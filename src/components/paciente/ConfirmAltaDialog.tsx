"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  /** Nome opcional pra personalizar a mensagem. */
  pacienteNome?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Pop-up que aparece sempre que o usuário tenta marcar um paciente como ALTA.
 * Lembra de validar no sistema do HGE antes — alta no Doutore ≠ alta do
 * paciente (pode ser só remoção do mapa da neurocirurgia).
 */
export function ConfirmAltaDialog({ open, pacienteNome, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-saffron">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Confirmar alta no HGE</DialogTitle>
          </div>
          <DialogDescription className="pt-2 space-y-2">
            <span className="block">
              {pacienteNome ? (
                <>
                  Você está marcando{" "}
                  <strong className="text-ink">{pacienteNome}</strong> como{" "}
                  <strong>ALTA</strong>.
                </>
              ) : (
                <>Você está marcando este paciente como <strong>ALTA</strong>.</>
              )}
            </span>
            <span className="block">
              Antes de confirmar, cheque no{" "}
              <strong className="text-ink">sistema do HGE</strong> se realmente
              é alta hospitalar — pode ser só uma <strong>saída do mapa da
              neurocirurgia no Doutore</strong> (paciente transferido pra outro
              serviço, mas ainda internado).
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-saffron/30 bg-saffron/[0.05] px-3.5 py-3">
          <p className="text-[12px] text-graphite leading-relaxed">
            <strong className="text-ink">Como checar:</strong> abra o prontuário
            digital do HGE (ícone amarelo) e confirme que existe registro de
            alta hospitalar.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
          <Button
            variant="outline"
            onClick={onCancel}
            className="sm:flex-1 border-saffron/40 text-saffron hover:bg-saffron/10 hover:text-saffron"
          >
            Vou checar no HGE
          </Button>
          <Button onClick={onConfirm} className="sm:flex-1">
            Já confirmei — é alta
          </Button>
        </DialogFooter>
        <p className="text-[11px] text-ash text-center leading-snug">
          Se escolher <em>“vou checar”</em>, o paciente fica em <span className="text-saffron font-semibold">amarelo</span> esperando sua confirmação.
        </p>
      </DialogContent>
    </Dialog>
  );
}
