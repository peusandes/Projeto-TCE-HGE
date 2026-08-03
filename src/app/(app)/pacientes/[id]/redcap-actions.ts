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
import { checarDados, type ValorSuspeito } from "@/lib/redcap-schema/plausibilidade";

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
 *  - VÍNCULO EXPLÍCITO: quando o record já existe lá (equipe digitou à mão), o
 *    envio só passa se o usuário confirmar que é a mesma pessoa (vincularExistente).
 * Roda como o usuário logado → o trigger de auditoria registra quem exportou.
 *
 * IMPORTANTE — POR QUE NADA AQUI FAZ `throw` PRA FORA:
 * o Next REDIGE a mensagem de qualquer erro lançado numa Server Action em
 * produção ("An error occurred in the Server Components render…"), então toda a
 * explicação cuidadosa virava um texto genérico e inútil na tela. Estas actions
 * devolvem `{ ok: false, erro }` pra mensagem chegar inteira no usuário.
 */

/** Erro de fluxo com mensagem que PODE ser mostrada ao usuário. */
class ErroExport extends Error {
  /** record_id real já existente no REDCap (quando o bloqueio foi por isso). */
  readonly jaExiste?: string;
  constructor(mensagem: string, jaExiste?: string) {
    super(mensagem);
    this.jaExiste = jaExiste;
  }
}

function mensagemDe(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Erro inesperado no envio. Tente de novo; se persistir, avise o suporte.";
}

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

/** Valor fora da faixa plausível + de onde veio (instrumento/seq). */
export type SuspeitoExport = ValorSuspeito & { tipo: string; seq: number };

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
  /** Valores implausíveis (ex.: exame trocado) — envio pede confirmação. */
  suspeitos: SuspeitoExport[];
  /**
   * record_id REAL já existente no REDCap equivalente a este nome (legado /
   * digitado à mão pela equipe) e que ainda NÃO é nosso. Enviar exige que o
   * usuário confirme o vínculo. null = nome inédito lá, criação limpa.
   */
  existenteNoRedcap: string | null;
  /** true = não deu pra consultar o REDCap agora; a checagem real roda no envio. */
  checagemExistenciaFalhou: boolean;
};

export type PreviewResposta = { ok: true; preview: PreviewExport } | { ok: false; erro: string };

/** Varre as coletas e junta os valores fora de faixa, com a origem. */
function coletarSuspeitos(coletas: ColetaParaExport[]): SuspeitoExport[] {
  const out: SuspeitoExport[] = [];
  for (const c of coletas) {
    for (const s of checarDados(c.dados)) {
      out.push({ ...s, tipo: c.tipo, seq: c.seq });
    }
  }
  return out;
}

const CTRL = new Set([
  "record_id",
  "redcap_event_name",
  "redcap_repeat_instrument",
  "redcap_repeat_instance",
]);

/** Monta o que SERIA enviado, sem enviar nada (dry-run / prévia). */
export async function previewExportRedcap(pacienteId: string): Promise<PreviewResposta> {
  try {
    return { ok: true, preview: await montarPreview(pacienteId) };
  } catch (err) {
    return { ok: false, erro: mensagemDe(err) };
  }
}

async function montarPreview(pacienteId: string): Promise<PreviewExport> {
  const { pac, coletas } = await carregar(pacienteId);
  // Espelha o gate do envio: a prévia não deve montar nada pra paciente não
  // habilitado (defesa em profundidade — a UI já esconde o botão).
  if (!pac.redcap_export_habilitado) {
    throw new ErroExport("Este paciente não está habilitado para exportação ao REDCap.");
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

  // Avisa ANTES do clique que o nome já existe lá (caso comum: a equipe digitou
  // o paciente à mão no REDCap). Rede pode falhar — degrada sem quebrar a prévia,
  // já que a checagem que de fato barra o envio roda na hora do envio.
  let existenteNoRedcap: string | null = null;
  let checagemExistenciaFalhou = false;
  if (criando && redcapConfigurado()) {
    try {
      const achado = await recordExisteCanon(recordId);
      existenteNoRedcap = achado && achado !== pac.redcap_id ? achado : null;
    } catch {
      checagemExistenciaFalhou = true;
    }
  }

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
    suspeitos: coletarSuspeitos(coletas),
    existenteNoRedcap,
    checagemExistenciaFalhou,
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
    throw new ErroExport(
      `Falha ao reservar o envio — já existe outro paciente no site com nome equivalente a "${recordId}" (mesmo acento/caixa) vinculado ao REDCap. Confira se não é a mesma pessoa. (${error.message})`,
    );
  }
  return (data?.length ?? 0) > 0;
}

export type EnvioResult = { recordId: string; criou: boolean; registros: number };

export type EnvioResposta =
  | ({ ok: true } & EnvioResult)
  /** jaExiste = record_id real no REDCap; a UI usa pra oferecer o vínculo. */
  | { ok: false; erro: string; jaExiste?: string };

export type EnvioOpts = {
  confirmarSuspeitos?: boolean;
  /**
   * record_id que JÁ existe no REDCap e que o usuário confirmou ser a mesma
   * pessoa. Precisa bater exatamente com o que a checagem encontrar na hora do
   * envio — senão o vínculo é recusado (o REDCap pode ter mudado no meio).
   */
  vincularExistente?: string;
};

/** Envia de fato pro REDCap (só este paciente). Nunca lança: devolve `ok:false`. */
export async function enviarParaRedcap(
  pacienteId: string,
  opts: EnvioOpts = {},
): Promise<EnvioResposta> {
  try {
    return { ok: true, ...(await executarEnvio(pacienteId, opts)) };
  } catch (err) {
    return {
      ok: false,
      erro: mensagemDe(err),
      ...(err instanceof ErroExport && err.jaExiste ? { jaExiste: err.jaExiste } : {}),
    };
  }
}

async function executarEnvio(pacienteId: string, opts: EnvioOpts): Promise<EnvioResult> {
  const { supabase, pac, coletas } = await carregar(pacienteId);

  if (!pac.redcap_export_habilitado) {
    throw new ErroExport(
      "Este paciente não está habilitado para exportação ao REDCap (o fluxo cobre só novas admissões; legados ficam intocados).",
    );
  }
  if (coletas.length === 0)
    throw new ErroExport("Este paciente não tem nenhuma coleta pra enviar.");

  // Blindagem: valor fora da faixa plausível (ex.: exame trocado → hemácias
  // 0.0059, sódio 26). Não bloqueia de vez — exige confirmação explícita.
  const suspeitos = coletarSuspeitos(coletas);
  if (suspeitos.length > 0 && !opts.confirmarSuspeitos) {
    const lista = suspeitos.map((s) => `${s.rotulo} ${s.valor} (${s.tipo})`).join(", ");
    throw new ErroExport(
      `Valores suspeitos (fora da faixa plausível): ${lista}. Confira se não é outro exame — confirme o envio se estiver certo.`,
    );
  }
  if (!redcapConfigurado()) {
    throw new ErroExport(
      "API do REDCap ainda não configurada (REDCAP_API_URL / REDCAP_API_TOKEN).",
    );
  }

  const nome = normalizeNome(pac.nome);
  if (!nome) {
    throw new ErroExport(
      "O paciente está sem nome — no REDCap o record_id é o nome completo. Preencha o nome antes de exportar.",
    );
  }

  // "criando" = primeiro envio ainda não concluído (verdade: redcap_exportado_em).
  // Derivar de redcap_id deixaria a trava de existência ser pulada pra sempre
  // após um claim seguido de falha de import (I6-01).
  const criando = !pac.redcap_exportado_em;
  let recordId = pac.redcap_id ?? nome;
  const primeiraCriacao = criando && !pac.redcap_id; // ainda não reservamos o nome

  // Defensivo: o fluxo assume record_id=nome (auto-numeração DESLIGADA).
  const proj = await getProjectInfo();
  if (proj.autonumber) {
    throw new ErroExport(
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
    if (oErr) throw new ErroExport(`Erro checando duplicidade de nome: ${oErr.message}`);
    const colisao = (outros ?? []).find((o) => canonNome(o.nome as string) === canon);
    if (colisao) {
      throw new ErroExport(
        `Já existe um paciente exportado com nome equivalente ("${colisao.nome}", record "${colisao.redcap_id}"). Confirme se é a mesma pessoa antes de exportar — pra não duplicar no REDCap.`,
      );
    }
  }

  // A checagem de existência vem ANTES de montar os registros: ao vincular a um
  // record já existente, é o id REAL de lá que manda (a grafia pode divergir da
  // nossa — "José" vs "Jose") e ele precisa ir em todos os registros.
  if (criando) {
    // TRAVA DE EXISTÊNCIA CANÔNICA, re-checada a CADA tentativa não concluída:
    // nunca sobrescrever/duplicar um record que já existe — inclusive legado com
    // grafia divergente (acento/caixa), que o match exato deixaria passar. Se o
    // existente NÃO for o que reservamos antes, só passa com vínculo confirmado
    // pelo usuário. Se é nosso (claim anterior, match exato), segue pro import
    // idempotente.
    const existente = await recordExisteCanon(recordId);
    const ehNosso = existente !== null && existente === pac.redcap_id;
    if (existente && !ehNosso) {
      // O vínculo confirmado tem que apontar pro MESMO record que achamos agora;
      // se o REDCap mudou entre a prévia e o envio, recusa e pede reconferência.
      if (opts.vincularExistente !== existente) {
        throw new ErroExport(
          `Já existe um registro "${existente}" no REDCap equivalente a "${recordId}" — não vou sobrescrever sozinho (pode ser legado, digitado à mão, ou homônimo). Se for a mesma pessoa, confirme o vínculo; senão ajuste o nome.`,
          existente,
        );
      }
      recordId = existente; // adota o id real de lá
    }
    if (!pac.redcap_id) {
      const reservou = await claimCriacao(supabase, pacienteId, recordId);
      if (!reservou) {
        throw new ErroExport(
          "Já há um envio em andamento pra este paciente (ou ele acabou de ser vinculado). Aguarde alguns segundos e tente de novo.",
        );
      }
    }
  }

  const records = coletasParaRegistros(recordId, coletas);
  assertRecordIdUnico(records, recordId); // TRAVA: só este paciente

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
    throw new ErroExport(
      `Enviado ao REDCap, mas falhei ao salvar o status localmente: ${upErr.message}. Como o record_id é o nome, reenviar é seguro (não duplica) — tente de novo.`,
    );
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  return { recordId, criou: criando, registros: records.length };
}
