/**
 * Transforma as coletas de UM paciente (coletas_redcap) em registros prontos
 * pra API de import do REDCap (content=record, format=json, type=flat).
 *
 * SEGURANÇA / ISOLAÇÃO (crítico — dado de pesquisa):
 *  - Todo registro gerado carrega o MESMO `record_id` (o do paciente). O import
 *    do REDCap só afeta os record_id presentes no payload, então isto, somado a
 *    `assertRecordIdUnico`, garante que NENHUM outro paciente é tocado.
 *  - Só geramos os campos que temos (não-vazios). Combinado com
 *    overwriteBehavior=normal no envio, nunca apagamos dados já existentes no
 *    REDCap (outras partes do mesmo paciente ficam preservadas).
 *
 * Regras de conversão:
 *  - Campos descritivos (nome começa com "_") são ignorados.
 *  - Campos CALC são ignorados (o REDCap recalcula sozinho e rejeita import).
 *  - O próprio `record_id`, se vier no dados, é ignorado (o id canônico do
 *    paciente sempre vence — trava de isolação).
 *  - Valor array (checkbox) vira `campo___valor = "1"` por item marcado.
 *  - Datetime "YYYY-MM-DDTHH:mm[:ss]" vira "YYYY-MM-DD HH:mm" (formato REDCap).
 *  - Demais valores viram string.
 *  - Acrescenta `<instrumento>_complete` = 0/1/2 a partir do status.
 *  - Instrumentos repetíveis (seguimento) viram linhas próprias com
 *    redcap_repeat_instrument + redcap_repeat_instance = seq.
 */

import { ALL_INSTRUMENTS } from "@/lib/redcap-schema/instruments";

export type ColetaParaExport = {
  tipo: string;
  seq: number;
  dados: Record<string, unknown>;
  status: string;
};

export type RedcapRecord = Record<string, string>;

/** Campo identificador do registro no REDCap (primeiro campo do dicionário). */
export const RECORD_ID_FIELD = "record_id";

/** Instrumentos repetíveis no REDCap (cada instância é uma linha). */
const REPETIVEIS = new Set(["seguimento"]);

/** Campos calculados (REDCap recalcula sozinho — não devem ser importados). */
const CAMPOS_CALC: ReadonlySet<string> = new Set(
  ALL_INSTRUMENTS.flatMap((inst) => inst.fields.filter((f) => f.type === "calc").map((f) => f.name)),
);

const STATUS_PARA_COMPLETE: Record<string, string> = {
  INCOMPLETE: "0",
  UNVERIFIED: "1",
  COMPLETE: "2",
};

function valorRedcap(v: unknown): string {
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    return m ? `${m[1]} ${m[2]}` : v;
  }
  return String(v);
}

function preencher(rec: RedcapRecord, c: ColetaParaExport): void {
  for (const [k, v] of Object.entries(c.dados)) {
    if (k.startsWith("_")) continue; // descritivos
    if (k === RECORD_ID_FIELD) continue; // id canônico sempre vence
    if (CAMPOS_CALC.has(k)) continue; // calc são recalculados pelo REDCap
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item === null || item === undefined || item === "") continue;
        rec[`${k}___${item}`] = "1";
      }
      continue;
    }
    const val = valorRedcap(v);
    if (val !== "") rec[k] = val;
  }
  rec[`${c.tipo}_complete`] = STATUS_PARA_COMPLETE[c.status] ?? "0";
}

/**
 * Gera os registros REDCap pra um paciente. Instrumentos únicos são fundidos
 * num registro base; cada instância de instrumento repetível vira uma linha.
 * `eventName` só é usado se o projeto for longitudinal (definido na conexão).
 */
export function coletasParaRegistros(
  recordId: string,
  coletas: ColetaParaExport[],
  opts: { eventName?: string } = {},
): RedcapRecord[] {
  const base: RedcapRecord = { [RECORD_ID_FIELD]: recordId };
  if (opts.eventName) base.redcap_event_name = opts.eventName;

  const repetidos: RedcapRecord[] = [];

  for (const c of coletas) {
    if (REPETIVEIS.has(c.tipo)) {
      const rec: RedcapRecord = {
        [RECORD_ID_FIELD]: recordId,
        redcap_repeat_instrument: c.tipo,
        redcap_repeat_instance: String(c.seq),
      };
      if (opts.eventName) rec.redcap_event_name = opts.eventName;
      preencher(rec, c);
      repetidos.push(rec);
    } else {
      preencher(base, c);
    }
  }

  return [base, ...repetidos];
}

/**
 * Trava de segurança: confirma que TODOS os registros têm o record_id esperado
 * e nenhum outro. Lança se algo escapar — usar ANTES de enviar pro REDCap.
 */
export function assertRecordIdUnico(records: RedcapRecord[], recordId: string): void {
  for (const r of records) {
    const id = r[RECORD_ID_FIELD];
    if (id !== recordId) {
      throw new Error(
        `Trava de segurança: registro com record_id "${id}" ≠ esperado "${recordId}". Envio abortado.`,
      );
    }
  }
}
