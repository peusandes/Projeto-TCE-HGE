"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getPesquisadorContext } from "@/lib/data/pesquisador-context";
import { DIAS_COM_TARDE, type Turno, type EstagioSolicTipo } from "@/lib/lanc/enums";

/** Server actions da escala de estágio (estagio_alocacoes / estagio_solicitacoes). */

async function ctxOrThrow() {
  const ctx = await getPesquisadorContext();
  if (!ctx) throw new Error("Sessão expirada. Faça login de novo.");
  return ctx;
}

function validarDiaTurno(dia: number | undefined, turno: Turno | undefined): void {
  if (dia === undefined || turno === undefined) throw new Error("Dia e turno são obrigatórios.");
  if (dia < 0 || dia > 6) throw new Error("Dia inválido (0=Dom..6=Sáb).");
  if (turno === "TARDE" && !DIAS_COM_TARDE.has(dia)) {
    throw new Error("Turno da tarde só existe em Seg, Ter, Qui e Sex.");
  }
}

type Mudanca = {
  tipo: EstagioSolicTipo;
  deDiaSemana?: number;
  deTurno?: Turno;
  paraDiaSemana?: number;
  paraTurno?: Turno;
};

/** Aplica a mudança na escala recorrente de um ligante (entrar/sair/trocar). */
async function aplicarMudanca(
  supabase: SupabaseClient,
  pesquisadorId: string,
  criadoPor: string,
  m: Mudanca,
): Promise<void> {
  const entrar = async (dia: number, turno: Turno) => {
    const { error } = await supabase.from("estagio_alocacoes").upsert(
      { pesquisador_id: pesquisadorId, dia_semana: dia, turno, ativo: true, criado_por: criadoPor },
      { onConflict: "pesquisador_id,dia_semana,turno" },
    );
    if (error) throw new Error(error.message);
  };
  const sair = async (dia: number, turno: Turno) => {
    const { error } = await supabase
      .from("estagio_alocacoes")
      .update({ ativo: false })
      .eq("pesquisador_id", pesquisadorId)
      .eq("dia_semana", dia)
      .eq("turno", turno);
    if (error) throw new Error(error.message);
  };

  if (m.tipo === "ENTRAR") {
    await entrar(m.paraDiaSemana!, m.paraTurno!);
  } else if (m.tipo === "SAIR") {
    await sair(m.deDiaSemana!, m.deTurno!);
  } else {
    await sair(m.deDiaSemana!, m.deTurno!);
    await entrar(m.paraDiaSemana!, m.paraTurno!);
  }
}

export async function criarSolicitacaoEscala(input: Mudanca & { mensagem?: string }): Promise<{ applied: boolean }> {
  const ctx = await ctxOrThrow();
  if (input.tipo === "ENTRAR" || input.tipo === "TROCAR") validarDiaTurno(input.paraDiaSemana, input.paraTurno);
  if (input.tipo === "SAIR" || input.tipo === "TROCAR") validarDiaTurno(input.deDiaSemana, input.deTurno);

  const supabase = createClient();

  // Trânsito livre (Pesquisador TCE baby): aplica direto, sem solicitação.
  if (ctx.perms.hasFreeEscalaTransit) {
    await aplicarMudanca(supabase, ctx.id, ctx.email, input);
    revalidatePath("/estagio/escala");
    return { applied: true };
  }

  const { error } = await supabase.from("estagio_solicitacoes").insert({
    pesquisador_id: ctx.id,
    tipo: input.tipo,
    de_dia_semana: input.deDiaSemana ?? null,
    de_turno: input.deTurno ?? null,
    para_dia_semana: input.paraDiaSemana ?? null,
    para_turno: input.paraTurno ?? null,
    mensagem: input.mensagem?.trim() || null,
    status: "PENDENTE",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/estagio/solicitacoes");
  return { applied: false };
}

export async function decidirSolicitacaoEscala(input: {
  id: string;
  acao: "APROVAR" | "RECUSAR";
  motivo?: string;
}): Promise<void> {
  const ctx = await ctxOrThrow();
  if (!ctx.perms.canManageEscala) throw new Error("Sem permissão para decidir solicitações.");
  const supabase = createClient();

  const { data: sol } = await supabase
    .from("estagio_solicitacoes")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  if (!sol) throw new Error("Solicitação não encontrada.");
  if (sol.status !== "PENDENTE") throw new Error("Solicitação não está pendente.");

  if (input.acao === "APROVAR") {
    await aplicarMudanca(supabase, sol.pesquisador_id as string, ctx.email, {
      tipo: sol.tipo as EstagioSolicTipo,
      deDiaSemana: (sol.de_dia_semana as number | null) ?? undefined,
      deTurno: (sol.de_turno as Turno | null) ?? undefined,
      paraDiaSemana: (sol.para_dia_semana as number | null) ?? undefined,
      paraTurno: (sol.para_turno as Turno | null) ?? undefined,
    });
  }

  const { error } = await supabase
    .from("estagio_solicitacoes")
    .update({
      status: input.acao === "APROVAR" ? "APROVADA" : "RECUSADA",
      revisado_por: ctx.email,
      revisado_em: new Date().toISOString(),
      resposta_motivo: input.motivo?.trim() || null,
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);

  revalidatePath("/estagio/solicitacoes");
  revalidatePath("/estagio/escala");
}

/** Gestão direta da Extensão/admin: aloca ou remove um ligante da grade. */
export async function gerirAlocacao(input: {
  pesquisadorId: string;
  diaSemana: number;
  turno: Turno;
  ativo: boolean;
}): Promise<void> {
  const ctx = await ctxOrThrow();
  if (!ctx.perms.canManageEscala) throw new Error("Sem permissão para gerir a escala.");
  validarDiaTurno(input.diaSemana, input.turno);
  const supabase = createClient();
  await aplicarMudanca(
    supabase,
    input.pesquisadorId,
    ctx.email,
    input.ativo
      ? { tipo: "ENTRAR", paraDiaSemana: input.diaSemana, paraTurno: input.turno }
      : { tipo: "SAIR", deDiaSemana: input.diaSemana, deTurno: input.turno },
  );
  revalidatePath("/estagio/escala");
}
