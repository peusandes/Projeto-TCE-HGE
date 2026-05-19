import { cn } from "@/lib/utils";
import {
  SITUACAO_LABEL,
  TCLE_LABEL,
  type Situacao,
  type TcleStatus,
} from "@/lib/domain/enums";

const PILL_BASE =
  "inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[10px] uppercase tracking-[0.06em] font-medium leading-none border";

const SIT_THEME: Record<Situacao, { text: string; bg: string; dot: string; border: string }> = {
  ADM:      { text: "text-cobalt-soft", bg: "bg-cobalt/15",  dot: "bg-cobalt-soft", border: "border-cobalt/25" },
  SEG:      { text: "text-moss",        bg: "bg-moss/15",    dot: "bg-moss",        border: "border-moss/25" },
  EXCLUSAO: { text: "text-vermillion",  bg: "bg-vermillion/15", dot: "bg-vermillion", border: "border-vermillion/30" },
  ALTA:     { text: "text-plum",        bg: "bg-plum/15",    dot: "bg-plum",        border: "border-plum/25" },
};

const TCLE_THEME: Record<TcleStatus, { text: string; bg: string; dot: string; border: string }> = {
  PENDENTE: { text: "text-saffron",    bg: "bg-saffron/15",    dot: "bg-saffron",    border: "border-saffron/30" },
  ASSINADO: { text: "text-moss",       bg: "bg-moss/15",       dot: "bg-moss",       border: "border-moss/25" },
  RECUSADO: { text: "text-vermillion", bg: "bg-vermillion/15", dot: "bg-vermillion", border: "border-vermillion/30" },
  NA:       { text: "text-ash",        bg: "bg-paper-soft",    dot: "bg-ash",        border: "border-hairline" },
};

export function SituacaoBadge({ value }: { value: Situacao }) {
  const t = SIT_THEME[value];
  return (
    <span className={cn(PILL_BASE, t.text, t.bg, t.border)}>
      <span className={cn("size-1.5 rounded-full", t.dot)} />
      {SITUACAO_LABEL[value]}
    </span>
  );
}

export function TcleBadge({ value }: { value: TcleStatus }) {
  const t = TCLE_THEME[value];
  const short =
    value === "PENDENTE" ? "TCLE pend." :
    value === "ASSINADO" ? "TCLE ok" :
    `TCLE ${TCLE_LABEL[value]}`;
  return (
    <span className={cn(PILL_BASE, t.text, t.bg, t.border)}>
      <span className={cn("size-1.5 rounded-full", t.dot)} />
      {short}
    </span>
  );
}

export const SITUACAO_ACCENT: Record<Situacao, string> = {
  ADM: "bg-cobalt",
  SEG: "bg-moss",
  EXCLUSAO: "bg-vermillion/70",
  ALTA: "bg-plum",
};
