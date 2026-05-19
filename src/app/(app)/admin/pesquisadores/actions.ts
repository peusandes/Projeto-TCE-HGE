"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// URL pública do app em produção. O link de convite SEMPRE aponta pra cá,
// independente de onde o admin disparou o invite (local ou prod), pra que
// o pesquisador convidado consiga clicar de qualquer lugar.
const PRODUCTION_URL = "https://projetotce.com";
const INVITE_REDIRECT = `${PRODUCTION_URL}/auth/callback?next=/auth/setup-account`;

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const { data: pesq } = await supabase
    .from("pesquisadores")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!pesq?.is_admin) throw new Error("Acesso negado: ação restrita a administradores.");
  return user;
}

export async function convidarPesquisador(input: { email: string; nome?: string }) {
  await requireAdmin();
  const email = input.email?.trim().toLowerCase();
  if (!email) throw new Error("Email é obrigatório.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email inválido.");
  }

  const admin = createAdminClient();

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: INVITE_REDIRECT,
    data: input.nome ? { nome: input.nome } : undefined,
  });
  if (error) {
    if (/already.*registered|exists/i.test(error.message)) {
      throw new Error("Esse email já está cadastrado.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/pesquisadores");
  return { ok: true, email };
}

export async function alternarAdmin(pesquisadorId: string, isAdmin: boolean) {
  const me = await requireAdmin();
  if (pesquisadorId === me.id && !isAdmin) {
    throw new Error("Você não pode remover seu próprio acesso de admin.");
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("pesquisadores")
    .update({ is_admin: isAdmin })
    .eq("id", pesquisadorId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pesquisadores");
}

export async function removerPesquisador(pesquisadorId: string) {
  const me = await requireAdmin();
  if (pesquisadorId === me.id) {
    throw new Error("Você não pode remover sua própria conta.");
  }
  const admin = createAdminClient();
  // Apaga do auth — cascade derruba o pesquisador via FK
  const { error } = await admin.auth.admin.deleteUser(pesquisadorId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pesquisadores");
}

export async function reenviarConvite(email: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: INVITE_REDIRECT,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pesquisadores");
}
