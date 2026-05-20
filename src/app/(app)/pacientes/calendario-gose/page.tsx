import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, Phone, Clock } from "lucide-react";
import { listGoseCalendar, type GoseCalendarEvent } from "@/lib/data/gose-calendar";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendário GOS-E — LANC TCE" };

type Section = {
  label: string;
  description?: string;
  accent: "vermillion" | "saffron" | "cobalt" | "graphite" | "moss";
  events: GoseCalendarEvent[];
};

function grouparSecoes(eventos: GoseCalendarEvent[]): Section[] {
  const atrasados = eventos.filter((e) => e.status === "atrasada");
  const hoje = eventos.filter((e) => e.status === "hoje");
  const proximas7 = eventos.filter(
    (e) => e.status === "proxima" && e.dias_relativo >= -7 && e.dias_relativo < 0,
  );
  const proximas30 = eventos.filter(
    (e) => e.status === "proxima" && e.dias_relativo < -7,
  );
  const futuras = eventos.filter((e) => e.status === "futura");

  return [
    {
      label: "Atrasados",
      description:
        "Janela passou e o GOS-E ainda não foi concluído. Priorize essas ligações.",
      accent: "vermillion",
      events: atrasados,
    },
    { label: "Hoje", accent: "saffron", events: hoje },
    {
      label: "Esta semana",
      description: "Próximos 7 dias.",
      accent: "saffron",
      events: proximas7,
    },
    {
      label: "Próximos 30 dias",
      accent: "cobalt",
      events: proximas30,
    },
    {
      label: "Depois",
      description: "Janelas distantes — só pra planejamento.",
      accent: "graphite",
      events: futuras,
    },
  ];
}

export default async function CalendarioGosePage({
  searchParams,
}: {
  searchParams: { concluidas?: string };
}) {
  const eventos = await listGoseCalendar();
  const mostrarConcluidas = searchParams?.concluidas === "1";
  const concluidasEvents = eventos.filter((e) => e.status === "concluida");
  const secoesAtivas = grouparSecoes(eventos).filter((s) => s.events.length > 0);

  const totalAtrasados = eventos.filter((e) => e.status === "atrasada").length;
  const totalHoje = eventos.filter((e) => e.status === "hoje").length;
  const totalProxima = eventos.filter((e) => e.status === "proxima").length;
  const totalConcluidas = concluidasEvents.length;

  return (
    <div className="container max-w-2xl py-5 space-y-7">
      {/* Header */}
      <section>
        <Link
          href="/pacientes"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-editorial text-ash hover:text-ink min-tap mb-3"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          Pacientes
        </Link>
        <p className="text-[10px] uppercase tracking-ultra text-cobalt-soft font-medium">
          Follow-up
        </p>
        <h1 className="text-[28px] leading-none font-semibold text-ink mt-1">
          Calendário <span className="text-cobalt">GOS-E</span>
        </h1>
        <p className="mt-2 text-[13px] text-graphite">
          Ligações de seguimento aos 30, 90 e 180 dias após a admissão. Cada item
          leva direto pro formulário do paciente.
        </p>
      </section>

      {/* Resumo */}
      <section className="grid grid-cols-4 divide-x divide-hairline bg-paper-deep border border-hairline rounded-xl py-3">
        <Stat value={totalAtrasados} label="Atrasados" tone="vermillion" />
        <Stat value={totalHoje} label="Hoje" tone="saffron" />
        <Stat value={totalProxima} label="Próximas" tone="cobalt" />
        <Stat value={totalConcluidas} label="Concluídas" tone="moss" />
      </section>

      {/* Lista de eventos por seção */}
      {secoesAtivas.length === 0 && !mostrarConcluidas && (
        <EmptyState />
      )}

      {secoesAtivas.map((sec) => (
        <SectionBlock key={sec.label} section={sec} />
      ))}

      {/* Toggle concluídas */}
      {totalConcluidas > 0 && (
        <div className="pt-2">
          <Link
            href={mostrarConcluidas ? "?" : "?concluidas=1"}
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-paper-soft px-3 py-2 text-[12px] font-medium text-graphite hover:border-cobalt/40 hover:text-ink transition-colors"
          >
            {mostrarConcluidas ? "Esconder concluídas" : `Mostrar ${totalConcluidas} concluídas`}
          </Link>
        </div>
      )}

      {mostrarConcluidas && totalConcluidas > 0 && (
        <SectionBlock
          section={{
            label: "Concluídas",
            description: "GOS-E já preenchido — histórico.",
            accent: "moss",
            events: concluidasEvents,
          }}
        />
      )}

      <div className="h-16" aria-hidden />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-hairline bg-paper-deep p-10 text-center space-y-2">
      <p className="text-[14px] font-medium text-ink">Nenhum GOS-E na agenda</p>
      <p className="text-[12px] text-ash leading-relaxed max-w-prose mx-auto">
        Lembretes aparecem aqui automaticamente conforme os pacientes entram em
        plantão. A janela conta a partir do primeiro plantão em que cada paciente
        foi mapeado.
      </p>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "vermillion" | "saffron" | "cobalt" | "moss";
}) {
  const toneClass = {
    vermillion: "text-vermillion",
    saffron: "text-saffron",
    cobalt: "text-cobalt-soft",
    moss: "text-moss",
  }[tone];
  return (
    <div className="text-center">
      <div className={cn("text-[22px] leading-none font-light tab-num", toneClass)}>
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[10px] uppercase tracking-editorial text-ash mt-1.5">
        {label}
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: Section }) {
  const accentColors = {
    vermillion: "border-vermillion/50 text-vermillion",
    saffron: "border-saffron/50 text-saffron",
    cobalt: "border-cobalt/40 text-cobalt-soft",
    graphite: "border-hairline text-graphite",
    moss: "border-moss/40 text-moss",
  };
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span
          className={cn(
            "font-mono text-[11px] tab-num",
            accentColors[section.accent].split(" ")[1],
          )}
        >
          {String(section.events.length).padStart(2, "0")}
        </span>
        <div className={cn("flex-1 h-px", accentColors[section.accent].split(" ")[0])} />
        <span
          className={cn(
            "text-[12px] uppercase tracking-editorial font-semibold",
            accentColors[section.accent].split(" ")[1],
          )}
        >
          {section.label}
        </span>
        <div className={cn("flex-1 h-px", accentColors[section.accent].split(" ")[0])} />
      </div>
      {section.description && (
        <p className="text-[11px] px-1 text-graphite">{section.description}</p>
      )}
      <ul className="space-y-2">
        {section.events.map((e) => (
          <li key={`${e.paciente_id}-${e.janela}`}>
            <EventRow event={e} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EventRow({ event }: { event: GoseCalendarEvent }) {
  const dataLabel = format(parseISO(event.data_alvo), "EEE · dd MMM", {
    locale: ptBR,
  });
  const admissaoLabel = format(parseISO(event.data_admissao), "dd/MM", {
    locale: ptBR,
  });

  const statusLabel = (() => {
    if (event.status === "atrasada") return `${event.dias_relativo}d de atraso`;
    if (event.status === "hoje") return "Vence hoje";
    if (event.status === "concluida") return "Concluído";
    const dias = Math.abs(event.dias_relativo);
    return `Em ${dias}d`;
  })();

  const statusColor = {
    atrasada: "text-vermillion",
    hoje: "text-saffron",
    proxima: "text-cobalt-soft",
    futura: "text-graphite",
    concluida: "text-moss",
  }[event.status];

  const borderColor = {
    atrasada: "border-l-vermillion",
    hoje: "border-l-saffron",
    proxima: "border-l-cobalt",
    futura: "border-l-hairline",
    concluida: "border-l-moss",
  }[event.status];

  const href = `/pacientes/${event.paciente_id}?tab=redcap&open=gose_${event.janela}d`;

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-r-lg border border-hairline border-l-4 bg-paper hover:bg-paper-soft transition-colors px-3.5 py-3 active:scale-[0.998]",
        borderColor,
      )}
    >
      <div className="flex items-start gap-3">
        {/* Data */}
        <div className="shrink-0 w-[60px] text-center">
          <div className="text-[10px] uppercase tracking-editorial text-ash leading-none">
            {format(parseISO(event.data_alvo), "MMM", { locale: ptBR })}
          </div>
          <div className="text-[20px] leading-none font-semibold text-ink tab-num mt-1">
            {format(parseISO(event.data_alvo), "dd")}
          </div>
          <div className="text-[9px] uppercase tracking-editorial text-ash mt-1">
            {format(parseISO(event.data_alvo), "EEE", { locale: ptBR })}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-baseline gap-2">
            <p className="text-[14px] font-semibold text-ink truncate">
              {event.paciente_nome}
            </p>
            <span className="shrink-0 text-[10px] uppercase tracking-editorial text-cobalt-soft font-semibold">
              {event.janela}d
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className={cn("font-medium", statusColor)}>{statusLabel}</span>
            <span className="text-ash">·</span>
            <span className="text-graphite">{dataLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-ash">
            <span>Admissão {admissaoLabel}</span>
            {event.telefones.length > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-2.5 w-2.5" strokeWidth={2} />
                  {event.telefones.length} contato{event.telefones.length > 1 ? "s" : ""}
                </span>
              </>
            )}
            {event.tentativas_count > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-saffron">
                  <Clock className="h-2.5 w-2.5" strokeWidth={2} />
                  {event.tentativas_count} tentativa
                  {event.tentativas_count > 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
