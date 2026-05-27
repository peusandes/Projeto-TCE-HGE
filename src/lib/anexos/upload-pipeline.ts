/**
 * Pipeline de upload de anexos — extraído do AnexoUploader pra ser
 * reaproveitado pelo upload em lote do plantão. Encapsula:
 *
 *  - Heurística de tipo (image vs pdf vs HEIC vs raw)
 *  - Compressão best-effort de imagens
 *  - Crop/rotação opcional (já aplicado via ImageEditState)
 *  - Upload pro Storage + insert na tabela `anexos`
 *
 * Importante: NÃO passa por performWithSync de propósito — binários ficam
 * fora da sync queue offline-first (decisão arquitetural; vide
 * feedback_offline_first_arch).
 */

import imageCompression from "browser-image-compression";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCroppedBlob } from "@/lib/utils/crop-image";
import { buildStoragePath } from "@/lib/utils/storage-path";
import type { TipoAnexo } from "@/lib/domain/enums";
import type { ImageEditState } from "@/components/anexos/ImageEditor";

/** Imagens menores que isso e sem edição: sobem cruas (skip do canvas). */
export const COMPRESS_SKIP_MB = 1.5;

/* ─────────── Detecção de tipo ─────────── */

export function isHeicFile(f: File): boolean {
  if (/^image\/hei[cf]/i.test(f.type)) return true;
  return /\.(hei[cf])$/i.test(f.name);
}

export function isImageFile(f: File): boolean {
  if (f.type.startsWith("image/")) return true;
  if (isHeicFile(f)) return true;
  // Algumas câmeras Android salvam sem mime — checa extensão.
  return /\.(jpe?g|png|gif|webp|avif|tiff?|bmp|heic|heif)$/i.test(f.name);
}

export function isPdfFile(f: File): boolean {
  if (f.type === "application/pdf") return true;
  return /\.pdf$/i.test(f.name);
}

export function isEditableImage(f: File): boolean {
  // Qualquer imagem entra no editor — Safari decoda HEIC no canvas (iPhone
  // funciona normalmente). Em browsers sem suporte HEIC, o preview pode
  // ficar em branco, mas o try/catch do processOne resolve no upload.
  return isImageFile(f);
}

/** Tamanho humano. */
export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─────────── processOne: prepara o blob pra upload ─────────── */

export type ProcessedFile = {
  blob: File | Blob;
  mimeType: string;
  outName: string;
};

export const EMPTY_EDIT: ImageEditState = { appliedCrop: null, rotation: 0 };

export async function processOne(
  f: File,
  edit: ImageEditState = EMPTY_EDIT,
): Promise<ProcessedFile> {
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
      (isHeicFile(f)
        ? /\.heif$/i.test(f.name)
          ? "image/heif"
          : "image/heic"
        : "application/octet-stream");
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

/* ─────────── uploadOne: faz processOne + storage + insert ─────────── */

export type UploadOneInput = {
  file: File;
  edit?: ImageEditState;
  paciente_id: string;
  plantao_id: string;
  tipo_anexo: TipoAnexo;
  data_referencia: string | null;
  descricao?: string | null;
  enviado_por?: string | null;
  /** Timeout total em ms (default 90s). */
  timeoutMs?: number;
  /** AbortController opcional pra cancelar manualmente. */
  controller?: AbortController;
};

export type UploadOneResult =
  | { ok: true; storage_path: string; tamanho_bytes: number }
  | { ok: false; error: Error };

export async function uploadOne(
  supabase: SupabaseClient,
  input: UploadOneInput,
): Promise<UploadOneResult> {
  const controller = input.controller ?? new AbortController();
  const timeoutMs = input.timeoutMs ?? 90_000;
  const timeoutId = setTimeout(
    () => controller.abort(new Error(`Timeout (${Math.round(timeoutMs / 1000)}s)`)),
    timeoutMs,
  );

  try {
    if (controller.signal.aborted) {
      throw controller.signal.reason ?? new Error("Abortado");
    }

    const { blob, mimeType, outName } = await processOne(
      input.file,
      input.edit ?? EMPTY_EDIT,
    );
    if (controller.signal.aborted) {
      throw controller.signal.reason ?? new Error("Abortado");
    }

    const path = buildStoragePath({
      paciente_id: input.paciente_id,
      tipo_anexo: input.tipo_anexo,
      data_referencia: input.data_referencia,
      filename: outName,
    });

    // Promise.race contra abort signal — supabase-js não aceita signal direto.
    const uploadPromise = supabase.storage
      .from("anexos-tce")
      .upload(path, blob, {
        contentType: mimeType || "application/octet-stream",
        upsert: false,
      });
    const { error: upErr } = await Promise.race([
      uploadPromise,
      new Promise<{ error: Error }>((_, reject) => {
        controller.signal.addEventListener("abort", () =>
          reject(controller.signal.reason ?? new Error("Abortado")),
        );
      }),
    ]);
    if (upErr) throw upErr;

    const { error: insertErr } = await supabase.from("anexos").insert({
      paciente_id: input.paciente_id,
      plantao_id: input.plantao_id,
      storage_path: path,
      tipo_anexo: input.tipo_anexo,
      data_referencia: input.data_referencia,
      descricao: input.descricao ?? null,
      mime_type: mimeType || "application/octet-stream",
      tamanho_bytes: blob.size,
      enviado_por: input.enviado_por ?? null,
    });
    if (insertErr) throw insertErr;

    return { ok: true, storage_path: path, tamanho_bytes: blob.size };
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    return { ok: false, error: e };
  } finally {
    clearTimeout(timeoutId);
  }
}
