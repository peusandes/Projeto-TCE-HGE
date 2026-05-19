"use client";

import { getDb, type MutationType, type QueuedMutation } from "@/lib/db/dexie";
import { EXECUTORS } from "./executors";

const MAX_RETRIES = 10;
// Mutações em "syncing" mais antigas que isso são tratadas como órfãs
// (tab fechou no meio, worker morreu, etc.) e voltam pra fila.
const SYNCING_ORPHAN_MS = 60_000;

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Pra mutações que se sobrepõem (auto-save em rajada do mesmo paciente),
 * fazemos coalesce: se já existe uma pending pro mesmo "merge key", trocamos
 * o payload em vez de criar nova entrada. Evita queue inflada e ordem frágil.
 */
function mergeKey(type: MutationType, payload: unknown): string | null {
  if (type === "update_paciente") {
    const p = payload as { id?: string };
    return p?.id ? `update_paciente:${p.id}` : null;
  }
  if (type === "upsert_coleta_redcap") {
    const p = payload as { paciente_id?: string; instrument?: string; seq?: number };
    if (!p?.paciente_id || !p?.instrument) return null;
    return `upsert_coleta_redcap:${p.paciente_id}:${p.instrument}:${p.seq ?? 1}`;
  }
  return null;
}

function mutationMatchesKey(m: QueuedMutation, key: string): boolean {
  return mergeKey(m.type, m.payload) === key;
}

function mergePayload(type: MutationType, prev: unknown, next: unknown): unknown {
  if (type === "update_paciente") {
    const a = prev as { id: string; plantao_id: string; patch?: Record<string, unknown> };
    const b = next as { id: string; plantao_id: string; patch?: Record<string, unknown> };
    return { ...b, patch: { ...(a.patch ?? {}), ...(b.patch ?? {}) } };
  }
  // Pra coleta_redcap: payload mais recente vence (dados completos do form)
  return next;
}

/** Adiciona uma mutação à fila local — faz coalesce se já houver pending equivalente. */
export async function enqueue<P>(type: MutationType, payload: P): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const key = mergeKey(type, payload);

  if (key) {
    // Procura outra pending mesma chave e merge in-place.
    const existing = await db.mutation_queue
      .where("status")
      .anyOf("pending", "error")
      .toArray();
    const dup = existing.find((m) => mutationMatchesKey(m, key));
    if (dup) {
      const merged = mergePayload(type, dup.payload, payload);
      await db.mutation_queue.update(dup.id, {
        payload: merged,
        status: "pending",
        retries: 0,
        last_error: undefined,
        updated_at: now,
      });
      return;
    }
  }

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

/** Retorna o número de mutações pendentes (pending + error retriable + órfãs de syncing). */
export async function countPending(): Promise<number> {
  const db = getDb();
  return await db.mutation_queue
    .where("status")
    .anyOf("pending", "error", "syncing")
    .count();
}

/**
 * Drena a fila: tenta executar cada mutação pendente em ordem FIFO.
 * Inclui registros marcados como "syncing" há mais de 60s (órfãos de tab
 * fechada / worker morto). Retorna { synced, failed }.
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
    const orphanCutoff = new Date(Date.now() - SYNCING_ORPHAN_MS).toISOString();

    const pending = await db.mutation_queue
      .where("status")
      .anyOf("pending", "error", "syncing")
      .filter((m) => m.status !== "syncing" || m.updated_at < orphanCutoff)
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
        // Trigger revalidação leve no client — re-renderiza páginas RSC
        // depois de sync da fila offline pra UI não ficar stale.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("lanc:sync-flushed", { detail: { type: mut.type } }));
        }
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
