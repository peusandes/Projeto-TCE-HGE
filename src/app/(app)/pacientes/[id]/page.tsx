import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";
import {
  getPaciente,
  getTimelineDoPaciente,
  getAnexosDoPaciente,
  getReservaDoPaciente,
} from "@/lib/data/pacientes";
import { getPlantao } from "@/lib/data/plantoes";
import { getCurrentPesquisador } from "@/lib/data/pesquisadores";
import { listColetasDoPaciente } from "@/lib/data/redcap";
import { ResponsavelControl } from "@/components/plantao/ResponsavelControl";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PacienteResumoForm } from "@/components/paciente/PacienteResumoForm";
import { TimelineEvolucao } from "@/components/paciente/TimelineEvolucao";
import { PendenciasPaciente } from "@/components/paciente/PendenciasPaciente";
import { RedcapTab } from "@/components/redcap/RedcapTab";
import { AnexosTab } from "@/components/paciente/AnexosTab";
import { SITUACAO_LABEL, SETOR_SHORT } from "@/lib/domain/enums";

export const dynamic = "force-dynamic";

type SearchParams = { tab?: string; open?: string; plantao?: string };

export default async function PacientePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: SearchParams;
}) {
  const paciente = await getPaciente(params.id);
  if (!paciente) notFound();

  // Deep-link: vem do banner GOS-E (/?tab=redcap&open=gose_30d) ou de
  // links similares pra abrir a aba e o instrumento direto.
  const validTabs = ["resumo", "redcap", "anexos"] as const;
  const initialTab = (validTabs as readonly string[]).includes(searchParams.tab ?? "")
    ? (searchParams.tab as (typeof validTabs)[number])
    : "resumo";
  const initialOpenInstrument = searchParams.open ?? null;

  // Plantão de contexto: vem do mapa do plantão atual (?plantao=<id>) para
  // manter o detalhe do paciente preso AO PLANTÃO em que o usuário está,
  // não ao plantão original (paciente.plantao_id) — esse cai como fallback
  // se ninguém passou o contexto na URL.
  const contextoPlantaoId = searchParams.plantao ?? paciente.plantao_id;

  const [timeline, anexos, plantao, coletas, reserva, me] = await Promise.all([
    getTimelineDoPaciente(paciente.id),
    getAnexosDoPaciente(paciente.id),
    getPlantao(contextoPlantaoId),
    listColetasDoPaciente(paciente.id),
    getReservaDoPaciente(paciente.id, contextoPlantaoId),
    getCurrentPesquisador(),
  ]);

  // Calcula progresso REDCap: % de instrumentos com pelo menos 1 seq COMPLETE.
  // Total = 11 (status_de_admisso, dados_demograficos, historia_pregressa,
  // historia_admissao, neuroimagem_admissao, seguimento, dados_de_cirurgia,
  // alta, gose_30d, gose_90d, gose_180d).
  const TOTAL_INSTRUMENTOS = 11;
  const instrumentosCompletos = new Set<string>();
  for (const c of coletas) {
    if (c.status === "COMPLETE") instrumentosCompletos.add(c.instrument);
  }
  const completudePct = Math.round(
    (instrumentosCompletos.size / TOTAL_INSTRUMENTOS) * 100,
  );

  const plantaoLabel = plantao
    ? format(new Date(plantao.data + "T12:00:00"), "dd 'de' MMM", { locale: ptBR })
    : "";

  const coletasCount = coletas.filter((c) => c.status === "COMPLETE").length;

  return (
    <div className="container max-w-2xl py-3 space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/plantoes/${contextoPlantaoId}`}
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-editorial text-ash hover:text-ink min-tap"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          {plantaoLabel} · {SETOR_SHORT[paciente.setor]}
        </Link>
      </div>

      <section>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cobalt-soft">
          {paciente.leito ? `${paciente.leito} · ` : ""}
          {SETOR_SHORT[paciente.setor]}
        </p>
        <h1 className="text-[26px] leading-[1.05] font-semibold mt-2 text-ink text-balance">
          {paciente.nome}
        </h1>
        {reserva && paciente.situacao !== "EXCLUSAO" && me && (
          <div className="mt-3">
            <ResponsavelControl
              mapaEntryId={reserva.mapaEntryId}
              responsavel={reserva.responsavel}
              currentUserId={me.id}
              isAdmin={me.is_admin}
              readOnly={reserva.plantaoFinalizado}
              variant="full"
            />
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[10px] uppercase tracking-[0.08em] font-medium leading-none text-cobalt-soft bg-cobalt/10 border border-cobalt/25">
            <span className="size-1.5 rounded-full bg-cobalt-soft" />
            {SITUACAO_LABEL[paciente.situacao]}
          </span>
          {/* Progresso REDCap — instrumentos completos / total */}
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[10px] uppercase tracking-[0.08em] font-medium leading-none border ${
              completudePct === 100
                ? "text-moss bg-moss/10 border-moss/30"
                : completudePct >= 50
                  ? "text-cobalt-soft bg-cobalt/10 border-cobalt/25"
                  : "text-ash bg-paper-soft border-hairline"
            }`}
          >
            REDCap {instrumentosCompletos.size}/{TOTAL_INSTRUMENTOS}
            <span className="font-mono opacity-70">· {completudePct}%</span>
          </span>
          {paciente.redcap_id ? (
            <span className="font-mono text-[10px] text-graphite ml-1">
              ID #{paciente.redcap_id}
            </span>
          ) : null}
        </div>
      </section>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="redcap">
            REDCap{coletasCount > 0 && <span className="ml-1 font-mono text-moss">{coletasCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="anexos">
            Anexos{anexos.length > 0 && <span className="ml-1 font-mono text-cobalt-soft">{anexos.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-6">
          <PendenciasPaciente
            paciente={paciente}
            coletas={coletas}
            anexos={anexos}
          />
          <PacienteResumoForm paciente={paciente} plantaoContextoId={contextoPlantaoId} />
          <TimelineEvolucao items={timeline} />
        </TabsContent>

        <TabsContent value="redcap">
          <RedcapTab
            paciente={{ id: paciente.id, nome: paciente.nome, plantao_id: contextoPlantaoId }}
            coletas={coletas}
            initialOpenInstrument={initialOpenInstrument}
          />
        </TabsContent>

        <TabsContent value="anexos">
          <AnexosTab paciente={paciente} anexos={anexos} plantaoContextoId={contextoPlantaoId} />
        </TabsContent>
      </Tabs>

      <div className="h-32" aria-hidden />
    </div>
  );
}
