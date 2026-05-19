"use client";

import { useEffect } from "react";
import { cachePlantoes, cacheMapa, cachePaciente, cacheAnexos } from "@/lib/db/dexie";
import type { Anexo, MapaEntry, Paciente, Plantao } from "@/lib/domain/types";

/**
 * Mounted no client após o Server Component renderizar.
 * Hidrata o IndexedDB com os dados frescos, sem bloquear o paint.
 * Quando offline, esses dados continuam acessíveis via useLiveQuery (futuro).
 */
export function CachePlantoesBootstrap({ data }: { data: Plantao[] }) {
  useEffect(() => {
    cachePlantoes(data).catch(() => {});
  }, [data]);
  return null;
}

export function CacheMapaBootstrap({
  plantaoId,
  mapa,
}: {
  plantaoId: string;
  mapa: MapaEntry[];
}) {
  useEffect(() => {
    cacheMapa(plantaoId, mapa).catch(() => {});
  }, [plantaoId, mapa]);
  return null;
}

export function CachePacienteBootstrap({
  paciente,
  anexos,
}: {
  paciente: Paciente;
  anexos: Anexo[];
}) {
  useEffect(() => {
    cachePaciente(paciente).catch(() => {});
    cacheAnexos(paciente.id, anexos).catch(() => {});
  }, [paciente, anexos]);
  return null;
}
