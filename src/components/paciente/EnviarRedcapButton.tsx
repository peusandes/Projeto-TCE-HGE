"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  habilitado: boolean;
};

const EVENTO_LABEL: Record<string, string> = {
  admisso_arm_1: "Admissão",
  seguimento_arm_1: "Seguimento",
  alta_arm_1: "Alta",
};

export function EnviarRedcapButton({ pacienteId, pacienteNome, habilitado }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewExport | null>(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const [confirmouSuspeitos, setConfirmouSuspeitos] = useState(false);
  /** record_id que já existe no REDCap (da prévia ou revelado pelo envio). */
  const [jaExiste, setJaExiste] = useState<string | null>(null);
  const [confirmouVinculo, setConfirmouVinculo] = useState(false);
  const [enviando, startEnvio] = useTransition();

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setConfirmouSuspeitos(false);
      setJaExiste(null);
      setConfirmouVinculo(false);
      return;
    }
    let vivo = true;
    setCarregandoPreview(true);
    previewExportRedcap(pacienteId)
      .then((res) => {
        if (!vivo) return;
        if (!res.ok) {
          toast.error("Não consegui montar a prévia", { description: res.erro });
          setOpen(false);
          return;
        }
        setPreview(res.preview);
        setJaExiste(res.preview.existenteNoRedcap);
      })
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

  const temSuspeitos = Boolean(preview && preview.suspeitos.length > 0);
  const podeEnviar = Boolean(
    preview &&
      preview.configurado &&
      !preview.semDados &&
      !preview.semNome &&
      !enviando &&
      (!temSuspeitos || confirmouSuspeitos) &&
      (!jaExiste || confirmouVinculo),
  );

  if (!habilitado) {
    return (
      <div className="rounded-md border border-hairline bg-paper-deep/40 p-3 text-[12px] text-ash">
        <p className="flex items-center gap-1.5 text-graphite">
          <Upload className="h-3.5 w-3.5" /> Exportação para o REDCap indisponível
        </p>
        <p className="mt-1">
          Este paciente não está habilitado — o envio cobre só novas admissões; os legados
          ficam intocados no REDCap.
        </p>
      </div>
    );
  }

  function handleEnviar() {
    startEnvio(async () => {
      try {
        const res = await enviarParaRedcap(pacienteId, {
          confirmarSuspeitos: confirmouSuspeitos,
          ...(jaExiste && confirmouVinculo ? { vincularExistente: jaExiste } : {}),
        });
        if (!res.ok) {
          // Bloqueio por record já existente: mostra a caixa de vínculo em vez de
          // só reclamar — o usuário decide se é a mesma pessoa.
          if (res.jaExiste) {
            setJaExiste(res.jaExiste);
            setConfirmouVinculo(false);
          }
          toast.error("Erro ao enviar", { description: res.erro });
          return;
        }
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
              Manda os dados de <strong className="text-ink">{pacienteNome}</strong> pro
              REDCap (o banco oficial da pesquisa).
            </DialogDescription>
          </DialogHeader>

          <div className="text-sm space-y-3">
            <div className="rounded-md border border-hairline bg-paper-deep/40 p-3 space-y-1.5 text-[12px] text-graphite">
              <p className="text-ink font-medium">O que acontece ao confirmar:</p>
              <ul className="space-y-1 list-disc pl-4">
                <li>Envia <strong className="text-ink">só este paciente</strong> — nenhum outro é tocado.</li>
                <li>O <strong className="text-ink">record_id</strong> no REDCap é o <strong className="text-ink">nome</strong>. Se o nome ainda não existe lá, é criado; se já existir (legado), o envio é <strong className="text-ink">bloqueado</strong> pra não sobrescrever.</li>
                <li><strong className="text-ink">Nunca apaga</strong> o que já está no REDCap — só preenche/atualiza os campos que temos aqui.</li>
                <li>Cada dia de seguimento vira uma instância; cada instrumento vai pro seu evento (admissão/seguimento/alta).</li>
                <li>Correções como desmarcar caixinhas ou esvaziar um campo precisam ser feitas direto no REDCap.</li>
              </ul>
            </div>

            {carregandoPreview && (
              <div className="flex items-center gap-2 text-ash">
                <Loader2 className="h-4 w-4 animate-spin" /> Montando a prévia…
              </div>
            )}

            {preview && (
              <>
                {preview.semDados ? (
                  <p className="text-vermillion">Este paciente ainda não tem coletas pra enviar.</p>
                ) : preview.semNome ? (
                  <p className="text-vermillion">
                    Paciente sem nome — no REDCap o record_id é o nome completo. Preencha o nome
                    antes de exportar.
                  </p>
                ) : (
                  <div className="rounded-md border border-hairline bg-paper-deep/40 p-3 space-y-1.5">
                    <p>
                      {jaExiste ? (
                        <span className="text-amber-700 font-medium">↻ Vai preencher o registro já existente &ldquo;{jaExiste}&rdquo; (precisa confirmar o vínculo abaixo).</span>
                      ) : preview.criando ? (
                        <span className="text-cobalt font-medium">➕ Vai criar o registro &ldquo;{preview.recordId}&rdquo; no REDCap.</span>
                      ) : (
                        <span className="text-moss font-medium">↻ Vai atualizar o registro &ldquo;{preview.recordIdAtual}&rdquo;.</span>
                      )}
                    </p>
                    <p className="text-graphite">
                      {preview.instrumentos.length} instrumento(s)
                      {preview.totalSeguimentos > 0 && ` · ${preview.totalSeguimentos} seguimento(s)`} ·{" "}
                      {preview.totalCampos} campo(s) preenchido(s).
                    </p>
                    {preview.eventos.length > 0 && (
                      <p className="text-[12px] text-ash">
                        Eventos: {preview.eventos.map((e) => EVENTO_LABEL[e] ?? e).join(", ")}
                      </p>
                    )}
                    {preview.criando && !jaExiste && (
                      <p className="text-[11px] text-ash">
                        Se já existir um registro com esse nome no REDCap, o envio é bloqueado
                        automaticamente (não sobrescreve).
                      </p>
                    )}
                  </div>
                )}

                {jaExiste && (
                  <div className="space-y-2 rounded-md border border-amber-400/50 bg-amber-50/60 p-3 text-[12px]">
                    <p className="flex items-center gap-1.5 font-medium text-amber-700">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Esse nome já existe no REDCap
                    </p>
                    <p className="text-graphite">
                      Já há o registro <strong className="text-ink">&ldquo;{jaExiste}&rdquo;</strong> lá
                      — provavelmente digitado à mão pela equipe. Pra não sobrescrever ninguém por
                      engano, o envio só segue se você confirmar que é <strong className="text-ink">a
                      mesma pessoa</strong>.
                    </p>
                    <p className="text-graphite">
                      Ao vincular: nada é apagado no REDCap, mas os campos que temos aqui{" "}
                      <strong className="text-ink">substituem</strong> o que estiver preenchido lá
                      (ex.: o nome do ligante de cada seguimento). O que só existe no REDCap fica
                      intacto.
                    </p>
                    <label className="flex items-start gap-2 pt-1 cursor-pointer">
                      <Checkbox
                        checked={confirmouVinculo}
                        onCheckedChange={(v) => setConfirmouVinculo(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-graphite">
                        É a mesma pessoa — <strong className="text-ink">vincular</strong> a este
                        paciente e atualizar o registro existente.
                      </span>
                    </label>
                  </div>
                )}

                {preview.checagemExistenciaFalhou && (
                  <p className="text-[12px] text-ash">
                    Não deu pra conferir agora se esse nome já existe no REDCap — a checagem roda de
                    novo no envio e bloqueia se existir.
                  </p>
                )}

                {temSuspeitos && (
                  <div className="space-y-2 rounded-md border border-vermillion/40 bg-vermillion/[0.06] p-3 text-[12px]">
                    <p className="flex items-center gap-1.5 font-medium text-vermillion">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Valores fora da faixa plausível — pode ser exame trocado
                    </p>
                    <ul className="space-y-0.5 list-disc pl-4 text-graphite">
                      {preview.suspeitos.map((s, i) => (
                        <li key={`${s.tipo}-${s.campo}-${i}`}>
                          <strong className="text-ink">{s.rotulo} {s.valor}{s.unidade ? ` ${s.unidade}` : ""}</strong>{" "}
                          ({s.tipo}{s.tipo === "seguimento" ? ` dia ${s.seq}` : ""}) — {s.motivo === "baixo" ? `abaixo de ${s.min}` : `acima de ${s.max}`}
                        </li>
                      ))}
                    </ul>
                    <label className="flex items-start gap-2 pt-1 cursor-pointer">
                      <Checkbox
                        checked={confirmouSuspeitos}
                        onCheckedChange={(v) => setConfirmouSuspeitos(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-graphite">
                        Revisei estes valores e quero <strong className="text-ink">enviar mesmo assim</strong>.
                      </span>
                    </label>
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
