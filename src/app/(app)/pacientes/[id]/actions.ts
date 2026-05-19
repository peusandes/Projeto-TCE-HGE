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
  seq: number;
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
        seq: input.seq,
        dados: input.data,
        status: input.status,
        coletado_por: user?.id ?? null,
      },
      { onConflict: "paciente_id,tipo,seq" },
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

/**
 * Cria uma nova instância vazia de coleta REDCap para o paciente. Usado pra
 * instrumentos multi-instance (seguimento: dia 1, dia 2, dia 3…).
 * Retorna o novo seq atribuído.
 */
export async function criarNovaColetaSeq(input: {
  paciente_id: string;
  plantao_id: string;
  instrument: InstrumentId;
}): Promise<{ seq: number }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pega o maior seq atual e adiciona 1.
  const { data: existentes, error: selErr } = await supabase
    .from("coletas_redcap")
    .select("seq")
    .eq("paciente_id", input.paciente_id)
    .eq("tipo", input.instrument)
    .order("seq", { ascending: false })
    .limit(1);
  if (selErr) throw new Error(selErr.message);

  const proximoSeq = (existentes?.[0]?.seq ?? 0) + 1;

  const { error } = await supabase.from("coletas_redcap").insert({
    paciente_id: input.paciente_id,
    plantao_id: input.plantao_id,
    tipo: input.instrument,
    seq: proximoSeq,
    dados: {},
    status: "INCOMPLETE",
    coletado_por: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/pacientes/${input.paciente_id}`);
  return { seq: proximoSeq };
}

export async function deletarPaciente(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pacientes")
    .select("plantao_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;

  // Antes de derrubar o paciente (cascade apaga registros de anexos),
  // limpa os arquivos do bucket pra não deixar órfãos.
  const { data: anexos } = await supabase
    .from("anexos")
    .select("storage_path")
    .eq("paciente_id", id);
  const paths = (anexos ?? []).map((a) => a.storage_path).filter(Boolean);
  if (paths.length > 0) {
    const { error: rmErr } = await supabase.storage
      .from("anexos-tce")
      .remove(paths);
    // Arquivo órfão é menos grave que paciente fantasma — só warn.
    if (rmErr) console.warn("[deletarPaciente] storage remove falhou:", rmErr.message);
  }

  await supabase.from("pacientes").delete().eq("id", id);
  if (data?.plantao_id) {
    revalidatePath(`/plantoes/${data.plantao_id}`);
    revalidatePath("/pacientes");
  }
}
