"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DiretoriaValue, CargoEspecialValue, RoleValue } from "@/lib/lanc/cargos";

const INVITE_REDIRECT = "https://projetotce.com/auth/callback?next=/auth/setup-account";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const { data: pesq } = await supabase
    .from("pesquisadores")
    .select("is_admin, role, email")
    .eq("id", user.id)
    .maybeSingle();
  if (!pesq?.is_admin && pesq?.role !== "ADMIN") throw new Error("Acesso restrito a administradores.");
  return { id: user.id, email: pesq?.email ?? user.email ?? "admin" };
}

/** Aprova um cadastro: convida o usuário (fluxo Supabase) e marca APPROVED. */
export async function aprovarSignup(id: string): Promise<void> {
  const me = await requireAdmin();
  const supabase = createClient();
  const { data: sr } = await supabase
    .from("signup_requests")
    .select("email, nome")
    .eq("id", id)
    .maybeSingle();
  if (!sr) throw new Error("Solicitação não encontrada.");

  const admin = createAdminClient();
  const { error: invErr } = await admin.auth.admin.inviteUserByEmail(sr.email as string, {
    redirectTo: INVITE_REDIRECT,
    data: sr.nome ? { nome: sr.nome } : undefined,
  });
  if (invErr && !/already.*registered|exists/i.test(invErr.message)) {
    throw new Error(invErr.message);
  }

  await supabase
    .from("signup_requests")
    .update({ status: "APPROVED", revisado_por: me.email, revisado_em: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/membros");
}

export async function rejeitarSignup(id: string): Promise<void> {
  const me = await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase
    .from("signup_requests")
    .update({ status: "REJECTED", revisado_por: me.email, revisado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/membros");
}

export async function alterarRole(pesquisadorId: string, role: RoleValue): Promise<void> {
  const me = await requireAdmin();
  if (pesquisadorId === me.id && role !== "ADMIN") {
    throw new Error("Você não pode rebaixar o seu próprio acesso de admin.");
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("pesquisadores")
    .update({ role, is_admin: role === "ADMIN" })
    .eq("id", pesquisadorId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/membros");
}

export async function alterarCargo(
  pesquisadorId: string,
  cargo: {
    diretoria: DiretoriaValue | null;
    isDiretor: boolean;
    isSecretario: boolean;
    cargoEspecial: CargoEspecialValue | null;
  },
): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("pesquisadores")
    .update({
      diretoria: cargo.diretoria,
      is_diretor: cargo.isDiretor,
      is_secretario: cargo.isSecretario,
      cargo_especial: cargo.cargoEspecial,
    })
    .eq("id", pesquisadorId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/membros");
}
