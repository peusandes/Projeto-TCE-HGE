"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function atualizarPerfil(input: {
  nome?: string;
  avatar_url?: string | null;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const patch: Record<string, unknown> = {};
  if (typeof input.nome === "string") {
    const nome = input.nome.trim();
    if (nome.split(/\s+/).length < 2) throw new Error("Nome completo: inclua nome e sobrenome.");
    patch.nome = nome;
  }
  if (input.avatar_url !== undefined) {
    patch.avatar_url = input.avatar_url;
  }
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("pesquisadores").update(patch).eq("id", user.id);
  if (error) throw new Error(error.message);

  // Mantém metadata do auth.user sincronizado (pra fallback de nome em tela)
  if (patch.nome) {
    await supabase.auth.updateUser({ data: { nome: patch.nome } });
  }

  revalidatePath("/", "layout");
}

export async function alterarSenha(input: {
  senha_atual: string;
  nova_senha: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error("Não autenticado");

  if (input.nova_senha.length < 8) {
    throw new Error("Nova senha deve ter pelo menos 8 caracteres.");
  }

  // Verifica senha atual
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.senha_atual,
  });
  if (signErr) throw new Error("Senha atual incorreta.");

  // Troca senha
  const { error: updErr } = await supabase.auth.updateUser({ password: input.nova_senha });
  if (updErr) throw new Error(updErr.message);

  revalidatePath("/perfil");
}
