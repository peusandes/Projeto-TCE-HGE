"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPesquisadorContext } from "@/lib/data/pesquisador-context";

async function requireAdmin() {
  const ctx = await getPesquisadorContext();
  if (!ctx?.isAdmin) throw new Error("Acesso restrito a administradores.");
  return ctx;
}

export async function salvarSetting(key: string, value: string): Promise<void> {
  const ctx = await requireAdmin();
  const k = key.trim();
  if (!k) throw new Error("Chave obrigatória.");
  const supabase = createClient();
  const { error } = await supabase.from("settings").upsert(
    { key: k, value, atualizado_por: ctx.email, atualizado_em: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
}
