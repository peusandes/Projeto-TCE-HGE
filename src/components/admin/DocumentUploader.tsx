"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { assinarUploadDocumento, registrarDocumento } from "@/app/(app)/admin/documentos/actions";
import { errMsg } from "@/lib/utils";
import { DOCUMENTO_TIPO, DOCUMENTO_TIPO_LABEL, type DocumentoTipo } from "@/lib/lanc/enums";

const SELECT =
  "w-full rounded-md border border-hairline bg-paper-deep/50 px-3 py-2 text-sm focus:border-cobalt focus:outline-none";

export function DocumentUploader({ membros }: { membros: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [pid, setPid] = useState("");
  const [tipo, setTipo] = useState<DocumentoTipo>("rg");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pid || !file) {
      toast.warning("Escolha o membro e o arquivo.");
      return;
    }
    setPending(true);
    try {
      const { path, token } = await assinarUploadDocumento({ pesquisadorId: pid, nomeArquivo: file.name });
      const supabase = createClient();
      const { error } = await supabase.storage.from("documentos").uploadToSignedUrl(path, token, file);
      if (error) throw new Error(error.message);
      await registrarDocumento({ pesquisadorId: pid, tipo, nomeArquivo: file.name, storagePath: path });
      toast.success("Documento enviado");
      setFile(null);
      setPid("");
      router.refresh();
    } catch (err) {
      toast.error("Erro ao enviar", { description: errMsg(err) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-hairline bg-paper-deep/40 p-4">
      <h3 className="font-medium text-ink">Enviar documento</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className={SELECT} value={pid} onChange={(e) => setPid(e.target.value)} required>
          <option value="">Membro…</option>
          {membros.map((m) => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
        <select className={SELECT} value={tipo} onChange={(e) => setTipo(e.target.value as DocumentoTipo)}>
          {DOCUMENTO_TIPO.map((t) => (
            <option key={t} value={t}>{DOCUMENTO_TIPO_LABEL[t]}</option>
          ))}
        </select>
      </div>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-graphite file:mr-3 file:rounded-md file:border file:border-hairline file:bg-paper file:px-3 file:py-1.5 file:text-sm"
      />
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Enviando…" : "Enviar"}</Button>
    </form>
  );
}
