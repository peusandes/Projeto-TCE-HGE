import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SituacaoBadge, TcleBadge, SITUACAO_ACCENT } from "./PacienteBadges";
import type { Situacao, TcleStatus } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";

type Props = {
  paciente: {
    id: string;
    nome: string;
    leito: string | null;
    situacao: Situacao;
    tcle_status: TcleStatus;
    descricao: string | null;
    comentarios: string | null;
  };
};

function extractLeitoNumber(raw: string | null): { numeral: string; suffix: string } {
  if (!raw) return { numeral: "—", suffix: "" };
  const match = raw.match(/(\d+)/);
  if (!match) return { numeral: raw.slice(0, 4), suffix: "" };
  const num = match[1].padStart(2, "0");
  const suffix = raw.replace(match[0], "").trim();
  return { numeral: num, suffix };
}

export function PacienteCard({ paciente }: Props) {
  const { numeral, suffix } = extractLeitoNumber(paciente.leito);
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
        <div className={cn("absolute left-0 top-5 bottom-5 w-[2px] rounded-full", accent)} />
        <div className="flex items-start gap-4">
          <div className="text-center pt-0.5 shrink-0 w-11">
            <div
              className={cn(
                "text-[26px] leading-none font-light tab-num tracking-tight",
                isExcluded ? "text-vermillion/60" : isAlta ? "text-ash" : "text-ink",
              )}
            >
              {numeral}
            </div>
            <div className={cn("text-[9px] uppercase tracking-[0.18em] mt-1", isExcluded ? "text-vermillion/50" : "text-ash")}>leito</div>
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-[15px] font-medium leading-tight",
                isExcluded
                  ? "text-vermillion/70 line-through decoration-1 decoration-vermillion/40"
                  : isAlta
                    ? "text-graphite"
                    : "text-ink",
              )}
            >
              {paciente.nome}
            </p>
            {(paciente.descricao || suffix) && (
              <p className={cn("text-[12px] mt-1", isExcluded ? "text-vermillion/60" : "text-ash")}>
                {[suffix, paciente.descricao].filter(Boolean).join(" · ")}
              </p>
            )}
            {paciente.comentarios && (
              <p className="text-[11px] text-ash/80 italic mt-1 line-clamp-2">
                {paciente.comentarios}
              </p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
              <SituacaoBadge value={paciente.situacao} />
              {paciente.situacao !== "EXCLUSAO" && <TcleBadge value={paciente.tcle_status} />}
            </div>
          </div>
          <ChevronRight className={cn("h-4 w-4 mt-1 shrink-0", isExcluded ? "text-vermillion/50" : isAlta ? "text-ash/60" : "text-ash")} />
        </div>
      </article>
    </Link>
  );
}
