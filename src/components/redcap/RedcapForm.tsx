"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, AlertCircle, AlertTriangle, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { revalidarPacienteRoutes } from "@/app/(app)/pacientes/[id]/actions";
import { RedcapField } from "./RedcapField";
import type {
  FieldValue,
  FormContext,
  FormData,
  FormStatus,
  InstrumentDef,
} from "@/lib/redcap-schema/types";
import { validateField } from "@/lib/redcap-schema/validations";
import { checarDados } from "@/lib/redcap-schema/plausibilidade";
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
  /** Chamado após salvar com sucesso — o pai guarda em memória pra reabrir a
   *  seção mostrando o dado salvo na hora (sem depender do refresh do servidor). */
  onSaved?: (data: FormData, status: FormStatus) => void;
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
  onSaved,
}: Props) {
  const [data, setData] = useState<FormData>(initialData);
  const [status, setStatus] = useState<FormStatus>(initialStatus);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  const firstRender = useRef(true);
  const router = useRouter();

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

  // Núcleo do salvamento (awaitable) — sync wrapper que enfileira se offline.
  // Salva SEMPRE o estado atual, com qualquer status (completo ou não). Em ref
  // pra ficar estável e ler data/status do payload (evita closure velha).
  const persistRef = useRef<(p: { data: FormData; status: FormStatus }) => Promise<boolean>>();
  persistRef.current = async (payload) => {
    setSaving(true);
    try {
      const res = await performWithSync<UpsertColetaRedcapPayload>(
        "upsert_coleta_redcap",
        {
          paciente_id: paciente.id,
          plantao_id: paciente.plantao_id,
          instrument: instrument.id,
          seq,
          data: payload.data,
          status: payload.status,
        },
        { silent: true },
      );
      setSavedAt(new Date());
      // Guarda no pai o que foi salvo → reabrir a seção mostra na hora (não
      // depende do round-trip do servidor). Vale pra synced E queued.
      onSaved?.(payload.data, payload.status);
      // Gravou no servidor: invalida o cache RSC das rotas do paciente pra que
      // reabrir/voltar NÃO mostre dados velhos (o initialData não se atualiza
      // sozinho). Fire-and-forget. (O botão Salvar ainda dá router.refresh()
      // pra atualizar a página atual na hora.)
      if (res === "synced") {
        revalidarPacienteRoutes(paciente.plantao_id, paciente.id).catch(() => {});
      }
      return true;
    } catch (err) {
      toast.error("Erro ao salvar", { description: errMsg(err) });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Save debounced (auto-save ao editar). flush() roda o pendente na hora.
  const save = useRef(
    debounce((payload: { data: FormData; status: FormStatus }) => {
      startTransition(() => {
        void persistRef.current?.(payload);
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
    // Dispara só por edição real do usuário (data/status). calcSnapshot é lido
    // na hora, mas NÃO entra nas deps: senão a re-renderização vinda do onSaved
    // (que muda a identidade de otherForms→calcSnapshot) re-dispararia o save
    // em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, status]);

  // Não perder edições: grava o save pendente ao DESMONTAR (navegar no app /
  // fechar o instrumento) e ao ESCONDER/FECHAR a aba do navegador.
  useEffect(() => {
    const onPageHide = () => save.flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save.flush();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      save.flush();
    };
  }, [save]);

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
  const isFilled = (f: (typeof required)[number]) => {
    const v = data[f.name];
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined && v !== "";
  };
  const requiredFilled = required.filter(isFilled);
  const missingRequired = required.filter((f) => !isFilled(f));
  const canComplete = missingRequired.length === 0;

  // Blindagem: valores laboratoriais/vitais fora da faixa plausível (ex.: exame
  // trocado → hemácias 0.0059, sódio 26). Não bloqueia; pede confirmação.
  const suspeitos = useMemo(() => checarDados(data), [data]);

  // Salvar AGORA, com qualquer status (completo ou não). Cancela o debounce
  // pendente pra não gravar duas vezes.
  function salvarAgora() {
    save.cancel();
    const merged = { ...data, ...calcSnapshot };
    startTransition(async () => {
      const ok = await persistRef.current?.({ data: merged, status });
      if (ok) {
        // Re-busca a página atual: garante que reabrir o seguimento/voltar
        // mostre o que acabou de ser salvo (a prop initialData vem daqui).
        router.refresh();
        toast.success("Salvo");
      }
    });
  }

  function handleMarkComplete() {
    // Reabrir um instrumento já completo nunca precisa de validação.
    if (status === "COMPLETE") {
      aplicarStatusCompleto("INCOMPLETE");
      return;
    }
    // Faltam obrigatórios e/ou há valor implausível: não bloqueia — avisa e
    // oferece concluir assim mesmo.
    if (!canComplete || suspeitos.length > 0) {
      const partes: string[] = [];
      if (!canComplete) {
        partes.push(`Faltam ${missingRequired.length} obrigatório(s): ${missingRequired.map((f) => f.label).join(", ")}`);
      }
      if (suspeitos.length > 0) {
        partes.push(`Valor(es) suspeito(s): ${suspeitos.map((s) => `${s.rotulo} ${s.valor}`).join(", ")}`);
      }
      const titulo = suspeitos.length > 0 ? "Confira antes de concluir" : `Faltam ${missingRequired.length} campo(s) obrigatório(s)`;
      toast.warning(titulo, {
        description: partes.join(" · "),
        duration: 12000,
        action: {
          label: "Concluir mesmo assim",
          onClick: () => aplicarStatusCompleto("COMPLETE"),
        },
      });
      return;
    }
    aplicarStatusCompleto("COMPLETE");
  }

  function aplicarStatusCompleto(next: FormStatus) {
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
              await atualizarPaciente(paciente.id, { situacao: "SEG" }, paciente.plantao_id);
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
          const fullCtx = { ...ctx, data };
          const warning = validateField(instrument.id, f.name, fullCtx);
          return (
            <div key={f.name} className="space-y-1.5">
              <RedcapField
                field={f}
                value={data[f.name] ?? null}
                onChange={(v) => update(f.name, v)}
                ctx={fullCtx}
              />
              {warning && (
                <div className="flex items-start gap-1.5 rounded-md border border-saffron/30 bg-saffron/[0.08] px-2.5 py-1.5">
                  <AlertTriangle
                    className="h-3 w-3 mt-0.5 shrink-0 text-saffron"
                    strokeWidth={2}
                  />
                  <p className="text-[11px] leading-snug text-saffron">{warning}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action */}
      <div className="pt-4 border-t border-hairline space-y-2">
        <Button
          onClick={salvarAgora}
          disabled={saving}
          variant="outline"
          size="lg"
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" strokeWidth={1.8} />
          {saving ? "Salvando..." : "Salvar (mesmo incompleto)"}
        </Button>
        <Button
          onClick={handleMarkComplete}
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
        {!canComplete && status !== "COMPLETE" && required.length > 0 && (
          <div className="flex items-start gap-1.5 text-[11px] text-saffron">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              Faltam {missingRequired.length} obrigatório(s):{" "}
              {missingRequired.map((f) => f.label).join(", ")}. Dá pra concluir
              assim mesmo.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
