"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
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
import {
  previewExportRedcap,
  enviarParaRedcap,
  type PreviewExport,
} from "@/app/(app)/pacientes/[id]/redcap-actions";
import { errMsg } from "@/lib/utils";

type Props = {
  pacienteId: string;
  pacienteNome: string;
};

export function EnviarRedcapButton({ pacienteId, pacienteNome }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewExport | null>(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const [enviando, startEnvio] = useTransition();

  useEffect(() => {
    if (!open) {
      setPreview(null);
      return;
    }
    let vivo = true;
    setCarregandoPreview(true);
    previewExportRedcap(pacienteId)
      .then((p) => vivo && setPreview(p))
      .catch((err) => {
        if (vivo) {
          toast.error("Não consegui montar a prévia", { description: errMsg(err) });
          setOpen(false);
        }
      })
      .finally(() => vivo && setCarregandoPreview(false));
    return () => {
      vivo = false;
    };
  }, [open, pacienteId]);

  const podeEnviar = Boolean(preview && preview.configurado && !preview.semDados && !enviando);

  function handleEnviar() {
    startEnvio(async () => {
      try {
        const res = await enviarParaRedcap(pacienteId);
        toast.success(
          res.criou ? `Paciente criado no REDCap (id ${res.recordId})` : "Dados enviados ao REDCap",
          { description: `${res.registros} registro(s) enviado(s).` },
        );
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error("Erro ao enviar", { description: errMsg(err) });
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-1.5" /> Enviar para o REDCap
      </Button>

      <Dialog open={open} onOpenChange={(o) => !enviando && setOpen(o)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-cobalt">
              <Upload className="h-5 w-5" />
              <DialogTitle>Enviar para o REDCap</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Envia <strong className="text-ink">somente este paciente</strong> (
              {pacienteNome}) pro REDCap. Não mexe em outros pacientes e não apaga
              nada que já esteja lá.
            </DialogDescription>
          </DialogHeader>

          <div className="text-sm space-y-3">
            {carregandoPreview && (
              <div className="flex items-center gap-2 text-ash">
                <Loader2 className="h-4 w-4 animate-spin" /> Montando a prévia…
              </div>
            )}

            {preview && (
              <>
                {preview.semDados ? (
                  <p className="text-vermillion">Este paciente ainda não tem coletas pra enviar.</p>
                ) : (
                  <div className="rounded-md border border-hairline bg-paper-deep/40 p-3 space-y-1.5">
                    <p>
                      {preview.criando ? (
                        <span className="text-cobalt font-medium">➕ Vai criar o paciente no REDCap (novo record).</span>
                      ) : (
                        <span className="text-moss font-medium">↻ Vai atualizar o record #{preview.recordIdAtual}.</span>
                      )}
                    </p>
                    <p className="text-graphite">
                      {preview.instrumentos.length} instrumento(s)
                      {preview.totalSeguimentos > 0 && ` · ${preview.totalSeguimentos} seguimento(s)`} ·{" "}
                      {preview.totalCampos} campo(s) preenchido(s).
                    </p>
                    <p className="text-[12px] text-ash">{preview.instrumentos.join(", ")}</p>
                  </div>
                )}

                {!preview.configurado && (
                  <div className="flex gap-2 rounded-md border border-amber-400/40 bg-amber-50/60 p-2.5 text-[12px] text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      A API do REDCap ainda não está conectada — isto é só uma{" "}
                      <strong>prévia</strong>. Quando o token estiver configurado, o envio fica liberado.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={enviando} className="sm:flex-1">
              Cancelar
            </Button>
            <Button onClick={handleEnviar} disabled={!podeEnviar} className="sm:flex-1">
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirmar envio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
