import { createClient } from "@/lib/supabase/server";

export type GoseLembrete = {
  paciente_id: string;
  paciente_nome: string;
  /** Data base do cálculo — primeiro plantão em que o paciente apareceu (≈ admissão). */
  data_admissao: string; // ISO date (yyyy-MM-dd)
  janela: 30 | 90 | 180;
  data_alvo: string; // ISO date — quando o GOS-E vence
  dias_atraso: number; // 0 = hoje; positivo = atrasado; negativo = ainda não venceu
  telefones: string[]; // até 3
  ultima_tentativa: { tentado_em: string; observacao: string | null } | null;
  /** Quantas vezes já foi tentado (incluindo a última). */
  tentativas_count: number;
};

const JANELAS: Array<GoseLembrete["janela"]> = [30, 90, 180];

const TIPO_POR_JANELA: Record<number, string> = {
  30: "gose_30d",
  90: "gose_90d",
  180: "gose_180d",
};

function addDays(dateIso: string, days: number): string {
  const d = new Date(dateIso + (dateIso.length === 10 ? "T12:00:00" : ""));
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function diasEntre(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / (24 * 60 * 60 * 1000));
}

/**
 * Lembretes GOS-E pendentes. Janela conta a partir do PRIMEIRO PLANTÃO
 * em que o paciente apareceu (= data de admissão na prática). NÃO depende
 * de nenhum form REDCap estar preenchido — só do paciente existir no mapa.
 *
 * Lembrete aparece se:
 *  - paciente não está em EXCLUSAO
 *  - janela 30/90/180 já venceu (passou da admissão + Nd)
 *  - coleta gose_Nd não está COMPLETE
 *
 * Telefones (se houver) vem das coletas dados_demograficos/alta — opcional.
 */
export async function listGoseLembretes(): Promise<GoseLembrete[]> {
  const supabase = createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  // 1) Todos os pacientes não-excluídos
  const { data: pacientes, error: errPac } = await supabase
    .from("pacientes")
    .select("id, nome, situacao")
    .neq("situacao", "EXCLUSAO");
  if (errPac) throw errPac;
  const pacs = (pacientes ?? []) as Array<{
    id: string;
    nome: string;
    situacao: string;
  }>;
  if (pacs.length === 0) return [];

  const ids = pacs.map((p) => p.id);

  // 2) Pra cada paciente, descobre data do PRIMEIRO plantão (data ascendente).
  //    Faz uma query única juntando mapa_entries com plantoes.
  const { data: entries, error: errEnt } = await supabase
    .from("mapa_entries")
    .select("paciente_id, plantoes(data)")
    .in("paciente_id", ids);
  if (errEnt) throw errEnt;

  type Row = {
    paciente_id: string;
    plantoes: { data: string } | { data: string }[] | null;
  };
  const primeiroPlantao = new Map<string, string>(); // paciente_id → data
  for (const row of (entries ?? []) as Row[]) {
    const plant = Array.isArray(row.plantoes) ? row.plantoes[0] : row.plantoes;
    if (!plant?.data) continue;
    const atual = primeiroPlantao.get(row.paciente_id);
    if (!atual || plant.data < atual) {
      primeiroPlantao.set(row.paciente_id, plant.data);
    }
  }

  // 3) Coletas REDCap (só pra checar status do gose_Nd + pegar telefones).
  const { data: coletas } = await supabase
    .from("coletas_redcap")
    .select("paciente_id, tipo, dados, status")
    .in("paciente_id", ids)
    .in("tipo", [
      "dados_demograficos",
      "alta",
      "gose_30d",
      "gose_90d",
      "gose_180d",
    ]);
  type Coleta = {
    paciente_id: string;
    tipo: string;
    dados: Record<string, unknown>;
    status: string;
  };
  const porPaciente = new Map<string, Coleta[]>();
  for (const c of (coletas ?? []) as Coleta[]) {
    const arr = porPaciente.get(c.paciente_id) ?? [];
    arr.push(c);
    porPaciente.set(c.paciente_id, arr);
  }

  // 4) Tentativas anteriores
  const { data: tents } = await supabase
    .from("gose_tentativas")
    .select("paciente_id, janela, tentado_em, observacao")
    .in("paciente_id", ids)
    .order("tentado_em", { ascending: false });
  type Tent = {
    paciente_id: string;
    janela: number;
    tentado_em: string;
    observacao: string | null;
  };
  const tentsAll = (tents ?? []) as Tent[];

  // 5) Compor lembretes.
  const lembretes: GoseLembrete[] = [];
  for (const p of pacs) {
    const dataAdmissao = primeiroPlantao.get(p.id);
    if (!dataAdmissao) continue; // paciente sem nenhum mapa_entry
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAdmissao)) continue;

    const lista = porPaciente.get(p.id) ?? [];
    // Telefones: alta (mais atualizado) > demográfico
    const alta = lista.find((c) => c.tipo === "alta");
    const demo = lista.find((c) => c.tipo === "dados_demograficos");
    const fonte = (alta?.dados ?? demo?.dados ?? {}) as Record<string, unknown>;
    const telefones = (["contato_1", "contato_2", "contato_3"] as const)
      .map((k) => fonte[k])
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);

    for (const janela of JANELAS) {
      const tipoColeta = TIPO_POR_JANELA[janela];
      const goseColeta = lista.find((c) => c.tipo === tipoColeta);
      if (goseColeta?.status === "COMPLETE") continue;

      const dataAlvo = addDays(dataAdmissao, janela);
      if (dataAlvo > hoje) continue; // ainda não venceu

      const diasAtraso = diasEntre(dataAlvo, hoje);
      const tentsDestaJanela = tentsAll.filter(
        (t) => t.paciente_id === p.id && t.janela === janela,
      );
      const ultima = tentsDestaJanela[0]
        ? {
            tentado_em: tentsDestaJanela[0].tentado_em,
            observacao: tentsDestaJanela[0].observacao,
          }
        : null;

      lembretes.push({
        paciente_id: p.id,
        paciente_nome: p.nome,
        data_admissao: dataAdmissao,
        janela,
        data_alvo: dataAlvo,
        dias_atraso: diasAtraso,
        telefones,
        ultima_tentativa: ultima,
        tentativas_count: tentsDestaJanela.length,
      });
    }
  }

  // Ordena: mais atrasado primeiro, depois janela menor.
  lembretes.sort((a, b) => {
    if (a.dias_atraso !== b.dias_atraso) return b.dias_atraso - a.dias_atraso;
    return a.janela - b.janela;
  });

  return lembretes;
}
