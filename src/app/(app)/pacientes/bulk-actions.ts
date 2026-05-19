"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TcleStatus } from "@/lib/domain/enums";

/**
 * Atualiza tcle_status em massa pra um array de paciente_ids.
 * Mirror em mapa_entries (snapshot do plantão atual) é best-effort.
 */
export async function bulkUpdateTcle(input: {
  paciente_ids: string[];
  tcle_status: TcleStatus;
}): Promise<{ updated: number }> {
  if (input.paciente_ids.length === 0) return { updated: 0 };
  const sb = createClient();

  const { error: errPac, count } = await sb
    .from("pacientes")
    .update({ tcle_status: input.tcle_status }, { count: "exact" })
    .in("id", input.paciente_ids);
  if (errPac) throw new Error(errPac.message);

  // Espelha no mapa_entries (não-bloqueante)
  await sb
    .from("mapa_entries")
    .update({ tcle_status: input.tcle_status })
    .in("paciente_id", input.paciente_ids);

  revalidatePath("/pacientes");
  revalidatePath("/plantoes");
  return { updated: count ?? input.paciente_ids.length };
}
