import { createClient } from "@/lib/supabase/client";
import type { MutationType } from "@/lib/db/dexie";
import type { Paciente } from "@/lib/domain/types";
import type {
  FormData as RedcapFormData,
  FormStatus,
  InstrumentId,
} from "@/lib/redcap-schema/types";

export type UpdatePacientePayload = {
  id: string;
  plantao_id: string;
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
  >;
};

export type UpsertColetaRedcapPayload = {
  paciente_id: string;
  plantao_id: string;
  instrument: InstrumentId;
  data: RedcapFormData;
  status: FormStatus;
};

/**
 * Mapeia cada tipo de mutação para uma função que a executa via Supabase JS.
 * Estes executores são usados tanto no caminho online quanto no drain da fila.
 */
type Executor<P> = (payload: P) => Promise<void>;

const updatePaciente: Executor<UpdatePacientePayload> = async ({
  id,
  plantao_id,
  patch,
}) => {
  const supabase = createClient();
  const { error: upErr } = await supabase.from("pacientes").update(patch).eq("id", id);
  if (upErr) throw new Error(upErr.message);

  // Espelha snapshot no mapa_entries (best-effort, mesma tabela RLS)
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
    .eq("plantao_id", plantao_id);
};

const upsertColetaRedcap: Executor<UpsertColetaRedcapPayload> = async (input) => {
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
};

export const EXECUTORS: Record<MutationType, Executor<unknown>> = {
  update_paciente: updatePaciente as Executor<unknown>,
  upsert_coleta_redcap: upsertColetaRedcap as Executor<unknown>,
};

/**
 * Detecta se um erro veio de problema de rede (offline / fetch falhou).
 * Diferencia de erros lógicos do Supabase (RLS, constraint, etc.) que devem
 * surfaçar pro usuário em vez de virem pra fila.
 */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Failed to fetch|Network|NetworkError|fetch failed|TypeError: Load failed/i.test(msg)
  );
}
