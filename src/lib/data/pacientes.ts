import { createClient } from "@/lib/supabase/server";
import type { Paciente, MapaEntry, Anexo } from "@/lib/domain/types";

export async function getPaciente(id: string): Promise<Paciente | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTimelineDoPaciente(
  pacienteId: string,
): Promise<Array<MapaEntry & { plantao_data: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mapa_entries")
    .select("*, plantoes(data)")
    .eq("paciente_id", pacienteId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...(row as MapaEntry),
    plantao_data: (row as { plantoes: { data: string } | null }).plantoes?.data ?? "",
  }));
}

export async function getAnexosDoPaciente(pacienteId: string): Promise<Anexo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("anexos")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("enviado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Anexo[];
}

export type GroupedPacientes = {
  pendentesAlta: Paciente[];
  admissao: Paciente[];
  seguimento: Paciente[];
  excluidos: Paciente[];
  altaNoMapa: Paciente[];
  /** Pacientes com situacao=ALTA que NÃO estão mais no mapa do plantão atual. */
  altaForaDoMapa: Paciente[];
  historico: Paciente[];
  latestPlantaoData: string | null;
};

/**
 * Lista todos os pacientes da coleta, agrupados pelo seu status atual
 * em relação ao plantão mais recente:
 *
 * Em atendimento (foco clínico — no mapa do último plantão):
 *   - admissao: situacao = ADM
 *   - seguimento: situacao = SEG
 * - excluidos: no mapa do último plantão E situacao = EXCLUSAO
 * - altaNoMapa: no mapa do último plantão E situacao = ALTA
 * - historico: não está no mapa do último plantão
 */
export async function listAllPacientesAgrupados(): Promise<GroupedPacientes> {
  const supabase = createClient();

  // 1) Plantão mais recente
  const { data: latest } = await supabase
    .from("plantoes")
    .select("id, data")
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2) IDs de pacientes no mapa do último plantão
  let inMapaIds = new Set<string>();
  if (latest) {
    const { data: mapaRows } = await supabase
      .from("mapa_entries")
      .select("paciente_id")
      .eq("plantao_id", latest.id);
    inMapaIds = new Set((mapaRows ?? []).map((r) => r.paciente_id));
  }

  // 3) Todos os pacientes, ordenados por atividade recente
  const { data: pacientes, error } = await supabase
    .from("pacientes")
    .select("*")
    .order("atualizado_em", { ascending: false });
  if (error) throw error;

  const pendentesAlta: Paciente[] = [];
  const admissao: Paciente[] = [];
  const seguimento: Paciente[] = [];
  const excluidos: Paciente[] = [];
  const altaNoMapa: Paciente[] = [];
  const altaForaDoMapa: Paciente[] = [];
  const historico: Paciente[] = [];

  for (const p of (pacientes ?? []) as Paciente[]) {
    const inMapa = inMapaIds.has(p.id);
    if (!inMapa) {
      // Fora do mapa do último plantão: separa ALTA do resto do histórico.
      if (p.situacao === "ALTA") altaForaDoMapa.push(p);
      else historico.push(p);
      continue;
    }
    // PENDENTE_HGE tem prioridade sobre situacao — o pesquisador precisa
    // resolver isso antes de qualquer outra decisão clínica.
    if (p.verificacao_alta === "PENDENTE_HGE") {
      pendentesAlta.push(p);
      continue;
    }
    if (p.situacao === "EXCLUSAO") excluidos.push(p);
    else if (p.situacao === "ALTA") altaNoMapa.push(p);
    else if (p.situacao === "ADM") admissao.push(p);
    else seguimento.push(p);
  }

  return {
    pendentesAlta,
    admissao,
    seguimento,
    excluidos,
    altaNoMapa,
    altaForaDoMapa,
    historico,
    latestPlantaoData: latest?.data ?? null,
  };
}
