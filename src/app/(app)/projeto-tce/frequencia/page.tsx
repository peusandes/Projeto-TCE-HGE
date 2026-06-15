import { listEscalasParaFrequencia } from "@/lib/data/tce-escala";

export const dynamic = "force-dynamic";

type FreqRow = { nome: string; ano: number; semestre: number; total: number };

export default async function FrequenciaPage() {
  const escalas = await listEscalasParaFrequencia();

  const byKey = new Map<string, FreqRow>();
  for (const e of escalas) {
    const d = new Date(e.data + "T12:00:00");
    const ano = d.getFullYear();
    const semestre = d.getMonth() < 6 ? 1 : 2;
    const key = `${e.nome}|${ano}|${semestre}`;
    const cur = byKey.get(key);
    if (cur) cur.total += 1;
    else byKey.set(key, { nome: e.nome, ano, semestre, total: 1 });
  }

  const rows = [...byKey.values()].sort(
    (a, b) => b.ano - a.ano || b.semestre - a.semestre || b.total - a.total || a.nome.localeCompare(b.nome),
  );

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-hairline bg-paper-deep/40 p-4">
        <h1 className="text-lg font-medium text-ink">Frequência das coletas</h1>
        <p className="mt-1 text-sm text-ash">Coletas por ligante × semestre (a partir da escala registrada).</p>
      </section>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-hairline bg-paper-deep/40 p-6 text-sm text-ash">Sem dados ainda.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-hairline bg-paper-deep/40 md:block">
            <table className="w-full text-sm">
              <thead className="bg-paper-deep/60 text-left text-[10px] uppercase tracking-wide text-ash">
                <tr>
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2 text-center">Semestre</th>
                  <th className="px-4 py-2 text-right">Coletas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.nome}-${r.ano}-${r.semestre}`} className="border-t border-hairline">
                    <td className="px-4 py-2 text-ink">{r.nome}</td>
                    <td className="px-4 py-2 text-center text-graphite">{r.ano}.{r.semestre}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums text-ink">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li
                key={`${r.nome}-${r.ano}-${r.semestre}`}
                className="flex items-center justify-between rounded-lg border border-hairline bg-paper-deep/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{r.nome}</p>
                  <p className="text-xs text-ash">{r.ano}.{r.semestre}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-semibold tabular-nums text-ink">{r.total}</p>
                  <p className="text-xs text-ash">{r.total === 1 ? "coleta" : "coletas"}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
