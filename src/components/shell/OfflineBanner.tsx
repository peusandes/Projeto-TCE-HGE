"use client";

import { useState } from "react";
import { CloudOff, RefreshCcw, X } from "lucide-react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { drainQueue } from "@/lib/sync/queue";
import { cn } from "@/lib/utils";

/**
 * Banner persistente abaixo do AppHeader quando o usuário está offline OU
 * quando há mutações pendentes esperando sync. Pode ser fechado, mas o
 * OnlineBadge no header continua sinalizando.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const { total: pending } = useSyncStatus();
  const [dismissed, setDismissed] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Se voltou online, reseta o dismiss pra próximo evento.
  // (não usa useEffect — só lê o estado atual)
  const ativo = !online || pending > 0;

  if (!ativo || dismissed) return null;

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const { synced, failed } = await drainQueue();
      if (synced > 0 && failed === 0) {
        toast.success(`${synced} mudança(s) sincronizada(s)`);
      } else if (failed > 0) {
        toast.warning(`${synced} OK, ${failed} ainda falham — tentaremos de novo`);
      } else {
        toast.info("Nenhuma mudança pendente");
      }
    } catch {
      toast.error("Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div
      className={cn(
        "sticky top-12 z-30 w-full border-b",
        !online
          ? "bg-vermillion/10 border-vermillion/30 text-vermillion"
          : "bg-saffron/10 border-saffron/30 text-saffron",
      )}
      role="status"
    >
      <div className="container max-w-3xl flex items-center gap-2 px-5 py-2">
        <CloudOff className="h-4 w-4 shrink-0" strokeWidth={1.8} />
        <p className="text-[12px] flex-1 leading-tight">
          {!online ? (
            <>
              <strong>Sem conexão.</strong> O que você editar fica salvo no
              celular e sincroniza quando a internet voltar.
              {pending > 0 && (
                <span className="ml-1 opacity-80">
                  · {pending} mudança{pending > 1 ? "s" : ""} pendente
                  {pending > 1 ? "s" : ""}
                </span>
              )}
            </>
          ) : (
            <>
              <strong>{pending} mudança{pending > 1 ? "s" : ""} pendente{pending > 1 ? "s" : ""}.</strong>{" "}
              Conexão voltou — sincronizando em segundos. Toque pra forçar.
            </>
          )}
        </p>
        {online && pending > 0 && (
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="size-8 rounded-md flex items-center justify-center hover:bg-saffron/10 transition-colors disabled:opacity-50 min-tap"
            aria-label="Sincronizar agora"
          >
            <RefreshCcw
              className={cn("h-3.5 w-3.5", syncing && "animate-spin")}
              strokeWidth={1.8}
            />
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="size-8 rounded-md flex items-center justify-center hover:bg-current/10 transition-colors opacity-70 hover:opacity-100 min-tap"
          aria-label="Fechar aviso"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
