import { createClient } from "@/lib/supabase/server";

export type PesquisadorRow = {
  id: string;
  nome: string;
  email: string;
  is_admin: boolean;
  setup_complete: boolean;
  avatar_url: string | null;
  criado_em: string;
};

export type CurrentPesquisador = {
  id: string;
  email: string;
  nome: string;
  is_admin: boolean;
  setup_complete: boolean;
  avatar_url: string | null;
};

export async function listPesquisadores(): Promise<PesquisadorRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pesquisadores")
    .select("id, nome, email, is_admin, setup_complete, avatar_url, criado_em")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PesquisadorRow[];
}

export async function getCurrentPesquisador(): Promise<CurrentPesquisador | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("pesquisadores")
    .select("id, nome, email, is_admin, setup_complete, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return data as CurrentPesquisador;
}
