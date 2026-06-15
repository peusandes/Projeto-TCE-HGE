"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { decidirDocumento, urlDownloadDocumento } from "@/app/(app)/admin/documentos/actions";
import { errMsg } from "@/lib/utils";
import type { DocumentoStatus } from "@/lib/lanc/enums";

export function DocumentoRowActions({ id, status }: { id: string; status: DocumentoStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);
    try {
      const url = await urlDownloadDocumento(id);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error("Erro", { description: errMsg(e) });
    } finally {
      setBaixando(false);
    }
  }

  function decidir(s: DocumentoStatus) {
    startTransition(async () => {
      try {
        await decidirDocumento(id, s);
        toast.success(s === "APROVADO" ? "Aprovado" : "Rejeitado");
        router.refresh();
      } catch (e) {
        toast.error("Erro", { description: errMsg(e) });
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={baixar}
        disabled={baixando}
        className="inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-xs text-ink hover:bg-paper-deep disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" /> {baixando ? "…" : "Baixar"}
      </button>
      {status !== "APROVADO" && (
        <button type="button" onClick={() => decidir("APROVADO")} disabled={pending} className="rounded-md border border-moss/40 bg-moss/10 px-2 py-1 text-xs font-medium text-moss disabled:opacity-50">
          Aprovar
        </button>
      )}
      {status !== "REJEITADO" && (
        <button type="button" onClick={() => decidir("REJEITADO")} disabled={pending} className="rounded-md border border-vermillion/40 bg-vermillion/10 px-2 py-1 text-xs font-medium text-vermillion disabled:opacity-50">
          Rejeitar
        </button>
      )}
    </div>
  );
}
