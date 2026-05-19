import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  SETOR_SHORT,
  SITUACAO_LABEL,
  type Situacao,
  type TcleStatus,
  type Setor,
} from "@/lib/domain/enums";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  plantao_data: string;
  setor: Setor;
  leito: string | null;
  situacao: Situacao;
  tcle_status: TcleStatus;
  descricao: string | null;
  comentarios: string | null;
};

export function TimelineEvolucao({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <div className="pt-2">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="font-mono text-[11px] text-cobalt tab-num">
          {String(items.length).padStart(2, "0")}
        </span>
        <div className="flex-1 h-px bg-hairline" />
        <span className="font-display-italic text-[13px] text-ink font-medium">
          Evolução
        </span>
        <div className="flex-1 h-px bg-hairline" />
      </div>

      <ol className="relative pl-5">
        <span className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-hairline" />
        {items.map((item, idx) => {
          const date = item.plantao_data
            ? format(new Date(item.plantao_data + "T12:00:00"), "dd 'de' MMM", {
                locale: ptBR,
              })
            : "—";
          const first = idx === 0;
          return (
            <li key={item.id} className="relative mb-5 last:mb-0">
              <span
                className={cn(
                  "absolute -left-[19px] top-1 rounded-full",
                  first
                    ? "size-3.5 bg-cobalt border-4 border-paper"
                    : "size-2.5 bg-paper border border-hairline mt-0.5",
                )}
              />
              <p
                className={cn(
                  "font-mono text-[10px] uppercase tracking-wider",
                  first ? "text-cobalt" : "text-ash",
                )}
              >
                {date}
              </p>
              <p
                className={cn(
                  "text-[13px] mt-0.5",
                  first ? "text-ink font-medium" : "text-graphite",
                )}
              >
                {SETOR_SHORT[item.setor]}
                {item.leito ? ` · ${item.leito}` : ""}
                <span className="text-ash font-normal"> · {SITUACAO_LABEL[item.situacao]}</span>
              </p>
              {item.descricao && (
                <p className="text-[11.5px] text-graphite mt-0.5">{item.descricao}</p>
              )}
              {item.comentarios && (
                <p className="text-[11px] text-slate-500 italic mt-0.5">
                  {item.comentarios}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
