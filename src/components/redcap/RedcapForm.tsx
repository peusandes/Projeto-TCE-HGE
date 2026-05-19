"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, CircleDashed, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RedcapField } from "./RedcapField";
import type {
  FieldValue,
  FormContext,
  FormData,
  FormStatus,
  InstrumentDef,
} from "@/lib/redcap-schema/types";
import { performWithSync } from "@/lib/sync/perform";
import type { UpsertColetaRedcapPayload } from "@/lib/sync/executors";
import { debounce, cn, errMsg } from "@/lib/utils";

type Props = {
  instrument: InstrumentDef;
  paciente: { id: string; nome: string; plantao_id: string };
  /** Instância dessa coleta. 1 pra single-shot, >1 pra seguimento dia N. */
  seq?: number;
  initialData: FormData;
  initialStatus: FormStatus;
  otherForms: Record<string, FormData>;
};

const STATUS_LABEL: Record<FormStatus, string> = {
  INCOMPLETE: "Incompleto",
  UNVERIFIED: "Não verificado",
  COMPLETE: "Completo",
};

export function RedcapForm({
  instrument,
  paciente,
  seq = 1,
  initialData,
  initialStatus,
  otherForms,
}: Props) {
  const [data, setData] = useState<FormData>(initialData);
  const [status, setStatus] = useState<FormStatus>(initialStatus);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  const firstRender = useRef(true);

  const ctx: FormContext = useMemo(
    () => ({ data, others: otherForms, paciente: { id: paciente.id, nome: paciente.nome } }),
    [data, otherForms, paciente.id, paciente.nome],
  );

  // Pré-preenche record_id com o nome do paciente se vazio
  useEffect(() => {
    if (instrument.id === "status_de_admisso" && !data.record_id) {
      setData((d) => ({ ...d, record_id: paciente.nome }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrument.id, paciente.nome]);

  // Persiste calc fields no payload sempre que mudam (evita drift na exportação)
  const calcSnapshot = useMemo(() => {
    const next: FormData = {};
    for (const f of instrument.fields) {
      if (f.type === "calc" && f.calc) {
        const v = f.calc({ ...ctx, data });
        next[f.name] = v === undefined ? null : (v as FieldValue);
      }
    }
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, otherForms]);

  // Save (debounced) — usa sync wrapper que enfileira se offline
  const save = useRef(
    debounce(async (payload: { data: FormData; status: FormStatus }) => {
      setSaving(true);
      startTransition(async () => {
        try {
          const op: UpsertColetaRedcapPayload = {
            paciente_id: paciente.id,
            plantao_id: paciente.plantao_id,
            instrument: instrument.id,
            seq,
            data: payload.data,
            status: payload.status,
          };
          await performWithSync<UpsertColetaRedcapPayload>(
            "upsert_coleta_redcap",
            op,
            { silent: true },
          );
          setSavedAt(new Date());
        } catch (err) {
          toast.error("Erro ao salvar", { description: errMsg(err) });
        } finally {
          setSaving(false);
        }
      });
    }, 1500),
  ).current;

  // Auto-save quando dados mudam
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const merged = { ...data, ...calcSnapshot };
    save({ data: merged, status });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, calcSnapshot, status]);

  const update = useCallback((name: string, value: FieldValue) => {
    setData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Conta required preenchidos pra calcular progresso
  const visibleFields = useMemo(
    () =>
      instrument.fields.filter(
        (f) =>
          f.type !== "descriptive" &&
          (!f.showWhen || f.showWhen({ ...ctx, data })),
      ),
    [instrument.fields, ctx, data],
  );
  const required = visibleFields.filter((f) => f.required);
  const requiredFilled = required.filter((f) => {
    const v = data[f.name];
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined && v !== "";
  });
  const canComplete = required.length === 0 || requiredFilled.length === required.length;

  function handleMarkComplete() {
    if (!canComplete) {
      toast.warning("Preencha todos os campos obrigatórios antes de marcar como Completo.");
      return;
    }
    const next: FormStatus = status === "COMPLETE" ? "INCOMPLETE" : "COMPLETE";
    setStatus(next);
    toast.success(`Marcado como ${STATUS_LABEL[next]}`);

    // Auto-link: ao completar instrumento de seguimento, oferece atualizar
    // a situação do paciente pra SEG (se ainda estiver em ADM).
    if (next === "COMPLETE" && instrument.id === "seguimento") {
      toast.info("Atualizar situação do paciente?", {
        description: "Marcar como Seguimento (se ainda estiver em Admissão)",
        duration: 8000,
        action: {
          label: "Sim",
          onClick: async () => {
            try {
              const { atualizarPaciente } = await import(
                "@/app/(app)/pacientes/[id]/actions"
              );
              await atualizarPaciente(paciente.id, { situacao: "SEG" });
              toast.success("Paciente marcado como Seguimento");
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              toast.error("Erro ao atualizar", { description: msg });
            }
          },
        },
      });
    }
  }

  return (
    <div className="space-y-5">
      {/* Status + progresso */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-mono text-ash">
          {required.length > 0
            ? `${requiredFilled.length}/${required.length} obrigatórios`
            : `${visibleFields.length} campos`}
        </span>
        <span className="flex items-center gap-1.5 text-ash">
          <span
            className={cn(
              "size-1.5 rounded-full",
              saving ? "bg-saffron" : "bg-moss",
            )}
          />
          {saving
            ? "salvando..."
            : savedAt
              ? `salvo às ${savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
              : "auto-salva ao editar"}
        </span>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        {instrument.fields.map((f) => {
          if (f.showWhen && !f.showWhen({ ...ctx, data })) return null;
          return (
            <RedcapField
              key={f.name}
              field={f}
              value={data[f.name] ?? null}
              onChange={(v) => update(f.name, v)}
              ctx={{ ...ctx, data }}
            />
          );
        })}
      </div>

      {/* Action */}
      <div className="pt-4 border-t border-hairline space-y-2">
        <Button
          onClick={handleMarkComplete}
          disabled={!canComplete}
          size="lg"
          className={cn(
            "w-full",
            status === "COMPLETE" && "bg-moss hover:bg-moss/90 text-paper",
          )}
        >
          {status === "COMPLETE" ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" strokeWidth={1.8} />
              Completo — toque para reabrir
            </>
          ) : (
            <>
              <CircleDashed className="h-4 w-4 mr-2" strokeWidth={1.8} />
              Marcar como Completo
            </>
          )}
        </Button>
        {!canComplete && required.length > 0 && (
          <p className="text-[11px] text-saffron flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3" />
            Faltam {required.length - requiredFilled.length} obrigatório(s) para concluir.
          </p>
        )}
      </div>
    </div>
  );
}
