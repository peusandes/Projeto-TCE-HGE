"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { decidirSolicitacaoEscala } from "@/app/(app)/estagio/escala-actions";
import { errMsg } from "@/lib/utils";

export function SolicitacaoFilaActions({ solicitacaoId }: { solicitacaoId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [acao, setAcao] = useState<string | null>(null);

  function decidir(a: "APROVAR" | "RECUSAR") {
    let motivo: string | undefined;
    if (a === "RECUSAR") {
      const m = prompt("Motivo da recusa (opcional):");
      if (m === null) return;
      motivo = m || undefined;
    }
    setAcao(a);
    startTransition(async () => {
      try {
        await decidirSolicitacaoEscala({ id: solicitacaoId, acao: a, motivo });
        toast.success(a === "APROVAR" ? "Solicitação aprovada" : "Solicitação recusada");
        router.refresh();
      } catch (err) {
        toast.error("Erro", { description: errMsg(err) });
      } finally {
        setAcao(null);
      }
    });
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => decidir("APROVAR")}
        disabled={pending}
        className="rounded-md border border-moss/40 bg-moss/10 px-3 py-1 text-xs font-medium text-moss disabled:opacity-50"
      >
        {acao === "APROVAR" ? "…" : "Aprovar"}
      </button>
      <button
        type="button"
        onClick={() => decidir("RECUSAR")}
        disabled={pending}
        className="rounded-md border border-vermillion/40 bg-vermillion/10 px-3 py-1 text-xs font-medium text-vermillion disabled:opacity-50"
      >
        {acao === "RECUSAR" ? "…" : "Recusar"}
      </button>
    </div>
  );
}
