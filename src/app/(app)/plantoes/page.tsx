import Link from "next/link";
import { listPlantoes } from "@/lib/data/plantoes";
import { PlantaoCard } from "@/components/plantao/PlantaoCard";
import { NovoPlantaoFab } from "@/components/plantao/NovoPlantaoFab";

export const dynamic = "force-dynamic";

export default async function PlantoesPage() {
  const plantoes = await listPlantoes();

  return (
    <div className="container max-w-2xl py-5 space-y-5">
      <section>
        <h1 className="text-[28px] leading-none font-semibold text-ink">Plantões</h1>
        <p className="mt-2 text-[13px] text-ash">Mapa de campo da coleta.</p>
      </section>

      {plantoes.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {plantoes.map((p) => (
            <li key={p.id}>
              <Link href={`/plantoes/${p.id}`}>
                <PlantaoCard plantao={p} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="h-28" aria-hidden />
      <NovoPlantaoFab />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-hairline bg-paper-deep p-10 flex flex-col items-center justify-center text-center gap-3">
      <p className="text-[16px] font-medium text-ink">Nenhum plantão ainda</p>
      <p className="text-[12px] text-ash max-w-[240px] leading-relaxed">
        Toque em <span className="text-cobalt-soft font-medium">+ Novo plantão</span>{" "}
        no canto inferior direito para começar o mapa.
      </p>
    </div>
  );
}
