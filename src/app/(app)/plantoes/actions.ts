"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
