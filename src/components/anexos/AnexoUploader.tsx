"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import {
  Camera,
  Paperclip,
  Upload,
  X,
  FileText,
  AlertCircle,
  Plus,
  Check,
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

const FIELD_LABEL = "text-[11px] uppercase tracking-editorial text-ash";
const FIELD_INPUT =
  "bg-paper-soft border-hairline focus-visible:border-cobalt focus-visible:ring-0";

// Tipos que precisam OBRIGATORIAMENTE de data de referência
const TIPO_REQUER_DATA: TipoAnexo[] = [
  "EXAME_LABORATORIAL",
  "EXAME_IMAGEM",
  "HGT",
  "EVOLUCAO_MEDICA",
  "PRESCRICAO",
  "BOLETIM_NEURO",
];

// Ordem de exibição: primários (mencionados pelo pesquisador) → resto
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

function isImageFile(f: File) {
  return f.type.startsWith("image/");
}
function isPdfFile(f: File) {
  return f.type === "application/pdf";
}

export function AnexoUploader({ paciente }: { paciente: Paciente }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [editStates, setEditStates] = useState<ImageEditState[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tipo, setTipo] = useState<TipoAnexo | "">("");
  const [dataRef, setDataRef] = useState(format(new Date(), "yyyy-MM-dd"));
  const [descricao, setDescricao] = useState("");
  const [progress, setProgress] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0); // 1-based em uso, 0 = nada
  const [pending, startTransition] = useTransition();
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const addMoreInput = useRef<HTMLInputElement>(null);

  const activeFile = files[activeIndex] ?? null;
  const activeIsImage = activeFile ? isImageFile(activeFile) : false;
  const activeIsPdf = activeFile ? isPdfFile(activeFile) : false;

  const requerData = useMemo(
    () => tipo !== "" && TIPO_REQUER_DATA.includes(tipo as TipoAnexo),
    [tipo],
  );

  const podeEnviar = useMemo(() => {
    if (files.length === 0) return false;
    if (!tipo) return false;
    if (requerData && !dataRef) return false;
    return !pending;
  }, [files.length, tipo, requerData, dataRef, pending]);

  function acceptFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming: File[] = [];
    let rejected = 0;
    for (const f of Array.from(list)) {
      if (isImageFile(f) || isPdfFile(f)) incoming.push(f);
      else rejected++;
    }
    if (rejected > 0) {
      toast.error(`${rejected} arquivo(s) ignorado(s)`, {
        description: "Só JPG/PNG/HEIC e PDF.",
      });
    }
    if (incoming.length === 0) return;

    setFiles((prev) => {
      const next = [...prev, ...incoming];
      // primeira leva → ativa o primeiro; lote adicional → mantém ativo atual
      if (prev.length === 0) setActiveIndex(0);
      return next;
    });
    setEditStates((prev) => [
      ...prev,
      ...incoming.map(() => ({ ...EMPTY_EDIT })),
    ]);
    setProgress(0);
  }

  function reset() {
    setFiles([]);
    setEditStates([]);
    setActiveIndex(0);
    setTipo("");
    setDescricao("");
    setProgress(0);
    setCurrentIdx(0);
  }

  function removeAt(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setEditStates((prev) => prev.filter((_, idx) => idx !== i));
    setActiveIndex((prev) => {
      if (prev === i) return Math.max(0, i - 1);
      if (prev > i) return prev - 1;
      return prev;
    });
  }

  // useCallback é crítico aqui — o ImageEditor tem onStateChange nas deps
  // de um useEffect, então uma nova referência a cada render dispararia
  // loop infinito de re-render.
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

  async function processOne(
    f: File,
    edit: ImageEditState,
  ): Promise<{ blob: File | Blob; mimeType: string; outName: string }> {
    if (!isImageFile(f)) {
      return { blob: f, mimeType: f.type, outName: f.name };
    }
    let toUpload: File | Blob = f;
    let outName = f.name;
    let outType = f.type;

    const precisaEditar = edit.appliedCrop !== null || edit.rotation !== 0;
    if (precisaEditar) {
      const url = URL.createObjectURL(f);
      try {
        toUpload = await getCroppedBlob(url, edit.appliedCrop, edit.rotation, 0.92);
        outName = f.name.replace(/\.[^.]+$/, "") + ".jpg";
        outType = "image/jpeg";
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    const compressed = await imageCompression(
      new File([toUpload], outName, { type: outType }),
      { maxSizeMB: 1.5, maxWidthOrHeight: 1920, useWebWorker: true },
    );
    return { blob: compressed, mimeType: compressed.type || outType, outName };
  }

  async function handleUpload() {
    if (files.length === 0 || !tipo) return;
    if (requerData && !dataRef) {
      toast.warning("Informe a data de referência.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const total = files.length;
      let enviados = 0;
      const erros: { name: string; err: string }[] = [];

      try {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const edit = editStates[i] ?? EMPTY_EDIT;
          setCurrentIdx(i + 1);
          setProgress(Math.round(((i) / total) * 100));

          try {
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
            enviados++;
          } catch (err) {
            erros.push({ name: f.name, err: String(err) });
          }
        }

        setProgress(100);
        if (enviados > 0 && erros.length === 0) {
          toast.success(
            total === 1 ? "Anexo enviado" : `${enviados} anexos enviados`,
          );
          reset();
          router.refresh();
        } else if (enviados > 0 && erros.length > 0) {
          toast.warning(`${enviados}/${total} enviados`, {
            description: `${erros.length} falharam — ${erros[0].name}`,
          });
          router.refresh();
        } else {
          toast.error("Nenhum anexo enviado", {
            description: erros[0]?.err ?? "Erro desconhecido.",
          });
        }
      } finally {
        setCurrentIdx(0);
      }
    });
  }

  const editorTitle =
    files.length <= 1
      ? "Rotular anexo"
      : `Rotular lote (${files.length} arquivos)`;

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
        accept="image/*,application/pdf"
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
        accept="image/*,application/pdf"
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
            <DrawerDescription>
              {files.length > 1
                ? "Tipo, data e descrição valem pra todo o lote. Edite cada foto pelos thumbnails."
                : "Tipo é obrigatório. Para exames, HGT e evolução, a data de referência também."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4">
            {/* Thumb strip — aparece sempre que há arquivos pra deixar evidente que é multi */}
            {files.length > 0 && (
              <ThumbStrip
                files={files}
                editStates={editStates}
                activeIndex={activeIndex}
                onActivate={setActiveIndex}
                onRemove={removeAt}
                onAddMore={() => addMoreInput.current?.click()}
                disabled={pending}
              />
            )}

            {/* Editor da foto ativa */}
            {activeFile && activeIsImage && (
              <ImageEditor
                key={activeIndex}
                file={activeFile}
                initial={editStates[activeIndex] ?? EMPTY_EDIT}
                onStateChange={updateActiveEdit}
              />
            )}

            {activeFile && activeIsPdf && (
              <div className="space-y-2">
                <div className="rounded-md border border-hairline bg-paper-soft p-3 flex items-center gap-3">
                  <div className="size-10 rounded-md bg-vermillion/15 flex items-center justify-center text-vermillion shrink-0">
                    <FileText className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink truncate">{activeFile.name}</p>
                    <p className="text-[11px] text-ash">
                      PDF · {(activeFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
                <iframe
                  src={URL.createObjectURL(activeFile)}
                  className="w-full h-48 rounded-md border border-hairline bg-paper-soft"
                  title="Pré-visualização do PDF"
                />
              </div>
            )}

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
                  <AlertCircle className="h-3 w-3" /> Diga a que se refere {files.length > 1 ? "este lote" : "este documento"}.
                </p>
              )}
            </div>

            {/* Data — required when tipo demands */}
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

            {/* Descrição */}
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

            {progress > 0 && (
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-paper-soft overflow-hidden">
                  <div
                    className="h-full bg-cobalt transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-ash text-right font-mono">
                  {currentIdx > 0 ? `${currentIdx}/${files.length} · ` : ""}
                  {progress}%
                </p>
              </div>
            )}
          </div>

          <DrawerFooter>
            <Button onClick={handleUpload} disabled={!podeEnviar} size="lg">
              <Upload className="h-4 w-4 mr-2" />
              {pending
                ? `Enviando ${currentIdx}/${files.length}...`
                : files.length > 1
                  ? `Enviar ${files.length} anexos`
                  : "Enviar anexo"}
            </Button>
            <Button variant="ghost" onClick={reset} disabled={pending}>
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

/**
 * Strip horizontal de thumbnails. Mostra a foto ativa em destaque + um "+"
 * pra adicionar mais arquivos ao mesmo lote.
 */
function ThumbStrip({
  files,
  editStates,
  activeIndex,
  onActivate,
  onRemove,
  onAddMore,
  disabled,
}: {
  files: File[];
  editStates: ImageEditState[];
  activeIndex: number;
  onActivate: (i: number) => void;
  onRemove: (i: number) => void;
  onAddMore: () => void;
  disabled: boolean;
}) {
  return (
    <div className="-mx-1 px-1 overflow-x-auto">
      <div className="flex items-stretch gap-2 min-w-min">
        {files.map((f, i) => (
          <ThumbItem
            key={`${f.name}-${f.size}-${i}`}
            file={f}
            edited={
              editStates[i]?.appliedCrop !== null || (editStates[i]?.rotation ?? 0) !== 0
            }
            active={i === activeIndex}
            disabled={disabled}
            onActivate={() => onActivate(i)}
            onRemove={() => onRemove(i)}
          />
        ))}
        <button
          type="button"
          onClick={onAddMore}
          disabled={disabled}
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
  active,
  disabled,
  onActivate,
  onRemove,
}: {
  file: File;
  edited: boolean;
  active: boolean;
  disabled: boolean;
  onActivate: () => void;
  onRemove: () => void;
}) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  // Não revoga aqui — o objeto pode estar em uso no editor ativo.
  // O GC do navegador resolve quando a aba fecha; trade-off aceitável.
  const isImg = isImageFile(file);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onActivate}
        disabled={disabled}
        className={cn(
          "size-16 rounded-lg overflow-hidden border-2 bg-paper-soft relative",
          "flex items-center justify-center",
          active
            ? "border-cobalt ring-2 ring-cobalt/20"
            : "border-hairline hover:border-cobalt/50",
          "transition-colors disabled:opacity-50",
        )}
        aria-label={`Editar ${file.name}`}
      >
        {isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <FileText className="h-6 w-6 text-vermillion" strokeWidth={1.8} />
        )}
        {edited && (
          <span className="absolute bottom-0.5 right-0.5 size-4 rounded-full bg-cobalt text-white flex items-center justify-center">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className={cn(
          "absolute -top-1.5 -right-1.5 size-5 rounded-full bg-paper-deep border border-hairline",
          "flex items-center justify-center text-ash hover:text-vermillion hover:border-vermillion/60",
          "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        )}
        aria-label={`Remover ${file.name}`}
      >
        <X className="h-3 w-3" strokeWidth={2} />
      </button>
    </div>
  );
}
