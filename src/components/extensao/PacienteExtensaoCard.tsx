"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  mudarStatusPacienteExtensao,
  deletarPacienteExtensao,
} from "@/app/(app)/estagio/actions";
import { errMsg } from "@/lib/utils";
import {
  PACIENTE_STATUS_EXT_LABEL,
  PACIENTE_STATUS_EXT_PROXIMOS,
  type PacienteFluxo,
  type PacienteStatusExt,
} from "@/lib/lanc/enums";

const BADGE: Record<PacienteStatusExt, string> = {
  ADMISSAO: "bg-cobalt/10 text-cobalt border-cobalt/30",
  NO_MAPA: "bg-moss/10 text-moss border-moss/30",
  FORA_DO_MAPA: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  ALTA: "bg-slate-400/10 text-graphite border-slate-400/30",
};

type Props = {
  id: string;
  nome: string;
  dataAdmissao: string;
  statusAtual: PacienteStatusExt;
  fluxo: PacienteFluxo;
  isAdmin: boolean;
};

export function PacienteExtensaoCard(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [acao, setAcao] = useState<string | null>(null);

  function mudar(next: PacienteStatusExt) {
    if (next === "ALTA" && !confirm(`Confirmar ALTA de ${props.nome}?`)) return;
    setAcao(next);
    startTransition(async () => {
      try {
        await mudarStatusPacienteExtensao({ id: props.id, status: next, fluxo: props.fluxo });
        toast.success(`${props.nome} → ${PACIENTE_STATUS_EXT_LABEL[next]}`);
        router.refresh();
      } catch (err) {
        toast.error("Erro", { description: errMsg(err) });
      } finally {
        setAcao(null);
      }
    });
  }

  function apagar() {
    if (!confirm(`Apagar ${props.nome}? Ação irreversível.`)) return;
    setAcao("delete");
    startTransition(async () => {
      try {
        await deletarPacienteExtensao({ id: props.id, fluxo: props.fluxo });
        toast.success(`${props.nome} apagado`);
        router.refresh();
      } catch (err) {
        toast.error("Erro", { description: errMsg(err) });
      } finally {
        setAcao(null);
      }
    });
  }

  const admLabel = new Date(props.dataAdmissao + "T12:00:00").toLocaleDateString("pt-BR");
  const proximos = PACIENTE_STATUS_EXT_PROXIMOS[props.statusAtual];

  return (
    <div className="rounded-lg border border-hairline bg-paper-deep/40 p-3 md:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-ink">{props.nome}</h3>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${BADGE[props.statusAtual]}`}
        >
          {PACIENTE_STATUS_EXT_LABEL[props.statusAtual]}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-ash">Admitido em {admLabel}</p>

      {proximos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {proximos.map((next) => (
            <button
              key={next}
              type="button"
              onClick={() => mudar(next)}
              disabled={pending}
              className="rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper-deep disabled:opacity-50"
            >
              {acao === next ? "…" : `→ ${PACIENTE_STATUS_EXT_LABEL[next]}`}
            </button>
          ))}
        </div>
      )}

      {props.isAdmin && (
        <div className="mt-3 border-t border-hairline pt-2">
          <button
            type="button"
            onClick={apagar}
            disabled={pending}
            className="inline-flex items-center gap-1 text-xs text-vermillion hover:underline disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> {acao === "delete" ? "…" : "Apagar"}
          </button>
        </div>
      )}
    </div>
  );
}
