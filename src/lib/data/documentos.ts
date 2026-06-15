import { createClient } from "@/lib/supabase/server";
import type { DocumentoStatus, DocumentoTipo } from "@/lib/lanc/enums";

export type DocumentoRow = {
  id: string;
  pesquisador_id: string;
  nome_membro: string;
  tipo: DocumentoTipo;
  nome_arquivo: string;
  status: DocumentoStatus;
  enviado_em: string;
};

export async function listDocumentos(): Promise<DocumentoRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documentos")
    .select("id, pesquisador_id, tipo, nome_arquivo, status, enviado_em, pesquisadores ( nome )")
    .order("enviado_em", { ascending: false });
  if (error) throw new Error(`listDocumentos: ${error.message}`);
  return (data ?? []).map((d) => {
    const p = Array.isArray(d.pesquisadores) ? d.pesquisadores[0] : d.pesquisadores;
    return {
      id: d.id as string,
      pesquisador_id: d.pesquisador_id as string,
      nome_membro: (p as { nome?: string } | null)?.nome ?? "—",
      tipo: d.tipo as DocumentoTipo,
      nome_arquivo: d.nome_arquivo as string,
      status: d.status as DocumentoStatus,
      enviado_em: d.enviado_em as string,
    };
  });
}
