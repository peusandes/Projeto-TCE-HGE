import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollText, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log — LANC TCE" };

type AuditRow = {
  id: number;
  occurred_at: string;
  actor: string | null;
  actor_email: string | null;
  acao: "INSERT" | "UPDATE" | "DELETE";
  tabela: string;
  registro_id: string | null;
};

const ACAO_META: Record<AuditRow["acao"], { Icon: typeof PlusCircle; color: string; label: string }> = {
  INSERT: { Icon: PlusCircle, color: "text-moss", label: "Criou" },
  UPDATE: { Icon: Pencil, color: "text-cobalt-soft", label: "Atualizou" },
  DELETE: { Icon: Trash2, color: "text-vermillion", label: "Excluiu" },
};

const TABELA_LABEL: Record<string, string> = {
  pacientes: "paciente",
  plantoes: "plantão",
  coletas_redcap: "coleta REDCap",
};

export default async function AuditLogPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, occurred_at, actor, actor_email, acao, tabela, registro_id")
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="container max-w-3xl py-5">
        <p className="text-vermillion">Erro ao carregar: {error.message}</p>
        <p className="text-[12px] text-ash mt-2">
          A migration 0014 (audit_log) foi aplicada no Supabase?
        </p>
      </div>
    );
  }

  const rows = (data ?? []) as AuditRow[];

  return (
    <div className="container max-w-3xl py-5 space-y-6">
      <section>
        <p className="text-[10px] uppercase tracking-ultra text-cobalt-soft">Admin</p>
        <h1 className="text-[28px] leading-none font-semibold text-ink mt-1 flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-cobalt-soft" strokeWidth={1.6} />
          Audit log
        </h1>
        <p className="mt-2 text-[13px] text-graphite">
          Últimas 200 mudanças em pacientes, plantões e coletas REDCap. Útil
          pra rastrear quem fez o quê durante a coleta.
        </p>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline bg-paper-deep p-10 text-center">
          <p className="text-[13px] text-ink font-medium">Nenhuma ação registrada ainda</p>
          <p className="text-[11px] text-ash mt-1">
            As próximas mudanças aparecem aqui automaticamente.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const meta = ACAO_META[r.acao];
            const Icon = meta.Icon;
            const tabelaLabel = TABELA_LABEL[r.tabela] ?? r.tabela;
            return (
              <li
                key={r.id}
                className="rounded-md border border-hairline bg-paper-deep px-3 py-2 flex items-start gap-2.5"
              >
                <span className={cn("size-7 rounded-md flex items-center justify-center shrink-0", `bg-paper-soft ${meta.color}`)}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] leading-tight text-ink">
                    <span className={cn("font-medium", meta.color)}>{meta.label}</span>{" "}
                    {tabelaLabel}
                    {r.registro_id && (
                      <span className="font-mono text-ash">
                        {" "}#{r.registro_id.slice(0, 8)}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-ash mt-0.5">
                    {r.actor_email ?? "sistema"} ·{" "}
                    {format(parseISO(r.occurred_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="h-16" aria-hidden />
    </div>
  );
}
