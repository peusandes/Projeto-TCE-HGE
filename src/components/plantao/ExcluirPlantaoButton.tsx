"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { excluirPlantao } from "@/app/(app)/plantoes/actions";
import { errMsg } from "@/lib/utils";

export function ExcluirPlantaoButton({
  plantaoId,
  dataLabel,
}: {
  plantaoId: string;
  dataLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirma, setConfirma] = useState("");
  const [pending, startTransition] = useTransition();

  const palavraCerta = confirma.trim().toUpperCase() === "EXCLUIR";

  function handleConfirm() {
    if (!palavraCerta) {
      toast.warning("Digite EXCLUIR para confirmar.");
      return;
    }
    startTransition(async () => {
      try {
        await excluirPlantao(plantaoId);
        // server action chama redirect — não chega aqui em sucesso
      } catch (err) {
        const msg = err instanceof Error ? err.message : errMsg(err);
        // NEXT_REDIRECT é jogado pelo redirect() — ignora.
        if (msg.includes("NEXT_REDIRECT")) return;
        toast.error("Erro ao excluir", { description: msg });
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-vermillion hover:text-vermillion hover:bg-vermillion/10"
      >
        <Trash2 className="h-4 w-4 mr-1" /> Excluir
      </Button>

      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-vermillion">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Excluir plantão</DialogTitle>
            </div>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                Você vai excluir o plantão de <strong>{dataLabel}</strong> em definitivo.
              </span>
              <span className="block text-vermillion">
                Isso apaga todos os pacientes, coletas REDCap e anexos vinculados a este plantão. Ação irreversível.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirma" className="text-[11px] uppercase tracking-editorial text-ash">
              Digite <span className="text-ink font-semibold">EXCLUIR</span> pra confirmar
            </Label>
            <Input
              id="confirma"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              placeholder="EXCLUIR"
              autoComplete="off"
              disabled={pending}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={pending || !palavraCerta}
            >
              {pending ? "Excluindo..." : "Excluir definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
