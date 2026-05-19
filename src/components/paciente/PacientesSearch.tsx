"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PacienteListItem } from "./PacienteListItem";
import { cn } from "@/lib/utils";
import type { Paciente } from "@/lib/domain/types";

type Props = {
  /** Children renderiza as seções agrupadas — usado quando NÃO há busca. */
  children: React.ReactNode;
  /** Todos os pacientes pra busca cruzar todas as seções. */
  todos: Paciente[];
};

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Wrapper de busca da lista de pacientes. Quando o usuário digita, troca a
 * visualização agrupada por uma lista flat filtrada por nome/leito/REDCap.
 */
export function PacientesSearch({ children, todos }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (q.length === 0) return null;
    const nq = norm(q);
    return todos.filter((p) => {
      if (norm(p.nome).includes(nq)) return true;
      if (p.leito && norm(p.leito).includes(nq)) return true;
      if (p.redcap_id && p.redcap_id.toLowerCase().includes(nq.toLowerCase()))
        return true;
      return false;
    });
  }, [query, todos]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ash pointer-events-none"
          strokeWidth={1.8}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, leito ou REDCap ID..."
          className={cn(
            "pl-9 pr-9 bg-paper-deep/50 border-hairline",
            "focus-visible:border-cobalt focus-visible:ring-0",
          )}
          autoComplete="off"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-md flex items-center justify-center text-ash hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filtered ? (
        <section className="space-y-2">
          <p className="text-[11px] text-ash px-1">
            {filtered.length === 0
              ? `Nenhum paciente encontrado para "${query}".`
              : `${filtered.length} encontrado${filtered.length === 1 ? "" : "s"} para "${query}".`}
          </p>
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id}>
                <PacienteListItem paciente={p} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        children
      )}
    </div>
  );
}
