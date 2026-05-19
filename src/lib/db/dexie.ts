import Dexie, { type Table } from "dexie";
import type {
  Anexo,
  ColetaRedcap,
  MapaEntry,
  Paciente,
  Plantao,
} from "@/lib/domain/types";

export type MutationType = "update_paciente" | "upsert_coleta_redcap";

export type MutationStatus = "pending" | "syncing" | "synced" | "error";

export type QueuedMutation = {
  id: string;
  type: MutationType;
  /** Payload JSON-serializável específico do tipo. */
  payload: unknown;
  status: MutationStatus;
  retries: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
};

/**
 * Cache local IndexedDB + fila de mutações offline.
 *
 * Tabelas:
 *  - plantoes, pacientes, mapa_entries, anexos, coletas_redcap: mirror leitura
 *  - mutation_queue: escritas pendentes para sincronizar quando voltar online
 */
export class LancCache extends Dexie {
  plantoes!: Table<Plantao, string>;
  pacientes!: Table<Paciente, string>;
  mapa_entries!: Table<MapaEntry, string>;
  anexos!: Table<Anexo, string>;
  coletas_redcap!: Table<ColetaRedcap, string>;
  mutation_queue!: Table<QueuedMutation, string>;

  constructor() {
    super("lanc-tce-cache");
    this.version(1).stores({
      plantoes: "id, data, finalizado",
      pacientes: "id, plantao_id, setor, situacao",
      mapa_entries: "id, plantao_id, paciente_id, [plantao_id+ordem]",
      anexos: "id, paciente_id, plantao_id, processado, enviado_em",
      coletas_redcap: "id, paciente_id, plantao_id, status",
    });
    this.version(2).stores({
      plantoes: "id, data, finalizado",
      pacientes: "id, plantao_id, setor, situacao",
      mapa_entries: "id, plantao_id, paciente_id, [plantao_id+ordem]",
      anexos: "id, paciente_id, plantao_id, processado, enviado_em",
      coletas_redcap: "id, paciente_id, plantao_id, status",
      mutation_queue: "id, status, type, created_at",
    });
  }
}

let _db: LancCache | null = null;

export function getDb(): LancCache {
  if (typeof window === "undefined") {
    throw new Error("Dexie só pode ser usado no client (browser)");
  }
  if (!_db) _db = new LancCache();
  return _db;
}

// ---------- Cache helpers ----------

export async function cachePlantoes(plantoes: Plantao[]) {
  if (typeof window === "undefined") return;
  const db = getDb();
  await db.plantoes.bulkPut(plantoes);
}

export async function cacheMapa(plantaoId: string, mapa: MapaEntry[]) {
  if (typeof window === "undefined") return;
  const db = getDb();
  await db.mapa_entries.where("plantao_id").equals(plantaoId).delete();
  await db.mapa_entries.bulkPut(mapa);
}

export async function cachePaciente(p: Paciente) {
  if (typeof window === "undefined") return;
  await getDb().pacientes.put(p);
}

export async function cacheAnexos(pacienteId: string, anexos: Anexo[]) {
  if (typeof window === "undefined") return;
  const db = getDb();
  await db.anexos.where("paciente_id").equals(pacienteId).delete();
  await db.anexos.bulkPut(anexos);
}
