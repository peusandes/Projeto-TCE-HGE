import Link from "next/link";
import { BarChart3, Database } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { listPesquisadores } from "@/lib/data/pesquisadores";
import { InvitarForm } from "@/app/(app)/admin/pesquisadores/InvitarForm";
import { PesquisadorRowActions } from "@/app/(app)/admin/pesquisadores/RowActions";

export async function AdminSection() {
  const pesquisadores = await listPesquisadores();

  return (
    <section className="space-y-5">
      {/* Atalhos admin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Link
          href="/admin/dashboard"
          className="block rounded-xl border border-cobalt/30 bg-cobalt/[0.04] p-4 hover:bg-cobalt/[0.08] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="size-9 rounded-lg bg-cobalt/15 border border-cobalt/30 flex items-center justify-center text-cobalt-soft shrink-0">
              <BarChart3 className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-ink leading-tight">
                Dashboard
              </p>
              <p className="text-[11px] text-graphite leading-tight mt-0.5">
                KPIs da coleta
              </p>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/migrations"
          className="block rounded-xl border border-cobalt/30 bg-cobalt/[0.04] p-4 hover:bg-cobalt/[0.08] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="size-9 rounded-lg bg-cobalt/15 border border-cobalt/30 flex items-center justify-center text-cobalt-soft shrink-0">
              <Database className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-ink leading-tight">
                Migrations
              </p>
              <p className="text-[11px] text-graphite leading-tight mt-0.5">
                Schema esperado vs aplicado
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] text-cobalt-soft tab-num">
          {String(pesquisadores.length).padStart(2, "0")}
        </span>
        <div className="flex-1 h-px bg-hairline" />
        <span className="text-[12px] uppercase tracking-editorial font-semibold text-ink">
          Pesquisadores
        </span>
        <div className="flex-1 h-px bg-hairline" />
      </div>
      <p className="text-[11px] text-ash px-1">
        Convide novos pesquisadores por email. Eles recebem um link, definem
        nome + senha no primeiro acesso e entram no app.
      </p>

      <InvitarForm />

      <div className="space-y-3 pt-2">
        <p className="text-[10px] uppercase tracking-editorial text-ash px-1">
          Já cadastrados
        </p>
        {pesquisadores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hairline bg-paper-deep p-6 text-center">
            <p className="text-[12px] text-ash">Ninguém cadastrado ainda.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {pesquisadores.map((p) => (
              <li
                key={p.id}
                className="bg-paper-deep rounded-xl border border-hairline px-4 py-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-medium text-ink">
                      {p.setup_complete ? p.nome : <span className="text-ash">— (pendente)</span>}
                    </span>
                    {p.is_admin && (
                      <span className="inline-flex items-center px-1.5 py-[2px] rounded text-[9px] uppercase tracking-[0.08em] font-medium bg-cobalt/15 text-cobalt-soft border border-cobalt/25">
                        admin
                      </span>
                    )}
                    {!p.setup_complete && (
                      <span className="inline-flex items-center px-1.5 py-[2px] rounded text-[9px] uppercase tracking-[0.08em] font-medium bg-saffron/15 text-saffron border border-saffron/25">
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
      </div>
    </section>
  );
}
