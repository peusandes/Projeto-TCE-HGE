import { createClient } from "@/lib/supabase/server";

export type GoseStatus =
  | "atrasada" // data_alvo < hoje, sem coleta complete
  | "hoje" // data_alvo === hoje
  | "proxima" // vence em até 30 dias
  | "futura" // vence depois de 30 dias
  | "concluida"; // coleta gose_Nd está COMPLETE

export type GoseCalendarEvent = {
  paciente_id: string;
  paciente_nome: string;
  paciente_situacao: string;
  data_admissao: string; // ISO date — data do 1º plantão
  janela: 30 | 90 | 180;
  data_alvo: string; // ISO date — data da ligação
  status: GoseStatus;
  /** Dias relativos a hoje. Negativo = futuro, 0 = hoje, positivo = atrasado. */
  dias_relativo: number;
  telefones: string[];
  ultima_tentativa: {
    tentado_em: string;
    observacao: string | null;
  } | null;
  tentativas_count: number;
};

const JANELAS: Array<GoseCalendarEvent["janela"]> = [30, 90, 180];

const TIPO_POR_JANELA: Record<number, string> = {
  30: "gose_30d",
  90: "gose_90d",
  180: "gose_180d",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

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

function classify(
  dataAlvo: string,
  hoje: string,
  isComplete: boolean,
): { status: GoseStatus; dias: number } {
  const dias = diasEntre(dataAlvo, hoje);
  if (isComplete) return { status: "concluida", dias };
  if (dias === 0) return { status: "hoje", dias };
  if (dias > 0) return { status: "atrasada", dias };
  if (dias >= -30) return { status: "proxima", dias };
  return { status: "futura", dias };
}

/**
 * Retorna TODOS os eventos GOS-E (30/90/180d) pra todos pacientes não-EXCLUSAO,
 * com status calculado relativo a hoje. Inclui passados (atrasados, concluídos)
 * e futuros (próximos meses).
 *
 * Performance: 4 queries em paralelo, processamento em memória O(n*3). Pra
 * n=200 pacientes, gera ~600 eventos — leve.
 */
export async function listGoseCalendar(): Promise<GoseCalendarEvent[]> {
  const supabase = createClient();
  const hoje = todayISO();

  // 1) Pacientes ativos no estudo
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

  // 2) Primeiro plantão de cada paciente (= data de admissão na prática)
  const { data: entries, error: errEnt } = await supabase
    .from("mapa_entries")
    .select("paciente_id, plantoes(data)")
    .in("paciente_id", ids);
  if (errEnt) throw errEnt;
  type Row = {
    paciente_id: string;
    plantoes: { data: string } | { data: string }[] | null;
  };
  const primeiroPlantao = new Map<string, string>();
  for (const row of (entries ?? []) as Row[]) {
    const plant = Array.isArray(row.plantoes) ? row.plantoes[0] : row.plantoes;
    if (!plant?.data) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plant.data)) continue;
    const atual = primeiroPlantao.get(row.paciente_id);
    if (!atual || plant.data < atual) {
      primeiroPlantao.set(row.paciente_id, plant.data);
    }
  }

  // 3) Coletas relevantes (gose_Nd + fontes de telefone)
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

  // 4) Tentativas (todas)
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

  // 5) Compor eventos
  const eventos: GoseCalendarEvent[] = [];
  for (const p of pacs) {
    const dataAdmissao = primeiroPlantao.get(p.id);
    if (!dataAdmissao) continue;

    const lista = porPaciente.get(p.id) ?? [];
    const alta = lista.find((c) => c.tipo === "alta");
    const demo = lista.find((c) => c.tipo === "dados_demograficos");
    const fonte = (alta?.dados ?? demo?.dados ?? {}) as Record<string, unknown>;
    const telefones = (["contato_1", "contato_2", "contato_3"] as const)
      .map((k) => fonte[k])
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);

    for (const janela of JANELAS) {
      const tipoColeta = TIPO_POR_JANELA[janela];
      const goseColeta = lista.find((c) => c.tipo === tipoColeta);
      const isComplete = goseColeta?.status === "COMPLETE";

      const dataAlvo = addDays(dataAdmissao, janela);
      const { status, dias } = classify(dataAlvo, hoje, isComplete);

      const tentsDestaJanela = tentsAll.filter(
        (t) => t.paciente_id === p.id && t.janela === janela,
      );
      const ultima = tentsDestaJanela[0]
        ? {
            tentado_em: tentsDestaJanela[0].tentado_em,
            observacao: tentsDestaJanela[0].observacao,
          }
        : null;

      eventos.push({
        paciente_id: p.id,
        paciente_nome: p.nome,
        paciente_situacao: p.situacao,
        data_admissao: dataAdmissao,
        janela,
        data_alvo: dataAlvo,
        status,
        dias_relativo: dias,
        telefones,
        ultima_tentativa: ultima,
        tentativas_count: tentsDestaJanela.length,
      });
    }
  }

  // Ordena: atrasadas primeiro (maior atraso), depois hoje, depois futuras
  // (mais próximas primeiro), concluídas no fim.
  eventos.sort((a, b) => {
    const orderStatus = (s: GoseStatus): number => {
      if (s === "atrasada") return 0;
      if (s === "hoje") return 1;
      if (s === "proxima") return 2;
      if (s === "futura") return 3;
      return 4; // concluida
    };
    const oa = orderStatus(a.status);
    const ob = orderStatus(b.status);
    if (oa !== ob) return oa - ob;
    // Dentro do mesmo status: atrasadas em ordem decrescente de atraso,
    // futuras em ordem crescente de dias (mais próximas primeiro).
    if (a.status === "atrasada") return b.dias_relativo - a.dias_relativo;
    return a.data_alvo.localeCompare(b.data_alvo);
  });

  return eventos;
}
