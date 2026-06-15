import { createClient } from "@/lib/supabase/server";
import type { Turno, EstagioSolicTipo, EstagioSolicStatus } from "@/lib/lanc/enums";

/** Leituras da escala de estágio (alocações recorrentes + solicitações). */

export type AlocacaoRow = {
  id: string;
  pesquisador_id: string;
  dia_semana: number;
  turno: Turno;
  nome: string;
};

export type LiganteRef = { id: string; nome: string };

export type SolicitacaoRow = {
  id: string;
  pesquisador_id: string;
  nome: string;
  email: string | null;
  tipo: EstagioSolicTipo;
  de_dia_semana: number | null;
  de_turno: Turno | null;
  para_dia_semana: number | null;
  para_turno: Turno | null;
  mensagem: string | null;
  status: EstagioSolicStatus;
  revisado_por: string | null;
};

type NestedNome = { nome?: string | null; email?: string | null } | { nome?: string | null; email?: string | null }[] | null;
function flat(n: NestedNome): { nome: string; email: string | null } {
  const o = Array.isArray(n) ? n[0] : n;
  return { nome: o?.nome ?? "—", email: o?.email ?? null };
}

export async function listAlocacoesAtivas(): Promise<AlocacaoRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("estagio_alocacoes")
    .select("id, pesquisador_id, dia_semana, turno, pesquisadores ( nome )")
    .eq("ativo", true)
    .order("dia_semana", { ascending: true });
  if (error) throw new Error(`listAlocacoesAtivas: ${error.message}`);
  return (data ?? []).map((a) => ({
    id: a.id as string,
    pesquisador_id: a.pesquisador_id as string,
    dia_semana: a.dia_semana as number,
    turno: a.turno as Turno,
    nome: flat(a.pesquisadores as NestedNome).nome,
  }));
}

export async function listLigantesAtivos(): Promise<LiganteRef[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pesquisadores")
    .select("id, nome")
    .eq("status", "ATIVO")
    .order("nome", { ascending: true });
  if (error) throw new Error(`listLigantesAtivos: ${error.message}`);
  return (data ?? []).map((p) => ({ id: p.id as string, nome: (p.nome as string) ?? "—" }));
}

function mapSolic(rows: unknown[]): SolicitacaoRow[] {
  return (rows ?? []).map((r) => {
    const s = r as Record<string, unknown>;
    const p = flat(s.pesquisadores as NestedNome);
    return {
      id: s.id as string,
      pesquisador_id: s.pesquisador_id as string,
      nome: p.nome,
      email: p.email,
      tipo: s.tipo as EstagioSolicTipo,
      de_dia_semana: (s.de_dia_semana as number | null) ?? null,
      de_turno: (s.de_turno as Turno | null) ?? null,
      para_dia_semana: (s.para_dia_semana as number | null) ?? null,
      para_turno: (s.para_turno as Turno | null) ?? null,
      mensagem: (s.mensagem as string | null) ?? null,
      status: s.status as EstagioSolicStatus,
      revisado_por: (s.revisado_por as string | null) ?? null,
    };
  });
}

export async function listSolicitacoesPendentes(): Promise<SolicitacaoRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("estagio_solicitacoes")
    .select("*, pesquisadores ( nome, email )")
    .eq("status", "PENDENTE")
    .order("criado_em", { ascending: true });
  if (error) throw new Error(`listSolicitacoesPendentes: ${error.message}`);
  return mapSolic(data ?? []);
}

export async function listSolicitacoesRecentes(): Promise<SolicitacaoRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("estagio_solicitacoes")
    .select("*, pesquisadores ( nome, email )")
    .in("status", ["APROVADA", "RECUSADA", "CANCELADA"])
    .order("atualizado_em", { ascending: false })
    .limit(20);
  if (error) throw new Error(`listSolicitacoesRecentes: ${error.message}`);
  return mapSolic(data ?? []);
}
