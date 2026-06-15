"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPesquisadorContext } from "@/lib/data/pesquisador-context";
import type { DocumentoStatus, DocumentoTipo } from "@/lib/lanc/enums";

const BUCKET = "documentos";

async function requireDocUploader() {
  const ctx = await getPesquisadorContext();
  if (!ctx || !ctx.perms.canUploadDocs) throw new Error("Sem permissão para gerir documentos.");
  return ctx;
}

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "arquivo";
}

/** Gera URL assinada pro client subir o arquivo direto no Storage (sem passar pela server action). */
export async function assinarUploadDocumento(input: {
  pesquisadorId: string;
  nomeArquivo: string;
}): Promise<{ path: string; token: string }> {
  await requireDocUploader();
  const admin = createAdminClient();
  const path = `${input.pesquisadorId}/${crypto.randomUUID()}_${safeName(input.nomeArquivo)}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Falha ao preparar o upload.");
  return { path: data.path, token: data.token };
}

export async function registrarDocumento(input: {
  pesquisadorId: string;
  tipo: DocumentoTipo;
  nomeArquivo: string;
  storagePath: string;
}): Promise<void> {
  await requireDocUploader();
  const supabase = createClient();
  const { error } = await supabase.from("documentos").insert({
    pesquisador_id: input.pesquisadorId,
    tipo: input.tipo,
    nome_arquivo: input.nomeArquivo,
    storage_path: input.storagePath,
    status: "PENDENTE",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/documentos");
}

export async function decidirDocumento(id: string, status: DocumentoStatus): Promise<void> {
  const ctx = await requireDocUploader();
  const supabase = createClient();
  const { error } = await supabase
    .from("documentos")
    .update({ status, revisado_em: new Date().toISOString(), revisado_por: ctx.email })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/documentos");
}

/** URL assinada de download (60s). */
export async function urlDownloadDocumento(id: string): Promise<string> {
  await requireDocUploader();
  const supabase = createClient();
  const { data: doc } = await supabase.from("documentos").select("storage_path").eq("id", id).maybeSingle();
  if (!doc) throw new Error("Documento não encontrado.");
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(doc.storage_path as string, 60);
  if (error || !data) throw new Error(error?.message ?? "Falha ao gerar o link.");
  return data.signedUrl;
}
