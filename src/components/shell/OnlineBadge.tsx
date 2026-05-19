"use client";

import { CloudOff, Cloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { drainQueue } from "@/lib/sync/queue";

export function OnlineBadge() {
  const online = useOnlineStatus();
  const { total: pending } = useSyncStatus();

  const state =
    !online ? "offline" :
    pending > 0 ? "pending" :
    "online";

  async function handleSync() {
    toast("Sincronizando...");
    try {
      const { synced, failed } = await drainQueue();
      if (synced > 0 && failed === 0) toast.success(`${synced} mudança(s) sincronizada(s)`);
      else if (failed > 0) toast.error(`${failed} falha(s) — tentaremos de novo`);
    } catch {
      toast.error("Erro ao sincronizar");
    }
  }

  if (state === "offline") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[10px] tracking-wide font-mono text-vermillion"
        title="Sem conexão — mudanças salvam localmente e sincronizam ao voltar"
      >
        <CloudOff className="h-3.5 w-3.5" strokeWidth={1.8} />
        offline
        {pending > 0 && <span className="text-saffron">· {pending}</span>}
      </span>
    );
  }

  if (state === "pending") {
    return (
      <button
        type="button"
        onClick={handleSync}
        className="inline-flex items-center gap-1.5 text-[10px] tracking-wide font-mono text-saffron hover:text-saffron/80 transition-colors min-tap"
        title="Toque para sincronizar agora"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
        {pending} pendente{pending > 1 ? "s" : ""}
      </button>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] tracking-wide font-mono text-moss"
      title="Conectado"
    >
      <Cloud className="h-3.5 w-3.5" strokeWidth={1.8} />
      online
    </span>
  );
}
