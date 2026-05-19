"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Paciente } from "@/lib/domain/types";
import { PacienteListItem } from "./PacienteListItem";

type Props = {
  pacientes: Paciente[];
  /** Mostra os primeiros N. Botão expande pra todos. */
  inicial?: number;
};

/**
 * Lista de pacientes com lazy render: mostra `inicial` (default 30) +
 * botão "Mostrar mais". Performance — renderizar 500+ items em mobile
 * trava a UI; 30 é confortável e cobre a maioria dos plantões.
 *
 * Quando a busca está ativa (PacientesSearch acima sobrescreve children),
 * essa lista nem chega a ser renderizada — então não há conflito.
 */
export function LazyList({ pacientes, inicial = 30 }: Props) {
  const [expandido, setExpandido] = useState(false);
  const total = pacientes.length;
  const mostrando = expandido ? pacientes : pacientes.slice(0, inicial);
  const restantes = total - mostrando.length;

  return (
    <>
      <ul className="space-y-2">
        {mostrando.map((p) => (
          <li key={p.id}>
            <PacienteListItem paciente={p} />
          </li>
        ))}
      </ul>
      {restantes > 0 && (
        <button
          type="button"
          onClick={() => setExpandido(true)}
          className="w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-md border border-hairline bg-paper-soft px-3 py-2 text-[12px] font-medium text-graphite hover:border-cobalt/40 hover:text-ink transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.8} />
          Mostrar mais {restantes}
        </button>
      )}
    </>
  );
}
