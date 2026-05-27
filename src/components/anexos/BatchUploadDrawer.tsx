"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { parseDateFromFilename } from "@/lib/utils/parse-filename-date";
import { parsePatientNameFromFilename } from "@/lib/utils/parse-filename-patient";
import {
  matchPacienteByFilename,
  type FuzzyClassification,
  type ScoredCandidate,
} from "@/lib/utils/fuzzy-match-paciente";
import {
  fmtSize,
  isImageFile,
  isPdfFile,
  uploadOne as pipelineUploadOne,
} from "@/lib/anexos/upload-pipeline";
import { cn } from "@/lib/utils";

/* ─────────── Constantes ─────────── */

// Limites mais generosos que o uploader single (este é o caso de uso de
// "mandei 30 fotos do dia"). 50/500/50 aprovado pelo Peu.
const MAX_FILES_PER_BATCH = 50;
const MAX_BATCH_MB = 500;
const MAX_FILE_MB = 50;
const CONCURRENCY = 3;
const TIPO_LOTE = "EXAME_LABORATORIAL" as const;

type RowStatus = "queued" | "uploading" | "done" | "error";

type ReviewRow = {
  id: string;
  file: File;
  /** Nome do paciente extraído do filename. */
  nomeRaw: string | null;
  /** Data parseada do filename (ISO YYYY-MM-DD) ou null. */
  parsedDate: string | null;
  /** Top-3 candidatos do matcher. */
  candidates: ScoredCandidate[];
  classification: FuzzyClassification;
  /** Paciente escolhido (após resolução manual ou auto). null = não resolvido. */
  paciente_id: string | null;
  /** Data efetiva pra envio (default parsedDate; editável). */
  data_referencia: string | null;
  /** Anexo igual já existe no banco? (paciente + data + tipo lab) */
  duplicate: boolean;
  status: RowStatus;
};

type MapaPaciente = { id: string; nome: string };

function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

/* ─────────── Componente ─────────── */

export function BatchUploadDrawer({
  plantaoId,
  pacientes,
  open,
  onClose,
}: {
  plantaoId: string;
  pacientes: MapaPaciente[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [descricao, setDescricao] = useState("");
  const [pending, startTransition] = useTransition();
  const [showAttributed, setShowAttributed] = useState(false);
  const statusesRef = useRef<RowStatus[]>([]);
  const abortRefs = useRef<Map<string, AbortController>>(new Map());
  const fileInput = useRef<HTMLInputElement>(null);

  const totalSize = useMemo(
    () => rows.reduce((s, r) => s + r.file.size, 0),
    [rows],
  );

  // Adapta o formato do mapa pro shape esperado pelo matcher fuzzy.
  const matcherCandidates = useMemo(
    () => pacientes.map((p) => ({ paciente_id: p.id, nome: p.nome })),
    [pacientes],
  );

  const groups = useMemo(() => {
    const unassigned: ReviewRow[] = [];
    const ambiguous: ReviewRow[] = [];
    const assigned: ReviewRow[] = [];
    for (const r of rows) {
      if (!r.paciente_id || !r.data_referencia) {
        unassigned.push(r);
      } else if (r.classification === "AMBIGUO") {
        ambiguous.push(r);
      } else {
        assigned.push(r);
      }
    }
    return { unassigned, ambiguous, assigned };
  }, [rows]);

  const canSend =
    rows.length > 0 &&
    groups.unassigned.length === 0 &&
    groups.ambiguous.length === 0 &&
    !pending;

  /* ─── reset ao fechar ─── */
  useEffect(() => {
    if (!open) {
      setRows([]);
      setDescricao("");
      setShowAttributed(false);
      statusesRef.current = [];
      abortRefs.current.forEach((c) => c.abort(new Error("fechado")));
      abortRefs.current.clear();
    }
  }, [open]);

  /* ─── adicionar arquivos ─── */

  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      if (list.length === 0) return;

      // Validações por arquivo + agregado
      const accepted: File[] = [];
      const reasons: string[] = [];
      const currentSize = rows.reduce((s, r) => s + r.file.size, 0);
      const currentCount = rows.length;
      let runningSize = currentSize;
      const existingKeys = new Set(
        rows.map((r) => `${r.file.name}|${r.file.size}`),
      );

      for (const f of list) {
        if (currentCount + accepted.length >= MAX_FILES_PER_BATCH) {
          reasons.push(`Limite de ${MAX_FILES_PER_BATCH} arquivos por lote`);
          break;
        }
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          reasons.push(`${f.name} excede ${MAX_FILE_MB} MB`);
          continue;
        }
        if (runningSize + f.size > MAX_BATCH_MB * 1024 * 1024) {
          reasons.push(`Lote ultrapassaria ${MAX_BATCH_MB} MB total`);
          break;
        }
        if (existingKeys.has(`${f.name}|${f.size}`)) {
          reasons.push(`${f.name} já está no lote`);
          continue;
        }
        // Aceita PDF + qualquer imagem reconhecida (incluindo HEIC).
        if (!isPdfFile(f) && !isImageFile(f)) {
          reasons.push(`${f.name}: formato não suportado`);
          continue;
        }
        existingKeys.add(`${f.name}|${f.size}`);
        runningSize += f.size;
        accepted.push(f);
      }

      if (reasons.length > 0) {
        toast.warning("Alguns arquivos foram ignorados", {
          description: reasons.slice(0, 3).join(" · "),
        });
      }
      if (accepted.length === 0) return;

      const newRows: ReviewRow[] = accepted.map((file) => {
        const nomeRaw = parsePatientNameFromFilename(file.name);
        const parsedDate = parseDateFromFilename(file.name);
        const match = matchPacienteByFilename(nomeRaw, matcherCandidates);
        const paciente_id =
          match.classification === "AUTO" || match.classification === "SUGERIDO"
            ? (match.top?.paciente_id ?? null)
            : null;
        return {
          id: shortId(),
          file,
          nomeRaw,
          parsedDate,
          candidates: match.candidates,
          classification: match.classification,
          paciente_id,
          data_referencia: parsedDate,
          duplicate: false,
          status: "queued",
        };
      });

      setRows((prev) => [...prev, ...newRows]);
      statusesRef.current = [
        ...statusesRef.current,
        ...newRows.map(() => "queued" as RowStatus),
      ];

      // Query duplicatas existentes no banco — só pra rows que já têm
      // paciente + data atribuídos. Não bloqueia, só sinaliza.
      await flagDuplicates(newRows);
    },
    [rows, matcherCandidates],
  );

  async function flagDuplicates(newRows: ReviewRow[]) {
    const targets = newRows.filter((r) => r.paciente_id && r.data_referencia);
    if (targets.length === 0) return;

    const supabase = createClient();
    const ids = [...new Set(targets.map((r) => r.paciente_id!))];
    const dates = [...new Set(targets.map((r) => r.data_referencia!))];
    const { data, error } = await supabase
      .from("anexos")
      .select("paciente_id, data_referencia")
      .eq("tipo_anexo", TIPO_LOTE)
      .in("paciente_id", ids)
      .in("data_referencia", dates);

    if (error) {
      // best-effort, não trava o fluxo
      console.warn("[batch] dup check falhou:", error.message);
      return;
    }

    const dupKeys = new Set(
      (data ?? []).map((d) => `${d.paciente_id}|${d.data_referencia}`),
    );
    setRows((prev) =>
      prev.map((r) => {
        if (!r.paciente_id || !r.data_referencia) return r;
        const key = `${r.paciente_id}|${r.data_referencia}`;
        return dupKeys.has(key) ? { ...r, duplicate: true } : r;
      }),
    );
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const fl = e.target.files;
    if (fl && fl.length > 0) {
      addFiles(fl);
      e.target.value = "";
    }
  }

  /* ─── editar linha ─── */

  function updatePaciente(id: string, paciente_id: string | null) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        // Se user resolveu manualmente um ambíguo/não-atribuído, classifica
        // como SUGERIDO (pra sumir das seções de pendência). Mantém score
        // dos candidatos pra exibir no badge.
        const next: ReviewRow = {
          ...r,
          paciente_id,
          classification: paciente_id ? "SUGERIDO" : "NAO_ATRIBUIDO",
          duplicate: false, // reavaliar
        };
        return next;
      }),
    );
    // Reverifica duplicata da linha editada
    setTimeout(() => {
      setRows((cur) => {
        const target = cur.find((r) => r.id === id);
        if (target && target.paciente_id && target.data_referencia) {
          flagDuplicates([target]);
        }
        return cur;
      });
    }, 0);
  }

  function updateData(id: string, data: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, data_referencia: data || null, duplicate: false }
          : r,
      ),
    );
    setTimeout(() => {
      setRows((cur) => {
        const target = cur.find((r) => r.id === id);
        if (target && target.paciente_id && target.data_referencia) {
          flagDuplicates([target]);
        }
        return cur;
      });
    }, 0);
  }

  function discardRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  /* ─── upload ─── */

  function setRowStatus(id: string, status: RowStatus) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  async function uploadRow(row: ReviewRow): Promise<"done" | "error"> {
    if (!row.paciente_id || !row.data_referencia) return "error";
    setRowStatus(row.id, "uploading");
    const controller = new AbortController();
    abortRefs.current.set(row.id, controller);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const result = await pipelineUploadOne(supabase, {
        file: row.file,
        paciente_id: row.paciente_id,
        plantao_id: plantaoId,
        tipo_anexo: TIPO_LOTE,
        data_referencia: row.data_referencia,
        descricao: descricao || null,
        enviado_por: user?.id ?? null,
        controller,
      });
      if (!result.ok) {
        console.error(`[batch] ${row.file.name} falhou:`, result.error);
        setRowStatus(row.id, "error");
        return "error";
      }
      setRowStatus(row.id, "done");
      return "done";
    } catch (err) {
      console.error(`[batch] ${row.file.name} falhou:`, err);
      setRowStatus(row.id, "error");
      return "error";
    } finally {
      abortRefs.current.delete(row.id);
    }
  }

  function handleSend() {
    if (!canSend) return;

    startTransition(async () => {
      // Idempotência: só envia o que não está done
      const targets = rows.filter((r) => r.status !== "done");
      if (targets.length === 0) {
        toast.info("Todos os arquivos já foram enviados");
        return;
      }

      // Reset status dos targets
      setRows((prev) =>
        prev.map((r) =>
          r.status !== "done" ? { ...r, status: "queued" } : r,
        ),
      );

      // Pool concorrente
      const queue = [...targets];
      const results: Array<"done" | "error"> = [];
      const runNext = async (): Promise<void> => {
        while (true) {
          const row = queue.shift();
          if (!row) return;
          // Pega versão fresca do row (data/paciente podem ter mudado)
          const fresh =
            (rowsRef.current ?? rows).find((r) => r.id === row.id) ?? row;
          const r = await uploadRow(fresh);
          results.push(r);
        }
      };
      const pool: Promise<void>[] = [];
      for (let n = 0; n < Math.min(CONCURRENCY, targets.length); n++) {
        pool.push(runNext());
      }
      await Promise.all(pool);

      const ok = results.filter((r) => r === "done").length;
      const err = results.filter((r) => r === "error").length;
      const total = targets.length;

      if (ok > 0 && err === 0) {
        toast.success(`${ok} exames anexados`);
        setTimeout(() => {
          onClose();
          router.refresh();
        }, 500);
      } else if (ok > 0 && err > 0) {
        toast.warning(`${ok}/${total} enviados`, {
          description: `${err} falharam — toque em "Reenviar falhos"`,
          duration: 6000,
        });
        router.refresh();
      } else {
        toast.error("Nenhum anexo enviado", {
          description: "Verifique a conexão e tente novamente.",
        });
      }
    });
  }

  // Mantém ref fresca pra usar dentro do pool
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  function retryFalhos() {
    const falhos = rows.filter((r) => r.status === "error");
    if (falhos.length === 0) return;
    startTransition(async () => {
      const queue = [...falhos];
      const runNext = async (): Promise<void> => {
        while (true) {
          const row = queue.shift();
          if (!row) return;
          const fresh = rowsRef.current.find((r) => r.id === row.id) ?? row;
          await uploadRow(fresh);
        }
      };
      const pool: Promise<void>[] = [];
      for (let n = 0; n < Math.min(CONCURRENCY, falhos.length); n++) {
        pool.push(runNext());
      }
      await Promise.all(pool);
      router.refresh();
    });
  }

  function abortAll() {
    abortRefs.current.forEach((c) =>
      c.abort(new Error("Cancelado pelo usuário")),
    );
    abortRefs.current.clear();
  }

  /* ─── render ─── */

  const hasFiles = rows.length > 0;
  const uploading = rows.some((r) => r.status === "uploading");
  const doneCount = rows.filter((r) => r.status === "done").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <Drawer open={open} dismissible={false} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DrawerTitle>Upload em lote — Exames laboratoriais</DrawerTitle>
              <DrawerDescription className="mt-1">
                Renomeie os arquivos como <code className="font-mono text-[11px]">nome_DD_MM.pdf</code>{" "}
                (ex.: <code className="font-mono text-[11px]">joao_silva_18_05.pdf</code>). O sistema
                identifica o paciente do plantão e a data automaticamente.
              </DrawerDescription>
            </div>
            <button
              type="button"
              onClick={() => {
                if (uploading) abortAll();
                onClose();
              }}
              aria-label="Fechar"
              className="size-9 -mr-1 -mt-1 shrink-0 rounded-full flex items-center justify-center text-graphite hover:text-ink hover:bg-paper-soft transition-colors"
            >
              <X className="h-5 w-5" strokeWidth={1.8} />
            </button>
          </div>
        </DrawerHeader>

        <div className="space-y-4">
          {/* Drop / seleção */}
          {!hasFiles && (
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-cobalt/40 bg-cobalt/5 p-8 cursor-pointer hover:bg-cobalt/10 transition-colors">
              <Upload className="h-7 w-7 text-cobalt" />
              <span className="text-sm font-medium text-ink">
                Selecionar arquivos
              </span>
              <span className="text-[11px] text-ash">
                Até {MAX_FILES_PER_BATCH} arquivos · {MAX_BATCH_MB} MB no total · PDF, JPG, PNG, HEIC
              </span>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept="image/*,application/pdf,.heic,.heif"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
          )}

          {hasFiles && (
            <div className="flex items-center justify-between text-[12px] text-graphite">
              <div>
                <span className="font-medium">{rows.length}</span>{" "}
                {rows.length === 1 ? "arquivo" : "arquivos"} ·{" "}
                {fmtSize(totalSize)}
              </div>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="text-cobalt text-[12px] inline-flex items-center gap-1 hover:underline disabled:opacity-50"
                disabled={uploading || rows.length >= MAX_FILES_PER_BATCH}
              >
                <Paperclip className="h-3.5 w-3.5" /> Adicionar mais
              </button>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept="image/*,application/pdf,.heic,.heif"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          )}

          {/* Descrição opcional */}
          {hasFiles && (
            <div>
              <label className="text-[11px] uppercase tracking-editorial text-ash">
                Descrição (opcional, aplicada a todos)
              </label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: laboratório do dia"
                disabled={uploading}
                className="mt-1 bg-paper-soft border-hairline"
              />
            </div>
          )}

          {/* Grupos de revisão */}
          {groups.unassigned.length > 0 && (
            <SectionUnassigned
              rows={groups.unassigned}
              pacientes={pacientes}
              onPaciente={updatePaciente}
              onData={updateData}
              onDiscard={discardRow}
              disabled={uploading}
            />
          )}

          {groups.ambiguous.length > 0 && (
            <SectionAmbiguous
              rows={groups.ambiguous}
              pacientes={pacientes}
              onPaciente={updatePaciente}
              onData={updateData}
              onDiscard={discardRow}
              disabled={uploading}
            />
          )}

          {groups.assigned.length > 0 && (
            <SectionAssigned
              rows={groups.assigned}
              pacientes={pacientes}
              collapsed={!showAttributed}
              onToggle={() => setShowAttributed((v) => !v)}
              onPaciente={updatePaciente}
              onData={updateData}
              onDiscard={discardRow}
              disabled={uploading}
            />
          )}
        </div>

        <DrawerFooter>
          {errorCount > 0 && !uploading && (
            <Button
              type="button"
              variant="outline"
              onClick={retryFalhos}
              disabled={pending}
            >
              Reenviar falhos ({errorCount})
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            disabled={!canSend}
            onClick={handleSend}
          >
            {uploading
              ? `Enviando ${doneCount}/${rows.length}...`
              : !hasFiles
                ? "Adicione arquivos"
                : groups.unassigned.length + groups.ambiguous.length > 0
                  ? `Resolva ${groups.unassigned.length + groups.ambiguous.length} pendência(s)`
                  : `Enviar ${rows.length} exame(s)`}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (uploading) abortAll();
              onClose();
            }}
          >
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/* ─────────── Sub-seções ─────────── */

function RowCommon({
  row,
  pacientes,
  onPaciente,
  onData,
  onDiscard,
  disabled,
  showCandidates,
}: {
  row: ReviewRow;
  pacientes: MapaPaciente[];
  onPaciente: (id: string, paciente_id: string | null) => void;
  onData: (id: string, data: string) => void;
  onDiscard: (id: string) => void;
  disabled: boolean;
  showCandidates: boolean;
}) {
  const pacienteAtual = pacientes.find((p) => p.id === row.paciente_id);
  const FileIcon = isPdfFile(row.file) ? FileText : ImageIcon;
  return (
    <div className="space-y-2 py-2">
      <div className="flex items-start gap-2 text-[12px]">
        <FileIcon className="h-4 w-4 mt-0.5 text-ash shrink-0" strokeWidth={1.6} />
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[11px] text-graphite truncate">
            {row.file.name}
          </div>
          {row.nomeRaw && (
            <div className="text-[11px] text-ash">
              Detectado: <span className="italic">{row.nomeRaw}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDiscard(row.id)}
          disabled={disabled}
          aria-label="Descartar"
          className="size-7 shrink-0 rounded-md flex items-center justify-center text-ash hover:text-vermillion hover:bg-vermillion/10 transition-colors disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {showCandidates && row.candidates.length > 0 && (
        <div className="ml-6 space-y-1">
          {row.candidates.slice(0, 3).map((c) => (
            <label
              key={c.paciente_id}
              className="flex items-center gap-2 text-[12px] cursor-pointer"
            >
              <input
                type="radio"
                name={`paciente-${row.id}`}
                checked={row.paciente_id === c.paciente_id}
                onChange={() => onPaciente(row.id, c.paciente_id)}
                disabled={disabled}
                className="accent-cobalt"
              />
              <span className="flex-1">{c.nome}</span>
              <span className="font-mono text-[10px] text-ash tab-num">
                {Math.round(c.score * 100)}%
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="ml-6 grid grid-cols-[1fr_auto] gap-2">
        <select
          value={row.paciente_id ?? ""}
          onChange={(e) => onPaciente(row.id, e.target.value || null)}
          disabled={disabled}
          className="h-9 px-2 text-[13px] rounded-md bg-paper-soft border border-hairline focus:outline-none focus:border-cobalt min-w-0"
        >
          <option value="">
            {pacienteAtual ? "— escolher outro —" : "— selecionar paciente —"}
          </option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={row.data_referencia ?? ""}
          onChange={(e) => onData(row.id, e.target.value)}
          disabled={disabled}
          className="h-9 px-2 text-[13px] rounded-md bg-paper-soft border border-hairline focus:outline-none focus:border-cobalt tab-num"
        />
      </div>

      {row.duplicate && (
        <div className="ml-6 text-[11px] text-saffron inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Já existe um exame lab desse paciente nesse dia
        </div>
      )}

      <RowStatusBadge status={row.status} />
    </div>
  );
}

function RowStatusBadge({ status }: { status: RowStatus }) {
  if (status === "queued") return null;
  if (status === "uploading") {
    return (
      <div className="ml-6 text-[11px] text-cobalt inline-flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Enviando...
      </div>
    );
  }
  if (status === "done") {
    return (
      <div className="ml-6 text-[11px] text-moss inline-flex items-center gap-1">
        <Check className="h-3 w-3" /> Enviado
      </div>
    );
  }
  return (
    <div className="ml-6 text-[11px] text-vermillion inline-flex items-center gap-1">
      <AlertCircle className="h-3 w-3" /> Falhou
    </div>
  );
}

function SectionUnassigned(props: {
  rows: ReviewRow[];
  pacientes: MapaPaciente[];
  onPaciente: (id: string, paciente_id: string | null) => void;
  onData: (id: string, data: string) => void;
  onDiscard: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border border-vermillion/30 bg-vermillion/5 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-editorial font-semibold text-vermillion mb-2">
        <AlertCircle className="h-3.5 w-3.5" />
        {props.rows.length} não atribuído(s) — resolva antes de enviar
      </div>
      <div className="divide-y divide-vermillion/15">
        {props.rows.map((r) => (
          <RowCommon
            key={r.id}
            row={r}
            pacientes={props.pacientes}
            onPaciente={props.onPaciente}
            onData={props.onData}
            onDiscard={props.onDiscard}
            disabled={props.disabled}
            showCandidates={r.candidates.length > 0}
          />
        ))}
      </div>
    </div>
  );
}

function SectionAmbiguous(props: {
  rows: ReviewRow[];
  pacientes: MapaPaciente[];
  onPaciente: (id: string, paciente_id: string | null) => void;
  onData: (id: string, data: string) => void;
  onDiscard: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border border-saffron/40 bg-saffron/10 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-editorial font-semibold text-saffron mb-2">
        <AlertCircle className="h-3.5 w-3.5" />
        {props.rows.length} ambíguo(s) — confirme o paciente
      </div>
      <div className="divide-y divide-saffron/20">
        {props.rows.map((r) => (
          <RowCommon
            key={r.id}
            row={r}
            pacientes={props.pacientes}
            onPaciente={props.onPaciente}
            onData={props.onData}
            onDiscard={props.onDiscard}
            disabled={props.disabled}
            showCandidates
          />
        ))}
      </div>
    </div>
  );
}

function SectionAssigned(props: {
  rows: ReviewRow[];
  pacientes: MapaPaciente[];
  collapsed: boolean;
  onToggle: () => void;
  onPaciente: (id: string, paciente_id: string | null) => void;
  onData: (id: string, data: string) => void;
  onDiscard: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border border-moss/30 bg-moss/5 p-3">
      <button
        type="button"
        onClick={props.onToggle}
        className="w-full flex items-center gap-2 text-[11px] uppercase tracking-editorial font-semibold text-moss"
      >
        <Check className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">
          {props.rows.length} atribuído(s)
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            props.collapsed && "-rotate-90",
          )}
          strokeWidth={1.8}
        />
      </button>
      {!props.collapsed && (
        <div className="mt-2 divide-y divide-moss/15">
          {props.rows.map((r) => (
            <RowCommon
              key={r.id}
              row={r}
              pacientes={props.pacientes}
              onPaciente={props.onPaciente}
              onData={props.onData}
              onDiscard={props.onDiscard}
              disabled={props.disabled}
              showCandidates={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
