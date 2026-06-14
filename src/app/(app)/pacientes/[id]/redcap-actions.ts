"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  coletasParaRegistros,
  assertRecordIdUnico,
  type ColetaParaExport,
} from "@/lib/redcap-export/transform";
import { importarRegistros, redcapConfigurado } from "@/lib/redcap-export/client";

/**
 * Exportação de UM paciente pro REDCap. Sob demanda (botão). Travas:
 *  - lê e envia SÓ as coletas deste paciente;
 *  - todos os registros carregam o mesmo record_id (assertRecordIdUnico);
 *  - overwriteBehavior=normal no client → nunca apaga nada no REDCap;
 *  - cria o registro (auto-numeração) só se o paciente ainda não tem redcap_id.
 * Roda como o usuário logado → o trigger de auditoria registra quem exportou.
 */

async function carregar(pacienteId: string) {
  const supabase = createClient();
  const { data: pac, error: pErr } = await supabase
    .from("pacientes")
    .select("id, nome, redcap_id")
    .eq("id", pacienteId)
    .single();
  if (pErr || !pac) throw new Error("Paciente não encontrado.");

  const { data: rows, error: cErr } = await supabase
    .from("coletas_redcap")
    .select("tipo, seq, dados, status")
    .eq("paciente_id", pacienteId);
  if (cErr) throw new Error(`Erro lendo coletas: ${cErr.message}`);

  const coletas: ColetaParaExport[] = (rows ?? []).map((r) => ({
    tipo: r.tipo as string,
    seq: (r.seq ?? 1) as number,
    dados: (r.dados ?? {}) as Record<string, unknown>,
    status: (r.status ?? "INCOMPLETE") as string,
  }));

  return { supabase, pac, coletas };
}

export type PreviewExport = {
  configurado: boolean;
  criando: boolean;
  recordIdAtual: string | null;
  totalRegistros: number;
  totalSeguimentos: number;
  totalCampos: number;
  instrumentos: string[];
  semDados: boolean;
};

/** Monta o que SERIA enviado, sem enviar nada (dry-run / prévia). */
export async function previewExportRedcap(pacienteId: string): Promise<PreviewExport> {
  const { pac, coletas } = await carregar(pacienteId);
  const criando = !pac.redcap_id;
  const recordId = pac.redcap_id ?? pacienteId;
  const records = coletasParaRegistros(recordId, coletas);
  assertRecordIdUnico(records, recordId);

  const instrumentos = Array.from(new Set(coletas.map((c) => c.tipo))).sort();
  const totalSeguimentos = coletas.filter((c) => c.tipo === "seguimento").length;
  const totalCampos = records.reduce((acc, r) => {
    // não conta os campos de controle
    const ctrl = new Set(["record_id", "redcap_event_name", "redcap_repeat_instrument", "redcap_repeat_instance"]);
    return acc + Object.keys(r).filter((k) => !ctrl.has(k)).length;
  }, 0);

  return {
    configurado: redcapConfigurado(),
    criando,
    recordIdAtual: pac.redcap_id,
    totalRegistros: records.length,
    totalSeguimentos,
    totalCampos,
    instrumentos,
    semDados: coletas.length === 0,
  };
}

export type EnvioResult = { recordId: string | null; criou: boolean; registros: number };

/** Envia de fato pro REDCap (só este paciente). */
export async function enviarParaRedcap(pacienteId: string): Promise<EnvioResult> {
  const { supabase, pac, coletas } = await carregar(pacienteId);

  if (coletas.length === 0) {
    throw new Error("Este paciente não tem nenhuma coleta pra enviar.");
  }
  if (!redcapConfigurado()) {
    throw new Error("API do REDCap ainda não configurada (REDCAP_API_URL / REDCAP_API_TOKEN).");
  }

  const criando = !pac.redcap_id;
  const recordId = pac.redcap_id ?? pacienteId;
  const records = coletasParaRegistros(recordId, coletas);

  // TRAVA: aborta se qualquer registro fugir do record_id deste paciente.
  assertRecordIdUnico(records, recordId);

  const res = await importarRegistros(records, { forceAutoNumber: criando });

  const novoRecordId = criando ? res.novoRecordId ?? null : pac.redcap_id;
  if (criando && !novoRecordId) {
    throw new Error(
      "O REDCap não retornou o record_id do paciente novo. Confira no REDCap antes de reenviar (pra não duplicar).",
    );
  }

  const { error: upErr } = await supabase
    .from("pacientes")
    .update({ redcap_id: novoRecordId, redcap_exportado_em: new Date().toISOString() })
    .eq("id", pacienteId);
  if (upErr) {
    throw new Error(
      `Enviado ao REDCap, mas falhei ao registrar o redcap_id localmente: ${upErr.message}. Anote o record_id ${novoRecordId} no paciente.`,
    );
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  return { recordId: novoRecordId, criou: criando, registros: records.length };
}
