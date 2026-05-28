import { createClient } from "@/lib/supabase/server";
import type { Paciente, MapaEntry, Anexo } from "@/lib/domain/types";
import type { ResponsavelInfo } from "@/components/plantao/ResponsavelAvatar";

export type PacienteComResponsavel = Paciente & {
  responsavel_atual?: ResponsavelInfo | null;
};

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

export type ReservaInfo = {
  mapaEntryId: string;
  responsavel: ResponsavelInfo | null;
  concluido: boolean;
  plantaoFinalizado: boolean;
};

/**
 * Busca a mapa_entry do paciente no plantão atual (mais recente) + dados
 * do responsável vigente. Retorna null se não há plantão atual ou se o
 * paciente não está no mapa.
 */
export async function getReservaDoPaciente(
  paciente_id: string,
  plantao_id: string,
): Promise<ReservaInfo | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mapa_entries")
    .select(
      `id, plantao_id, concluido_em, responsavel:responsavel_id(id, nome, avatar_url), plantoes(finalizado)`,
    )
    .eq("paciente_id", paciente_id)
    .eq("plantao_id", plantao_id)
    .maybeSingle();
  if (error || !data) return null;
  const resp = Array.isArray(data.responsavel)
    ? data.responsavel[0]
    : data.responsavel;
  const plant = Array.isArray(data.plantoes) ? data.plantoes[0] : data.plantoes;
  return {
    mapaEntryId: data.id as string,
    responsavel:
      resp && resp.id
        ? {
            id: resp.id as string,
            nome: (resp.nome as string) ?? "",
            avatar_url: (resp.avatar_url as string | null) ?? null,
          }
        : null,
    concluido: data.concluido_em != null,
    plantaoFinalizado: Boolean(plant?.finalizado),
  };
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
  pendentesAlta: PacienteComResponsavel[];
  admissao: PacienteComResponsavel[];
  seguimento: PacienteComResponsavel[];
  excluidos: PacienteComResponsavel[];
  altaNoMapa: PacienteComResponsavel[];
  /** Pacientes com situacao=ALTA que NÃO estão mais no mapa do plantão atual. */
  altaForaDoMapa: PacienteComResponsavel[];
  historico: PacienteComResponsavel[];
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

  // 2) IDs de pacientes no mapa do último plantão + responsável vigente
  //    de cada um (puxa só os com responsavel_id, evita N+1).
  const inMapaIds = new Set<string>();
  const responsavelPorPaciente = new Map<string, ResponsavelInfo>();
  if (latest) {
    const { data: mapaRows } = await supabase
      .from("mapa_entries")
      .select(
        `paciente_id, responsavel:responsavel_id(id, nome, avatar_url)`,
      )
      .eq("plantao_id", latest.id);
    for (const r of mapaRows ?? []) {
      inMapaIds.add(r.paciente_id as string);
      const resp = Array.isArray(r.responsavel) ? r.responsavel[0] : r.responsavel;
      if (resp && resp.id) {
        responsavelPorPaciente.set(r.paciente_id as string, {
          id: resp.id as string,
          nome: (resp.nome as string) ?? "",
          avatar_url: (resp.avatar_url as string | null) ?? null,
        });
      }
    }
  }

  // 3) Todos os pacientes, ordenados por atividade recente
  const { data: pacientes, error } = await supabase
    .from("pacientes")
    .select("*")
    .order("atualizado_em", { ascending: false });
  if (error) throw error;

  const pendentesAlta: PacienteComResponsavel[] = [];
  const admissao: PacienteComResponsavel[] = [];
  const seguimento: PacienteComResponsavel[] = [];
  const excluidos: PacienteComResponsavel[] = [];
  const altaNoMapa: PacienteComResponsavel[] = [];
  const altaForaDoMapa: PacienteComResponsavel[] = [];
  const historico: PacienteComResponsavel[] = [];

  for (const p of (pacientes ?? []) as Paciente[]) {
    const inMapa = inMapaIds.has(p.id);
    const pComResp: PacienteComResponsavel = {
      ...p,
      responsavel_atual: responsavelPorPaciente.get(p.id) ?? null,
    };
    if (!inMapa) {
      // Fora do mapa do último plantão: separa ALTA do resto do histórico.
      if (p.situacao === "ALTA") altaForaDoMapa.push(pComResp);
      else historico.push(pComResp);
      continue;
    }
    // PENDENTE_HGE tem prioridade sobre situacao — o pesquisador precisa
    // resolver isso antes de qualquer outra decisão clínica.
    if (p.verificacao_alta === "PENDENTE_HGE") {
      pendentesAlta.push(pComResp);
      continue;
    }
    if (p.situacao === "EXCLUSAO") excluidos.push(pComResp);
    else if (p.situacao === "ALTA") altaNoMapa.push(pComResp);
    else if (p.situacao === "ADM") admissao.push(pComResp);
    else seguimento.push(pComResp);
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
