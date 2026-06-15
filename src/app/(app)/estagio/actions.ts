"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPesquisadorContext } from "@/lib/data/pesquisador-context";
import {
  PACIENTE_STATUS_EXT_PROXIMOS,
  type PacienteFluxo,
  type PacienteStatusExt,
} from "@/lib/lanc/enums";

/** Server actions do TCE Baby / Aneurisma Baby (pacientes_extensao). */

function rota(fluxo: PacienteFluxo): string {
  return `/estagio/${fluxo === "TCE_BABY" ? "tce-baby" : "aneurisma-baby"}`;
}

async function ctxOrThrow() {
  const ctx = await getPesquisadorContext();
  if (!ctx) throw new Error("Sessão expirada. Faça login de novo.");
  return ctx;
}

export async function criarPacienteExtensao(input: {
  fluxo: PacienteFluxo;
  nome: string;
  dataAdmissao: string;
}): Promise<void> {
  const ctx = await ctxOrThrow();
  const nome = input.nome.trim();
  if (!nome) throw new Error("Nome obrigatório.");

  const supabase = createClient();
  const { data: pac, error } = await supabase
    .from("pacientes_extensao")
    .insert({
      fluxo: input.fluxo,
      nome,
      data_admissao: input.dataAdmissao,
      status_atual: "ADMISSAO",
      registrado_por: ctx.nome,
    })
    .select("id")
    .single();
  if (error || !pac) throw new Error(error?.message ?? "Falha ao cadastrar paciente.");

  await supabase.from("paciente_status_eventos").insert({
    paciente_id: pac.id,
    status: "ADMISSAO",
    registrado_por: ctx.nome,
    observacoes: "Cadastro",
  });

  revalidatePath(rota(input.fluxo));
}

export async function mudarStatusPacienteExtensao(input: {
  id: string;
  status: PacienteStatusExt;
  fluxo: PacienteFluxo;
}): Promise<void> {
  const ctx = await ctxOrThrow();
  const supabase = createClient();

  const { data: atual } = await supabase
    .from("pacientes_extensao")
    .select("status_atual")
    .eq("id", input.id)
    .maybeSingle();
  if (!atual) throw new Error("Paciente não encontrado.");

  const validos = PACIENTE_STATUS_EXT_PROXIMOS[atual.status_atual as PacienteStatusExt] ?? [];
  if (!validos.includes(input.status)) {
    throw new Error(`Transição inválida: ${atual.status_atual} → ${input.status}.`);
  }

  const patch: Record<string, unknown> = { status_atual: input.status };
  if (input.status === "ALTA") {
    patch.alta_reportada_em = new Date().toISOString();
    patch.alta_reportada_por = ctx.nome;
  }
  const { error } = await supabase.from("pacientes_extensao").update(patch).eq("id", input.id);
  if (error) throw new Error(error.message);

  await supabase.from("paciente_status_eventos").insert({
    paciente_id: input.id,
    status: input.status,
    registrado_por: ctx.nome,
  });

  revalidatePath(rota(input.fluxo));
}

export async function deletarPacienteExtensao(input: { id: string; fluxo: PacienteFluxo }): Promise<void> {
  const ctx = await ctxOrThrow();
  if (!ctx.isAdmin) throw new Error("Só admin pode apagar paciente.");
  const supabase = createClient();
  const { error } = await supabase.from("pacientes_extensao").delete().eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidatePath(rota(input.fluxo));
}
