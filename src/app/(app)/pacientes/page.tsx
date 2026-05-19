import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { listAllPacientesAgrupados } from "@/lib/data/pacientes";
import { PacienteListItem } from "@/components/paciente/PacienteListItem";
import { PacientesSearch } from "@/components/paciente/PacientesSearch";
import { BulkActionsToolbar } from "@/components/paciente/BulkActionsToolbar";
import type { Paciente } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pacientes — LANC TCE" };

export default async function PacientesIndexPage() {
  const {
    pendentesAlta,
    admissao,
    seguimento,
    excluidos,
    altaNoMapa,
    altaForaDoMapa,
    historico,
    latestPlantaoData,
  } = await listAllPacientesAgrupados();

  const internadosCount = admissao.length + seguimento.length;
  const todos = [
    ...pendentesAlta,
    ...admissao,
    ...seguimento,
    ...excluidos,
    ...altaNoMapa,
    ...altaForaDoMapa,
    ...historico,
  ];
  const total = todos.length;
  const latestLabel = latestPlantaoData
    ? format(new Date(latestPlantaoData + "T12:00:00"), "dd 'de' MMM", { locale: ptBR })
    : null;

  return (
    <div className="container max-w-2xl py-5 space-y-7">
      <section>
        <h1 className="text-[28px] leading-none font-semibold text-ink">Pacientes</h1>
        <p className="mt-2 text-[13px] text-ash">
          {total === 0
            ? "Nenhum paciente cadastrado ainda."
            : `${total} ${total === 1 ? "paciente" : "pacientes"} na coleta.`}
        </p>
      </section>

      {total > 0 && (
        <div className="flex justify-end">
          <BulkActionsToolbar
            pacientesElegiveis={[...admissao, ...seguimento, ...altaNoMapa]}
          />
        </div>
      )}

      {total === 0 ? (
        <EmptyState />
      ) : (
        <PacientesSearch todos={todos}>
          {/* Possível alta — destaque máximo, exige verificação imediata no HGE */}
          {pendentesAlta.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] tab-num text-saffron">
                  {String(pendentesAlta.length).padStart(2, "0")}
                </span>
                <div className="flex-1 h-px bg-saffron/40" />
                <span className="text-[12px] uppercase tracking-editorial font-semibold text-saffron">
                  Possível alta — verificar no HGE
                </span>
                <div className="flex-1 h-px bg-saffron/40" />
              </div>
              <p className="text-[11px] px-1 text-graphite">
                Confirme no prontuário digital se foi alta hospitalar ou só
                saída do mapa Doutore.
              </p>
              <ul className="space-y-2">
                {pendentesAlta.map((p) => (
                  <li key={p.id}>
                    <PacienteListItem paciente={p} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Em atendimento (com subgrupos) */}
          {internadosCount > 0 && (
            <section className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] tab-num text-cobalt-soft">
                  {String(internadosCount).padStart(2, "0")}
                </span>
                <div className="flex-1 h-px bg-hairline" />
                <span className="text-[12px] uppercase tracking-editorial font-semibold text-ink">
                  Em atendimento
                </span>
                <div className="flex-1 h-px bg-hairline" />
              </div>
              {latestLabel && (
                <p className="text-[11px] px-1 text-graphite">Último plantão · {latestLabel}</p>
              )}

              <SubGroup label="Admissão" pacientes={admissao} />
              <SubGroup label="Seguimento" pacientes={seguimento} />
            </section>
          )}

          <Section
            title="Excluídos do protocolo"
            subtitle="Ainda na unidade, fora do estudo TCE."
            pacientes={excluidos}
          />

          <Section
            title="Alta — ainda no mapa atual"
            subtitle="Saíram, mas ainda aparecem no plantão de hoje."
            pacientes={altaNoMapa}
          />

          <Section
            title="Altas fora do mapa atual"
            subtitle="Tiveram alta em plantões anteriores e saíram do mapa."
            pacientes={altaForaDoMapa}
          />

          <Section
            title="Histórico"
            subtitle="Fora do mapa do último plantão."
            pacientes={historico}
            dim
          />
        </PacientesSearch>
      )}

      <div className="h-16" aria-hidden />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-hairline bg-paper-deep p-10 text-center space-y-2">
      <p className="text-[14px] font-medium text-ink">Nenhum paciente registrado</p>
      <p className="text-[12px] text-ash">
        Comece um plantão em <span className="text-cobalt-soft">Plantões</span> para mapear pacientes.
      </p>
    </div>
  );
}

function SubGroup({ label, pacientes }: { label: string; pacientes: Paciente[] }) {
  if (pacientes.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] uppercase tracking-editorial text-ash font-medium">
          {label}
        </span>
        <span className="text-[10px] font-mono text-ash tab-num">
          · {pacientes.length}
        </span>
        <div className="flex-1 h-px bg-hairline-soft" />
      </div>
      <ul className="space-y-2">
        {pacientes.map((p) => (
          <li key={p.id}>
            <PacienteListItem paciente={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({
  title,
  subtitle,
  pacientes,
  dim = false,
}: {
  title: string;
  subtitle?: string;
  pacientes: Paciente[];
  dim?: boolean;
}) {
  if (pacientes.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] tab-num text-ash">
          {String(pacientes.length).padStart(2, "0")}
        </span>
        <div className="flex-1 h-px bg-hairline" />
        <span
          className={cn(
            "text-[12px] uppercase tracking-editorial font-semibold",
            dim ? "text-ash" : "text-graphite",
          )}
        >
          {title}
        </span>
        <div className="flex-1 h-px bg-hairline" />
      </div>
      {subtitle && <p className="text-[11px] px-1 text-ash">{subtitle}</p>}
      <ul className="space-y-2">
        {pacientes.map((p) => (
          <li key={p.id}>
            <PacienteListItem paciente={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
