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
  Camera,
  Paperclip,
  Upload,
  X,
  FileText,
  AlertCircle,
  Plus,
  Check,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import imageCompression from "browser-image-compression";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPOS_ANEXO, TIPO_ANEXO_LABEL, type TipoAnexo } from "@/lib/domain/enums";
import type { Paciente } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/client";
import { buildStoragePath } from "@/lib/utils/storage-path";
import { getCroppedBlob } from "@/lib/utils/crop-image";
import { ImageEditor, type ImageEditState } from "./ImageEditor";
import { cn } from "@/lib/utils";

/* ─────────── Constantes ─────────── */

const FIELD_LABEL = "text-[11px] uppercase tracking-editorial text-ash";
const FIELD_INPUT =
  "bg-paper-soft border-hairline focus-visible:border-cobalt focus-visible:ring-0";

// Limites do lote — generosos pra plantão real, mas evitam acidentes.
const MAX_FILES_PER_BATCH = 25;
const MAX_FILE_MB = 50;
const MAX_BATCH_MB = 300;
// Imagens menores que isso e sem edição: sobem cruas (skip do canvas).
const COMPRESS_SKIP_MB = 1.5;
// Quantos arquivos em paralelo. 3 é um sweet spot — paraleliza rede sem
// triplicar pico de memória da compressão.
const CONCURRENCY = 3;

const TIPO_REQUER_DATA: TipoAnexo[] = [
  "EXAME_LABORATORIAL",
  "EXAME_IMAGEM",
  "HGT",
  "EVOLUCAO_MEDICA",
  "PRESCRICAO",
  "BOLETIM_NEURO",
];

const TIPO_ORDER: TipoAnexo[] = [
  "EXAME_LABORATORIAL",
  "HGT",
  "ADMISSAO",
  "EXAME_IMAGEM",
  "EVOLUCAO_MEDICA",
  "PRESCRICAO",
  "BOLETIM_NEURO",
  "TCLE_ASSINADO",
  "OUTRO",
];

const EMPTY_EDIT: ImageEditState = { appliedCrop: null, rotation: 0 };

type FileStatus = "queued" | "uploading" | "done" | "error";

/* ─────────── Detecção de tipo ─────────── */

function isHeicFile(f: File) {
  if (/^image\/hei[cf]/i.test(f.type)) return true;
  return /\.(hei[cf])$/i.test(f.name);
}
function isImageFile(f: File) {
  if (f.type.startsWith("image/")) return true;
  if (isHeicFile(f)) return true;
  // Algumas câmeras Android salvam sem mime — checa extensão.
  return /\.(jpe?g|png|gif|webp|avif|tiff?|bmp|heic|heif)$/i.test(f.name);
}
function isPdfFile(f: File) {
  if (f.type === "application/pdf") return true;
  return /\.pdf$/i.test(f.name);
}
function isEditableImage(f: File) {
  // Qualquer imagem entra no editor — Safari decoda HEIC no canvas (iPhone
  // funciona normalmente). Em browsers sem suporte HEIC, o preview pode
  // ficar em branco, mas o try/catch do processOne resolve no upload.
  if (!isImageFile(f)) return false;
  return true;
}
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─────────── Componente principal ─────────── */

export function AnexoUploader({ paciente }: { paciente: Paciente }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [editStates, setEditStates] = useState<ImageEditState[]>([]);
  const [statuses, setStatuses] = useState<FileStatus[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tipo, setTipo] = useState<TipoAnexo | "">("");
  const [dataRef, setDataRef] = useState(format(new Date(), "yyyy-MM-dd"));
  const [descricao, setDescricao] = useState("");
  const [pending, startTransition] = useTransition();
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const addMoreInput = useRef<HTMLInputElement>(null);

  const activeFile = files[activeIndex] ?? null;
  const activeIsEditable = activeFile ? isEditableImage(activeFile) : false;
  const activeIsPdf = activeFile ? isPdfFile(activeFile) : false;
  const activeIsRawImage =
    activeFile && isImageFile(activeFile) && !isEditableImage(activeFile);

  const requerData = useMemo(
    () => tipo !== "" && TIPO_REQUER_DATA.includes(tipo as TipoAnexo),
    [tipo],
  );

  const totalBytes = useMemo(
    () => files.reduce((acc, f) => acc + f.size, 0),
    [files],
  );

  const doneCount = useMemo(
    () => statuses.filter((s) => s === "done").length,
    [statuses],
  );

  const podeEnviar = useMemo(() => {
    if (files.length === 0) return false;
    if (!tipo) return false;
    if (requerData && !dataRef) return false;
    return !pending;
  }, [files.length, tipo, requerData, dataRef, pending]);

  /* ─── Aceitar arquivos com validação ─── */

  function acceptFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming: File[] = [];
    const rejeitados: string[] = [];

    for (const f of Array.from(list)) {
      // Tipo
      if (!isImageFile(f) && !isPdfFile(f)) {
        rejeitados.push(`${f.name}: formato não suportado`);
        continue;
      }
      // Tamanho individual
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        rejeitados.push(
          `${f.name}: ${fmtSize(f.size)} (máx. ${MAX_FILE_MB} MB)`,
        );
        continue;
      }
      incoming.push(f);
    }

    // Limite de quantidade
    const espacoRestante = MAX_FILES_PER_BATCH - files.length;
    if (incoming.length > espacoRestante) {
      const cortar = incoming.length - espacoRestante;
      const cortados = incoming.splice(espacoRestante);
      rejeitados.push(
        ...cortados.map((c) => `${c.name}: lote cheio (máx. ${MAX_FILES_PER_BATCH})`),
      );
      void cortar;
    }

    // Limite de tamanho total
    let bytesAcumulados = totalBytes;
    const dentroDoTotal: File[] = [];
    for (const f of incoming) {
      if (bytesAcumulados + f.size > MAX_BATCH_MB * 1024 * 1024) {
        rejeitados.push(
          `${f.name}: ultrapassa total do lote (máx. ${MAX_BATCH_MB} MB)`,
        );
        continue;
      }
      bytesAcumulados += f.size;
      dentroDoTotal.push(f);
    }

    if (rejeitados.length > 0) {
      toast.error(
        rejeitados.length === 1
          ? "1 arquivo rejeitado"
          : `${rejeitados.length} arquivos rejeitados`,
        {
          description: rejeitados.slice(0, 3).join(" · "),
          duration: 5000,
        },
      );
    }
    if (dentroDoTotal.length === 0) return;

    setFiles((prev) => {
      if (prev.length === 0) setActiveIndex(0);
      return [...prev, ...dentroDoTotal];
    });
    setEditStates((prev) => [
      ...prev,
      ...dentroDoTotal.map(() => ({ ...EMPTY_EDIT })),
    ]);
    setStatuses((prev) => [
      ...prev,
      ...dentroDoTotal.map(() => "queued" as FileStatus),
    ]);
  }

  function reset() {
    setFiles([]);
    setEditStates([]);
    setStatuses([]);
    setActiveIndex(0);
    setTipo("");
    setDescricao("");
  }

  function removeAt(i: number) {
    if (pending) return;
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setEditStates((prev) => prev.filter((_, idx) => idx !== i));
    setStatuses((prev) => prev.filter((_, idx) => idx !== i));
    setActiveIndex((prev) => {
      if (prev === i) return Math.max(0, i - 1);
      if (prev > i) return prev - 1;
      return prev;
    });
  }

  const updateActiveEdit = useCallback(
    (state: ImageEditState) => {
      setEditStates((prev) => {
        const cur = prev[activeIndex];
        if (
          cur &&
          cur.rotation === state.rotation &&
          cur.appliedCrop === state.appliedCrop
        ) {
          return prev;
        }
        const next = [...prev];
        next[activeIndex] = state;
        return next;
      });
    },
    [activeIndex],
  );

  /* ─── Pipeline por arquivo ─── */

  async function processOne(
    f: File,
    edit: ImageEditState,
  ): Promise<{ blob: File | Blob; mimeType: string; outName: string }> {
    const hasEdit = edit.appliedCrop !== null || edit.rotation !== 0;

    // PDF: passa direto.
    if (isPdfFile(f)) {
      return {
        blob: f,
        mimeType: f.type || "application/pdf",
        outName: f.name,
      };
    }

    // HEIC ou imagem que o canvas não decodifica: sobe cru.
    if (!isEditableImage(f)) {
      const mime =
        f.type ||
        (isHeicFile(f) ? (/\.heif$/i.test(f.name) ? "image/heif" : "image/heic") : "application/octet-stream");
      return { blob: f, mimeType: mime, outName: f.name };
    }

    let blob: File | Blob = f;
    let outName = f.name;
    let mime = f.type || "image/jpeg";

    if (hasEdit) {
      const url = URL.createObjectURL(f);
      try {
        blob = await getCroppedBlob(url, edit.appliedCrop, edit.rotation, 0.92);
        outName = f.name.replace(/\.[^.]+$/, "") + ".jpg";
        mime = "image/jpeg";
      } catch (err) {
        // Browser sem suporte ao formato (ex.: HEIC fora do Safari) —
        // sobe original sem edição em vez de derrubar o upload.
        console.warn("[anexo] crop/rotação falhou, subindo original:", err);
        blob = f;
        outName = f.name;
        mime = f.type || mime;
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    // Skip de compressão pra arquivos já pequenos sem edição — sem ganho real
    // e poupa CPU/memória do mobile.
    if (!hasEdit && blob.size <= COMPRESS_SKIP_MB * 1024 * 1024) {
      return { blob, mimeType: mime, outName };
    }

    // Compressão best-effort.
    try {
      const compressed = await imageCompression(
        new File([blob], outName, { type: mime }),
        { maxSizeMB: 1.5, maxWidthOrHeight: 1920, useWebWorker: true },
      );
      return {
        blob: compressed,
        mimeType: compressed.type || mime,
        outName,
      };
    } catch (err) {
      console.warn("[anexo] compressão falhou, subindo original:", err);
      return { blob, mimeType: mime, outName };
    }
  }

  /* ─── Pool de upload concorrente ─── */

  function setStatusAt(i: number, s: FileStatus) {
    setStatuses((prev) => {
      if (prev[i] === s) return prev;
      const next = [...prev];
      next[i] = s;
      return next;
    });
  }

  async function uploadOne(i: number) {
    const f = files[i];
    const edit = editStates[i] ?? EMPTY_EDIT;
    setStatusAt(i, "uploading");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { blob, mimeType, outName } = await processOne(f, edit);
      const path = buildStoragePath({
        paciente_id: paciente.id,
        tipo_anexo: tipo as TipoAnexo,
        data_referencia: dataRef || null,
        filename: outName,
      });
      const { error: upErr } = await supabase.storage
        .from("anexos-tce")
        .upload(path, blob, {
          contentType: mimeType || "application/octet-stream",
          upsert: false,
        });
      if (upErr) throw upErr;
      const { error: insertErr } = await supabase.from("anexos").insert({
        paciente_id: paciente.id,
        plantao_id: paciente.plantao_id,
        storage_path: path,
        tipo_anexo: tipo,
        data_referencia: dataRef || null,
        descricao: descricao || null,
        mime_type: mimeType || "application/octet-stream",
        tamanho_bytes: blob.size,
        enviado_por: user?.id ?? null,
      });
      if (insertErr) throw insertErr;
      setStatusAt(i, "done");
    } catch (err) {
      console.error(`[anexo] ${f.name} falhou:`, err);
      setStatusAt(i, "error");
    }
  }

  async function handleUpload() {
    if (files.length === 0 || !tipo) return;
    if (requerData && !dataRef) {
      toast.warning("Informe a data de referência.");
      return;
    }

    startTransition(async () => {
      // Reset de status: tudo vira queued.
      setStatuses(files.map(() => "queued"));

      // Pool de workers concorrentes.
      const queue = files.map((_, i) => i);
      const pool: Promise<void>[] = [];
      const runNext = (): Promise<void> | null => {
        const i = queue.shift();
        if (i === undefined) return null;
        return uploadOne(i).then(() => {
          const next = runNext();
          if (next) return next;
        });
      };

      for (let n = 0; n < Math.min(CONCURRENCY, files.length); n++) {
        const t = runNext();
        if (t) pool.push(t);
      }
      await Promise.all(pool);

      // Calcula resultado lendo o estado mais recente via callback.
      setStatuses((curr) => {
        const ok = curr.filter((s) => s === "done").length;
        const err = curr.filter((s) => s === "error").length;
        const total = curr.length;

        if (ok > 0 && err === 0) {
          toast.success(
            total === 1 ? "Anexo enviado" : `${ok} anexos enviados`,
          );
          // Limpa o drawer depois de um respiro pra animação dos ✓
          setTimeout(() => {
            reset();
            router.refresh();
          }, 600);
        } else if (ok > 0 && err > 0) {
          toast.warning(`${ok}/${total} enviados`, {
            description: `${err} falharam — toque nos arquivos em vermelho pra reenviar`,
            duration: 6000,
          });
          router.refresh();
        } else {
          toast.error("Nenhum anexo enviado", {
            description: "Verifique sua conexão e tente de novo.",
          });
        }
        return curr;
      });
    });
  }

  /* ─── Reenviar só os que falharam ─── */

  async function retryFalhos() {
    const idxs = statuses
      .map((s, i) => (s === "error" ? i : -1))
      .filter((i) => i >= 0);
    if (idxs.length === 0) return;

    startTransition(async () => {
      idxs.forEach((i) => setStatusAt(i, "queued"));
      const queue = [...idxs];
      const pool: Promise<void>[] = [];
      const runNext = (): Promise<void> | null => {
        const i = queue.shift();
        if (i === undefined) return null;
        return uploadOne(i).then(() => {
          const next = runNext();
          if (next) return next;
        });
      };
      for (let n = 0; n < Math.min(CONCURRENCY, idxs.length); n++) {
        const t = runNext();
        if (t) pool.push(t);
      }
      await Promise.all(pool);
      router.refresh();
    });
  }

  const erroCount = statuses.filter((s) => s === "error").length;
  const editorTitle =
    files.length <= 1
      ? "Rotular anexo"
      : `Rotular lote (${files.length} arquivo${files.length === 1 ? "" : "s"})`;

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg bg-cobalt text-white py-5 min-h-16 active:scale-[0.98] transition-transform"
        >
          <Camera className="h-6 w-6" />
          <span className="text-sm font-semibold">Tirar foto</span>
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-cobalt text-cobalt-soft py-5 min-h-16 bg-paper-deep active:scale-[0.98] transition-transform"
        >
          <Paperclip className="h-6 w-6" />
          <span className="text-sm font-semibold">Anexar arquivo(s)</span>
        </button>
      </div>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          acceptFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf,.pdf,.heic,.heif,.webp,.avif,.tif,.tiff,.bmp"
        multiple
        className="hidden"
        onChange={(e) => {
          acceptFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={addMoreInput}
        type="file"
        accept="image/*,application/pdf,.pdf,.heic,.heif,.webp,.avif,.tif,.tiff,.bmp"
        multiple
        className="hidden"
        onChange={(e) => {
          acceptFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <Drawer
        open={files.length > 0}
        onOpenChange={(o) => !o && !pending && reset()}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editorTitle}</DrawerTitle>
            <DrawerDescription className="flex items-center gap-2 flex-wrap">
              {files.length > 1 ? (
                <>
                  <span>Tipo, data e descrição valem pro lote inteiro.</span>
                  <span className="text-ash">·</span>
                  <span className="font-mono text-[11px] text-graphite">
                    {fmtSize(totalBytes)} total
                  </span>
                </>
              ) : (
                <span>
                  Tipo é obrigatório. Para exames, HGT e evolução, a data
                  também.
                </span>
              )}
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4">
            {files.length > 0 && (
              <ThumbStrip
                files={files}
                editStates={editStates}
                statuses={statuses}
                activeIndex={activeIndex}
                onActivate={setActiveIndex}
                onRemove={removeAt}
                onAddMore={() => addMoreInput.current?.click()}
                podeAdicionar={
                  !pending && files.length < MAX_FILES_PER_BATCH
                }
              />
            )}

            {activeFile && activeIsEditable && (
              <ImageEditor
                key={activeIndex}
                file={activeFile}
                initial={editStates[activeIndex] ?? EMPTY_EDIT}
                onStateChange={updateActiveEdit}
              />
            )}

            {activeFile && activeIsRawImage && (
              <RawImageCard file={activeFile} />
            )}

            {activeFile && activeIsPdf && <PdfPreviewCard file={activeFile} />}

            {/* Tipo (required) */}
            <div className="space-y-2">
              <Label className={FIELD_LABEL}>
                Tipo de anexo <span className="text-vermillion">*</span>
                {files.length > 1 && (
                  <span className="ml-2 normal-case tracking-normal text-[10px] text-cobalt-soft">
                    aplicado aos {files.length} arquivos
                  </span>
                )}
              </Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAnexo)}>
                <SelectTrigger
                  className={cn(
                    FIELD_INPUT,
                    !tipo && "border-vermillion/40 text-ash",
                  )}
                >
                  <SelectValue placeholder="Escolha do que se trata..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_ORDER.filter((t) => TIPOS_ANEXO.includes(t)).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_ANEXO_LABEL[t]}
                      {TIPO_REQUER_DATA.includes(t) && (
                        <span className="ml-1.5 text-[10px] text-ash">(+ data)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!tipo && (
                <p className="text-[10px] text-vermillion/80 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Diga a que se refere{" "}
                  {files.length > 1 ? "este lote" : "este documento"}.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataref" className={FIELD_LABEL}>
                Data de referência
                {requerData && <span className="ml-1 text-vermillion">*</span>}
              </Label>
              <Input
                id="dataref"
                type="date"
                value={dataRef}
                onChange={(e) => setDataRef(e.target.value)}
                className={cn(
                  FIELD_INPUT,
                  requerData && !dataRef && "border-vermillion/40",
                )}
              />
              <p className="text-[11px] text-ash">
                {requerData
                  ? "Dia em que o exame/registro foi feito. Pode ter mais de um por dia."
                  : "Opcional — padrão é hoje."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc" className={FIELD_LABEL}>
                Descrição
              </Label>
              <Input
                id="desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={
                  files.length > 1
                    ? "Ex.: Fotos do prontuário da admissão"
                    : "Ex.: TC crânio do dia da admissão"
                }
                className={FIELD_INPUT}
              />
            </div>

            {(pending || doneCount > 0) && (
              <UploadProgressBar
                done={doneCount}
                total={files.length}
                errors={erroCount}
                running={pending}
              />
            )}
          </div>

          <DrawerFooter>
            {erroCount > 0 && !pending && (
              <Button variant="outline" onClick={retryFalhos} size="lg">
                Reenviar {erroCount} que falhou{erroCount > 1 ? "" : ""}
              </Button>
            )}
            <Button onClick={handleUpload} disabled={!podeEnviar} size="lg">
              <Upload className="h-4 w-4 mr-2" />
              {pending
                ? `Enviando... ${doneCount}/${files.length}`
                : files.length > 1
                  ? `Enviar ${files.length} anexos`
                  : "Enviar anexo"}
            </Button>
            <Button variant="ghost" onClick={reset} disabled={pending}>
              {doneCount > 0 ? "Fechar" : "Cancelar"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

/* ─────────── Sub-componentes ─────────── */

function UploadProgressBar({
  done,
  total,
  errors,
  running,
}: {
  done: number;
  total: number;
  errors: number;
  running: boolean;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="relative h-2 rounded-full bg-paper-soft overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-all duration-300",
            errors > 0 ? "bg-saffron" : "bg-cobalt",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-ash font-mono">
        <span className="flex items-center gap-1.5">
          {running && <Loader2 className="h-3 w-3 animate-spin text-cobalt-soft" />}
          {done}/{total} enviado{done === 1 ? "" : "s"}
          {errors > 0 && (
            <span className="text-vermillion">· {errors} falhou{errors > 1 ? "" : ""}</span>
          )}
        </span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}

function PdfPreviewCard({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-hairline bg-paper-soft p-3 flex items-center gap-3">
        <div className="size-10 rounded-md bg-vermillion/15 flex items-center justify-center text-vermillion shrink-0">
          <FileText className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink truncate">{file.name}</p>
          <p className="text-[11px] text-ash">PDF · {fmtSize(file.size)}</p>
        </div>
      </div>
      <iframe
        src={url}
        className="w-full h-48 rounded-md border border-hairline bg-paper-soft"
        title="Pré-visualização do PDF"
      />
    </div>
  );
}

function RawImageCard({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-hairline bg-paper-soft p-3 flex items-center gap-3">
        <div className="size-10 rounded-md bg-cobalt/15 flex items-center justify-center text-cobalt-soft shrink-0">
          <ImageIcon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink truncate">{file.name}</p>
          <p className="text-[11px] text-ash">
            {(file.type || "imagem").replace("image/", "").toUpperCase()} ·{" "}
            {fmtSize(file.size)}
          </p>
          <p className="text-[10px] text-ash italic mt-0.5">
            Sobe sem edição (formato não decodificado pelo navegador).
          </p>
        </div>
      </div>
      {/* Tenta renderizar — Safari mostra HEIC, outros browsers nada. */}
      <img
        src={url}
        alt=""
        className="w-full max-h-48 object-contain rounded-md border border-hairline bg-paper-soft"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

function ThumbStrip({
  files,
  editStates,
  statuses,
  activeIndex,
  onActivate,
  onRemove,
  onAddMore,
  podeAdicionar,
}: {
  files: File[];
  editStates: ImageEditState[];
  statuses: FileStatus[];
  activeIndex: number;
  onActivate: (i: number) => void;
  onRemove: (i: number) => void;
  onAddMore: () => void;
  podeAdicionar: boolean;
}) {
  return (
    <div className="-mx-1 px-1 overflow-x-auto">
      <div className="flex items-stretch gap-2 min-w-min">
        {files.map((f, i) => (
          <ThumbItem
            key={`${f.name}-${f.size}-${i}`}
            file={f}
            edited={
              editStates[i]?.appliedCrop !== null ||
              (editStates[i]?.rotation ?? 0) !== 0
            }
            status={statuses[i] ?? "queued"}
            active={i === activeIndex}
            onActivate={() => onActivate(i)}
            onRemove={() => onRemove(i)}
          />
        ))}
        <button
          type="button"
          onClick={onAddMore}
          disabled={!podeAdicionar}
          className={cn(
            "shrink-0 size-16 rounded-lg border-2 border-dashed border-cobalt/40 text-cobalt-soft",
            "flex flex-col items-center justify-center gap-0.5 bg-paper-soft",
            "hover:border-cobalt hover:bg-cobalt/5 transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
          aria-label="Adicionar mais arquivos"
        >
          <Plus className="h-5 w-5" strokeWidth={1.8} />
          <span className="text-[9px] uppercase tracking-editorial">Add</span>
        </button>
      </div>
    </div>
  );
}

function ThumbItem({
  file,
  edited,
  status,
  active,
  onActivate,
  onRemove,
}: {
  file: File;
  edited: boolean;
  status: FileStatus;
  active: boolean;
  onActivate: () => void;
  onRemove: () => void;
}) {
  // O URL é criado uma vez por File; só revoga quando o componente desmonta.
  // Sem revogar no useMemo pra não invalidar a img enquanto em uso.
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const isImg = isImageFile(file);
  const isHeic = isHeicFile(file);
  const isPdf = isPdfFile(file);

  // Esconde overlays de status quando ainda está só na fila.
  const showStatusOverlay =
    status === "uploading" || status === "done" || status === "error";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onActivate}
        disabled={status === "uploading"}
        className={cn(
          "size-16 rounded-lg overflow-hidden border-2 bg-paper-soft relative",
          "flex items-center justify-center transition-colors",
          active && status !== "error"
            ? "border-cobalt ring-2 ring-cobalt/20"
            : status === "error"
              ? "border-vermillion/60 ring-2 ring-vermillion/20"
              : status === "done"
                ? "border-moss/60"
                : "border-hairline hover:border-cobalt/50",
          status === "uploading" && "opacity-90",
        )}
        aria-label={`Editar ${file.name}`}
      >
        {isPdf ? (
          <FileText className="h-6 w-6 text-vermillion" strokeWidth={1.8} />
        ) : isImg && !isHeic ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : isHeic ? (
          // HEIC só renderiza em Safari; resto cai no fallback de ícone.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              const fallback = img.parentElement?.querySelector("[data-fallback]");
              if (fallback) (fallback as HTMLElement).style.display = "flex";
            }}
          />
        ) : (
          <ImageIcon className="h-6 w-6 text-ash" strokeWidth={1.8} />
        )}
        {isHeic && (
          <div
            data-fallback
            className="absolute inset-0 hidden items-center justify-center text-ash text-[8px] uppercase tracking-editorial bg-paper-soft"
          >
            HEIC
          </div>
        )}

        {edited && status !== "uploading" && status !== "done" && (
          <span className="absolute bottom-0.5 right-0.5 size-4 rounded-full bg-cobalt text-white flex items-center justify-center">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}

        {showStatusOverlay && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              status === "done" && "bg-moss/30",
              status === "error" && "bg-vermillion/30",
              status === "uploading" && "bg-cobalt/20",
            )}
          >
            {status === "uploading" && (
              <Loader2 className="h-5 w-5 text-white animate-spin drop-shadow" />
            )}
            {status === "done" && (
              <span className="size-7 rounded-full bg-moss text-white flex items-center justify-center shadow-lg">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
            )}
            {status === "error" && (
              <span className="size-7 rounded-full bg-vermillion text-white flex items-center justify-center shadow-lg">
                <X className="h-4 w-4" strokeWidth={3} />
              </span>
            )}
          </div>
        )}
      </button>

      {status !== "uploading" && status !== "done" && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            "absolute -top-1.5 -right-1.5 size-5 rounded-full bg-paper-deep border border-hairline",
            "flex items-center justify-center text-ash hover:text-vermillion hover:border-vermillion/60",
            "transition-colors",
          )}
          aria-label={`Remover ${file.name}`}
        >
          <X className="h-3 w-3" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
