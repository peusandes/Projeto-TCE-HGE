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
 *    Datas "YYYY-MM-DD" seguem como estão (a API do REDCap importa em Y-M-D).
 *  - `<instrumento>_complete = 2` SÓ quando o instrumento tem dado e o status
 *    local é COMPLETE — nunca rebaixa o status no REDCap nem marca vazio.
 *  - Instrumentos repetíveis (seguimento) viram linhas próprias com
 *    redcap_repeat_instrument + redcap_repeat_instance = seq; instâncias sem
 *    nenhum dado real são puladas.
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

function valorRedcap(v: unknown): string | null {
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : null;
  if (typeof v === "string") {
    if (v === "") return null;
    const m = v.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    return m ? `${m[1]} ${m[2]}` : v;
  }
  return null; // boolean / objeto / etc — não enviar (evita NaN, [object Object])
}

/** Preenche um registro com os campos da coleta. Retorna se escreveu algo. */
function preencher(rec: RedcapRecord, c: ColetaParaExport): boolean {
  let escreveu = false;
  for (const [k, v] of Object.entries(c.dados)) {
    if (k.startsWith("_")) continue; // descritivos
    if (k === RECORD_ID_FIELD) continue; // id canônico sempre vence
    if (CAMPOS_CALC.has(k)) continue; // calc são recalculados pelo REDCap
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item === null || item === undefined || item === "") continue;
        rec[`${k}___${item}`] = "1";
        escreveu = true;
      }
      continue;
    }
    const val = valorRedcap(v);
    if (val !== null) {
      rec[k] = val;
      escreveu = true;
    }
  }
  // _complete só pra instrumento COM dado e status COMPLETE — nunca rebaixa.
  if (escreveu && c.status === "COMPLETE") {
    rec[`${c.tipo}_complete`] = "2";
  }
  return escreveu;
}

/**
 * Gera os registros REDCap pra um paciente. Instrumentos únicos são fundidos
 * num registro base; cada instância de instrumento repetível vira uma linha
 * (instâncias vazias são puladas). `eventName` só é usado se o projeto for
 * longitudinal (definido na conexão).
 */
export function coletasParaRegistros(
  recordId: string,
  coletas: ColetaParaExport[],
  opts: { eventName?: string } = {},
): RedcapRecord[] {
  // Trava: instrumento NÃO-repetível não pode ter instâncias duplicadas (fusão
  // ambígua, last-write-wins não-determinístico) — aborta antes de enviar lixo.
  const contagem = new Map<string, number>();
  for (const c of coletas) {
    if (!REPETIVEIS.has(c.tipo)) contagem.set(c.tipo, (contagem.get(c.tipo) ?? 0) + 1);
  }
  const duplicados = [...contagem.entries()].filter(([, n]) => n > 1).map(([t]) => t);
  if (duplicados.length > 0) {
    throw new Error(
      `Instrumento não-repetível com instâncias duplicadas: ${duplicados.join(", ")}. Corrija no site antes de enviar.`,
    );
  }

  // Ordem determinística (tipo, seq) — evita fusão arbitrária.
  const ordenadas = [...coletas].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.seq - b.seq);

  const base: RedcapRecord = { [RECORD_ID_FIELD]: recordId };
  if (opts.eventName) base.redcap_event_name = opts.eventName;
  const repetidos: RedcapRecord[] = [];

  for (const c of ordenadas) {
    if (REPETIVEIS.has(c.tipo)) {
      const rec: RedcapRecord = {
        [RECORD_ID_FIELD]: recordId,
        redcap_repeat_instrument: c.tipo,
        redcap_repeat_instance: String(c.seq),
      };
      if (opts.eventName) rec.redcap_event_name = opts.eventName;
      if (preencher(rec, c)) repetidos.push(rec); // pula instância sem dado
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
