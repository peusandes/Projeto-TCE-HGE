"use client";

import { getDb, type MutationType, type QueuedMutation } from "@/lib/db/dexie";
import { EXECUTORS } from "./executors";

const MAX_RETRIES = 10;

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Adiciona uma mutação à fila local. */
export async function enqueue<P>(type: MutationType, payload: P): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const mut: QueuedMutation = {
    id: uid(),
    type,
    payload: payload as unknown,
    status: "pending",
    retries: 0,
    created_at: now,
    updated_at: now,
  };
  await db.mutation_queue.add(mut);
}

/** Retorna o número de mutações pendentes (pending + error retriable). */
export async function countPending(): Promise<number> {
  const db = getDb();
  return await db.mutation_queue.where("status").anyOf("pending", "error").count();
}

/**
 * Drena a fila: tenta executar cada mutação pendente em ordem FIFO.
 * Retorna { synced, failed }.
 */
let _draining = false;
export async function drainQueue(): Promise<{ synced: number; failed: number }> {
  if (_draining) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, failed: 0 };

  _draining = true;
  let synced = 0;
  let failed = 0;
  try {
    const db = getDb();
    const pending = await db.mutation_queue
      .where("status")
      .anyOf("pending", "error")
      .sortBy("created_at");

    for (const mut of pending) {
      if (mut.retries >= MAX_RETRIES) continue;

      await db.mutation_queue.update(mut.id, { status: "syncing", updated_at: new Date().toISOString() });
      try {
        const exec = EXECUTORS[mut.type];
        if (!exec) throw new Error(`Sem executor para tipo: ${mut.type}`);
        await exec(mut.payload);
        await db.mutation_queue.update(mut.id, {
          status: "synced",
          updated_at: new Date().toISOString(),
        });
        synced += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await db.mutation_queue.update(mut.id, {
          status: "error",
          retries: mut.retries + 1,
          last_error: msg,
          updated_at: new Date().toISOString(),
        });
        failed += 1;
        // Continua tentando próximas — uma falha não bloqueia outras
      }
    }

    // Limpa registros sincronizados há mais de 5 min para não acumular
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await db.mutation_queue
      .where("status")
      .equals("synced")
      .filter((m) => m.updated_at < fiveMinAgo)
      .delete();
  } finally {
    _draining = false;
  }
  return { synced, failed };
}

/** Limpa toda a fila — útil em dev. */
export async function clearQueue(): Promise<void> {
  await getDb().mutation_queue.clear();
}
