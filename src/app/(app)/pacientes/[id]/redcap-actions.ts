"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  coletasParaRegistros,
  assertRecordIdUnico,
  type ColetaParaExport,
} from "@/lib/redcap-export/transform";
import {
  importarRegistros,
  recordExisteCanon,
  getProjectInfo,
  redcapConfigurado,
} from "@/lib/redcap-export/client";
import { normalizeNome, canonNome } from "@/lib/redcap-export/nome";

/**
 * Exportação de UM paciente pro REDCap (Projeto TCE 3.0 — longitudinal,
 * record_id = NOME do paciente, SEM auto-numeração). Sob demanda (botão). Travas:
 *  - SÓ pacientes com redcap_export_habilitado (novas admissões). Legados nunca.
 *  - record_id = nome; todos os registros carregam o mesmo (assertRecordIdUnico)
 *    → nenhum outro paciente é tocado.
 *  - overwriteBehavior=normal + só campos não-vazios → nunca apaga/altera o que
 *    já está no REDCap.
 *  - TRAVA DE EXISTÊNCIA: ao criar, se o nome já existe no REDCap (legado ou
 *    homônimo), aborta — nunca sobrescreve. Só cria nomes inéditos.
 *  - claim reserva o redcap_id (=nome) antes de importar; se o import falhar,
 *    reenviar vira update idempotente (não duplica, pois o id é o nome).
 * Roda como o usuário logado → o trigger de auditoria registra quem exportou.
 */

async function carregar(pacienteId: string) {
  const supabase = createClient();
  const { data: pac, error: pErr } = await supabase
    .from("pacientes")
    .select("id, nome, redcap_id, redcap_export_habilitado, redcap_exportado_em")
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
  habilitado: boolean;
  criando: boolean;
  recordId: string;
  recordIdAtual: string | null;
  totalRegistros: number;
  totalSeguimentos: number;
  totalCampos: number;
  instrumentos: string[];
  eventos: string[];
  semDados: boolean;
  semNome: boolean;
};

const CTRL = new Set([
  "record_id",
  "redcap_event_name",
  "redcap_repeat_instrument",
  "redcap_repeat_instance",
]);

/** Monta o que SERIA enviado, sem enviar nada (dry-run / prévia). Offline-safe. */
export async function previewExportRedcap(pacienteId: string): Promise<PreviewExport> {
  const { pac, coletas } = await carregar(pacienteId);
  // Espelha o gate do envio: a prévia não deve montar nada pra paciente não
  // habilitado (defesa em profundidade — a UI já esconde o botão).
  if (!pac.redcap_export_habilitado) {
    throw new Error("Este paciente não está habilitado para exportação ao REDCap.");
  }
  // "criando" = primeiro envio ainda não concluído (verdade: redcap_exportado_em).
  const criando = !pac.redcap_exportado_em;
  const nome = normalizeNome(pac.nome);
  const recordId = pac.redcap_id ?? nome;
  const records = coletasParaRegistros(recordId, coletas);
  assertRecordIdUnico(records, recordId);

  const instrumentos = Array.from(new Set(coletas.map((c) => c.tipo))).sort();
  const totalSeguimentos = coletas.filter((c) => c.tipo === "seguimento").length;
  const eventos = Array.from(
    new Set(records.map((r) => r.redcap_event_name).filter(Boolean) as string[]),
  );
  const totalCampos = records.reduce(
    (acc, r) => acc + Object.keys(r).filter((k) => !CTRL.has(k) && !k.endsWith("_complete")).length,
    0,
  );

  return {
    configurado: redcapConfigurado(),
    habilitado: Boolean(pac.redcap_export_habilitado),
    criando,
    recordId,
    recordIdAtual: pac.redcap_id,
    totalRegistros: records.length,
    totalSeguimentos,
    totalCampos,
    instrumentos,
    eventos,
    semDados: coletas.length === 0,
    semNome: criando && !nome,
  };
}

async function setStatus(
  supabase: ReturnType<typeof createClient>,
  pacienteId: string,
  status: string,
): Promise<void> {
  await supabase.from("pacientes").update({ redcap_export_status: status }).eq("id", pacienteId);
}

/**
 * Reserva atômica da criação: grava redcap_id (=nome) e marca ENVIANDO só se o
 * paciente ainda não tem redcap_id. false = já reservado por outra requisição.
 * O índice único CANÔNICO de redcap_id (migration 0031) barra, de forma atômica
 * e à prova de corrida, dois pacientes com nome equivalente (mesmo acento/caixa).
 */
async function claimCriacao(
  supabase: ReturnType<typeof createClient>,
  pacienteId: string,
  recordId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("pacientes")
    .update({
      redcap_id: recordId,
      redcap_export_status: "ENVIANDO",
      redcap_export_iniciado_em: new Date().toISOString(),
    })
    .eq("id", pacienteId)
    .is("redcap_id", null)
    .select("id");
  if (error) {
    throw new Error(
      `Falha ao reservar o envio — já existe outro paciente no site com nome equivalente a "${recordId}" (mesmo acento/caixa) vinculado ao REDCap. Confira se não é a mesma pessoa. (${error.message})`,
    );
  }
  return (data?.length ?? 0) > 0;
}

export type EnvioResult = { recordId: string; criou: boolean; registros: number };

/** Envia de fato pro REDCap (só este paciente). */
export async function enviarParaRedcap(pacienteId: string): Promise<EnvioResult> {
  const { supabase, pac, coletas } = await carregar(pacienteId);

  if (!pac.redcap_export_habilitado) {
    throw new Error(
      "Este paciente não está habilitado para exportação ao REDCap (o fluxo cobre só novas admissões; legados ficam intocados).",
    );
  }
  if (coletas.length === 0) throw new Error("Este paciente não tem nenhuma coleta pra enviar.");
  if (!redcapConfigurado()) {
    throw new Error("API do REDCap ainda não configurada (REDCAP_API_URL / REDCAP_API_TOKEN).");
  }

  const nome = normalizeNome(pac.nome);
  if (!nome) {
    throw new Error(
      "O paciente está sem nome — no REDCap o record_id é o nome completo. Preencha o nome antes de exportar.",
    );
  }

  // "criando" = primeiro envio ainda não concluído (verdade: redcap_exportado_em).
  // Derivar de redcap_id deixaria a trava de existência ser pulada pra sempre
  // após um claim seguido de falha de import (I6-01).
  const criando = !pac.redcap_exportado_em;
  const recordId = pac.redcap_id ?? nome;
  const primeiraCriacao = criando && !pac.redcap_id; // ainda não reservamos o nome

  // Defensivo: o fluxo assume record_id=nome (auto-numeração DESLIGADA).
  const proj = await getProjectInfo();
  if (proj.autonumber) {
    throw new Error(
      "A auto-numeração de record está LIGADA no REDCap, mas este fluxo usa o NOME como record_id. Abortado por segurança — alinhe a configuração do projeto.",
    );
  }

  // I3: a MESMA pessoa com grafia divergente (caixa/acento) viraria 2 records.
  // Antes de reservar um nome novo, barra se já há paciente exportado equivalente.
  if (primeiraCriacao) {
    const canon = canonNome(nome);
    const { data: outros, error: oErr } = await supabase
      .from("pacientes")
      .select("nome, redcap_id")
      .not("redcap_id", "is", null)
      .neq("id", pacienteId);
    if (oErr) throw new Error(`Erro checando duplicidade de nome: ${oErr.message}`);
    const colisao = (outros ?? []).find((o) => canonNome(o.nome as string) === canon);
    if (colisao) {
      throw new Error(
        `Já existe um paciente exportado com nome equivalente ("${colisao.nome}", record "${colisao.redcap_id}"). Confirme se é a mesma pessoa antes de exportar — pra não duplicar no REDCap.`,
      );
    }
  }

  const records = coletasParaRegistros(recordId, coletas);
  assertRecordIdUnico(records, recordId); // TRAVA: só este paciente

  if (criando) {
    // TRAVA DE EXISTÊNCIA CANÔNICA, re-checada a CADA tentativa não concluída:
    // nunca sobrescrever/duplicar um record que já existe — inclusive legado com
    // grafia divergente (acento/caixa), que o match exato deixaria passar. Se o
    // existente NÃO for o que reservamos antes, aborta. Se é nosso (claim
    // anterior, match exato), segue pro import idempotente.
    const existente = await recordExisteCanon(recordId);
    const ehNosso = existente !== null && existente === pac.redcap_id;
    if (existente && !ehNosso) {
      throw new Error(
        `Já existe um registro "${existente}" no REDCap equivalente a "${recordId}" — não vou sobrescrever (pode ser legado ou homônimo). Se for o mesmo paciente, cole "${existente}" no record_id dele; senão ajuste o nome.`,
      );
    }
    if (!pac.redcap_id) {
      const reservou = await claimCriacao(supabase, pacienteId, recordId);
      if (!reservou) {
        throw new Error(
          "Já há um envio em andamento pra este paciente (ou ele acabou de ser vinculado). Aguarde alguns segundos e tente de novo.",
        );
      }
    }
  }

  try {
    await importarRegistros(records);
  } catch (err) {
    await setStatus(supabase, pacienteId, "ERRO");
    throw err;
  }

  const { error: upErr } = await supabase
    .from("pacientes")
    .update({
      redcap_id: recordId,
      redcap_exportado_em: new Date().toISOString(),
      redcap_export_status: "ENVIADO",
    })
    .eq("id", pacienteId);
  if (upErr) {
    await setStatus(supabase, pacienteId, "ERRO");
    throw new Error(
      `Enviado ao REDCap, mas falhei ao salvar o status localmente: ${upErr.message}. Como o record_id é o nome, reenviar é seguro (não duplica) — tente de novo.`,
    );
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  return { recordId, criou: criando, registros: records.length };
}
