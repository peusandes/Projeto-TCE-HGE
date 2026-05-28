"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Reserva o paciente pra mim (usuario atual). Falha se já reservado por
 * outro — comportamento idempotente se já é meu.
 *
 * RLS permite UPDATE pra qualquer authenticated, então a validação de
 * "quem pode reservar" é aqui na action.
 */
export async function reservarPaciente(mapaEntryId: string) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: row } = await sb
    .from("mapa_entries")
    .select("id, plantao_id, responsavel_id, plantoes(finalizado)")
    .eq("id", mapaEntryId)
    .maybeSingle();
  if (!row) throw new Error("Paciente não encontrado no mapa.");

  // Não permite reservar em plantão finalizado
  const plantao = Array.isArray(row.plantoes) ? row.plantoes[0] : row.plantoes;
  if (plantao?.finalizado) {
    throw new Error("Plantão finalizado — não dá pra reservar.");
  }

  if (row.responsavel_id && row.responsavel_id !== user.id) {
    throw new Error("Esse paciente já tem responsável.");
  }

  const { error } = await sb
    .from("mapa_entries")
    .update({ responsavel_id: user.id })
    .eq("id", mapaEntryId);
  if (error) throw new Error(error.message);

  revalidatePath(`/plantoes/${row.plantao_id}`);
  revalidatePath("/pacientes");
}

/**
 * Libera a reserva. Só quem reservou (ou admin) pode liberar — assim
 * ninguém "rouba" o paciente de outro.
 */
export async function liberarPaciente(mapaEntryId: string) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: row } = await sb
    .from("mapa_entries")
    .select("id, plantao_id, responsavel_id")
    .eq("id", mapaEntryId)
    .maybeSingle();
  if (!row) throw new Error("Paciente não encontrado no mapa.");

  if (row.responsavel_id !== user.id) {
    // Não é meu — verifica se sou admin antes de liberar
    const { data: pesq } = await sb
      .from("pesquisadores")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!pesq?.is_admin) {
      throw new Error("Só quem reservou pode liberar.");
    }
  }

  const { error } = await sb
    .from("mapa_entries")
    .update({ responsavel_id: null, concluido_em: null })
    .eq("id", mapaEntryId);
  if (error) throw new Error(error.message);

  revalidatePath(`/plantoes/${row.plantao_id}`);
  revalidatePath("/pacientes");
}

/**
 * Marca o paciente como "concluído" no plantão atual. Requer que o
 * pesquisador tenha reservado (precisa ser o responsável, ou admin).
 * Plantão finalizado não pode mexer.
 */
export async function concluirPaciente(mapaEntryId: string) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: row } = await sb
    .from("mapa_entries")
    .select("id, plantao_id, responsavel_id, plantoes(finalizado)")
    .eq("id", mapaEntryId)
    .maybeSingle();
  if (!row) throw new Error("Paciente não encontrado no mapa.");

  const plantao = Array.isArray(row.plantoes) ? row.plantoes[0] : row.plantoes;
  if (plantao?.finalizado) {
    throw new Error("Plantão finalizado — não dá pra concluir.");
  }

  if (!row.responsavel_id) {
    throw new Error("Reserve o paciente antes de concluir.");
  }

  if (row.responsavel_id !== user.id) {
    const { data: pesq } = await sb
      .from("pesquisadores")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!pesq?.is_admin) {
      throw new Error("Só quem reservou pode concluir.");
    }
  }

  const { error } = await sb
    .from("mapa_entries")
    .update({ concluido_em: new Date().toISOString() })
    .eq("id", mapaEntryId);
  if (error) throw new Error(error.message);

  revalidatePath(`/plantoes/${row.plantao_id}`);
  revalidatePath("/pacientes");
}

/**
 * Desfaz a conclusão — paciente volta pro estado "reservado em aberto".
 * Mesmas regras de permissão: quem reservou ou admin.
 */
export async function desfazerConclusaoPaciente(mapaEntryId: string) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: row } = await sb
    .from("mapa_entries")
    .select("id, plantao_id, responsavel_id, plantoes(finalizado)")
    .eq("id", mapaEntryId)
    .maybeSingle();
  if (!row) throw new Error("Paciente não encontrado no mapa.");

  const plantao = Array.isArray(row.plantoes) ? row.plantoes[0] : row.plantoes;
  if (plantao?.finalizado) {
    throw new Error("Plantão finalizado — não dá pra desfazer.");
  }

  if (row.responsavel_id && row.responsavel_id !== user.id) {
    const { data: pesq } = await sb
      .from("pesquisadores")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!pesq?.is_admin) {
      throw new Error("Só quem reservou pode desfazer a conclusão.");
    }
  }

  const { error } = await sb
    .from("mapa_entries")
    .update({ concluido_em: null })
    .eq("id", mapaEntryId);
  if (error) throw new Error(error.message);

  revalidatePath(`/plantoes/${row.plantao_id}`);
  revalidatePath("/pacientes");
}
