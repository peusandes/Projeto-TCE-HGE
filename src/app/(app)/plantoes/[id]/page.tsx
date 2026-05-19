import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, Lock } from "lucide-react";
import { getPlantao, getMapaDoPlantao } from "@/lib/data/plantoes";
import { getCurrentPesquisador } from "@/lib/data/pesquisadores";
import { listGoseLembretes } from "@/lib/data/gose-reminders";
import { MapaPlantao } from "@/components/plantao/MapaPlantao";
import { FinalizarPlantaoButton } from "@/components/plantao/FinalizarPlantaoButton";
import { ExcluirPlantaoButton } from "@/components/plantao/ExcluirPlantaoButton";
import { GoseRemindersBanner } from "@/components/plantao/GoseRemindersBanner";

export const dynamic = "force-dynamic";

export default async function PlantaoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const plantao = await getPlantao(params.id);
  if (!plantao) notFound();
  const [mapa, me, lembretes] = await Promise.all([
    getMapaDoPlantao(plantao.id),
    getCurrentPesquisador(),
    listGoseLembretes(),
  ]);

  const date = new Date(plantao.data + "T12:00:00");
  const dia = format(date, "dd");
  const diaSemana = format(date, "EEEE", { locale: ptBR });
  const mesAno = format(date, "MMMM 'de' yyyy", { locale: ptBR });
  const dataLabel = format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const tcleP = mapa.filter((m) => m.tcle_status === "PENDENTE").length;
  const adm = mapa.filter((m) => m.situacao === "ADM").length;
  const altas = mapa.filter((m) => m.situacao === "ALTA").length;
  const pendentesAlta = mapa.filter(
    (m) => m.verificacao_alta === "PENDENTE_HGE",
  ).length;

  return (
    <div className="container max-w-2xl py-3 space-y-2">
      <div className="flex items-center justify-between">
        <Link
          href="/plantoes"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-editorial text-ash hover:text-ink min-tap"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          Plantões
        </Link>
        <div className="flex items-center gap-1">
          {plantao.finalizado ? (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-editorial text-ash">
              <Lock className="h-3 w-3" /> finalizado
            </span>
          ) : (
            <FinalizarPlantaoButton
              plantaoId={plantao.id}
              pendentesAltaCount={pendentesAlta}
            />
          )}
          {me?.is_admin && (
            <ExcluirPlantaoButton plantaoId={plantao.id} dataLabel={dataLabel} />
          )}
        </div>
      </div>

      <section className="pt-3">
        <div className="flex items-end gap-4">
          <div className="text-[80px] leading-[0.82] font-light tracking-tight tab-num text-ink">
            {dia}
          </div>
          <div className="pb-2 flex-1 min-w-0">
            <div className="text-[18px] leading-none text-graphite font-medium capitalize">
              {diaSemana}
            </div>
            <div className="text-[11px] uppercase tracking-editorial text-ash mt-1.5 capitalize">
              {mesAno}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-graphite truncate">
          {plantao.pesquisadores.join(" · ") || "Sem pesquisadores"}
        </p>

        {plantao.observacoes && (
          <p className="mt-3 text-[13px] text-graphite bg-paper-deep border border-hairline rounded-lg p-3 leading-relaxed">
            {plantao.observacoes}
          </p>
        )}

        <div className="mt-5 grid grid-cols-4 divide-x divide-hairline bg-paper-deep border border-hairline rounded-xl py-3">
          <Stat label="Mapa" value={mapa.length} tone="ink" />
          <Stat label="TCLE" value={tcleP} tone="saffron" />
          <Stat label="ADM" value={adm} tone="cobalt" />
          <Stat label="Altas" value={altas} tone="plum" />
        </div>
      </section>

      {/* Lembretes GOS-E — só aparece quando há pendências (já vencidas). */}
      {lembretes.length > 0 && (
        <div className="pt-2">
          <GoseRemindersBanner lembretes={lembretes} />
        </div>
      )}

      <div className="h-px bg-hairline my-4" />

      <MapaPlantao
        plantaoId={plantao.id}
        mapa={mapa as never}
        readOnly={plantao.finalizado}
      />

      <div className="h-32" aria-hidden />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ink" | "saffron" | "cobalt" | "plum";
}) {
  const colors = {
    ink: "text-ink",
    saffron: "text-saffron",
    cobalt: "text-cobalt-soft",
    plum: "text-plum",
  };
  return (
    <div className="text-center">
      <div className={`text-[22px] leading-none font-light tab-num ${colors[tone]}`}>
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[10px] uppercase tracking-editorial text-ash mt-1.5">{label}</div>
    </div>
  );
}
