"use client";

import { useState } from "react";
import { ChevronDown, Clock, CheckCircle2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { RedcapForm } from "./RedcapForm";
import { ALL_INSTRUMENTS, INSTRUMENT_TITLE } from "@/lib/redcap-schema/instruments";
import type { FormData, FormStatus, InstrumentId } from "@/lib/redcap-schema/types";

type Coleta = {
  instrument: InstrumentId;
  data: FormData;
  status: FormStatus;
};

type Props = {
  paciente: { id: string; nome: string; plantao_id: string };
  coletas: Coleta[];
};

const STATUS_META: Record<FormStatus, { label: string; color: string; Icon: typeof Clock }> = {
  INCOMPLETE: { label: "Incompleto", color: "text-saffron", Icon: CircleDashed },
  UNVERIFIED: { label: "Não verificado", color: "text-cobalt-soft", Icon: Clock },
  COMPLETE: { label: "Completo", color: "text-moss", Icon: CheckCircle2 },
};

export function RedcapTab({ paciente, coletas }: Props) {
  const [openId, setOpenId] = useState<InstrumentId | null>(null);

  const byInstrument: Record<string, Coleta | undefined> = {};
  for (const c of coletas) byInstrument[c.instrument] = c;

  const others: Record<string, FormData> = {};
  for (const c of coletas) others[c.instrument] = c.data;

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-ash leading-relaxed">
        Coleta estruturada espelhando o REDCap (TCE 3.0 · PID 2080). Toque em um instrumento para preencher.
        Auto-salva a cada 1,5s.
      </p>

      <div className="rounded-xl border border-hairline bg-paper-deep divide-y divide-hairline overflow-hidden">
        {ALL_INSTRUMENTS.map((inst) => {
          const coleta = byInstrument[inst.id];
          const status: FormStatus = coleta?.status ?? "INCOMPLETE";
          const meta = STATUS_META[status];
          const isOpen = openId === inst.id;
          const Icon = meta.Icon;

          return (
            <div key={inst.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : inst.id)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-paper-soft transition-colors min-tap"
              >
                <Icon className={cn("h-4 w-4 shrink-0", meta.color)} strokeWidth={1.8} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-ink">{INSTRUMENT_TITLE[inst.id]}</p>
                  <p className={cn("text-[11px]", meta.color)}>{meta.label}</p>
                </div>
                <ChevronDown
                  className={cn("h-4 w-4 text-ash transition-transform", isOpen && "rotate-180")}
                  strokeWidth={1.8}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-5 pt-1 bg-paper">
                  <RedcapForm
                    instrument={inst}
                    paciente={paciente}
                    initialData={coleta?.data ?? {}}
                    initialStatus={status}
                    otherForms={others}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-ash text-center pt-2">
        11 instrumentos · TCE 3.0 · PID 2080
      </p>
    </div>
  );
}
