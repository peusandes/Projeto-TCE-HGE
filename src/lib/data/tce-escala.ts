import { createClient } from "@/lib/supabase/server";
import type { TceLocal, TceColetaStatus } from "@/lib/lanc/enums";

/**
 * Leituras da ESCALA do Projeto TCE (quem vai coletar em cada dia/hospital).
 * NÃO confundir com coletas_redcap (o dado de pesquisa em si), que é intocada.
 */

export type EscaladoRef = { id: string; nome: string };
export type ColetaComEscala = {
  id: string;
  data: string;
  capacidade_max: number;
  status: TceColetaStatus;
  escalados: EscaladoRef[];
};

function nomeDe(nested: unknown, fallback: string | null): string {
  const o = Array.isArray(nested) ? nested[0] : nested;
  const nome = (o as { nome?: string } | null)?.nome;
  return nome ?? fallback ?? "—";
}

export async function listColetasComEscala(local: TceLocal): Promise<ColetaComEscala[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tce_coletas")
    .select("id, data, capacidade_max, status, tce_escalas ( id, display_name, pesquisadores ( nome ) )")
    .eq("local", local)
    .order("data", { ascending: true });
  if (error) throw new Error(`listColetasComEscala: ${error.message}`);

  return (data ?? []).map((c) => {
    const escalasRaw = (c.tce_escalas ?? []) as Array<Record<string, unknown>>;
    const escalados: EscaladoRef[] = escalasRaw
      .map((e) => ({ id: e.id as string, nome: nomeDe(e.pesquisadores, (e.display_name as string | null) ?? null) }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    return {
      id: c.id as string,
      data: c.data as string,
      capacidade_max: (c.capacidade_max as number) ?? 0,
      status: c.status as TceColetaStatus,
      escalados,
    };
  });
}

export type FreqEscala = { nome: string; data: string };

export async function listEscalasParaFrequencia(): Promise<FreqEscala[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tce_escalas")
    .select("display_name, pesquisadores ( nome ), tce_coletas ( data )");
  if (error) throw new Error(`listEscalasParaFrequencia: ${error.message}`);

  return (data ?? [])
    .map((e) => {
      const coleta = Array.isArray(e.tce_coletas) ? e.tce_coletas[0] : e.tce_coletas;
      const dataColeta = (coleta as { data?: string } | null)?.data;
      if (!dataColeta) return null;
      return { nome: nomeDe(e.pesquisadores, (e.display_name as string | null) ?? null), data: dataColeta };
    })
    .filter((r): r is FreqEscala => r !== null);
}
