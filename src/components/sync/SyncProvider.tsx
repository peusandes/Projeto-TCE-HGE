"use client";

import { useEffect } from "react";
import { startSyncEngine } from "@/lib/sync/engine";

/** Monta uma única vez no app root para iniciar o engine de sync. */
export function SyncProvider() {
  useEffect(() => {
    startSyncEngine();
  }, []);
  return null;
}
