import { createClient } from "@/lib/supabase/server";
import type { Plantao } from "@/lib/domain/types";

export async function listPlantoes(): Promise<
  Array<Plantao & { paciente_count: number }>
> {
  const supabase = createClient();
  const { data: plantoes, error } = await supabase
    .from("plantoes")
    .select("*")
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false });
  if (error) throw error;
  if (!plantoes?.length) return [];

  const ids = plantoes.map((p) => p.id);
  const { data: counts } = await supabase
    .from("mapa_entries")
    .select("plantao_id")
    .in("plantao_id", ids);

  const counter = new Map<string, number>();
  for (const row of counts ?? []) {
    counter.set(row.plantao_id, (counter.get(row.plantao_id) ?? 0) + 1);
  }

  return plantoes.map((p) => ({ ...p, paciente_count: counter.get(p.id) ?? 0 }));
}

export async function getPlantao(id: string): Promise<Plantao | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("plantoes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMapaDoPlantao(plantaoId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mapa_entries")
    .select(
      `
      id, plantao_id, paciente_id, setor, leito, situacao, tcle_status,
      descricao, comentarios, verificacao_alta, ordem, responsavel_id,
      concluido_em,
      pacientes ( id, nome, redcap_id, motivo_exclusao ),
      responsavel:responsavel_id ( id, nome, avatar_url )
    `,
    )
    .eq("plantao_id", plantaoId)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getPlantaoAnterior(
  data: string,
): Promise<Plantao | null> {
  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from("plantoes")
    .select("*")
    .lt("data", data)
    .order("data", { ascending: false })
    .limit(1);
  if (error) throw error;
  return rows?.[0] ?? null;
}
