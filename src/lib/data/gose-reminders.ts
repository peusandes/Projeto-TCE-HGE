import { createClient } from "@/lib/supabase/server";

export type GoseLembrete = {
  paciente_id: string;
  paciente_nome: string;
  data_trauma: string; // ISO date (yyyy-MM-dd)
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
 * Retorna a lista de lembretes GOS-E pendentes (janelas que já venceram e que
 * o paciente ainda NÃO completou o instrumento gose_Nd). Inclui pacientes
 * em qualquer situação — alta, óbito não conta porque alta+óbito não tem
 * GOSE (presumivelmente). Filtra só os que têm hora_trauma preenchida.
 */
export async function listGoseLembretes(): Promise<GoseLembrete[]> {
  const supabase = createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  // 1) Pacientes com hora_trauma e contatos.
  // Faz join via consultas em paralelo pra evitar N+1 no fetch.
  const { data: coletas, error: errColetas } = await supabase
    .from("coletas_redcap")
    .select("paciente_id, tipo, dados, status")
    .in("tipo", [
      "historia_admissao",
      "dados_demograficos",
      "gose_30d",
      "gose_90d",
      "gose_180d",
      "alta",
    ]);
  if (errColetas) throw errColetas;

  type Coleta = {
    paciente_id: string;
    tipo: string;
    dados: Record<string, unknown>;
    status: string;
  };
  const todas = (coletas ?? []) as Coleta[];

  // Indexa por paciente
  const porPaciente = new Map<string, Coleta[]>();
  for (const c of todas) {
    const arr = porPaciente.get(c.paciente_id) ?? [];
    arr.push(c);
    porPaciente.set(c.paciente_id, arr);
  }

  if (porPaciente.size === 0) return [];

  // 2) Buscar nomes dos pacientes envolvidos.
  const ids = [...porPaciente.keys()];
  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, nome, situacao")
    .in("id", ids);
  const nomePorId = new Map<string, { nome: string; situacao: string }>(
    (pacientes ?? []).map((p) => [
      p.id as string,
      { nome: p.nome as string, situacao: p.situacao as string },
    ]),
  );

  // 3) Buscar tentativas anteriores.
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

  // 4) Compor lembretes.
  const lembretes: GoseLembrete[] = [];
  for (const [pid, lista] of porPaciente.entries()) {
    const info = nomePorId.get(pid);
    if (!info) continue;
    // Excluídos/óbito não recebem ligação. EXCLUSAO já cobre auto-removidos.
    if (info.situacao === "EXCLUSAO") continue;

    const historia = lista.find((c) => c.tipo === "historia_admissao");
    const traumaRaw = historia?.dados?.hora_trauma as string | undefined;
    if (!traumaRaw) continue;
    // hora_trauma é datetime; extrai só a data.
    const dataTrauma = traumaRaw.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataTrauma)) continue;

    // Telefones — preferência: alta (mais atualizado), fallback dados_demograficos.
    const alta = lista.find((c) => c.tipo === "alta");
    const demo = lista.find((c) => c.tipo === "dados_demograficos");
    const fonte = (alta?.dados ?? demo?.dados ?? {}) as Record<string, unknown>;
    const telefones = (["contato_1", "contato_2", "contato_3"] as const)
      .map((k) => fonte[k])
      .filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      );

    for (const janela of JANELAS) {
      const tipoColeta = TIPO_POR_JANELA[janela];
      const goseColeta = lista.find((c) => c.tipo === tipoColeta);
      if (goseColeta?.status === "COMPLETE") continue;

      const dataAlvo = addDays(dataTrauma, janela);
      if (dataAlvo > hoje) continue; // ainda não venceu

      const diasAtraso = diasEntre(dataAlvo, hoje);
      const tentsDestaJanela = tentsAll.filter(
        (t) => t.paciente_id === pid && t.janela === janela,
      );
      const ultima = tentsDestaJanela[0]
        ? {
            tentado_em: tentsDestaJanela[0].tentado_em,
            observacao: tentsDestaJanela[0].observacao,
          }
        : null;

      lembretes.push({
        paciente_id: pid,
        paciente_nome: info.nome,
        data_trauma: dataTrauma,
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
