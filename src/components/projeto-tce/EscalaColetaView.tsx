import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { listColetasComEscala, type ColetaComEscala } from "@/lib/data/tce-escala";
import { TCE_LOCAL_LABEL, type TceLocal } from "@/lib/lanc/enums";

/** View read-only da escala de coleta de um hospital (futuras vs realizadas). */
export async function EscalaColetaView({ local }: { local: TceLocal }) {
  const coletas = await listColetasComEscala(local);
  const hoje = format(new Date(), "yyyy-MM-dd");
  const futuras = coletas.filter((c) => c.data >= hoje);
  const realizadas = coletas.filter((c) => c.data < hoje).reverse();

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-hairline bg-paper-deep/40 p-4">
        <h1 className="text-lg font-medium text-ink">Escala — {TCE_LOCAL_LABEL[local]}</h1>
        <p className="mt-1 text-sm text-ash">
          {futuras.length} {futuras.length === 1 ? "coleta agendada" : "coletas agendadas"} ·{" "}
          {realizadas.length} {realizadas.length === 1 ? "realizada" : "realizadas"}.
        </p>
      </section>

      {futuras.length > 0 && (
        <section>
          <h2 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-ash">Próximas ({futuras.length})</h2>
          <div className="space-y-3">
            {futuras.map((c) => (
              <ColetaCard key={c.id} coleta={c} mostrarVagas />
            ))}
          </div>
        </section>
      )}

      {realizadas.length > 0 && (
        <details className="rounded-lg border border-hairline bg-paper-deep/40">
          <summary className="cursor-pointer p-4 text-sm font-medium text-ink">
            Realizadas <span className="font-normal text-ash">({realizadas.length})</span>
          </summary>
          <div className="space-y-1 px-4 pb-4">
            {realizadas.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 border-b border-hairline py-2 text-sm last:border-0">
                <span className="capitalize text-graphite">{format(new Date(c.data + "T12:00:00"), "EEE, dd/MM", { locale: ptBR })}</span>
                <span className="min-w-0 truncate text-right text-xs text-ash">
                  {c.escalados.length > 0 ? c.escalados.map((e) => e.nome).join(", ") : "—"}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {coletas.length === 0 && (
        <p className="rounded-lg border border-hairline bg-paper-deep/40 p-6 text-sm text-ash">
          Nenhuma escala cadastrada ainda para este hospital.
        </p>
      )}
    </div>
  );
}

function ColetaCard({ coleta: c, mostrarVagas }: { coleta: ColetaComEscala; mostrarVagas: boolean }) {
  const vagas = Math.max(0, c.capacidade_max - c.escalados.length);
  return (
    <div className="rounded-lg border border-hairline bg-paper-deep/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-medium capitalize text-ink">
            {format(new Date(c.data + "T12:00:00"), "EEEE, dd/MM", { locale: ptBR })}
          </h3>
          <p className="text-xs text-ash">{c.escalados.length} de {c.capacidade_max} escalados</p>
        </div>
        {mostrarVagas &&
          (vagas > 0 ? (
            <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {vagas} {vagas === 1 ? "vaga" : "vagas"}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-moss/10 px-2 py-0.5 text-[10px] font-medium text-moss">completa</span>
          ))}
      </div>
      <ul className="mt-3 space-y-1 text-sm text-ink">
        {c.escalados.map((e) => (
          <li key={e.id} className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-graphite/50" />
            {e.nome}
          </li>
        ))}
        {mostrarVagas &&
          Array.from({ length: vagas }).map((_, i) => (
            <li key={`vaga-${i}`} className="flex items-center gap-2 text-amber-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              <em>vaga aberta</em>
            </li>
          ))}
      </ul>
    </div>
  );
}
