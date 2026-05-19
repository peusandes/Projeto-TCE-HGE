"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PhoneCall,
  PhoneMissed,
  CheckCircle2,
  ChevronDown,
  Phone,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn, errMsg } from "@/lib/utils";
import { registrarTentativaGose } from "@/app/(app)/plantoes/[id]/gose-actions";
import type { GoseLembrete } from "@/lib/data/gose-reminders";

type Props = {
  lembretes: GoseLembrete[];
};

export function GoseRemindersBanner({ lembretes }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (lembretes.length === 0) return null;

  const total = lembretes.length;
  const atrasados = lembretes.filter((l) => l.dias_atraso > 0).length;

  return (
    <div className="rounded-xl border-2 border-saffron/50 bg-saffron/[0.07] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left min-tap"
        aria-expanded={expanded}
      >
        <span className="size-8 rounded-full bg-saffron/15 border border-saffron/40 flex items-center justify-center shrink-0">
          <PhoneCall className="h-4 w-4 text-saffron" strokeWidth={1.8} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink leading-tight">
            {total} ligaç{total > 1 ? "ões" : "ão"} pendente
            {total > 1 ? "s" : ""} — GOS-E
          </p>
          <p className="text-[11px] text-saffron mt-0.5 leading-tight">
            {atrasados > 0
              ? `${atrasados} atrasada${atrasados > 1 ? "s" : ""}`
              : "Vencem hoje ou recentemente"}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-saffron transition-transform",
            expanded && "rotate-180",
          )}
          strokeWidth={1.8}
        />
      </button>

      {expanded && (
        <div className="border-t border-saffron/30 divide-y divide-saffron/20">
          {lembretes.map((l) => (
            <LembreteItem key={`${l.paciente_id}-${l.janela}`} lembrete={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function LembreteItem({ lembrete: l }: { lembrete: GoseLembrete }) {
  const [showTentativa, setShowTentativa] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleTentativa() {
    startTransition(async () => {
      try {
        await registrarTentativaGose({
          paciente_id: l.paciente_id,
          janela: l.janela,
          observacao: observacao.trim() || null,
        });
        toast.info(`Tentativa registrada — GOS-E ${l.janela}d`);
        setShowTentativa(false);
        setObservacao("");
        router.refresh();
      } catch (err) {
        toast.error("Erro ao registrar", { description: errMsg(err) });
      }
    });
  }

  const admissaoLabel = format(parseISO(l.data_admissao), "dd 'de' MMM", {
    locale: ptBR,
  });
  const dueLabel =
    l.dias_atraso > 0
      ? `atraso ${l.dias_atraso}d`
      : l.dias_atraso === 0
        ? "vence hoje"
        : `vence em ${-l.dias_atraso}d`;
  const dueColor =
    l.dias_atraso > 7
      ? "text-vermillion"
      : l.dias_atraso > 0
        ? "text-saffron"
        : "text-graphite";

  return (
    <div className="px-4 py-3 space-y-2.5 bg-paper-soft/30">
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-ink leading-tight">
            {l.paciente_nome}
          </p>
          <p className="text-[11px] text-graphite leading-tight mt-0.5">
            Admissão {admissaoLabel} ·{" "}
            <span className="font-medium text-saffron">GOS-E {l.janela}d</span>{" "}
            · <span className={cn("font-medium", dueColor)}>{dueLabel}</span>
          </p>
          {l.ultima_tentativa && (
            <p className="text-[10px] text-ash italic mt-1 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              Última tentativa{" "}
              {format(parseISO(l.ultima_tentativa.tentado_em), "dd/MM HH:mm")}
              {l.ultima_tentativa.observacao && (
                <span className="text-graphite"> — {l.ultima_tentativa.observacao}</span>
              )}
              {l.tentativas_count > 1 && (
                <span className="text-ash"> ({l.tentativas_count} tentativas)</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Telefones */}
      {l.telefones.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {l.telefones.map((tel, i) => (
            <a
              key={`${tel}-${i}`}
              href={`tel:${tel.replace(/\D/g, "")}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-paper border border-cobalt/30 text-[12px] text-cobalt-soft hover:bg-cobalt/[0.06] transition-colors font-mono"
            >
              <Phone className="h-3 w-3" strokeWidth={2} />
              {tel}
            </a>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-ash italic">
          Sem telefones cadastrados — preencha em Dados Demográficos.
        </p>
      )}

      {/* Ações */}
      {!showTentativa ? (
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/pacientes/${l.paciente_id}?tab=redcap&open=gose_${l.janela}d`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-moss text-paper text-[12px] font-medium hover:bg-moss/90 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            Preencher GOS-E
          </Link>
          <button
            type="button"
            onClick={() => setShowTentativa(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-paper border border-saffron/40 text-saffron text-[12px] font-medium hover:bg-saffron/10 transition-colors"
          >
            <PhoneMissed className="h-3.5 w-3.5" strokeWidth={2} />
            Não atendeu
          </button>
        </div>
      ) : (
        <div className="space-y-2 pt-1 border-t border-saffron/20">
          <input
            type="text"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observação opcional (ex.: caixa postal, falou que ligaria de volta)"
            className="w-full h-9 px-3 rounded-md bg-paper border border-hairline text-[12px] focus:outline-none focus:border-saffron"
            disabled={pending}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowTentativa(false);
                setObservacao("");
              }}
              disabled={pending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleTentativa}
              disabled={pending}
              className="flex-1 bg-saffron text-paper-deep hover:bg-saffron/90"
            >
              {pending ? "Registrando..." : "Registrar tentativa"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
