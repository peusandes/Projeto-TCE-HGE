import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Migrations — LANC TCE" };

/**
 * Checagens leves contra o schema real do Supabase pra detectar migrations
 * "faltando" (caso o admin tenha esquecido de aplicar alguma).
 * Cada item testa a presença de uma coluna/tabela específica que veio numa
 * migration recente. Se a checagem falhar, indica o que falta.
 */
const CHECKS: Array<{
  id: string;
  migration: string;
  title: string;
  description: string;
  /** SELECT que retorna pelo menos 1 row se a migration foi aplicada. */
  probe: (sb: ReturnType<typeof createClient>) => Promise<boolean>;
}> = [
  {
    id: "verificacao_alta_pacientes",
    migration: "0009",
    title: "pacientes.verificacao_alta",
    description: "Coluna que rastreia 'Possível alta' (PENDENTE_HGE/FORA_DOUTORE)",
    probe: async (sb) => {
      const { error } = await sb
        .from("pacientes")
        .select("verificacao_alta")
        .limit(1);
      return !error;
    },
  },
  {
    id: "verificacao_alta_mapa",
    migration: "0009",
    title: "mapa_entries.verificacao_alta",
    description: "Espelho da verificação no snapshot do plantão",
    probe: async (sb) => {
      const { error } = await sb
        .from("mapa_entries")
        .select("verificacao_alta")
        .limit(1);
      return !error;
    },
  },
  {
    id: "coleta_seq",
    migration: "0010",
    title: "coletas_redcap.seq",
    description: "Permite múltiplas instâncias do mesmo instrumento (seguimento dia 1, 2, 3...)",
    probe: async (sb) => {
      const { error } = await sb
        .from("coletas_redcap")
        .select("seq")
        .limit(1);
      return !error;
    },
  },
  {
    id: "admin_delete_rls",
    migration: "0011",
    title: "RLS delete admin-only",
    description: "Trava DELETE direto via client (server actions ainda funcionam)",
    probe: async (sb) => {
      // Tenta detectar a função helper criada na migration.
      const { error } = await sb.rpc("is_current_user_admin");
      return !error;
    },
  },
  {
    id: "gose_tentativas",
    migration: "0013",
    title: "tabela gose_tentativas",
    description: "Registra ligações não atendidas pros lembretes GOS-E",
    probe: async (sb) => {
      const { error } = await sb
        .from("gose_tentativas")
        .select("id")
        .limit(1);
      return !error;
    },
  },
];

export default async function MigrationsPage() {
  const sb = createClient();
  const results = await Promise.all(
    CHECKS.map(async (c) => ({
      ...c,
      applied: await c.probe(sb).catch(() => false),
    })),
  );

  const totalOk = results.filter((r) => r.applied).length;
  const totalMissing = results.length - totalOk;

  return (
    <div className="container max-w-3xl py-5 space-y-6">
      <section>
        <p className="text-[10px] uppercase tracking-ultra text-cobalt-soft">Admin</p>
        <h1 className="text-[28px] leading-none font-semibold text-ink mt-1">
          Migrations
        </h1>
        <p className="mt-2 text-[13px] text-graphite">
          Verifica se as migrations esperadas pelo código atual estão aplicadas
          no Supabase. Se algo aparecer como faltando, rode o SQL correspondente
          em <span className="text-cobalt-soft">supabase/migrations/</span>.
        </p>
      </section>

      <div
        className={cn(
          "rounded-xl border p-4",
          totalMissing === 0
            ? "border-moss/30 bg-moss/[0.05]"
            : "border-saffron/40 bg-saffron/[0.07]",
        )}
      >
        <p className="text-[14px] font-semibold text-ink">
          {totalMissing === 0
            ? `Tudo aplicado — ${totalOk}/${results.length} checks OK`
            : `${totalMissing} pendente${totalMissing > 1 ? "s" : ""} de ${results.length}`}
        </p>
        {totalMissing > 0 && (
          <p className="text-[12px] text-graphite mt-1">
            Funcionalidades dependentes podem quebrar em produção até as
            migrations serem aplicadas.
          </p>
        )}
      </div>

      <ul className="space-y-2">
        {results.map((r) => (
          <li
            key={r.id}
            className={cn(
              "rounded-xl border p-4 flex items-start gap-3",
              r.applied
                ? "border-hairline bg-paper-deep"
                : "border-saffron/40 bg-saffron/[0.05]",
            )}
          >
            <span className={cn("size-7 rounded-md flex items-center justify-center shrink-0", r.applied ? "bg-moss/15 text-moss" : "bg-saffron/15 text-saffron")}>
              {r.applied ? (
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
              ) : (
                <AlertCircle className="h-4 w-4" strokeWidth={1.8} />
              )}
            </span>
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-[13px] font-medium text-ink leading-tight">
                {r.title}
              </p>
              <p className="text-[11px] text-graphite leading-snug">
                {r.description}
              </p>
              <p className="text-[10px] font-mono text-ash mt-1">
                migration {r.migration}_*
              </p>
            </div>
            <span
              className={cn(
                "text-[10px] uppercase tracking-editorial font-semibold shrink-0",
                r.applied ? "text-moss" : "text-saffron",
              )}
            >
              {r.applied ? "OK" : "Pendente"}
            </span>
          </li>
        ))}
      </ul>

      {totalMissing > 0 && (
        <div className="rounded-xl border border-hairline bg-paper-soft p-4 space-y-2">
          <div className="flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5 text-vermillion" strokeWidth={1.8} />
            <p className="text-[12px] uppercase tracking-editorial text-ash font-semibold">
              Como aplicar
            </p>
          </div>
          <ol className="text-[12px] text-graphite leading-relaxed list-decimal pl-5 space-y-1">
            <li>
              Abra o Supabase Dashboard → SQL Editor
            </li>
            <li>
              Cole o conteúdo de <code className="font-mono text-cobalt-soft">supabase/migrations/00XX_*.sql</code>
              {" "}correspondente
            </li>
            <li>
              Run. Volte aqui pra confirmar que virou OK.
            </li>
          </ol>
        </div>
      )}

      <div className="h-16" aria-hidden />
    </div>
  );
}
