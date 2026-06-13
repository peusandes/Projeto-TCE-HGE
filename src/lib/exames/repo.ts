import { createAdminClient } from "@/lib/supabase/admin";
import type { FormData } from "@/lib/redcap-schema/types";
import type { Plano, SeguimentoExistente } from "./seguimento-plan";

/**
 * Acesso ao Supabase para o bot do Telegram. Usa SEMPRE o admin client
 * (service role) porque o webhook não tem usuário logado — o RLS do projeto é
 * "tudo para authenticated", então sem service role nada passaria.
 */

export type PacienteRef = { paciente_id: string; nome: string; plantao_id: string };

/** Lista todos os pacientes (id, nome, plantão de origem) para o fuzzy match. */
export async function listarPacientes(): Promise<PacienteRef[]> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("pacientes").select("id, nome, plantao_id");
  if (error) throw new Error(`listarPacientes: ${error.message}`);
  return (data ?? []).map((p) => ({
    paciente_id: p.id as string,
    nome: p.nome as string,
    plantao_id: p.plantao_id as string,
  }));
}

export type PlantaoRef = { id: string; data: string; finalizado: boolean };

/** Plantões mais recentes (pra escolher onde criar um paciente novo). */
export async function listarPlantoesRecentes(limit = 6): Promise<PlantaoRef[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("plantoes")
    .select("id, data, finalizado")
    .order("data", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listarPlantoesRecentes: ${error.message}`);
  return (data ?? []).map((p) => ({
    id: p.id as string,
    data: p.data as string,
    finalizado: Boolean(p.finalizado),
  }));
}

/**
 * Cria um paciente novo (admissão) e a entrada dele no mapa do plantão —
 * espelha a server action adicionarPaciente. situacao=ADM, tcle=PENDENTE.
 */
export async function criarPacienteAdmissao(input: {
  plantaoId: string;
  nome: string;
  setor: string;
}): Promise<string> {
  const sb = createAdminClient();
  const { data: pac, error } = await sb
    .from("pacientes")
    .insert({
      plantao_id: input.plantaoId,
      nome: input.nome,
      setor: input.setor,
      leito: null,
      situacao: "ADM",
      tcle_status: "PENDENTE",
    })
    .select("id")
    .single();
  if (error || !pac) throw new Error(`criarPacienteAdmissao: ${error?.message ?? "sem retorno"}`);

  const { data: maxRow } = await sb
    .from("mapa_entries")
    .select("ordem")
    .eq("plantao_id", input.plantaoId)
    .order("ordem", { ascending: false })
    .limit(1);
  const ordem = ((maxRow?.[0]?.ordem as number | undefined) ?? -1) + 1;

  const { error: meErr } = await sb.from("mapa_entries").insert({
    plantao_id: input.plantaoId,
    paciente_id: pac.id,
    setor: input.setor,
    leito: null,
    situacao: "ADM",
    tcle_status: "PENDENTE",
    ordem,
  });
  if (meErr) throw new Error(`criarPacienteAdmissao (mapa): ${meErr.message}`);

  return pac.id as string;
}

/** Registra a data de admissão (historia_admissao.hora_admissao). */
export async function setAdmissaoIso(
  pacienteId: string,
  plantaoId: string,
  iso: string,
): Promise<void> {
  const sb = createAdminClient();
  const { error } = await sb.from("coletas_redcap").upsert(
    {
      paciente_id: pacienteId,
      plantao_id: plantaoId,
      tipo: "historia_admissao",
      seq: 1,
      dados: { hora_admissao: `${iso}T00:00` },
      status: "INCOMPLETE",
      coletado_por: null,
    },
    { onConflict: "paciente_id,tipo,seq", ignoreDuplicates: true },
  );
  if (error) throw new Error(`setAdmissaoIso: ${error.message}`);
}

function isoDate(v: unknown): string | null {
  if (typeof v !== "string" || v.length < 10) return null;
  return v.slice(0, 10); // "YYYY-MM-DD" (corta a hora se houver)
}

/** Data de nascimento (YYYY-MM-DD) do instrumento dados_demograficos, ou null. */
export async function getDataNascimento(pacienteId: string): Promise<string | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("coletas_redcap")
    .select("dados")
    .eq("paciente_id", pacienteId)
    .eq("tipo", "dados_demograficos")
    .maybeSingle();
  const dados = (data?.dados ?? {}) as Record<string, unknown>;
  return isoDate(dados.data_nascimento);
}

/** Data de admissão (YYYY-MM-DD) do instrumento historia_admissao, ou null. */
export async function getAdmissaoIso(pacienteId: string): Promise<string | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("coletas_redcap")
    .select("dados")
    .eq("paciente_id", pacienteId)
    .eq("tipo", "historia_admissao")
    .maybeSingle();
  const dados = (data?.dados ?? {}) as Record<string, unknown>;
  return isoDate(dados.hora_admissao);
}

/** Seguimentos já existentes do paciente (seq + data_seg). */
export async function getSeguimentos(pacienteId: string): Promise<SeguimentoExistente[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("coletas_redcap")
    .select("seq, dados")
    .eq("paciente_id", pacienteId)
    .eq("tipo", "seguimento")
    .order("seq", { ascending: true });
  if (error) throw new Error(`getSeguimentos: ${error.message}`);
  return (data ?? []).map((r) => ({
    seq: r.seq as number,
    dataIso: isoDate((r.dados as Record<string, unknown>)?.data_seg),
  }));
}

/**
 * Grava o plano: cria os dias em branco que faltam (só data_seg) e grava o dia
 * do exame com os laboratoriais. Mescla com o que já existe — nunca apaga
 * campos preenchidos à mão que o laudo não traz.
 */
export async function commitPlano(input: {
  pacienteId: string;
  plantaoId: string;
  plano: Plano;
  /** dados do dia do exame: data_seg + local_pct + ligante_seg + laboratoriais. */
  examDados: FormData;
}): Promise<{ criadosBranco: number[]; exameSeq: number }> {
  const sb = createAdminClient();
  const criadosBranco: number[] = [];

  for (const item of input.plano.itens) {
    if (item.isExame) continue;
    const { error } = await sb.from("coletas_redcap").upsert(
      {
        paciente_id: input.pacienteId,
        plantao_id: input.plantaoId,
        tipo: "seguimento",
        seq: item.seq,
        dados: { data_seg: item.dataIso },
        status: "INCOMPLETE",
        coletado_por: null,
      },
      { onConflict: "paciente_id,tipo,seq", ignoreDuplicates: true },
    );
    if (error) throw new Error(`commit blank seq ${item.seq}: ${error.message}`);
    criadosBranco.push(item.seq);
  }

  const exame = input.plano.itens.find((i) => i.isExame);
  // Sem dia de exame (caso "passou do dia 30"): só criamos os dias em branco.
  if (!exame) return { criadosBranco, exameSeq: 0 };

  if (exame.modo === "atualizar") {
    const { data: atual } = await sb
      .from("coletas_redcap")
      .select("dados")
      .eq("paciente_id", input.pacienteId)
      .eq("tipo", "seguimento")
      .eq("seq", exame.seq)
      .maybeSingle();
    const base = (atual?.dados ?? {}) as Record<string, unknown>;
    const { error } = await sb
      .from("coletas_redcap")
      .update({ dados: { ...base, ...input.examDados } })
      .eq("paciente_id", input.pacienteId)
      .eq("tipo", "seguimento")
      .eq("seq", exame.seq);
    if (error) throw new Error(`commit exame (update) seq ${exame.seq}: ${error.message}`);
  } else {
    const { error } = await sb.from("coletas_redcap").upsert(
      {
        paciente_id: input.pacienteId,
        plantao_id: input.plantaoId,
        tipo: "seguimento",
        seq: exame.seq,
        dados: input.examDados,
        status: "INCOMPLETE",
        coletado_por: null,
      },
      { onConflict: "paciente_id,tipo,seq" },
    );
    if (error) throw new Error(`commit exame (insert) seq ${exame.seq}: ${error.message}`);
  }

  return { criadosBranco, exameSeq: exame.seq };
}

/**
 * Grava os laboratoriais no instrumento "alta" (single, seq=1). Mescla com o
 * que já existe — não apaga campos preenchidos à mão (ex.: hora_alta, óbito).
 */
export async function commitAlta(input: {
  pacienteId: string;
  plantaoId: string;
  dados: FormData;
}): Promise<void> {
  const sb = createAdminClient();
  const { data: atual } = await sb
    .from("coletas_redcap")
    .select("dados")
    .eq("paciente_id", input.pacienteId)
    .eq("tipo", "alta")
    .eq("seq", 1)
    .maybeSingle();

  if (atual) {
    const base = (atual.dados ?? {}) as Record<string, unknown>;
    const { error } = await sb
      .from("coletas_redcap")
      .update({ dados: { ...base, ...input.dados } })
      .eq("paciente_id", input.pacienteId)
      .eq("tipo", "alta")
      .eq("seq", 1);
    if (error) throw new Error(`commitAlta (update): ${error.message}`);
  } else {
    const { error } = await sb.from("coletas_redcap").insert({
      paciente_id: input.pacienteId,
      plantao_id: input.plantaoId,
      tipo: "alta",
      seq: 1,
      dados: input.dados,
      status: "INCOMPLETE",
      coletado_por: null,
    });
    if (error) throw new Error(`commitAlta (insert): ${error.message}`);
  }
}

// ─── Estado pendente (perguntas que aguardam resposta no chat) ───────────────

export type PendingKind = "await_patient" | "await_admission" | "await_birthdate";

export type Pending = {
  id: string;
  chat_id: number;
  user_id: number;
  kind: PendingKind;
  payload: Record<string, unknown>;
};

export async function criarPending(input: {
  chatId: number;
  userId: number;
  kind: PendingKind;
  payload: Record<string, unknown>;
}): Promise<string> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("telegram_pending")
    .insert({
      chat_id: input.chatId,
      user_id: input.userId,
      kind: input.kind,
      payload: input.payload,
    })
    .select("id")
    .single();
  if (error) throw new Error(`criarPending: ${error.message}`);
  return data.id as string;
}

export async function getPendingById(id: string): Promise<Pending | null> {
  const sb = createAdminClient();
  const { data } = await sb.from("telegram_pending").select("*").eq("id", id).maybeSingle();
  return (data as Pending) ?? null;
}

/** Pendência mais recente de um chat (para respostas em texto livre). */
export async function getUltimoPending(chatId: number): Promise<Pending | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("telegram_pending")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Pending) ?? null;
}

export async function apagarPending(id: string): Promise<void> {
  const sb = createAdminClient();
  await sb.from("telegram_pending").delete().eq("id", id);
}

// ─── Usuários liberados (acesso por código compartilhado) ────────────────────

export async function usuarioNoBanco(userId: number): Promise<boolean> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("telegram_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function autorizarUsuario(userId: number, nome: string | null): Promise<void> {
  const sb = createAdminClient();
  const { error } = await sb
    .from("telegram_users")
    .upsert({ user_id: userId, nome }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw new Error(`autorizarUsuario: ${error.message}`);
}

/**
 * Marca um update_id do Telegram como processado. Retorna true se for novo
 * (deve processar) e false se já tinha sido visto (reentrega → ignorar).
 */
export async function registrarUpdate(updateId: number): Promise<boolean> {
  const sb = createAdminClient();
  const { error } = await sb.from("telegram_processed_updates").insert({ update_id: updateId });
  if (!error) return true;
  if (error.code === "23505") return false; // unique_violation → já processado
  throw new Error(`registrarUpdate: ${error.message}`);
}
