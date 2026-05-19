"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { deletarPaciente } from "@/app/(app)/pacientes/[id]/actions";
import { errMsg } from "@/lib/utils";

type Props = {
  pacienteId: string;
  pacienteNome: string;
  plantaoId: string;
};

export function ExcluirPacienteButton({ pacienteId, pacienteNome, plantaoId }: Props) {
  const router = useRouter();
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
        await deletarPaciente(pacienteId);
        toast.success("Paciente excluído");
        router.push(`/plantoes/${plantaoId}`);
      } catch (err) {
        toast.error("Erro ao excluir", { description: errMsg(err) });
      }
    });
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4 mr-1.5" /> Excluir paciente
      </Button>

      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-vermillion">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Excluir paciente</DialogTitle>
            </div>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                Você vai excluir <strong className="text-ink">{pacienteNome}</strong>{" "}
                em definitivo.
              </span>
              <span className="block text-vermillion">
                Apaga todas as coletas REDCap, anexos e histórico de plantões
                desse paciente. Ação irreversível.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="conf-pac" className="text-[11px] uppercase tracking-editorial text-ash">
              Digite <span className="text-ink font-semibold">EXCLUIR</span> pra confirmar
            </Label>
            <Input
              id="conf-pac"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              placeholder="EXCLUIR"
              autoComplete="off"
              disabled={pending}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending} className="sm:flex-1">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={pending || !palavraCerta}
              className="sm:flex-1"
            >
              {pending ? "Excluindo..." : "Excluir paciente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
