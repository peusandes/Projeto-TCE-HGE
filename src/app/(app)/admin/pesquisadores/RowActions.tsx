"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Shield, ShieldOff, Send, UserX } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { alternarAdmin, reenviarConvite, removerPesquisador } from "./actions";
import type { PesquisadorRow } from "@/lib/data/pesquisadores";
import { errMsg } from "@/lib/utils";

export function PesquisadorRowActions({ pesquisador }: { pesquisador: PesquisadorRow }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(label: string, fn: () => Promise<unknown>) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(label);
        setOpen(false);
      } catch (err) {
        toast.error("Erro", { description: errMsg(err) });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="size-9 rounded-full border border-hairline flex items-center justify-center text-graphite hover:text-ink hover:border-cobalt/60 min-tap"
        aria-label="Ações"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={1.6} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle className="font-display text-[20px] font-medium text-ink">
            {pesquisador.setup_complete ? pesquisador.nome : pesquisador.email}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-ash">{pesquisador.email}</DialogDescription>

          <div className="space-y-2 mt-3">
            {!pesquisador.setup_complete && (
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-start"
                disabled={pending}
                onClick={() =>
                  run("Convite reenviado", () => reenviarConvite(pesquisador.email))
                }
              >
                <Send className="h-4 w-4 mr-2" strokeWidth={1.8} />
                Reenviar convite
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start"
              disabled={pending}
              onClick={() =>
                run(
                  pesquisador.is_admin ? "Removido como admin" : "Promovido a admin",
                  () => alternarAdmin(pesquisador.id, !pesquisador.is_admin),
                )
              }
            >
              {pesquisador.is_admin ? (
                <>
                  <ShieldOff className="h-4 w-4 mr-2" strokeWidth={1.8} />
                  Remover privilégio admin
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" strokeWidth={1.8} />
                  Tornar admin
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              className="w-full justify-start"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Remover ${pesquisador.email}? Esta ação é irreversível.`)) return;
                run("Pesquisador removido", () => removerPesquisador(pesquisador.id));
              }}
            >
              <UserX className="h-4 w-4 mr-2" strokeWidth={1.8} />
              Remover pesquisador
            </Button>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
