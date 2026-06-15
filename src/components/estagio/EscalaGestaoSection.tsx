"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gerirAlocacao } from "@/app/(app)/estagio/escala-actions";
import { errMsg } from "@/lib/utils";
import { DIAS_ORDEM, DIA_SEMANA_LABEL, TURNO_LABEL, turnosDoDia, type Turno } from "@/lib/lanc/enums";

const SELECT =
  "w-full rounded-md border border-hairline bg-paper-deep/50 px-3 py-2 text-sm focus:border-cobalt focus:outline-none";

type Aloc = { id: string; pesquisador_id: string; nome: string; dia_semana: number; turno: Turno };

export function EscalaGestaoSection({
  ligantesAtivos,
  alocacoes,
}: {
  ligantesAtivos: { id: string; nome: string }[];
  alocacoes: Aloc[];
}) {
  const router = useRouter();
  const [pid, setPid] = useState("");
  const [dia, setDia] = useState("");
  const [turno, setTurno] = useState<Turno>("MANHA");
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!pid || dia === "") {
      toast.warning("Escolha o ligante e o dia.");
      return;
    }
    startTransition(async () => {
      try {
        await gerirAlocacao({ pesquisadorId: pid, diaSemana: Number(dia), turno, ativo: true });
        toast.success("Ligante alocado");
        setPid("");
        setDia("");
        router.refresh();
      } catch (err) {
        toast.error("Erro", { description: errMsg(err) });
      }
    });
  }

  function remover(a: Aloc) {
    startTransition(async () => {
      try {
        await gerirAlocacao({ pesquisadorId: a.pesquisador_id, diaSemana: a.dia_semana, turno: a.turno, ativo: false });
        toast.success("Alocação removida");
        router.refresh();
      } catch (err) {
        toast.error("Erro", { description: errMsg(err) });
      }
    });
  }

  const ordenadas = [...alocacoes].sort(
    (a, b) => DIAS_ORDEM.indexOf(a.dia_semana) - DIAS_ORDEM.indexOf(b.dia_semana) || a.nome.localeCompare(b.nome),
  );

  return (
    <section className="rounded-lg border border-hairline bg-paper-deep/40 p-4">
      <h3 className="font-medium text-ink">Gestão da escala (Extensão)</h3>

      <form onSubmit={add} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <select className={SELECT} value={pid} onChange={(e) => setPid(e.target.value)} required>
          <option value="">Ligante…</option>
          {ligantesAtivos.map((l) => (
            <option key={l.id} value={l.id}>{l.nome}</option>
          ))}
        </select>
        <select className={SELECT} value={dia} onChange={(e) => setDia(e.target.value)} required>
          <option value="">Dia…</option>
          {DIAS_ORDEM.map((d) => (
            <option key={d} value={d}>{DIA_SEMANA_LABEL[d]}</option>
          ))}
        </select>
        <select className={SELECT} value={turno} onChange={(e) => setTurno(e.target.value as Turno)}>
          {(dia ? turnosDoDia(Number(dia)) : (["MANHA", "TARDE"] as Turno[])).map((t) => (
            <option key={t} value={t}>{TURNO_LABEL[t]}</option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={pending}>Alocar</Button>
      </form>

      {ordenadas.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {ordenadas.map((a) => (
            <li
              key={a.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs text-ink"
            >
              <span>{a.nome} · {DIA_SEMANA_LABEL[a.dia_semana]} {TURNO_LABEL[a.turno].toLowerCase()}</span>
              <button
                type="button"
                onClick={() => remover(a)}
                disabled={pending}
                className="text-ash hover:text-vermillion disabled:opacity-50"
                aria-label="remover"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
