"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { aprovarSignup, rejeitarSignup } from "@/app/(app)/admin/membros/actions";
import { errMsg } from "@/lib/utils";

export function SignupRequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [acao, setAcao] = useState<string | null>(null);

  function run(a: "aprovar" | "rejeitar") {
    if (a === "rejeitar" && !confirm("Rejeitar este cadastro?")) return;
    setAcao(a);
    startTransition(async () => {
      try {
        if (a === "aprovar") await aprovarSignup(id);
        else await rejeitarSignup(id);
        toast.success(a === "aprovar" ? "Cadastro aprovado (convite enviado)" : "Cadastro rejeitado");
        router.refresh();
      } catch (e) {
        toast.error("Erro", { description: errMsg(e) });
      } finally {
        setAcao(null);
      }
    });
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => run("aprovar")}
        disabled={pending}
        className="rounded-md border border-moss/40 bg-moss/10 px-3 py-1 text-xs font-medium text-moss disabled:opacity-50"
      >
        {acao === "aprovar" ? "…" : "Aprovar"}
      </button>
      <button
        type="button"
        onClick={() => run("rejeitar")}
        disabled={pending}
        className="rounded-md border border-vermillion/40 bg-vermillion/10 px-3 py-1 text-xs font-medium text-vermillion disabled:opacity-50"
      >
        {acao === "rejeitar" ? "…" : "Rejeitar"}
      </button>
    </div>
  );
}
