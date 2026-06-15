import { redirect } from "next/navigation";
import { getPesquisadorContext } from "@/lib/data/pesquisador-context";
import { listAlocacoesAtivas, listLigantesAtivos } from "@/lib/data/estagio";
import { SolicitacaoEscalaForm } from "@/components/estagio/SolicitacaoEscalaForm";
import { EscalaGestaoSection } from "@/components/estagio/EscalaGestaoSection";
import { DIAS_ORDEM, DIA_SEMANA_CURTO, DIA_SEMANA_LABEL, DIAS_COM_TARDE, type Turno } from "@/lib/lanc/enums";

export const dynamic = "force-dynamic";

function shortName(full: string): string {
  return full.trim().split(/\s+/).slice(0, 2).join(" ") || "—";
}

export default async function EscalaPage() {
  const ctx = await getPesquisadorContext();
  if (!ctx) redirect("/login");

  const alocacoes = await listAlocacoesAtivas();
  const minhas = alocacoes.filter((a) => a.pesquisador_id === ctx.id);

  const byKey = new Map<string, string[]>();
  for (const a of alocacoes) {
    const k = `${a.dia_semana}-${a.turno}`;
    const list = byKey.get(k) ?? [];
    list.push(shortName(a.nome));
    byKey.set(k, list);
  }
  const escalados = (dia: number, turno: Turno) => [...(byKey.get(`${dia}-${turno}`) ?? [])].sort();

  const ligantes = ctx.perms.canManageEscala ? await listLigantesAtivos() : [];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-hairline bg-paper-deep/40 p-4">
        <h1 className="text-lg font-medium text-ink">Escala de estágio</h1>
        <p className="mt-0.5 text-sm text-ash">
          Padrão fixo semanal (Seg–Dom × Manhã/Tarde; tarde só Seg/Ter/Qui/Sex).
        </p>
        <div className="mt-3 rounded-md bg-paper-deep/60 px-3 py-2 text-sm text-graphite">
          {minhas.length > 0 ? (
            <>
              <span className="font-medium text-ink">Seus dias: </span>
              {minhas
                .sort((a, b) => a.dia_semana - b.dia_semana)
                .map((a) => `${DIA_SEMANA_CURTO[a.dia_semana]} ${a.turno === "MANHA" ? "manhã" : "tarde"}`)
                .join(" · ")}
            </>
          ) : (
            "Você não está alocado em nenhum dia."
          )}
        </div>
      </section>

      {/* Grade — desktop */}
      <div className="hidden overflow-x-auto rounded-lg border border-hairline bg-paper-deep/40 md:block">
        <table className="w-full text-sm">
          <thead className="bg-paper-deep/60 text-left text-[10px] uppercase tracking-wide text-ash">
            <tr>
              <th className="w-16 px-4 py-2"></th>
              {DIAS_ORDEM.map((d) => (
                <th key={d} className="px-4 py-2 text-center">{DIA_SEMANA_CURTO[d]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["MANHA", "TARDE"] as Turno[]).map((turno) => (
              <tr key={turno} className="border-t border-hairline">
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wide text-ash">
                  {turno === "MANHA" ? "Manhã" : "Tarde"}
                </th>
                {DIAS_ORDEM.map((d) => {
                  if (turno === "TARDE" && !DIAS_COM_TARDE.has(d)) {
                    return <td key={d} className="px-4 py-3 text-center text-ash/40">—</td>;
                  }
                  const list = escalados(d, turno);
                  return (
                    <td key={d} className="px-4 py-3 align-top text-ink">
                      {list.length === 0 ? (
                        <span className="text-ash/50">—</span>
                      ) : (
                        <ul className="space-y-1">{list.map((n) => <li key={n}>{n}</li>)}</ul>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grade — mobile */}
      <ul className="space-y-2 md:hidden">
        {DIAS_ORDEM.map((d) => {
          const manha = escalados(d, "MANHA");
          const temTarde = DIAS_COM_TARDE.has(d);
          const tarde = temTarde ? escalados(d, "TARDE") : [];
          return (
            <li key={d} className="rounded-lg border border-hairline bg-paper-deep/40 p-3">
              <p className="font-medium text-ink">{DIA_SEMANA_LABEL[d]}</p>
              <div className={`mt-2 grid gap-2 text-sm ${temTarde ? "grid-cols-2" : "grid-cols-1"}`}>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ash">Manhã</p>
                  <p className={manha.length === 0 ? "text-ash/50" : "text-ink"}>{manha.length === 0 ? "—" : manha.join(", ")}</p>
                </div>
                {temTarde && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-ash">Tarde</p>
                    <p className={tarde.length === 0 ? "text-ash/50" : "text-ink"}>{tarde.length === 0 ? "—" : tarde.join(", ")}</p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <SolicitacaoEscalaForm
        hasFreeTransit={ctx.perms.hasFreeEscalaTransit}
        minhasAlocacoes={minhas.map((a) => ({ diaSemana: a.dia_semana, turno: a.turno }))}
      />

      {ctx.perms.canManageEscala && (
        <EscalaGestaoSection
          ligantesAtivos={ligantes}
          alocacoes={alocacoes}
        />
      )}
    </div>
  );
}
