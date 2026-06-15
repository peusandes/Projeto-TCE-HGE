"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { criarSolicitacaoEscala } from "@/app/(app)/estagio/escala-actions";
import { errMsg } from "@/lib/utils";
import { DIAS_ORDEM, DIA_SEMANA_LABEL, turnosDoDia, TURNO_LABEL, type Turno } from "@/lib/lanc/enums";

const SELECT =
  "w-full rounded-md border border-hairline bg-paper-deep/50 px-3 py-2 text-sm focus:border-cobalt focus:outline-none";

type Tipo = "ENTRAR" | "TROCAR" | "SAIR";

export function SolicitacaoEscalaForm({
  hasFreeTransit,
  minhasAlocacoes,
}: {
  hasFreeTransit: boolean;
  minhasAlocacoes: { diaSemana: number; turno: Turno }[];
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<Tipo>("ENTRAR");
  const [deDia, setDeDia] = useState("");
  const [deTurno, setDeTurno] = useState<Turno>("MANHA");
  const [paraDia, setParaDia] = useState("");
  const [paraTurno, setParaTurno] = useState<Turno>("MANHA");
  const [mensagem, setMensagem] = useState("");
  const [pending, startTransition] = useTransition();

  const deDias = minhasAlocacoes.length
    ? Array.from(new Set(minhasAlocacoes.map((a) => a.diaSemana)))
    : DIAS_ORDEM;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const input: {
          tipo: Tipo;
          mensagem?: string;
          deDiaSemana?: number;
          deTurno?: Turno;
          paraDiaSemana?: number;
          paraTurno?: Turno;
        } = { tipo, mensagem: mensagem || undefined };
        if (tipo === "ENTRAR" || tipo === "TROCAR") {
          if (paraDia === "") {
            toast.warning("Escolha o dia de destino.");
            return;
          }
          input.paraDiaSemana = Number(paraDia);
          input.paraTurno = paraTurno;
        }
        if (tipo === "SAIR" || tipo === "TROCAR") {
          if (deDia === "") {
            toast.warning("Escolha o dia de origem.");
            return;
          }
          input.deDiaSemana = Number(deDia);
          input.deTurno = deTurno;
        }
        const res = await criarSolicitacaoEscala(input);
        if (res.applied) {
          toast.success("Escala atualizada na hora (trânsito livre).");
          router.refresh();
        } else {
          toast.success("Solicitação enviada. Aguarde aprovação da Extensão.");
          setMensagem("");
        }
      } catch (err) {
        toast.error("Erro", { description: errMsg(err) });
      }
    });
  }

  return (
    <section className="rounded-lg border border-hairline bg-paper-deep/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-ink">Solicitar mudança na escala</h3>
          <p className="mt-0.5 text-sm text-ash">
            {hasFreeTransit
              ? "Você tem trânsito livre — aplicado na hora, sem aprovação."
              : "Sua solicitação vai para aprovação da Extensão."}
          </p>
        </div>
        {hasFreeTransit && (
          <span className="shrink-0 rounded-full bg-cobalt/10 px-2 py-0.5 text-[10px] font-medium uppercase text-cobalt">
            trânsito livre
          </span>
        )}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["ENTRAR", "TROCAR", "SAIR"] as Tipo[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                tipo === t ? "bg-ink text-paper" : "border border-hairline text-graphite hover:bg-paper-deep"
              }`}
            >
              {t === "ENTRAR" ? "Entrar" : t === "TROCAR" ? "Trocar" : "Sair"}
            </button>
          ))}
        </div>

        {(tipo === "SAIR" || tipo === "TROCAR") && (
          <div className="grid grid-cols-2 gap-3">
            <select className={SELECT} value={deDia} onChange={(e) => setDeDia(e.target.value)} required>
              <option value="">{tipo === "TROCAR" ? "De — dia" : "Dia atual"}</option>
              {deDias.map((d) => (
                <option key={d} value={d}>{DIA_SEMANA_LABEL[d]}</option>
              ))}
            </select>
            <select className={SELECT} value={deTurno} onChange={(e) => setDeTurno(e.target.value as Turno)} required>
              {(deDia ? turnosDoDia(Number(deDia)) : (["MANHA", "TARDE"] as Turno[])).map((t) => (
                <option key={t} value={t}>{TURNO_LABEL[t]}</option>
              ))}
            </select>
          </div>
        )}

        {(tipo === "ENTRAR" || tipo === "TROCAR") && (
          <div className="grid grid-cols-2 gap-3">
            <select className={SELECT} value={paraDia} onChange={(e) => setParaDia(e.target.value)} required>
              <option value="">{tipo === "TROCAR" ? "Para — dia" : "Novo dia"}</option>
              {DIAS_ORDEM.map((d) => (
                <option key={d} value={d}>{DIA_SEMANA_LABEL[d]}</option>
              ))}
            </select>
            <select className={SELECT} value={paraTurno} onChange={(e) => setParaTurno(e.target.value as Turno)} required>
              {(paraDia ? turnosDoDia(Number(paraDia)) : (["MANHA", "TARDE"] as Turno[])).map((t) => (
                <option key={t} value={t}>{TURNO_LABEL[t]}</option>
              ))}
            </select>
          </div>
        )}

        {!hasFreeTransit && (
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Mensagem (opcional)…"
            className={`${SELECT} resize-none`}
          />
        )}

        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enviando…" : hasFreeTransit ? "Aplicar" : "Solicitar"}
        </Button>
      </form>
    </section>
  );
}
