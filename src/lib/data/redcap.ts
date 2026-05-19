import { createClient } from "@/lib/supabase/server";
import type {
  FormData,
  FormStatus,
  InstrumentId,
} from "@/lib/redcap-schema/types";

export type ColetaRedcapRow = {
  instrument: InstrumentId;
  data: FormData;
  status: FormStatus;
  atualizado_em: string;
};

export async function listColetasDoPaciente(pacienteId: string): Promise<ColetaRedcapRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coletas_redcap")
    .select("tipo, dados, status, atualizado_em")
    .eq("paciente_id", pacienteId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    instrument: row.tipo as InstrumentId,
    data: (row.dados ?? {}) as FormData,
    status: (row.status ?? "INCOMPLETE") as FormStatus,
    atualizado_em: row.atualizado_em,
  }));
}
