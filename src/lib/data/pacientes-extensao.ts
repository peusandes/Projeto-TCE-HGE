import { createClient } from "@/lib/supabase/server";
import { format, startOfDay } from "date-fns";
import type { PacienteFluxo, PacienteStatusExt } from "@/lib/lanc/enums";

export type PacienteExtensaoRow = {
  id: string;
  nome: string;
  data_admissao: string;
  status_atual: PacienteStatusExt;
};

/**
 * Auto-transição lazy ADMISSAO → NO_MAPA quando data_admissao < hoje. Roda antes
 * de listar; idempotente (só mexe em quem ainda está em ADMISSAO com data
 * passada). Portado do lanc-app (lib/pacientes.ts) pro nosso Supabase.
 */
export async function applyAdmissaoToNoMapa(): Promise<number> {
  const supabase = createClient();
  const hoje = format(startOfDay(new Date()), "yyyy-MM-dd");

  const { data: cands } = await supabase
    .from("pacientes_extensao")
    .select("id")
    .eq("status_atual", "ADMISSAO")
    .lt("data_admissao", hoje);
  if (!cands || cands.length === 0) return 0;

  const ids = cands.map((c) => c.id as string);
  const { error: upErr } = await supabase
    .from("pacientes_extensao")
    .update({ status_atual: "NO_MAPA" })
    .in("id", ids);
  if (upErr) return 0; // não bloqueia a listagem se a auto-transição falhar

  await supabase.from("paciente_status_eventos").insert(
    ids.map((id) => ({
      paciente_id: id,
      status: "NO_MAPA",
      registrado_por: "system",
      observacoes: "Auto-transição: dia seguinte à admissão",
    })),
  );
  return ids.length;
}

export async function listPacientesExtensao(fluxo: PacienteFluxo): Promise<PacienteExtensaoRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pacientes_extensao")
    .select("id, nome, data_admissao, status_atual")
    .eq("fluxo", fluxo)
    .order("status_atual", { ascending: true })
    .order("data_admissao", { ascending: false });
  if (error) throw new Error(`listPacientesExtensao: ${error.message}`);
  return (data ?? []) as PacienteExtensaoRow[];
}
