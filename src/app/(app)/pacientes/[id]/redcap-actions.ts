"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  coletasParaRegistros,
  assertRecordIdUnico,
  type ColetaParaExport,
} from "@/lib/redcap-export/transform";
import { importarRegistros, getProjectInfo, redcapConfigurado } from "@/lib/redcap-export/client";

/**
 * Exportação de UM paciente pro REDCap. Sob demanda (botão). Travas:
 *  - lê e envia SÓ as coletas deste paciente; todos os registros carregam o
 *    mesmo record_id (assertRecordIdUnico) → nenhum outro paciente é tocado;
 *  - overwriteBehavior=normal no client → nunca apaga nada no REDCap;
 *  - cria o registro (auto-numeração) só se o paciente ainda não tem redcap_id,
 *    e SÓ se o projeto estiver auto-numerado (getProjectInfo);
 *  - claim de concorrência + estado ID_PENDENTE evitam paciente duplicado;
 *  - bloqueia projeto longitudinal sem REDCAP_EVENT_NAME.
 * Roda como o usuário logado → o trigger de auditoria registra quem exportou.
 */

const EVENT_NAME = process.env.REDCAP_EVENT_NAME?.trim() || undefined;

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
    .eq("paciente_id", pacienteId)
    .order("tipo", { ascending: true })
    .order("seq", { ascending: true });
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

/** Monta o que SERIA enviado, sem enviar nada (dry-run / prévia). Offline-safe. */
export async function previewExportRedcap(pacienteId: string): Promise<PreviewExport> {
  const { pac, coletas } = await carregar(pacienteId);
  const criando = !pac.redcap_id;
  const recordId = pac.redcap_id ?? pacienteId;
  const records = coletasParaRegistros(recordId, coletas);
  assertRecordIdUnico(records, recordId);

  const instrumentos = Array.from(new Set(coletas.map((c) => c.tipo))).sort();
  const totalSeguimentos = coletas.filter((c) => c.tipo === "seguimento").length;
  const ctrl = new Set(["record_id", "redcap_event_name", "redcap_repeat_instrument", "redcap_repeat_instance"]);
  const totalCampos = records.reduce(
    (acc, r) => acc + Object.keys(r).filter((k) => !ctrl.has(k) && !k.endsWith("_complete")).length,
    0,
  );

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

async function setStatus(
  supabase: ReturnType<typeof createClient>,
  pacienteId: string,
  status: string,
): Promise<void> {
  await supabase.from("pacientes").update({ redcap_export_status: status }).eq("id", pacienteId);
}

/** Reivindica o envio (criação) de forma atômica. false = já há um em andamento. */
async function claimCriacao(
  supabase: ReturnType<typeof createClient>,
  pacienteId: string,
): Promise<boolean> {
  const stale = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("pacientes")
    .update({ redcap_export_status: "ENVIANDO", redcap_export_iniciado_em: new Date().toISOString() })
    .eq("id", pacienteId)
    .or(
      `redcap_export_status.is.null,redcap_export_status.neq.ENVIANDO,redcap_export_iniciado_em.lt.${stale}`,
    )
    .select("id");
  if (error) throw new Error(`Falha ao reservar o envio: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

export type EnvioResult = { recordId: string | null; criou: boolean; registros: number };

/** Envia de fato pro REDCap (só este paciente). */
export async function enviarParaRedcap(pacienteId: string): Promise<EnvioResult> {
  const { supabase, pac, coletas } = await carregar(pacienteId);

  if (coletas.length === 0) throw new Error("Este paciente não tem nenhuma coleta pra enviar.");
  if (!redcapConfigurado()) {
    throw new Error("API do REDCap ainda não configurada (REDCAP_API_URL / REDCAP_API_TOKEN).");
  }

  const criando = !pac.redcap_id;

  // Estado: criação anterior pode ter ocorrido sem confirmar o id → não recriar.
  const { data: st } = await supabase
    .from("pacientes")
    .select("redcap_export_status")
    .eq("id", pacienteId)
    .single();
  if (criando && st?.redcap_export_status === "ID_PENDENTE") {
    throw new Error(
      "Um envio anterior pode ter criado o registro no REDCap mas o id não foi confirmado. Confira no REDCap qual record é deste paciente e cole o record_id nele antes de reenviar — senão duplica.",
    );
  }

  // Travas do projeto (auto-numeração e longitudinal).
  const proj = await getProjectInfo();
  if (proj.longitudinal && !EVENT_NAME) {
    throw new Error(
      "O projeto REDCap é longitudinal, mas REDCAP_EVENT_NAME não está configurado. Defina o evento antes de enviar.",
    );
  }
  if (criando && !proj.autonumber) {
    throw new Error(
      "A auto-numeração de record está DESLIGADA no projeto REDCap — criar paciente automaticamente foi bloqueado por segurança (risco de colidir com outro record). Crie o record no REDCap e cole o record_id no paciente.",
    );
  }

  const recordId = pac.redcap_id ?? pacienteId;
  const records = coletasParaRegistros(recordId, coletas);
  assertRecordIdUnico(records, recordId); // TRAVA: só este paciente

  if (criando) {
    const reservou = await claimCriacao(supabase, pacienteId);
    if (!reservou) {
      throw new Error("Já há um envio em andamento pra este paciente. Aguarde alguns segundos e tente de novo.");
    }
  }

  let res;
  try {
    res = await importarRegistros(records, { forceAutoNumber: criando });
  } catch (err) {
    if (criando) await setStatus(supabase, pacienteId, "ERRO");
    throw err;
  }

  let novoRecordId = pac.redcap_id;
  if (criando) {
    novoRecordId = res.novoRecordId ?? null;
    // Auto-numeração tem que ter agido: id novo, existente e diferente do UUID.
    if (!novoRecordId || novoRecordId === recordId) {
      await setStatus(supabase, pacienteId, "ID_PENDENTE");
      throw new Error(
        "O REDCap pode ter criado o registro mas não retornou um record_id válido (auto-numeração não confirmada). NÃO reenvie — confira no REDCap e cole o id no paciente.",
      );
    }
  }

  const { error: upErr } = await supabase
    .from("pacientes")
    .update({
      redcap_id: novoRecordId,
      redcap_exportado_em: new Date().toISOString(),
      redcap_export_status: "ENVIADO",
    })
    .eq("id", pacienteId);
  if (upErr) {
    if (criando) await setStatus(supabase, pacienteId, "ID_PENDENTE");
    throw new Error(
      `Enviado ao REDCap, mas falhei ao salvar o redcap_id ${novoRecordId} localmente: ${upErr.message}. Cole esse id no paciente manualmente pra não duplicar.`,
    );
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  return { recordId: novoRecordId, criou: criando, registros: records.length };
}
