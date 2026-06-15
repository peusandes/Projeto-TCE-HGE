import { getPesquisadorContext } from "@/lib/data/pesquisador-context";
import { applyAdmissaoToNoMapa, listPacientesExtensao } from "@/lib/data/pacientes-extensao";
import { NovoPacienteExtensaoForm } from "./NovoPacienteExtensaoForm";
import { PacienteExtensaoCard } from "./PacienteExtensaoCard";
import { PACIENTE_FLUXO_LABEL, type PacienteFluxo } from "@/lib/lanc/enums";

/** Lista + cadastro de pacientes da extensão (TCE Baby / Aneurisma Baby). */
export async function PacientesExtensaoView({ fluxo }: { fluxo: PacienteFluxo }) {
  const ctx = await getPesquisadorContext();
  const isAdmin = ctx?.isAdmin ?? false;

  // Auto-transição ADMISSAO → NO_MAPA antes de listar.
  await applyAdmissaoToNoMapa();

  const pacientes = await listPacientesExtensao(fluxo);
  const ativos = pacientes.filter((p) => p.status_atual !== "ALTA");
  const altas = pacientes.filter((p) => p.status_atual === "ALTA");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink">{PACIENTE_FLUXO_LABEL[fluxo]}</h1>
        <p className="mt-1 text-sm text-ash">
          Fluxo: <strong>Admissão</strong> → <strong>No mapa</strong> (automático no dia seguinte) →{" "}
          <strong>Fora do mapa</strong> / <strong>Alta</strong>. O estagiário acompanha pelo prontuário a cada plantão.
        </p>
      </div>

      <NovoPacienteExtensaoForm fluxo={fluxo} />

      <section>
        <h2 className="mb-2 text-sm font-medium text-graphite">Ativos ({ativos.length})</h2>
        {ativos.length === 0 ? (
          <p className="rounded-lg border border-hairline bg-paper-deep/40 p-4 text-sm text-ash">
            Nenhum paciente ativo. Cadastre quando chegar um novo.
          </p>
        ) : (
          <ul className="space-y-2">
            {ativos.map((p) => (
              <li key={p.id}>
                <PacienteExtensaoCard
                  id={p.id}
                  nome={p.nome}
                  dataAdmissao={p.data_admissao}
                  statusAtual={p.status_atual}
                  fluxo={fluxo}
                  isAdmin={isAdmin}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {altas.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-graphite">Altas ({altas.length})</h2>
          <ul className="space-y-2">
            {altas.map((p) => (
              <li key={p.id}>
                <PacienteExtensaoCard
                  id={p.id}
                  nome={p.nome}
                  dataAdmissao={p.data_admissao}
                  statusAtual={p.status_atual}
                  fluxo={fluxo}
                  isAdmin={isAdmin}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
