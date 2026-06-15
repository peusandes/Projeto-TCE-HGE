import { createClient } from "@/lib/supabase/server";

export type SettingRow = { key: string; value: string; atualizado_em: string };

export async function listSettings(): Promise<SettingRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("key, value, atualizado_em")
    .order("key", { ascending: true });
  if (error) throw new Error(`listSettings: ${error.message}`);
  return (data ?? []) as SettingRow[];
}

/** Lê uma configuração pontual (ex.: tce_suburbio_anchor_date). */
export async function getSetting(key: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as string | undefined) ?? null;
}
