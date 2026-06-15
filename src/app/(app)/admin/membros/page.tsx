import { listSignupRequestsPendentes, listMembros } from "@/lib/data/membros";
import { SignupRequestActions } from "@/components/admin/SignupRequestActions";
import { MembroCargoControls } from "@/components/admin/MembroCargoControls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Membros — Admin" };

export default async function AdminMembrosPage() {
  const [pendentes, membros] = await Promise.all([listSignupRequestsPendentes(), listMembros()]);

  return (
    <div className="container max-w-2xl space-y-6 py-5">
      <section>
        <p className="text-[10px] uppercase tracking-ultra text-ash">Administração</p>
        <h1 className="mt-2 font-display text-[36px] font-light leading-none text-ink">
          Membros<span className="font-display-italic text-ash">.</span>
        </h1>
        <p className="mt-2 text-sm text-ash">Aprovar cadastros da liga e gerir papéis/cargos.</p>
        <div className="rule-dotted mt-4" />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-graphite">
          Solicitações de cadastro {pendentes.length > 0 && <span className="text-cobalt">({pendentes.length})</span>}
        </h2>
        {pendentes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-hairline bg-paper p-6 text-center text-sm text-ash">
            Nenhuma solicitação pendente.
          </p>
        ) : (
          <ul className="space-y-2">
            {pendentes.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-hairline bg-paper px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink">{s.nome}</p>
                  <p className="truncate text-[11.5px] text-graphite">{s.email}</p>
                  <p className="text-[10px] text-ash">
                    {[s.matricula && `mat. ${s.matricula}`, s.semestre && `${s.semestre}º sem`].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {s.mensagem && <p className="mt-1 text-[11px] text-ash">&ldquo;{s.mensagem}&rdquo;</p>}
                </div>
                <SignupRequestActions id={s.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-graphite">Membros ({membros.length})</h2>
        <ul className="space-y-2">
          {membros.map((m) => (
            <li key={m.id} className="rounded-2xl border border-hairline bg-paper px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-ink">
                  {m.setup_complete ? m.nome ?? "—" : <span className="text-ash">— (pendente)</span>}
                </span>
                {m.role === "ADMIN" && (
                  <span className="rounded bg-cobalt/10 px-1.5 py-[2px] text-[9px] font-medium uppercase tracking-[0.08em] text-cobalt">
                    admin
                  </span>
                )}
              </div>
              <p className="truncate text-[11.5px] text-graphite">{m.email}</p>
              <MembroCargoControls
                id={m.id}
                role={m.role}
                diretoria={m.diretoria}
                isDiretor={m.is_diretor}
                isSecretario={m.is_secretario}
                cargoEspecial={m.cargo_especial}
              />
            </li>
          ))}
        </ul>
      </section>

      <div className="h-24" aria-hidden />
    </div>
  );
}
