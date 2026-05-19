"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Situacao, TcleStatus, VerificacaoAlta } from "@/lib/domain/enums";

type MapaItem = {
  paciente_id: string;
  situacao: Situacao;
  tcle_status: TcleStatus;
  verificacao_alta: VerificacaoAlta | null;
};

type Filtro = "todos" | "possivel_alta" | "tcle_pendente" | "fora_doutore";

type Props = {
  mapa: MapaItem[];
  pacienteIdsComRedcapIncompleto?: string[];
  onFilterChange: (visibleIds: Set<string> | null) => void;
};

const CHIPS: Array<{
  key: Filtro;
  label: string;
  matcher: (item: MapaItem) => boolean;
  classes: string;
}> = [
  {
    key: "todos",
    label: "Todos",
    matcher: () => true,
    classes: "bg-paper border-hairline text-ink",
  },
  {
    key: "possivel_alta",
    label: "Possível alta",
    matcher: (m) => m.verificacao_alta === "PENDENTE_HGE",
    classes: "bg-saffron/15 border-saffron/40 text-saffron",
  },
  {
    key: "tcle_pendente",
    label: "TCLE pendente",
    matcher: (m) => m.tcle_status === "PENDENTE" && m.situacao !== "EXCLUSAO",
    classes: "bg-cobalt/15 border-cobalt/40 text-cobalt-soft",
  },
  {
    key: "fora_doutore",
    label: "Fora Doutore",
    matcher: (m) => m.verificacao_alta === "FORA_DOUTORE",
    classes: "bg-saffron/15 border-saffron/40 text-saffron",
  },
];

/**
 * Strip de chips no topo do mapa do plantão pra filtrar por tipo de pendência.
 * Cada chip mostra contagem; clique filtra a lista visível.
 */
export function PendenciasFiltros({ mapa, onFilterChange }: Props) {
  const [ativo, setAtivo] = useState<Filtro>("todos");

  const counts = useMemo(() => {
    const c: Record<Filtro, number> = {
      todos: mapa.length,
      possivel_alta: 0,
      tcle_pendente: 0,
      fora_doutore: 0,
    };
    for (const m of mapa) {
      for (const chip of CHIPS) {
        if (chip.key === "todos") continue;
        if (chip.matcher(m)) c[chip.key] += 1;
      }
    }
    return c;
  }, [mapa]);

  // Esconde se não há pendências reais
  const totalPendencias =
    counts.possivel_alta + counts.tcle_pendente + counts.fora_doutore;
  if (totalPendencias === 0) return null;

  function selecionar(k: Filtro) {
    setAtivo(k);
    if (k === "todos") {
      onFilterChange(null);
    } else {
      const chip = CHIPS.find((c) => c.key === k)!;
      const ids = new Set(mapa.filter(chip.matcher).map((m) => m.paciente_id));
      onFilterChange(ids);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <AlertCircle className="h-3 w-3 text-saffron" strokeWidth={2} />
        <span className="text-[10px] uppercase tracking-editorial text-ash font-semibold">
          Pendências do plantão
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((chip) => {
          const count = counts[chip.key];
          if (chip.key !== "todos" && count === 0) return null;
          const isActive = ativo === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => selecionar(chip.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                chip.classes,
                isActive && "ring-2 ring-cobalt/40",
                !isActive && "opacity-80 hover:opacity-100",
              )}
            >
              {chip.label}
              <span className="font-mono opacity-80">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
