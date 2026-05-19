"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { startSyncEngine } from "@/lib/sync/engine";

/** Monta uma única vez no app root para iniciar o engine de sync. */
export function SyncProvider() {
  const router = useRouter();
  useEffect(() => {
    startSyncEngine();

    // Quando o drainQueue sincroniza uma mutação offline com sucesso,
    // dispara um router.refresh() debounced pra revalidar RSC.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onFlushed = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 500);
    };
    window.addEventListener("lanc:sync-flushed", onFlushed);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("lanc:sync-flushed", onFlushed);
    };
  }, [router]);
  return null;
}
