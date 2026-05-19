import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Props = {
  plantao: {
    id: string;
    data: string;
    pesquisadores: string[];
    paciente_count: number;
    finalizado: boolean;
  };
};

export function PlantaoCard({ plantao }: Props) {
  const date = new Date(plantao.data + "T12:00:00");
  const dia = format(date, "dd");
  const diaSemana = format(date, "EEEE", { locale: ptBR });
  const mesAno = format(date, "MMMM · yyyy", { locale: ptBR });
  const active = !plantao.finalizado;

  return (
    <article
      className={cn(
        "relative rounded-xl border border-hairline overflow-hidden transition-colors",
        active ? "bg-paper-deep hover:border-cobalt/50" : "bg-paper-deep/50",
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-cobalt" />}
      <div className="p-5">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-[10px] uppercase tracking-ultra font-medium inline-flex items-center gap-1.5",
              active ? "text-cobalt-soft" : "text-ash",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                active ? "bg-cobalt-soft" : "bg-ash",
              )}
            />
            {active ? "Em andamento" : "Finalizado"}
          </span>
          <span className="font-mono text-[10px] text-ash uppercase">
            {plantao.paciente_count} {plantao.paciente_count === 1 ? "paciente" : "pacientes"}
          </span>
        </div>

        <div className="mt-4 flex items-end gap-5">
          <div
            className={cn(
              "tab-num leading-[0.85] font-light tracking-tight",
              active ? "text-[64px] text-ink" : "text-[44px] text-graphite",
            )}
          >
            {dia}
          </div>
          <div className="pb-1.5 flex-1 min-w-0">
            <div className="text-[16px] leading-none text-graphite font-medium capitalize">
              {diaSemana}
            </div>
            <div className="text-[11px] uppercase tracking-editorial text-ash mt-1.5 capitalize">
              {mesAno}
            </div>
          </div>
        </div>

        <p className="mt-4 text-[13px] text-graphite truncate">
          {plantao.pesquisadores.length > 0
            ? plantao.pesquisadores.join(" · ")
            : "Sem pesquisadores"}
        </p>
      </div>
    </article>
  );
}
