"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function registrarTentativaGose(input: {
  paciente_id: string;
  janela: 30 | 90 | 180;
  observacao?: string | null;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase.from("gose_tentativas").insert({
    paciente_id: input.paciente_id,
    janela: input.janela,
    tentado_por: user.id,
    observacao: input.observacao ?? null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/plantoes");
  revalidatePath("/pacientes");
}
