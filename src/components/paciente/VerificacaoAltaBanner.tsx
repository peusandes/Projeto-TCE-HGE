"use client";

import { useState } from "react";
import { AlertTriangle, Check, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SETORES, SETOR_LABEL, type Setor } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";

type Props = {
  setorAtual: Setor;
  leitoAtual: string | null;
  onConfirmAlta: () => void;
  onNaoFoiAlta: (info: { setor: Setor; leito: string | null }) => void;
};

const FIELD_LABEL = "text-[10px] uppercase tracking-editorial text-ash";
const FIELD_INPUT =
  "bg-paper-deep/50 border-hairline focus-visible:border-cobalt focus-visible:ring-0";

/**
 * Banner amarelo mostrado no topo do form de paciente quando
 * verificacao_alta = PENDENTE_HGE. Dois caminhos:
 *  - "Sim, foi alta hospitalar" → confirma alta (some o banner, vira ALTA)
 *  - "Não foi alta" → abre inline pra confirmar setor/leito e marca FORA_DOUTORE
 */
export function VerificacaoAltaBanner({
  setorAtual,
  leitoAtual,
  onConfirmAlta,
  onNaoFoiAlta,
}: Props) {
  const [step, setStep] = useState<"choose" | "locate">("choose");
  const [setor, setSetor] = useState<Setor>(setorAtual);
  const [leito, setLeito] = useState(leitoAtual ?? "");

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 space-y-3 animate-in fade-in slide-in-from-top-1",
        "border-saffron/50 bg-saffron/[0.07]",
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="h-5 w-5 text-saffron shrink-0 mt-0.5" strokeWidth={1.8} />
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-ink leading-tight">
            Verificação pendente — alta no HGE?
          </h3>
          <p className="text-[12px] text-graphite leading-relaxed mt-1">
            Você marcou esse paciente como possível alta. Confirme no
            prontuário digital do HGE se foi alta de verdade ou se sumiu só
            do mapa da neurocirurgia no Doutore.
          </p>
        </div>
      </div>

      {step === "choose" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <Button
            onClick={onConfirmAlta}
            className="bg-plum hover:bg-plum/90 text-white"
          >
            <Check className="h-4 w-4 mr-1.5" />
            Sim, foi alta hospitalar
          </Button>
          <Button
            variant="outline"
            onClick={() => setStep("locate")}
            className="border-saffron/40 text-saffron hover:bg-saffron/10 hover:text-saffron"
          >
            <X className="h-4 w-4 mr-1.5" />
            Não foi alta
          </Button>
        </div>
      )}

      {step === "locate" && (
        <div className="space-y-3 pt-2 border-t border-saffron/25">
          <p className="text-[12px] text-graphite leading-relaxed flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-saffron mt-0.5 shrink-0" strokeWidth={1.8} />
            Confirme onde o paciente está agora. Ele vai ficar marcado como
            <strong className="mx-1 text-ink">fora do mapa Doutore</strong>
            até alguém atualizar.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="conf-leito" className={FIELD_LABEL}>Leito</Label>
              <Input
                id="conf-leito"
                value={leito}
                onChange={(e) => setLeito(e.target.value)}
                placeholder="Ex.: 4"
                className={FIELD_INPUT}
              />
            </div>
            <div className="space-y-2">
              <Label className={FIELD_LABEL}>Setor</Label>
              <Select value={setor} onValueChange={(v) => setSetor(v as Setor)}>
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SETORES.filter((s) => s !== "ALTAS").map((s) => (
                    <SelectItem key={s} value={s}>
                      {SETOR_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("choose")}
              className="flex-1"
            >
              Voltar
            </Button>
            <Button
              size="sm"
              onClick={() =>
                onNaoFoiAlta({ setor, leito: leito.trim() || null })
              }
              className="flex-1 bg-saffron hover:bg-saffron/90 text-paper-deep font-semibold"
            >
              Salvar localização
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Pílula compacta mostrada quando verificacao_alta = FORA_DOUTORE.
 * Permite limpar o sinal quando o pesquisador conferir no Doutore e
 * o paciente reaparecer no mapa da neurocirurgia.
 */
export function ForaDoutoreBanner({ onLimpar }: { onLimpar: () => void }) {
  return (
    <div className="rounded-lg border border-saffron/30 bg-saffron/[0.05] px-3.5 py-2.5 flex items-center gap-2.5">
      <AlertTriangle className="h-4 w-4 text-saffron shrink-0" strokeWidth={1.8} />
      <p className="text-[12px] text-graphite leading-snug flex-1 min-w-0">
        <strong className="text-ink">Fora do mapa Doutore</strong> — paciente
        segue internado, mas sumiu da lista de neurocirurgia.
      </p>
      <button
        type="button"
        onClick={onLimpar}
        className="text-[10px] uppercase tracking-editorial text-saffron hover:text-ink underline-offset-2 hover:underline shrink-0"
      >
        Voltou ao Doutore
      </button>
    </div>
  );
}
