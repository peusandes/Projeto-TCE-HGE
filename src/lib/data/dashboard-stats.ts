import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  totalPacientes: number;
  porSituacao: { ADM: number; SEG: number; ALTA: number; EXCLUSAO: number };
  tcle: { ASSINADO: number; PENDENTE: number; RECUSADO: number; NA: number };
  possivelAlta: number;
  totalPlantoes: number;
  plantoesFinalizados: number;
  totalAnexos: number;
  coletas: {
    historia_admissao: number;
    seguimento: number;
    alta: number;
    gose_30d: number;
    gose_90d: number;
    gose_180d: number;
  };
  ultimosPlantoes: Array<{ data: string; total: number; finalizado: boolean }>;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();

  const [pacientes, plantoes, anexos, coletas] = await Promise.all([
    supabase.from("pacientes").select("situacao, tcle_status, verificacao_alta"),
    supabase
      .from("plantoes")
      .select("data, finalizado")
      .order("data", { ascending: false })
      .limit(30),
    supabase.from("anexos").select("id", { count: "exact", head: true }),
    supabase
      .from("coletas_redcap")
      .select("tipo, status, paciente_id"),
  ]);

  type P = { situacao: string; tcle_status: string; verificacao_alta: string | null };
  const pacs = (pacientes.data ?? []) as P[];

  const porSituacao = { ADM: 0, SEG: 0, ALTA: 0, EXCLUSAO: 0 };
  const tcle = { ASSINADO: 0, PENDENTE: 0, RECUSADO: 0, NA: 0 };
  let possivelAlta = 0;
  for (const p of pacs) {
    if (p.situacao in porSituacao)
      porSituacao[p.situacao as keyof typeof porSituacao] += 1;
    if (p.tcle_status in tcle) tcle[p.tcle_status as keyof typeof tcle] += 1;
    if (p.verificacao_alta === "PENDENTE_HGE") possivelAlta += 1;
  }

  type Coleta = { tipo: string; status: string; paciente_id: string };
  const cols = (coletas.data ?? []) as Coleta[];
  // Conta pacientes únicos com cada instrumento COMPLETO.
  const completosPorTipo = new Map<string, Set<string>>();
  for (const c of cols) {
    if (c.status !== "COMPLETE") continue;
    if (!completosPorTipo.has(c.tipo)) completosPorTipo.set(c.tipo, new Set());
    completosPorTipo.get(c.tipo)!.add(c.paciente_id);
  }
  const coletasCount = {
    historia_admissao: completosPorTipo.get("historia_admissao")?.size ?? 0,
    seguimento: completosPorTipo.get("seguimento")?.size ?? 0,
    alta: completosPorTipo.get("alta")?.size ?? 0,
    gose_30d: completosPorTipo.get("gose_30d")?.size ?? 0,
    gose_90d: completosPorTipo.get("gose_90d")?.size ?? 0,
    gose_180d: completosPorTipo.get("gose_180d")?.size ?? 0,
  };

  const plantoesRows = (plantoes.data ?? []) as Array<{ data: string; finalizado: boolean }>;
  const plantoesFinalizados = plantoesRows.filter((p) => p.finalizado).length;

  // Pra cada um dos últimos 7 plantões, conta pacientes
  const ultimos7 = plantoesRows.slice(0, 7);
  const ultimosPlantoes: DashboardStats["ultimosPlantoes"] = [];
  // Buscar contagens em lote
  if (ultimos7.length > 0) {
    const datas = ultimos7.map((p) => p.data);
    const { data: countsByData } = await supabase
      .from("plantoes")
      .select("id, data, mapa_entries(paciente_id)")
      .in("data", datas);
    const totalPorData = new Map<string, number>();
    for (const row of (countsByData ?? []) as Array<{
      data: string;
      mapa_entries: Array<{ paciente_id: string }>;
    }>) {
      const cur = totalPorData.get(row.data) ?? 0;
      totalPorData.set(row.data, cur + row.mapa_entries.length);
    }
    for (const p of ultimos7) {
      ultimosPlantoes.push({
        data: p.data,
        total: totalPorData.get(p.data) ?? 0,
        finalizado: p.finalizado,
      });
    }
  }

  return {
    totalPacientes: pacs.length,
    porSituacao,
    tcle,
    possivelAlta,
    totalPlantoes: plantoesRows.length,
    plantoesFinalizados,
    totalAnexos: anexos.count ?? 0,
    coletas: coletasCount,
    ultimosPlantoes,
  };
}
