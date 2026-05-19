"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Square, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bulkUpdateTcle } from "@/app/(app)/pacientes/bulk-actions";
import type { Paciente } from "@/lib/domain/types";
import type { TcleStatus } from "@/lib/domain/enums";
import { cn, errMsg } from "@/lib/utils";

type Props = {
  pacientesElegiveis: Paciente[];
};

/**
 * Toolbar de ações em massa pra pacientes. Mostra checkbox em cada item da
 * lista visível (via context não — receber via prop simplifica). Por hora
 * faz apenas atualização de TCLE em massa, que é o caso de uso real (cheguei
 * num plantão com 5 TCLEs assinados pra atualizar).
 */
export function BulkActionsToolbar({ pacientesElegiveis }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearAll() {
    setSelected(new Set());
    setActive(false);
  }

  function selectAll() {
    setSelected(new Set(pacientesElegiveis.map((p) => p.id)));
  }

  function applyTcle(status: TcleStatus) {
    if (selected.size === 0) {
      toast.warning("Selecione pelo menos 1 paciente.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await bulkUpdateTcle({
          paciente_ids: [...selected],
          tcle_status: status,
        });
        toast.success(
          `${res.updated} paciente${res.updated > 1 ? "s" : ""} atualizado${res.updated > 1 ? "s" : ""}`,
        );
        clearAll();
        router.refresh();
      } catch (err) {
        toast.error("Erro na atualização em massa", { description: errMsg(err) });
      }
    });
  }

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-hairline bg-paper text-[12px] font-medium text-graphite hover:border-cobalt/40 hover:text-ink transition-colors"
      >
        <CheckSquare className="h-3.5 w-3.5" strokeWidth={1.8} />
        Selecionar vários
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-cobalt/40 bg-cobalt/[0.06] p-3 space-y-3 sticky top-12 z-20 backdrop-blur">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={clearAll}
          aria-label="Sair do modo seleção"
          className="size-8 rounded-md flex items-center justify-center text-ash hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold text-ink">
          {selected.size} selecionado{selected.size === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={selectAll}
          className="text-[11px] uppercase tracking-editorial text-cobalt-soft hover:text-cobalt ml-auto"
        >
          Selecionar todos ({pacientesElegiveis.length})
        </button>
      </div>

      {/* Lista compacta de pacientes selecionáveis */}
      <ul className="max-h-[40dvh] overflow-y-auto -mx-1 px-1 space-y-1">
        {pacientesElegiveis.map((p) => {
          const isSelected = selected.has(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors",
                  isSelected
                    ? "bg-cobalt/15 border border-cobalt/40"
                    : "bg-paper border border-hairline hover:border-cobalt/30",
                )}
              >
                <span
                  className={cn(
                    "size-5 rounded-md border flex items-center justify-center shrink-0",
                    isSelected
                      ? "bg-cobalt border-cobalt text-white"
                      : "border-hairline text-transparent",
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-ink truncate">
                    {p.nome}
                  </p>
                  {p.leito && (
                    <p className="text-[10px] text-ash">
                      {p.leito} · TCLE {p.tcle_status.toLowerCase()}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
        {pacientesElegiveis.length === 0 && (
          <li className="text-center py-4 text-[11px] text-ash">
            Nenhum paciente elegível.
          </li>
        )}
      </ul>

      {/* Ações */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-editorial text-ash font-semibold px-1">
          Aplicar a {selected.size}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            disabled={pending || selected.size === 0}
            onClick={() => applyTcle("ASSINADO")}
            className="bg-moss hover:bg-moss/90 text-paper-deep"
          >
            TCLE → Assinado
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || selected.size === 0}
            onClick={() => applyTcle("RECUSADO")}
            className="border-vermillion/40 text-vermillion hover:bg-vermillion/10"
          >
            TCLE → Recusado
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper visual pro caller (placeholder — pacientes eligible são passados
// como prop pela page server component que decide quem é elegível)
export function _BulkSquareIcon() {
  return <Square className="h-3.5 w-3.5" strokeWidth={1.8} />;
}
