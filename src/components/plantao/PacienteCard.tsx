import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { SituacaoBadge, TcleBadge, RedcapElegivelBadge, SITUACAO_ACCENT } from "./PacienteBadges";
import { ResponsavelControl } from "./ResponsavelControl";
import type { ResponsavelInfo } from "./ResponsavelAvatar";
import type { Situacao, TcleStatus, VerificacaoAlta } from "@/lib/domain/enums";
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
    verificacao_alta?: VerificacaoAlta | null;
    /** Elegível para exportar ao REDCap (gate `redcap_export_habilitado`). */
    redcapElegivel?: boolean;
  };
  /** Plantão de onde a navegação parte. Quando definido, o detalhe do paciente
   *  fica preso a esse plantão (back link + revalidações + reservas). Sem ele,
   *  o detalhe cai no plantão original do paciente (comportamento legado). */
  plantaoContextoId?: string;
  /** Reserva opcional — só mostra quando tem mapa_entry_id (mapa do plantão) */
  reserva?: {
    mapaEntryId: string;
    responsavel: ResponsavelInfo | null;
    concluido: boolean;
    currentUserId: string;
    isAdmin: boolean;
    readOnly: boolean;
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

export function PacienteCard({ paciente, plantaoContextoId, reserva }: Props) {
  const { numeral, suffix } = extractLeitoNumber(paciente.leito);
  const isExcluded = paciente.situacao === "EXCLUSAO";
  const isAlta = paciente.situacao === "ALTA";
  const isPendenteAlta = paciente.verificacao_alta === "PENDENTE_HGE";
  const isForaDoutore = paciente.verificacao_alta === "FORA_DOUTORE";
  const accent = SITUACAO_ACCENT[paciente.situacao];
  const href = plantaoContextoId
    ? `/pacientes/${paciente.id}?plantao=${plantaoContextoId}`
    : `/pacientes/${paciente.id}`;

  return (
    <Link href={href} className="block">
      <article
        className={cn(
          "relative rounded-xl border px-4 py-3.5 transition-colors",
          // Prioridade: pendente > excluído > alta > normal.
          // Pendente tem o destaque mais forte: o usuário PRECISA resolver.
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
            "absolute left-0 top-5 bottom-5 w-[2px] rounded-full",
            isPendenteAlta ? "bg-saffron" : isForaDoutore ? "bg-saffron/70" : accent,
          )}
        />
        <div className="flex items-start gap-4">
          <div className="text-center pt-0.5 shrink-0 w-11">
            <div
              className={cn(
                "text-[26px] leading-none font-light tab-num tracking-tight",
                isPendenteAlta
                  ? "text-saffron"
                  : isExcluded
                    ? "text-vermillion/60"
                    : isAlta
                      ? "text-ash"
                      : "text-ink",
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
              {isPendenteAlta && <VerificacaoBadge tipo="pendente" />}
              {isForaDoutore && <VerificacaoBadge tipo="fora" />}
              {!isPendenteAlta && <SituacaoBadge value={paciente.situacao} />}
              {paciente.situacao !== "EXCLUSAO" && <TcleBadge value={paciente.tcle_status} />}
              {paciente.situacao !== "EXCLUSAO" && paciente.redcapElegivel && (
                <RedcapElegivelBadge />
              )}
            </div>
            {reserva && paciente.situacao !== "EXCLUSAO" && (
              <div className="mt-2 flex items-center" onClick={(e) => e.preventDefault()}>
                <ResponsavelControl
                  mapaEntryId={reserva.mapaEntryId}
                  responsavel={reserva.responsavel}
                  concluido={reserva.concluido}
                  currentUserId={reserva.currentUserId}
                  isAdmin={reserva.isAdmin}
                  readOnly={reserva.readOnly}
                  variant="compact"
                />
              </div>
            )}
          </div>
          <ChevronRight className={cn("h-4 w-4 mt-1 shrink-0", isExcluded ? "text-vermillion/50" : isAlta ? "text-ash/60" : "text-ash")} />
        </div>
      </article>
    </Link>
  );
}

function VerificacaoBadge({ tipo }: { tipo: "pendente" | "fora" }) {
  const label = tipo === "pendente" ? "Possível alta" : "Fora Doutore";
  return (
    <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] uppercase tracking-[0.06em] font-medium leading-none border bg-saffron/20 border-saffron/40 text-saffron">
      <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2.4} />
      {label}
    </span>
  );
}
