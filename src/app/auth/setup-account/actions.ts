"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completarSetup(input: { nome: string; senha: string }) {
  const nome = input.nome?.trim() ?? "";
  const senha = input.senha ?? "";
  if (nome.split(/\s+/).length < 2) throw new Error("Nome completo é obrigatório.");
  if (senha.length < 8) throw new Error("Senha deve ter pelo menos 8 caracteres.");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  // 1) Atualiza senha + metadata do auth.users.
  // Se a senha for igual à atual, o Supabase rejeita — tratamos como sucesso silencioso.
  const { error: authErr } = await supabase.auth.updateUser({
    password: senha,
    data: { nome },
  });
  if (authErr) {
    const samePassword = /should be different from the old password/i.test(authErr.message);
    if (!samePassword) throw new Error(authErr.message);
    // senha é a mesma — só atualiza o nome no metadata
    const { error: metaErr } = await supabase.auth.updateUser({ data: { nome } });
    if (metaErr) throw new Error(metaErr.message);
  }

  // 2) Atualiza pesquisador (RLS permite porque é o próprio usuário autenticado)
  const { error: dbErr } = await supabase
    .from("pesquisadores")
    .update({ nome, setup_complete: true })
    .eq("id", user.id);
  if (dbErr) throw new Error(dbErr.message);

  revalidatePath("/", "layout");
}
