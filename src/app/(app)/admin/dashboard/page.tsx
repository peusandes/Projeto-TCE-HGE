import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Phone,
  Image as ImageIcon,
  AlertTriangle,
  Users,
  TrendingUp,
} from "lucide-react";
import { getDashboardStats } from "@/lib/data/dashboard-stats";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — LANC TCE" };

export default async function AdminDashboardPage() {
  const s = await getDashboardStats();
  const internados = s.porSituacao.ADM + s.porSituacao.SEG;
  const pct = (n: number, total: number) =>
    total === 0 ? 0 : Math.round((n / total) * 100);

  return (
    <div className="container max-w-3xl py-5 space-y-6">
      <section>
        <p className="text-[10px] uppercase tracking-ultra text-cobalt-soft">Admin</p>
        <h1 className="text-[28px] leading-none font-semibold text-ink mt-1">
          Dashboard
        </h1>
        <p className="mt-2 text-[13px] text-graphite">
          Visão agregada da coleta LANC TCE — HGE.
        </p>
      </section>

      {/* KPIs primários */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KPI
          icon={<Users className="h-4 w-4" />}
          label="Pacientes"
          value={s.totalPacientes}
          sub={`${internados} ativos`}
          tone="cobalt"
        />
        <KPI
          icon={<ClipboardList className="h-4 w-4" />}
          label="Plantões"
          value={s.totalPlantoes}
          sub={`${s.plantoesFinalizados} finalizados`}
          tone="moss"
        />
        <KPI
          icon={<ImageIcon className="h-4 w-4" />}
          label="Anexos"
          value={s.totalAnexos}
          tone="plum"
        />
        <KPI
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Possível alta"
          value={s.possivelAlta}
          sub="aguardando HGE"
          tone={s.possivelAlta > 0 ? "saffron" : "ash"}
        />
      </section>

      {/* Situação dos pacientes */}
      <section className="rounded-xl border border-hairline bg-paper-deep p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-cobalt-soft" />
          <h2 className="text-[12px] uppercase tracking-editorial text-ash font-semibold">
            Situação dos pacientes
          </h2>
        </div>
        <BarRow label="Admissão" value={s.porSituacao.ADM} total={s.totalPacientes} color="bg-cobalt" />
        <BarRow label="Seguimento" value={s.porSituacao.SEG} total={s.totalPacientes} color="bg-moss" />
        <BarRow label="Alta" value={s.porSituacao.ALTA} total={s.totalPacientes} color="bg-plum" />
        <BarRow label="Exclusão" value={s.porSituacao.EXCLUSAO} total={s.totalPacientes} color="bg-vermillion/70" />
      </section>

      {/* TCLE */}
      <section className="rounded-xl border border-hairline bg-paper-deep p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-moss" />
          <h2 className="text-[12px] uppercase tracking-editorial text-ash font-semibold">
            TCLE
          </h2>
        </div>
        <BarRow label="Assinado" value={s.tcle.ASSINADO} total={s.totalPacientes} color="bg-moss" />
        <BarRow label="Pendente" value={s.tcle.PENDENTE} total={s.totalPacientes} color="bg-saffron" />
        <BarRow label="Recusado" value={s.tcle.RECUSADO} total={s.totalPacientes} color="bg-vermillion/70" />
        <BarRow label="N/A" value={s.tcle.NA} total={s.totalPacientes} color="bg-ash" />
      </section>

      {/* Coletas REDCap */}
      <section className="rounded-xl border border-hairline bg-paper-deep p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5 text-cobalt-soft" />
          <h2 className="text-[12px] uppercase tracking-editorial text-ash font-semibold">
            Coletas REDCap completas
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Tile label="Histórico" value={s.coletas.historia_admissao} subtotal={s.totalPacientes} />
          <Tile label="Seguimento" value={s.coletas.seguimento} subtotal={s.totalPacientes} />
          <Tile label="Alta" value={s.coletas.alta} subtotal={s.totalPacientes} />
          <Tile label="GOS-E 30d" value={s.coletas.gose_30d} subtotal={s.totalPacientes} />
          <Tile label="GOS-E 90d" value={s.coletas.gose_90d} subtotal={s.totalPacientes} />
          <Tile label="GOS-E 180d" value={s.coletas.gose_180d} subtotal={s.totalPacientes} />
        </div>
      </section>

      {/* Últimos plantões */}
      {s.ultimosPlantoes.length > 0 && (
        <section className="rounded-xl border border-hairline bg-paper-deep p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-cobalt-soft" />
            <h2 className="text-[12px] uppercase tracking-editorial text-ash font-semibold">
              Últimos plantões
            </h2>
          </div>
          <ul className="space-y-2">
            {s.ultimosPlantoes.map((p) => (
              <li
                key={p.data}
                className="flex items-center justify-between px-3 py-2 rounded-md border border-hairline bg-paper-soft/40"
              >
                <span className="text-[12px] text-ink capitalize">
                  {format(parseISO(p.data), "EEEE, dd 'de' MMM", { locale: ptBR })}
                </span>
                <span className="flex items-center gap-2 text-[11px]">
                  <span className="font-mono text-ink">{p.total} pacientes</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-editorial border",
                      p.finalizado
                        ? "text-graphite bg-paper-soft border-hairline"
                        : "text-moss bg-moss/10 border-moss/30",
                    )}
                  >
                    {p.finalizado ? "Finalizado" : "Em andamento"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* GOS-E summary banner (gancho pra page de lembretes) */}
      <section className="rounded-xl border border-saffron/30 bg-saffron/[0.05] p-4">
        <div className="flex items-center gap-2.5">
          <Phone className="h-4 w-4 text-saffron" />
          <p className="text-[13px] text-ink font-medium">
            Lembretes GOS-E ativos aparecem no topo de cada plantão
          </p>
        </div>
        <p className="text-[11px] text-graphite mt-1.5 leading-relaxed">
          Pacientes com trauma há 30+ dias sem GOS-E preenchido viram pendência.
          Pesquisador resolve marcando "Concluído" ou registrando tentativa.
        </p>
      </section>

      <div className="h-16" aria-hidden />
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  tone: "cobalt" | "moss" | "plum" | "saffron" | "ash";
}) {
  const toneClass = {
    cobalt: "text-cobalt-soft",
    moss: "text-moss",
    plum: "text-plum",
    saffron: "text-saffron",
    ash: "text-ash",
  }[tone];
  return (
    <div className="rounded-xl border border-hairline bg-paper-deep p-3 space-y-1">
      <div className={cn("flex items-center gap-1.5", toneClass)}>
        {icon}
        <span className="text-[10px] uppercase tracking-editorial">{label}</span>
      </div>
      <p className="text-[26px] leading-none font-light tab-num text-ink">
        {value}
      </p>
      {sub && <p className="text-[10px] text-ash">{sub}</p>}
    </div>
  );
}

function BarRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pctNum = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-graphite">{label}</span>
        <span className="font-mono text-ash">
          <span className="text-ink">{value}</span> · {pctNum}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-paper-soft overflow-hidden">
        <div
          className={cn("h-full transition-all", color)}
          style={{ width: `${pctNum}%` }}
        />
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  subtotal,
}: {
  label: string;
  value: number;
  subtotal: number;
}) {
  const pctNum = subtotal === 0 ? 0 : Math.round((value / subtotal) * 100);
  return (
    <div className="rounded-md border border-hairline bg-paper-soft/40 p-2">
      <p className="text-[10px] uppercase tracking-editorial text-ash">{label}</p>
      <p className="text-[20px] leading-none font-light tab-num text-ink mt-1">
        {value}
      </p>
      <p className="text-[9px] font-mono text-ash mt-1">{pctNum}%</p>
    </div>
  );
}
