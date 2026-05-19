"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Paciente } from "@/lib/domain/types";
import type {
  FormData as RedcapFormData,
  FormStatus,
  InstrumentId,
} from "@/lib/redcap-schema/types";

export async function atualizarPaciente(
  id: string,
  patch: Partial<
    Pick<
      Paciente,
      | "nome"
      | "setor"
      | "leito"
      | "situacao"
      | "tcle_status"
      | "descricao"
      | "comentarios"
      | "motivo_exclusao"
      | "redcap_id"
      | "verificacao_alta"
    >
  >,
) {
  const supabase = createClient();
  const { data: paciente, error } = await supabase
    .from("pacientes")
    .update(patch)
    .eq("id", id)
    .select("plantao_id")
    .single();
  if (error || !paciente) throw error ?? new Error("Falha ao atualizar");

  // Espelha snapshot atual em mapa_entries do plantão de origem (best-effort)
  await supabase
    .from("mapa_entries")
    .update({
      setor: patch.setor,
      leito: patch.leito,
      situacao: patch.situacao,
      tcle_status: patch.tcle_status,
      descricao: patch.descricao,
      comentarios: patch.comentarios,
      verificacao_alta: patch.verificacao_alta,
    })
    .eq("paciente_id", id)
    .eq("plantao_id", paciente.plantao_id);

  revalidatePath(`/pacientes/${id}`);
  revalidatePath(`/plantoes/${paciente.plantao_id}`);
}

/**
 * Salva (upsert) uma coleta de instrumento REDCap para um paciente.
 * Usa o índice único (paciente_id, tipo) — uma coleta por instrumento por paciente.
 */
export async function salvarColetaRedcap(input: {
  paciente_id: string;
  plantao_id: string;
  instrument: InstrumentId;
  data: RedcapFormData;
  status: FormStatus;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("coletas_redcap")
    .upsert(
      {
        paciente_id: input.paciente_id,
        plantao_id: input.plantao_id,
        tipo: input.instrument,
        dados: input.data,
        status: input.status,
        coletado_por: user?.id ?? null,
      },
      { onConflict: "paciente_id,tipo" },
    );
  if (error) throw new Error(error.message);

  revalidatePath(`/pacientes/${input.paciente_id}`);
}

/**
 * Invalidação leve do cache RSC depois que o sync escreve no Supabase
 * direto (sem passar por server action). Chama no client após cada save
 * pra que a navegação de volta pra /pacientes ou /plantoes/[id] mostre
 * o estado novo sem refresh manual.
 */
export async function revalidarPacienteRoutes(plantaoId: string, pacienteId: string) {
  revalidatePath("/pacientes");
  revalidatePath("/plantoes");
  revalidatePath(`/plantoes/${plantaoId}`);
  revalidatePath(`/pacientes/${pacienteId}`);
}

export async function deletarPaciente(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pacientes")
    .select("plantao_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  await supabase.from("pacientes").delete().eq("id", id);
  if (data?.plantao_id) revalidatePath(`/plantoes/${data.plantao_id}`);
}
