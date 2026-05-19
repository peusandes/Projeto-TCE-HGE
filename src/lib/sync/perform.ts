"use client";

import { toast } from "sonner";
import type { MutationType } from "@/lib/db/dexie";
import { EXECUTORS, isNetworkError } from "./executors";
import { enqueue } from "./queue";

export type SyncResult = "synced" | "queued";

/**
 * Tenta executar uma mutação online. Se rede falhar (ou estiver offline),
 * adiciona à fila local e retorna "queued". Erros lógicos do Supabase
 * (RLS, constraint, validação) são re-lançados para a UI tratar.
 */
export async function performWithSync<P>(
  type: MutationType,
  payload: P,
  options?: { silent?: boolean },
): Promise<SyncResult> {
  // Se já estamos offline, vai direto pra fila
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueue(type, payload);
    if (!options?.silent) {
      toast("Salvo localmente", {
        description: "Vai sincronizar quando a conexão voltar.",
      });
    }
    return "queued";
  }

  try {
    await EXECUTORS[type](payload as unknown);
    return "synced";
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueue(type, payload);
      if (!options?.silent) {
        toast("Salvo localmente", {
          description: "Vai sincronizar quando a conexão voltar.",
        });
      }
      return "queued";
    }
    throw err;
  }
}
