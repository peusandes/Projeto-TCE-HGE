"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Clock,
  CheckCircle2,
  CircleDashed,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RedcapForm } from "./RedcapForm";
import { ALL_INSTRUMENTS, INSTRUMENT_TITLE } from "@/lib/redcap-schema/instruments";
import type { FormData, FormStatus, InstrumentId } from "@/lib/redcap-schema/types";
import { criarNovaColetaSeq } from "@/app/(app)/pacientes/[id]/actions";

type Coleta = {
  instrument: InstrumentId;
  seq: number;
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

/** Instrumentos que permitem múltiplas instâncias por paciente. */
const MULTI_INSTANCE: InstrumentId[] = ["seguimento"];

function isMultiInstance(id: InstrumentId) {
  return MULTI_INSTANCE.includes(id);
}

function formatDataSeg(d: FormData): string | null {
  const raw = d.data_seg;
  if (!raw || typeof raw !== "string") return null;
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function RedcapTab({ paciente, coletas }: Props) {
  // Key composta pra identificar uma coleta específica: `${instrument}#${seq}`
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState<InstrumentId | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Agrupa coletas por instrumento, ordenadas por seq.
  const byInstrument = useMemo(() => {
    const map = new Map<InstrumentId, Coleta[]>();
    for (const c of coletas) {
      const list = map.get(c.instrument) ?? [];
      list.push(c);
      map.set(c.instrument, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.seq - b.seq);
    return map;
  }, [coletas]);

  // Context cruzado: usa SEMPRE seq=1 como "principal" do outro instrumento.
  // (Suficiente pro cálculo de campos como ISS, GCS, etc.)
  const others: Record<string, FormData> = useMemo(() => {
    const o: Record<string, FormData> = {};
    for (const c of coletas) {
      if (c.seq === 1) o[c.instrument] = c.data;
    }
    return o;
  }, [coletas]);

  function adicionarSeguimento(instrumentId: InstrumentId) {
    setAdicionando(instrumentId);
    startTransition(async () => {
      try {
        const res = await criarNovaColetaSeq({
          paciente_id: paciente.id,
          plantao_id: paciente.plantao_id,
          instrument: instrumentId,
        });
        toast.success(`Seguimento dia ${res.seq} criado`);
        router.refresh();
        // Abre a nova entrada automaticamente após o refresh.
        setOpenKey(`${instrumentId}#${res.seq}`);
      } catch (err) {
        toast.error("Não foi possível criar", { description: String(err) });
      } finally {
        setAdicionando(null);
      }
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-ash leading-relaxed">
        Coleta estruturada espelhando o REDCap (TCE 3.0 · PID 2080). Toque em um instrumento para preencher.
        Auto-salva a cada 1,5s.
      </p>

      <div className="rounded-xl border border-hairline bg-paper-deep divide-y divide-hairline overflow-hidden">
        {ALL_INSTRUMENTS.map((inst) => {
          const lista = byInstrument.get(inst.id) ?? [];
          const multi = isMultiInstance(inst.id);

          if (multi) {
            return (
              <MultiInstanceRow
                key={inst.id}
                instrumentId={inst.id}
                title={INSTRUMENT_TITLE[inst.id]}
                coletas={lista}
                openKey={openKey}
                onToggle={(k) => setOpenKey(openKey === k ? null : k)}
                onAdd={() => adicionarSeguimento(inst.id)}
                adicionando={adicionando === inst.id}
                paciente={paciente}
                otherForms={others}
              />
            );
          }

          // Single-instance: comportamento original (sempre seq=1)
          const coleta = lista[0];
          const status: FormStatus = coleta?.status ?? "INCOMPLETE";
          const meta = STATUS_META[status];
          const key = `${inst.id}#1`;
          const isOpen = openKey === key;
          const Icon = meta.Icon;

          return (
            <div key={inst.id}>
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : key)}
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
                    seq={1}
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

/* ─────────── Multi-instance row (seguimento) ─────────── */

function MultiInstanceRow({
  instrumentId,
  title,
  coletas,
  openKey,
  onToggle,
  onAdd,
  adicionando,
  paciente,
  otherForms,
}: {
  instrumentId: InstrumentId;
  title: string;
  coletas: Coleta[];
  openKey: string | null;
  onToggle: (key: string) => void;
  onAdd: () => void;
  adicionando: boolean;
  paciente: { id: string; nome: string; plantao_id: string };
  otherForms: Record<string, FormData>;
}) {
  const [expanded, setExpanded] = useState(false);

  const completos = coletas.filter((c) => c.status === "COMPLETE").length;
  const total = coletas.length;
  const summary =
    total === 0
      ? "Nenhum dia ainda"
      : `${total} dia${total > 1 ? "s" : ""} · ${completos}/${total} completo${completos === 1 ? "" : "s"}`;
  const summaryColor =
    total === 0
      ? "text-saffron"
      : completos === total
        ? "text-moss"
        : "text-cobalt-soft";

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-paper-soft transition-colors min-tap"
      >
        <CircleDashed className={cn("h-4 w-4 shrink-0", summaryColor)} strokeWidth={1.8} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-ink">{title}</p>
          <p className={cn("text-[11px]", summaryColor)}>{summary}</p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-ash transition-transform", expanded && "rotate-180")}
          strokeWidth={1.8}
        />
      </button>

      {expanded && (
        <div className="bg-paper-soft border-t border-hairline">
          {coletas.length === 0 && (
            <div className="px-4 py-5 text-center">
              <p className="text-[12px] text-ash">
                Nenhum seguimento registrado ainda.
              </p>
            </div>
          )}

          {coletas.map((c) => {
            const meta = STATUS_META[c.status];
            const Icon = meta.Icon;
            const key = `${instrumentId}#${c.seq}`;
            const isOpen = openKey === key;
            const dataLabel = formatDataSeg(c.data);

            return (
              <div key={key} className="border-t border-hairline first:border-t-0">
                <button
                  type="button"
                  onClick={() => onToggle(key)}
                  className="w-full flex items-center gap-3 px-4 py-3 pl-9 text-left hover:bg-paper transition-colors min-tap"
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} strokeWidth={1.8} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink">
                      Dia {c.seq}
                      {dataLabel && (
                        <span className="ml-2 text-[11px] font-normal text-ash">
                          · {dataLabel}
                        </span>
                      )}
                    </p>
                    <p className={cn("text-[10px]", meta.color)}>{meta.label}</p>
                  </div>
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 text-ash transition-transform", isOpen && "rotate-180")}
                    strokeWidth={1.8}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 pt-1 bg-paper">
                    <RedcapForm
                      instrument={ALL_INSTRUMENTS.find((i) => i.id === instrumentId)!}
                      paciente={paciente}
                      seq={c.seq}
                      initialData={c.data}
                      initialStatus={c.status}
                      otherForms={otherForms}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Botão adicionar */}
          <button
            type="button"
            onClick={onAdd}
            disabled={adicionando}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 pl-9 text-left",
              "border-t border-hairline first:border-t-0",
              "text-cobalt-soft hover:bg-cobalt/[0.06] transition-colors min-tap",
              "disabled:opacity-50",
            )}
          >
            {adicionando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            ) : (
              <span className="size-5 rounded-full border border-cobalt/40 flex items-center justify-center shrink-0">
                <Plus className="h-3 w-3" strokeWidth={2.4} />
              </span>
            )}
            <span className="text-[13px] font-medium">
              {adicionando ? "Criando..." : "Adicionar dia de seguimento"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
