"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/dexie";

export type SyncSnapshot = {
  pending: number;
  error: number;
  total: number;
};

/**
 * Reage à fila de mutações via Dexie live query. Conta:
 *  - pending: aguardando primeira tentativa ou rede
 *  - error: tentou e falhou (será re-tentado pelo engine)
 */
export function useSyncStatus(): SyncSnapshot {
  const snap = useLiveQuery(async () => {
    if (typeof window === "undefined") return { pending: 0, error: 0, total: 0 };
    const db = getDb();
    const [pending, error] = await Promise.all([
      db.mutation_queue.where("status").equals("pending").count(),
      db.mutation_queue.where("status").equals("error").count(),
    ]);
    return { pending, error, total: pending + error };
  }, []);
  return snap ?? { pending: 0, error: 0, total: 0 };
}
