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
 *  - Campos CALC do REDCap (@CALC) são ignorados (o REDCap recalcula e rejeita
 *    import). Campos calc só na UI mas que o REDCap guarda como number normal
 *    (marcados `exportCalc`: iss, gcs_admissao, gcs_minus_p_admissao) SÃO
 *    exportados — senão chegam vazios e viram digitação manual.
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
 *  - LONGITUDINAL: o projeto tem eventos; cada instrumento é mapeado a um evento
 *    (FORM_EVENT). Instrumentos do MESMO evento são fundidos numa linha daquele
 *    evento; o seguimento (repetível) vira N linhas no evento dele. Toda linha
 *    carrega redcap_event_name. Instrumento sem evento mapeado aborta o envio.
 */

import { ALL_INSTRUMENTS, FORM_EVENT, EVENT_ORDER } from "@/lib/redcap-schema/instruments";

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

/**
 * Campos que o REDCap recalcula sozinho (@CALC) — NÃO devem ser importados
 * (mandar o valor seria rejeitado e o REDCap recalcula a partir das fontes).
 *
 * Importante: nem todo campo calc do SITE é @CALC no REDCap. Alguns (iss,
 * gcs_admissao, gcs_minus_p_admissao) são auto-calculados na UI por conveniência
 * mas guardados como campo number NORMAL no REDCap — esses (marcados com
 * `exportCalc`) PRECISAM ser exportados, senão chegam vazios e viram digitação
 * manual. Só excluímos os calc que o REDCap de fato recalcula.
 */
const CAMPOS_CALC: ReadonlySet<string> = new Set(
  ALL_INSTRUMENTS.flatMap((inst) =>
    inst.fields.filter((f) => f.type === "calc" && !f.exportCalc).map((f) => f.name),
  ),
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
 * Gera os registros REDCap pra um paciente (projeto LONGITUDINAL). Instrumentos
 * do mesmo evento são fundidos numa linha daquele evento; cada instância de
 * seguimento vira uma linha no evento do seguimento (instâncias vazias e eventos
 * sem dado são pulados). Toda linha carrega redcap_event_name (FORM_EVENT).
 */
export function coletasParaRegistros(
  recordId: string,
  coletas: ColetaParaExport[],
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

  const porEvento = new Map<string, RedcapRecord>(); // evento → linha (não-repetível)
  const repetidos: RedcapRecord[] = [];

  for (const c of ordenadas) {
    const evento = FORM_EVENT[c.tipo as keyof typeof FORM_EVENT];
    if (!evento) {
      throw new Error(
        `Instrumento "${c.tipo}" não tem evento mapeado no REDCap (FORM_EVENT). Envio abortado.`,
      );
    }
    if (REPETIVEIS.has(c.tipo)) {
      const rec: RedcapRecord = {
        [RECORD_ID_FIELD]: recordId,
        redcap_event_name: evento,
        redcap_repeat_instrument: c.tipo,
        redcap_repeat_instance: String(c.seq),
      };
      if (preencher(rec, c)) repetidos.push(rec); // pula instância sem dado
    } else {
      let rec = porEvento.get(evento);
      if (!rec) {
        rec = { [RECORD_ID_FIELD]: recordId, redcap_event_name: evento };
        porEvento.set(evento, rec);
      }
      // Funde os campos deste instrumento na linha do evento. Trava defensiva:
      // dois instrumentos do mesmo evento NÃO podem escrever o mesmo campo com
      // valores diferentes (no REDCap os field_name são únicos no projeto, então
      // isso só dispararia num bug de schema nosso — aborta em vez de mascarar).
      const temp: RedcapRecord = {};
      preencher(temp, c);
      for (const [k, v] of Object.entries(temp)) {
        if (k in rec && rec[k] !== v) {
          throw new Error(
            `Conflito de campo "${k}" entre instrumentos do evento ${evento} ("${rec[k]}" vs "${v}"). Envio abortado.`,
          );
        }
        rec[k] = v;
      }
    }
  }

  // Só eventos que de fato ganharam dado (além dos campos de controle).
  const ctrl = new Set([
    RECORD_ID_FIELD,
    "redcap_event_name",
    "redcap_repeat_instrument",
    "redcap_repeat_instance",
  ]);
  const eventIndex = (ev: string) => {
    const i = EVENT_ORDER.indexOf(ev);
    return i === -1 ? EVENT_ORDER.length : i;
  };
  const bases = [...porEvento.entries()]
    .sort((a, b) => eventIndex(a[0]) - eventIndex(b[0]))
    .map(([, rec]) => rec)
    .filter((rec) => Object.keys(rec).some((k) => !ctrl.has(k)));

  repetidos.sort(
    (a, b) => Number(a.redcap_repeat_instance) - Number(b.redcap_repeat_instance),
  );

  return [...bases, ...repetidos];
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
