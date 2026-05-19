"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Camera, Paperclip, Upload, X, FileText, AlertCircle } from "lucide-react";
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

export function AnexoUploader({ paciente }: { paciente: Paciente }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<TipoAnexo | "">("");
  const [dataRef, setDataRef] = useState(format(new Date(), "yyyy-MM-dd"));
  const [descricao, setDescricao] = useState("");
  const [editState, setEditState] = useState<ImageEditState>({
    appliedCrop: null,
    rotation: 0,
  });
  const [progress, setProgress] = useState(0);
  const [pending, startTransition] = useTransition();
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const isImage = file?.type.startsWith("image/") ?? false;
  const isPdf = file?.type === "application/pdf";
  const requerData = useMemo(
    () => tipo !== "" && TIPO_REQUER_DATA.includes(tipo as TipoAnexo),
    [tipo],
  );

  // Validação pra habilitar o botão Enviar
  const podeEnviar = useMemo(() => {
    if (!file) return false;
    if (!tipo) return false;
    if (requerData && !dataRef) return false;
    return !pending;
  }, [file, tipo, requerData, dataRef, pending]);

  function handleFile(f: File | undefined) {
    if (!f) return;
    if (
      !f.type.startsWith("image/") &&
      f.type !== "application/pdf"
    ) {
      toast.error("Tipo inválido", {
        description: "Envie uma imagem (JPG, PNG, HEIC…) ou PDF.",
      });
      return;
    }
    setFile(f);
    setProgress(0);
    setEditState({ appliedCrop: null, rotation: 0 });
  }

  function reset() {
    setFile(null);
    setTipo("");
    setDescricao("");
    setProgress(0);
    setEditState({ appliedCrop: null, rotation: 0 });
  }

  async function handleUpload() {
    if (!file || !tipo) return;
    if (requerData && !dataRef) {
      toast.warning("Informe a data de referência.");
      return;
    }

    startTransition(async () => {
      try {
        let toUpload: File | Blob = file;
        let outName = file.name;
        let outType = file.type;

        if (isImage) {
          setProgress(8);
          // 1) Aplica crop+rotação SÓ se o usuário editou
          //    (toggle "Aplicar recorte" ligado OU rotação ≠ 0)
          const precisaEditar =
            editState.appliedCrop !== null || editState.rotation !== 0;
          if (precisaEditar) {
            const url = URL.createObjectURL(file);
            try {
              toUpload = await getCroppedBlob(
                url,
                editState.appliedCrop, // null = imagem inteira rotacionada
                editState.rotation,
                0.92,
              );
              outName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
              outType = "image/jpeg";
            } finally {
              URL.revokeObjectURL(url);
            }
            setProgress(35);
          }
          // 2) Comprime pra ≤1.5MB / 1920px
          const compressed = await imageCompression(
            new File([toUpload], outName, { type: outType }),
            {
              maxSizeMB: 1.5,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              onProgress: (p) => setProgress(35 + Math.round(p * 0.4)),
            },
          );
          toUpload = compressed;
          outType = compressed.type || outType;
          setProgress(75);
        }

        const path = buildStoragePath({
          paciente_id: paciente.id,
          tipo_anexo: tipo as TipoAnexo,
          data_referencia: dataRef || null,
          filename: outName,
        });

        const supabase = createClient();
        const { error: upErr } = await supabase.storage
          .from("anexos-tce")
          .upload(path, toUpload, {
            contentType: outType || "application/octet-stream",
            upsert: false,
          });
        if (upErr) throw upErr;
        setProgress(88);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error: insertErr } = await supabase.from("anexos").insert({
          paciente_id: paciente.id,
          plantao_id: paciente.plantao_id,
          storage_path: path,
          tipo_anexo: tipo,
          data_referencia: dataRef || null,
          descricao: descricao || null,
          mime_type: outType || "application/octet-stream",
          tamanho_bytes: toUpload.size,
          enviado_por: user?.id ?? null,
        });
        if (insertErr) throw insertErr;

        setProgress(100);
        toast.success("Anexo enviado");
        reset();
        router.refresh();
      } catch (err) {
        toast.error("Erro ao enviar anexo", { description: String(err) });
      }
    });
  }

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
          <span className="text-sm font-semibold">Anexar arquivo</span>
        </button>
      </div>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
      />
      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
      />

      <Drawer open={!!file} onOpenChange={(o) => !o && reset()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Rotular anexo</DrawerTitle>
            <DrawerDescription>
              Tipo é obrigatório. Para exames, HGT e evolução, a data de referência também.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4">
            {/* Preview / editor */}
            {file && isImage && (
              <ImageEditor file={file} onStateChange={setEditState} />
            )}

            {file && isPdf && (
              <div className="space-y-2">
                <div className="rounded-md border border-hairline bg-paper-soft p-3 flex items-center gap-3">
                  <div className="size-10 rounded-md bg-vermillion/15 flex items-center justify-center text-vermillion shrink-0">
                    <FileText className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink truncate">{file.name}</p>
                    <p className="text-[11px] text-ash">
                      PDF · {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="size-8 rounded-full border border-hairline flex items-center justify-center text-ash hover:text-vermillion"
                    aria-label="Remover"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <iframe
                  src={URL.createObjectURL(file)}
                  className="w-full h-48 rounded-md border border-hairline bg-paper-soft"
                  title="Pré-visualização do PDF"
                />
              </div>
            )}

            {/* Tipo (required) */}
            <div className="space-y-2">
              <Label className={FIELD_LABEL}>
                Tipo de anexo <span className="text-vermillion">*</span>
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
                  <AlertCircle className="h-3 w-3" /> Diga a que se refere este documento.
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
                placeholder="Ex.: TC crânio do dia da admissão"
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
                <p className="text-[10px] text-ash text-right font-mono">{progress}%</p>
              </div>
            )}
          </div>

          <DrawerFooter>
            <Button onClick={handleUpload} disabled={!podeEnviar} size="lg">
              <Upload className="h-4 w-4 mr-2" />
              {pending ? "Enviando..." : "Enviar anexo"}
            </Button>
            <Button variant="ghost" onClick={reset}>Cancelar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
