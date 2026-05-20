import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { SituacaoBadge, TcleBadge, SITUACAO_ACCENT } from "@/components/plantao/PacienteBadges";
import { ResponsavelAvatar } from "@/components/plantao/ResponsavelAvatar";
import { SETOR_SHORT } from "@/lib/domain/enums";
import type { PacienteComResponsavel } from "@/lib/data/pacientes";
import { cn } from "@/lib/utils";

export function PacienteListItem({ paciente }: { paciente: PacienteComResponsavel }) {
  const isExcluded = paciente.situacao === "EXCLUSAO";
  const isAlta = paciente.situacao === "ALTA";
  const isPendenteAlta = paciente.verificacao_alta === "PENDENTE_HGE";
  const isForaDoutore = paciente.verificacao_alta === "FORA_DOUTORE";
  const accent = SITUACAO_ACCENT[paciente.situacao];

  return (
    <Link href={`/pacientes/${paciente.id}`} className="block">
      <article
        className={cn(
          "relative rounded-xl border px-4 py-3.5 transition-colors",
          isPendenteAlta
            ? "bg-saffron/[0.10] border-saffron/50 ring-1 ring-saffron/20"
            : isExcluded
              ? "bg-vermillion/[0.07] border-vermillion/25"
              : isAlta
                ? "bg-paper-deep/50 border-hairline"
                : isForaDoutore
                  ? "bg-paper-deep border-saffron/30 hover:border-saffron/60"
                  : "bg-paper-deep border-hairline hover:border-cobalt/50",
        )}
      >
        <div
          className={cn(
            "absolute left-0 top-4 bottom-4 w-[2px] rounded-full",
            isPendenteAlta ? "bg-saffron" : isForaDoutore ? "bg-saffron/70" : accent,
          )}
        />
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
              {isPendenteAlta && (
                <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] uppercase tracking-[0.06em] font-medium leading-none border bg-saffron/20 border-saffron/40 text-saffron">
                  <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2.4} /> Possível alta
                </span>
              )}
              {isForaDoutore && (
                <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] uppercase tracking-[0.06em] font-medium leading-none border bg-saffron/20 border-saffron/40 text-saffron">
                  <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2.4} /> Fora Doutore
                </span>
              )}
              {!isPendenteAlta && <SituacaoBadge value={paciente.situacao} />}
              {paciente.situacao !== "EXCLUSAO" && <TcleBadge value={paciente.tcle_status} />}
            </div>
          </div>
          {paciente.responsavel_atual && (
            <div className="shrink-0" title={`Responsável: ${paciente.responsavel_atual.nome}`}>
              <ResponsavelAvatar
                responsavel={paciente.responsavel_atual}
                size="sm"
              />
            </div>
          )}
          <ChevronRight
            className={cn("h-4 w-4 shrink-0", isExcluded ? "text-vermillion/50" : "text-ash")}
          />
        </div>
      </article>
    </Link>
  );
}
