import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { listPesquisadores } from "@/lib/data/pesquisadores";
import { InvitarForm } from "./InvitarForm";
import { PesquisadorRowActions } from "./RowActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesquisadores — Admin" };

export default async function AdminPesquisadoresPage() {
  const pesquisadores = await listPesquisadores();

  return (
    <div className="container max-w-2xl py-5 space-y-6">
      <section>
        <p className="text-[10px] uppercase tracking-ultra text-ash">Administração</p>
        <h1 className="font-display text-[36px] leading-none mt-2 font-light text-ink">
          Pesquisadores<span className="font-display-italic text-ash">.</span>
        </h1>
        <div className="rule-dotted mt-4" />
      </section>

      <InvitarForm />

      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] text-cobalt tab-num">
            {String(pesquisadores.length).padStart(2, "0")}
          </span>
          <div className="flex-1 h-px bg-hairline" />
          <span className="font-display-italic text-[13px] text-ink font-medium">Cadastrados</span>
          <div className="flex-1 h-px bg-hairline" />
        </div>

        {pesquisadores.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-hairline bg-paper p-8 text-center">
            <p className="text-[13px] text-ash">Nenhum pesquisador ainda.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {pesquisadores.map((p) => (
              <li
                key={p.id}
                className="bg-paper rounded-2xl border border-hairline px-4 py-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-medium text-ink">
                      {p.setup_complete ? p.nome : <span className="text-ash">— (pendente)</span>}
                    </span>
                    {p.is_admin && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded text-[9px] uppercase tracking-[0.08em] font-medium bg-cobalt/10 text-cobalt">
                        admin
                      </span>
                    )}
                    {!p.setup_complete && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded text-[9px] uppercase tracking-[0.08em] font-medium bg-saffron/10 text-saffron">
                        convidado
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-graphite truncate">{p.email}</p>
                  <p className="text-[10px] text-ash mt-0.5">
                    desde {format(new Date(p.criado_em), "dd 'de' MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
                <PesquisadorRowActions pesquisador={p} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="h-24" aria-hidden />
    </div>
  );
}
