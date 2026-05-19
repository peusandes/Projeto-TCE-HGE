import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SituacaoBadge, TcleBadge, SITUACAO_ACCENT } from "@/components/plantao/PacienteBadges";
import { SETOR_SHORT } from "@/lib/domain/enums";
import type { Paciente } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function PacienteListItem({ paciente }: { paciente: Paciente }) {
  const isExcluded = paciente.situacao === "EXCLUSAO";
  const isAlta = paciente.situacao === "ALTA";
  const accent = SITUACAO_ACCENT[paciente.situacao];

  return (
    <Link href={`/pacientes/${paciente.id}`} className="block">
      <article
        className={cn(
          "relative rounded-xl border px-4 py-3.5 transition-colors",
          isExcluded
            ? "bg-vermillion/[0.07] border-vermillion/25"
            : isAlta
              ? "bg-paper-deep/50 border-hairline"
              : "bg-paper-deep border-hairline hover:border-cobalt/50",
        )}
      >
        <div className={cn("absolute left-0 top-4 bottom-4 w-[2px] rounded-full", accent)} />
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-editorial text-ash mb-1">
              <span className="font-medium">{SETOR_SHORT[paciente.setor]}</span>
              {paciente.leito && (
                <>
                  <span>·</span>
                  <span>{paciente.leito}</span>
                </>
              )}
            </div>
            <p
              className={cn(
                "text-[14.5px] font-medium leading-tight",
                isExcluded
                  ? "text-vermillion/70 line-through decoration-1"
                  : isAlta
                    ? "text-graphite"
                    : "text-ink",
              )}
            >
              {paciente.nome}
            </p>
            {paciente.descricao && (
              <p className={cn("text-[11.5px] mt-0.5", isExcluded ? "text-vermillion/60" : "text-ash")}>
                {paciente.descricao}
              </p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <SituacaoBadge value={paciente.situacao} />
              {paciente.situacao !== "EXCLUSAO" && <TcleBadge value={paciente.tcle_status} />}
            </div>
          </div>
          <ChevronRight
            className={cn("h-4 w-4 shrink-0", isExcluded ? "text-vermillion/50" : "text-ash")}
          />
        </div>
      </article>
    </Link>
  );
}
