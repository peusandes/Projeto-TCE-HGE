"use client";

import { drainQueue } from "./queue";

const INTERVAL_MS = 30_000;

let _started = false;
let _interval: ReturnType<typeof setInterval> | null = null;

/** Inicia o engine de sync (singleton — múltiplas chamadas no-op). */
export function startSyncEngine() {
  if (_started || typeof window === "undefined") return;
  _started = true;

  // Drena ao montar (caso tenha sobra de sessões antigas)
  drainQueue().catch(() => {});

  // Drena quando voltar online
  window.addEventListener("online", () => {
    drainQueue().catch(() => {});
  });

  // Drena periodicamente (catch-all)
  _interval = setInterval(() => {
    if (navigator.onLine) drainQueue().catch(() => {});
  }, INTERVAL_MS);
}

export function stopSyncEngine() {
  if (_interval) clearInterval(_interval);
  _interval = null;
  _started = false;
}
