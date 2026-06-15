import { redirect } from "next/navigation";
import { getPesquisadorContext } from "@/lib/data/pesquisador-context";
import { listSolicitacoesPendentes, listSolicitacoesRecentes } from "@/lib/data/estagio";
import { SolicitacaoFilaActions } from "@/components/estagio/SolicitacaoFilaActions";
import {
  DIA_SEMANA_CURTO,
  ESTAGIO_SOLIC_TIPO_LABEL,
  type EstagioSolicTipo,
  type Turno,
} from "@/lib/lanc/enums";

export const dynamic = "force-dynamic";

function slot(dia: number | null, turno: Turno | null): string {
  if (dia === null || !turno) return "—";
  return `${DIA_SEMANA_CURTO[dia] ?? dia} ${turno === "MANHA" ? "manhã" : "tarde"}`;
}

const STATUS_CLASS: Record<string, string> = {
  PENDENTE: "bg-amber-500/10 text-amber-700",
  APROVADA: "bg-moss/10 text-moss",
  RECUSADA: "bg-vermillion/10 text-vermillion",
  CANCELADA: "bg-slate-400/10 text-graphite",
};

export default async function SolicitacoesPage() {
  const ctx = await getPesquisadorContext();
  if (!ctx) redirect("/login");
  if (!ctx.perms.canManageEscala) redirect("/estagio/escala");

  const pendentes = await listSolicitacoesPendentes();
  const recentes = await listSolicitacoesRecentes();

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-medium text-ink">Solicitações pendentes</h1>
          {pendentes.length > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700">
              {pendentes.length}
            </span>
          )}
        </div>

        {pendentes.length === 0 ? (
          <p className="rounded-lg border border-hairline bg-paper-deep/40 p-6 text-center text-sm text-ash">
            Nenhuma solicitação pendente.
          </p>
        ) : (
          <ul className="space-y-2">
            {pendentes.map((s) => (
              <li key={s.id} className="rounded-lg border border-hairline bg-paper-deep/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{s.nome}</p>
                    {s.email && <p className="text-xs text-ash">{s.email}</p>}
                    <p className="mt-1 text-sm text-graphite">
                      <span className="font-medium text-ink">{ESTAGIO_SOLIC_TIPO_LABEL[s.tipo as EstagioSolicTipo]}</span>
                      {(s.tipo === "SAIR" || s.tipo === "TROCAR") && <> · de {slot(s.de_dia_semana, s.de_turno)}</>}
                      {(s.tipo === "ENTRAR" || s.tipo === "TROCAR") && <> · para {slot(s.para_dia_semana, s.para_turno)}</>}
                    </p>
                    {s.mensagem && <p className="mt-1 text-xs text-ash">&ldquo;{s.mensagem}&rdquo;</p>}
                  </div>
                  <SolicitacaoFilaActions solicitacaoId={s.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recentes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-graphite">Histórico recente</h2>
          <ul className="space-y-2">
            {recentes.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-paper-deep/30 px-4 py-2.5 text-sm"
              >
                <span className="text-ink">
                  {s.nome} · {ESTAGIO_SOLIC_TIPO_LABEL[s.tipo as EstagioSolicTipo]} · {slot(s.de_dia_semana, s.de_turno)} → {slot(s.para_dia_semana, s.para_turno)}
                </span>
                <span className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_CLASS[s.status] ?? ""}`}>
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
