"use client";

import { useState, useTransition } from "react";
import { Lock, AlertTriangle } from "lucide-react";
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
import { finalizarPlantao } from "@/app/(app)/plantoes/actions";
import { errMsg } from "@/lib/utils";

type Props = {
  plantaoId: string;
  /** Quantos pacientes estão em "Possível alta" neste plantão. */
  pendentesAltaCount?: number;
};

export function FinalizarPlantaoButton({ plantaoId, pendentesAltaCount = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const temPendentes = pendentesAltaCount > 0;

  function handleConfirm() {
    startTransition(async () => {
      try {
        const res = await finalizarPlantao(plantaoId);
        if (res.excluidos.length > 0) {
          toast.warning(
            `${res.excluidos.length} paciente(s) auto-excluído(s)`,
            {
              description: `Sumiram após 2 plantões com Possível alta sem confirmação no HGE: ${res.excluidos
                .map((p) => p.nome)
                .join(", ")}`,
              duration: 8000,
            },
          );
        } else {
          toast.success("Plantão finalizado");
        }
        setOpen(false);
      } catch (err) {
        toast.error("Erro ao finalizar", { description: errMsg(err) });
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        <Lock className="h-4 w-4 mr-1" /> Finalizar
      </Button>

      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <div
              className={temPendentes ? "flex items-center gap-2 text-saffron" : undefined}
            >
              {temPendentes && <AlertTriangle className="h-5 w-5 shrink-0" />}
              <DialogTitle>
                {temPendentes
                  ? `Finalizar com ${pendentesAltaCount} Possível alta pendente${
                      pendentesAltaCount > 1 ? "s" : ""
                    }?`
                  : "Finalizar plantão?"}
              </DialogTitle>
            </div>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                Após finalizar, o plantão fica em modo{" "}
                <strong className="text-ink">somente leitura</strong>.
              </span>
              {temPendentes && (
                <span className="block text-graphite">
                  Esses pacientes vão pro próximo plantão com o sinal amarelo.{" "}
                  <strong className="text-ink">
                    Se reaparecerem como Possível alta no próximo plantão sem
                    você confirmar no HGE, vão ser auto-excluídos do mapa
                  </strong>{" "}
                  — o sistema entende que o paciente sumiu (não está mais no
                  hospital nem no Doutore).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {temPendentes && (
            <div className="rounded-lg border border-saffron/30 bg-saffron/[0.05] px-3.5 py-3">
              <p className="text-[12px] text-graphite leading-relaxed">
                <strong className="text-ink">Recomendado:</strong> antes de
                finalizar, abra o prontuário digital do HGE e cheque se cada
                Possível alta teve alta hospitalar ou foi pra outro setor.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="sm:flex-1"
            >
              Voltar pra checar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={pending}
              className="sm:flex-1"
            >
              {pending
                ? "Finalizando..."
                : temPendentes
                  ? "Finalizar mesmo assim"
                  : "Finalizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
