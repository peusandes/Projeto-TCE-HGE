"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TCLE_STATUS, type TcleStatus } from "@/lib/domain/enums";

const MAX_BULK = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Atualiza tcle_status em massa pra um array de paciente_ids.
 * Mirror em mapa_entries (snapshot do plantão atual) é best-effort.
 *
 * Validação: max 500 IDs por lote, todos UUIDs válidos, status whitelisted.
 * Evita DoS por payload gigante e payloads malformados.
 */
export async function bulkUpdateTcle(input: {
  paciente_ids: string[];
  tcle_status: TcleStatus;
}): Promise<{ updated: number }> {
  if (!Array.isArray(input.paciente_ids) || input.paciente_ids.length === 0) {
    return { updated: 0 };
  }
  if (input.paciente_ids.length > MAX_BULK) {
    throw new Error(`Máximo ${MAX_BULK} pacientes por lote.`);
  }
  if (!input.paciente_ids.every((id) => typeof id === "string" && UUID_RE.test(id))) {
    throw new Error("Algum ID de paciente é inválido.");
  }
  if (!(TCLE_STATUS as readonly string[]).includes(input.tcle_status)) {
    throw new Error("Status TCLE inválido.");
  }

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
