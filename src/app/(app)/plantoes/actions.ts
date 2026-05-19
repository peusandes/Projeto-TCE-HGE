"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function criarPlantao(input: {
  data: string;
  pesquisadores: string[];
  observacoes?: string;
  clonar_anterior: boolean;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: novoPlantao, error } = await supabase
    .from("plantoes")
    .insert({
      data: input.data,
      pesquisadores: input.pesquisadores,
      observacoes: input.observacoes ?? null,
      criado_por: user.id,
    })
    .select("id")
    .single();

  if (error || !novoPlantao) throw error ?? new Error("Falha ao criar plantão");

  if (input.clonar_anterior) {
    const { data: anteriores } = await supabase
      .from("plantoes")
      .select("id")
      .lt("data", input.data)
      .order("data", { ascending: false })
      .limit(1);
    const anterior = anteriores?.[0];
    if (anterior) {
      await supabase.rpc("clonar_mapa_anterior", {
        p_plantao_origem: anterior.id,
        p_plantao_destino: novoPlantao.id,
      });
    }
  }

  revalidatePath("/plantoes");
  redirect(`/plantoes/${novoPlantao.id}`);
}

export async function finalizarPlantao(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("plantoes")
    .update({ finalizado: true, finalizado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/plantoes");
  revalidatePath(`/plantoes/${id}`);
}

/**
 * Exclui um plantão por completo (admin-only). Cascade no Postgres derruba
 * pacientes, mapa_entries, coletas_redcap e anexos. Antes do delete, limpa
 * os arquivos do bucket `anexos-tce` pra não deixar órfãos no Storage.
 */
export async function excluirPlantao(id: string) {
  await requireAdmin();
  const admin = createAdminClient();

  // 1. Pega todos os anexos do plantão pra limpar do Storage.
  const { data: anexos, error: listErr } = await admin
    .from("anexos")
    .select("storage_path")
    .eq("plantao_id", id);
  if (listErr) throw new Error(listErr.message);

  const paths = (anexos ?? []).map((a) => a.storage_path).filter(Boolean);
  if (paths.length > 0) {
    const { error: rmErr } = await admin.storage.from("anexos-tce").remove(paths);
    // Não aborta se falhar — arquivo órfão é menos grave que registro fantasma.
    if (rmErr) console.warn("[excluirPlantao] storage remove falhou:", rmErr.message);
  }

  // 2. Delete cascateia para pacientes/mapa_entries/coletas_redcap/anexos.
  const { error: delErr } = await admin.from("plantoes").delete().eq("id", id);
  if (delErr) throw new Error(delErr.message);

  revalidatePath("/plantoes");
  redirect("/plantoes");
}
