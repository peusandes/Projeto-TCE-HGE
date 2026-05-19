"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Setor, Situacao, TcleStatus } from "@/lib/domain/enums";

export type NovoPacienteAction = {
  plantao_id: string;
  nome: string;
  setor: Setor;
  leito?: string | null;
  situacao: Situacao;
  tcle_status: TcleStatus;
  descricao?: string | null;
  comentarios?: string | null;
};

export async function adicionarPaciente(input: NovoPacienteAction) {
  const supabase = createClient();
  const { data: paciente, error } = await supabase
    .from("pacientes")
    .insert({
      plantao_id: input.plantao_id,
      nome: input.nome,
      setor: input.setor,
      leito: input.leito ?? null,
      situacao: input.situacao,
      tcle_status: input.tcle_status,
      descricao: input.descricao ?? null,
      comentarios: input.comentarios ?? null,
    })
    .select("id, setor, leito, situacao, tcle_status, descricao, comentarios")
    .single();
  if (error || !paciente) throw error ?? new Error("Falha ao criar paciente");

  // ordem = max+1 do plantão (best-effort)
  const { data: maxRow } = await supabase
    .from("mapa_entries")
    .select("ordem")
    .eq("plantao_id", input.plantao_id)
    .order("ordem", { ascending: false })
    .limit(1);
  const ordem = (maxRow?.[0]?.ordem ?? -1) + 1;

  const { error: meErr } = await supabase.from("mapa_entries").insert({
    plantao_id: input.plantao_id,
    paciente_id: paciente.id,
    setor: paciente.setor,
    leito: paciente.leito,
    situacao: paciente.situacao,
    tcle_status: paciente.tcle_status,
    descricao: paciente.descricao,
    comentarios: paciente.comentarios,
    ordem,
  });
  if (meErr) throw meErr;

  revalidatePath(`/plantoes/${input.plantao_id}`);
  return paciente.id;
}

export async function bulkSeed(
  plantaoId: string,
  pacientes: Array<{
    nome: string;
    setor: Setor;
    leito?: string | null;
    situacao: Situacao;
    tcle_status: TcleStatus;
    descricao?: string | null;
    comentarios?: string | null;
  }>,
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("bulk_seed_plantao", {
    p_plantao_id: plantaoId,
    p_pacientes: pacientes,
  });
  if (error) throw error;
  revalidatePath(`/plantoes/${plantaoId}`);
  return data;
}
