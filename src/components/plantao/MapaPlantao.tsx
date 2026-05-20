"use client";

import { useMemo, useState } from "react";
import { Plus, FileSpreadsheet, ChevronDown, Search, X } from "lucide-react";
import { PacienteCard } from "./PacienteCard";
import { NovoPacienteDrawer } from "./NovoPacienteDrawer";
import { ExcelImportSheet } from "./ExcelImportSheet";
import { PendenciasFiltros } from "./PendenciasFiltros";
import type { ResponsavelInfo } from "./ResponsavelAvatar";
import {
  SETORES,
  SETOR_LABEL,
  type Setor,
  type Situacao,
  type TcleStatus,
  type VerificacaoAlta,
} from "@/lib/domain/enums";
import { cn } from "@/lib/utils";

type MapaItem = {
  id: string;
  paciente_id: string;
  setor: Setor;
  leito: string | null;
  situacao: Situacao;
  tcle_status: TcleStatus;
  descricao: string | null;
  comentarios: string | null;
  verificacao_alta: VerificacaoAlta | null;
  ordem: number;
  responsavel_id?: string | null;
  responsavel?: ResponsavelInfo | null;
  pacientes: { id: string; nome: string } | null;
};

export function MapaPlantao({
  plantaoId,
  mapa,
  readOnly,
  currentUserId,
  isAdmin,
}: {
  plantaoId: string;
  mapa: MapaItem[];
  readOnly: boolean;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [novoSetor, setNovoSetor] = useState<Setor | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<Setor>>(new Set());
  /** Quando setado, só renderiza pacientes com paciente_id nesse Set. */
  const [filterIds, setFilterIds] = useState<Set<string> | null>(null);
  const [query, setQuery] = useState("");

  const filteredMapa = useMemo(() => {
    const norm = (s: string) =>
      s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const q = query.trim();
    let base = mapa;
    if (filterIds !== null) base = base.filter((m) => filterIds.has(m.paciente_id));
    if (q.length > 0) {
      const nq = norm(q);
      base = base.filter((m) => {
        const nome = m.pacientes?.nome ?? "";
        if (norm(nome).includes(nq)) return true;
        if (m.leito && norm(m.leito).includes(nq)) return true;
        if (m.descricao && norm(m.descricao).includes(nq)) return true;
        return false;
      });
    }
    return base;
  }, [mapa, filterIds, query]);

  const grupos = useMemo(() => {
    const map = new Map<Setor, MapaItem[]>();
    SETORES.forEach((s) => map.set(s, []));
    for (const item of filteredMapa) map.get(item.setor)?.push(item);
    return map;
  }, [filteredMapa]);

  function toggle(setor: Setor) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(setor)) next.delete(setor);
      else next.add(setor);
      return next;
    });
  }

  let visibleIndex = 0;

  return (
    <>
      <PendenciasFiltros mapa={mapa} onFilterChange={setFilterIds} />

      {/* Busca inline — útil em plantões grandes (15+ pacientes) */}
      {mapa.length >= 6 && (
        <div className="relative pt-2">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ash pointer-events-none"
            strokeWidth={1.8}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar paciente no mapa..."
            className="w-full h-10 pl-9 pr-9 rounded-md bg-paper-deep border border-hairline text-[13px] focus:outline-none focus:border-cobalt"
            autoComplete="off"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-md flex items-center justify-center text-ash hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="space-y-1">
        {SETORES.map((setor) => {
          const itens = grupos.get(setor) ?? [];
          const count = itens.length;
          const empty = count === 0;
          const isCollapsed = collapsed.has(setor);
          if (!empty) visibleIndex += 1;
          const numeral = !empty ? String(visibleIndex).padStart(2, "0") : "—";

          return (
            <div key={setor} className={cn("pt-4", empty && "opacity-60")}>
              <button
                type="button"
                onClick={() => !empty && toggle(setor)}
                className="w-full flex items-baseline gap-3 mb-3 min-tap"
                disabled={empty}
              >
                <span
                  className={cn(
                    "font-mono text-[11px] tab-num",
                    empty ? "text-ash" : "text-cobalt",
                  )}
                >
                  {numeral}
                </span>
                <div className="flex-1 h-px bg-hairline" />
                <span
                  className={cn(
                    "text-[12px] uppercase tracking-editorial font-semibold",
                    empty ? "text-ash" : "text-ink",
                  )}
                >
                  {SETOR_LABEL[setor]}
                </span>
                <div className="flex-1 h-px bg-hairline" />
                <span className="font-mono text-[11px] text-ash tab-num">
                  {empty ? "0" : count}
                </span>
                {!empty && (
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-ash transition-transform",
                      isCollapsed && "-rotate-90",
                    )}
                    strokeWidth={1.8}
                  />
                )}
              </button>

              {!empty && !isCollapsed && (
                <ul className="space-y-2">
                  {itens.map((item) => (
                    <li key={item.id}>
                      <PacienteCard
                        paciente={{
                          id: item.paciente_id,
                          nome: item.pacientes?.nome ?? "Sem nome",
                          leito: item.leito,
                          situacao: item.situacao,
                          tcle_status: item.tcle_status,
                          descricao: item.descricao,
                          comentarios: item.comentarios,
                          verificacao_alta: item.verificacao_alta,
                        }}
                        reserva={{
                          mapaEntryId: item.id,
                          responsavel: item.responsavel ?? null,
                          currentUserId,
                          isAdmin,
                          readOnly,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {!readOnly && !isCollapsed && (
                <button
                  type="button"
                  onClick={() => setNovoSetor(setor)}
                  className="mt-2 w-full text-left text-[11px] tracking-editorial uppercase text-cobalt flex items-center gap-2 min-tap"
                >
                  <span className="size-5 rounded-full border border-cobalt/40 flex items-center justify-center">
                    <Plus className="h-3 w-3" strokeWidth={2.4} />
                  </span>
                  Adicionar em {SETOR_LABEL[setor]}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="fixed bottom-24 left-5 size-12 rounded-full bg-paper-deep border border-hairline flex items-center justify-center text-cobalt z-30 safe-bottom active:scale-[0.98] transition-transform"
            aria-label="Importar Excel"
          >
            <FileSpreadsheet className="h-4 w-4" strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={() => setNovoSetor("FORA_DO_MAPA")}
            className="fixed bottom-24 right-5 z-30 inline-flex items-center gap-2 px-5 h-12 rounded-full bg-cobalt text-white shadow-lg active:scale-[0.98] transition-transform safe-bottom"
            aria-label="Novo paciente"
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            <span className="text-[14px] font-medium tracking-tight">Novo paciente</span>
          </button>
        </>
      )}

      <NovoPacienteDrawer
        plantaoId={plantaoId}
        setor={novoSetor}
        open={novoSetor !== null}
        onClose={() => setNovoSetor(null)}
      />
      <ExcelImportSheet
        plantaoId={plantaoId}
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </>
  );
}
