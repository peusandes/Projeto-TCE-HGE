import type { InstrumentDef, InstrumentId } from "./types";
import { STATUS_DE_ADMISSO } from "./fields/status-de-admisso";
import { DADOS_DEMOGRAFICOS } from "./fields/dados-demograficos";
import { HISTORIA_PREGRESSA } from "./fields/historia-pregressa";
import { HISTORIA_ADMISSAO } from "./fields/historia-admissao";
import { NEUROIMAGEM_ADMISSAO } from "./fields/neuroimagem-admissao";
import { SEGUIMENTO } from "./fields/seguimento";
import { DADOS_DE_CIRURGIA } from "./fields/dados-de-cirurgia";
import { ALTA } from "./fields/alta";
import { GOSE_30D, GOSE_90D, GOSE_180D } from "./fields/gose";

// Fase 1 (admissão).
export const PHASE_1: InstrumentDef[] = [
  STATUS_DE_ADMISSO,
  DADOS_DEMOGRAFICOS,
  HISTORIA_PREGRESSA,
  HISTORIA_ADMISSAO,
  NEUROIMAGEM_ADMISSAO,
];

// Fase 2 (evolução).
export const PHASE_2: InstrumentDef[] = [SEGUIMENTO, DADOS_DE_CIRURGIA];

// Fase 3 (desfecho).
export const PHASE_3: InstrumentDef[] = [ALTA];

// Fase 4 (follow-up).
export const PHASE_4: InstrumentDef[] = [GOSE_30D, GOSE_90D, GOSE_180D];

export const ALL_INSTRUMENTS: InstrumentDef[] = [
  ...PHASE_1,
  ...PHASE_2,
  ...PHASE_3,
  ...PHASE_4,
];

export function getInstrument(id: InstrumentId): InstrumentDef | undefined {
  return ALL_INSTRUMENTS.find((i) => i.id === id);
}

export const INSTRUMENT_ORDER: InstrumentId[] = [
  "status_de_admisso",
  "dados_demograficos",
  "historia_pregressa",
  "historia_admissao",
  "neuroimagem_admissao",
  "seguimento",
  "dados_de_cirurgia",
  "alta",
  "gose_30d",
  "gose_90d",
  "gose_180d",
];

export const INSTRUMENT_TITLE: Record<InstrumentId, string> = {
  status_de_admisso: "Status de admissão",
  dados_demograficos: "Dados demográficos",
  historia_pregressa: "História pregressa",
  historia_admissao: "Histórico da admissão",
  neuroimagem_admissao: "Neuroimagem da admissão",
  seguimento: "Seguimento",
  dados_de_cirurgia: "Dados de cirurgia",
  alta: "Alta",
  gose_30d: "GOS-E 30 dias",
  gose_90d: "GOS-E 90 dias",
  gose_180d: "GOS-E 180 dias",
};
