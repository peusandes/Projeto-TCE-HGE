import { createClient } from "@/lib/supabase/server";
import type {
  FormData,
  FormStatus,
  InstrumentId,
} from "@/lib/redcap-schema/types";

export type ColetaRedcapRow = {
  instrument: InstrumentId;
  seq: number;
  data: FormData;
  status: FormStatus;
  atualizado_em: string;
};

export async function listColetasDoPaciente(pacienteId: string): Promise<ColetaRedcapRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coletas_redcap")
    .select("tipo, seq, dados, status, atualizado_em")
    .eq("paciente_id", pacienteId)
    .order("tipo", { ascending: true })
    .order("seq", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    instrument: row.tipo as InstrumentId,
    seq: (row.seq ?? 1) as number,
    data: (row.dados ?? {}) as FormData,
    status: (row.status ?? "INCOMPLETE") as FormStatus,
    atualizado_em: row.atualizado_em,
  }));
}
