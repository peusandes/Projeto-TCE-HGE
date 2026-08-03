/**
 * Compara o que vamos ENVIAR com o que JÁ ESTÁ no REDCap, campo a campo.
 *
 * Serve pra uma coisa só: quando o record já existe lá (legado / digitado à mão
 * pela equipe), o usuário precisa ver EXATAMENTE o que seria substituído antes
 * de confirmar o vínculo — "nunca apaga" não é o mesmo que "nunca altera".
 *
 * Classificação de cada campo que vamos mandar:
 *  - VAZIO lá        → preenche (ganho puro, sem perda)
 *  - IGUAL ao nosso  → sem efeito
 *  - DIFERENTE       → SUBSTITUI o que está lá (é isso que precisa ser mostrado)
 *
 * Checkbox é caso à parte: no REDCap ele nunca é "vazio", é 0 ou 1. Como só
 * emitimos os itens marcados (`campo___N = "1"`), 0→1 é preenchimento, não
 * substituição. Item marcado lá que não temos aqui continua marcado — contado à
 * parte (`mantidosLa`) porque é divergência que fica invisível no envio.
 */

import { ALL_INSTRUMENTS } from "@/lib/redcap-schema/instruments";
import type { FieldDef } from "@/lib/redcap-schema/types";
import type { RedcapRecord } from "./transform";

/** Uma linha do export flat do REDCap (todos os campos do projeto). */
export type LinhaRedcap = Record<string, string>;

export type CampoDiff = {
  /** Nome da variável no REDCap (ex.: sodio_seg, mecanismo_trauma___1). */
  campo: string;
  /** Rótulo legível (ex.: "Sódio"). */
  rotulo: string;
  /** Onde fica (ex.: "Admissão", "Seguimento dia 3 — 17/07/2026"). */
  onde: string;
  /** Valor legível hoje no REDCap. */
  atual: string;
  /** Valor legível que enviaríamos. */
  novo: string;
};

export type DiffExport = {
  /** Campos vazios no REDCap que este envio preenche. */
  preenche: number;
  /** Campos que já estão iguais lá. */
  iguais: number;
  /** Mesmo número escrito diferente ("21" vs "21.0") — não é perda de dado. */
  soFormato: number;
  /** Campos que seriam SUBSTITUÍDOS (o alerta de verdade). */
  substitui: CampoDiff[];
  /** Checkbox marcado lá que não está marcado aqui — continua marcado. */
  mantidosLa: number;
  /**
   * Seguimentos em que a DATA daqui não bate com a da mesma instância lá. Sinal
   * de que a numeração das instâncias está deslocada entre os dois lados — aí
   * vincular escreveria os dados de um dia por cima de outro dia.
   */
  datasDivergentes: CampoDiff[];
};

const CTRL = new Set([
  "record_id",
  "redcap_event_name",
  "redcap_repeat_instrument",
  "redcap_repeat_instance",
]);

const EVENTO_LABEL: Record<string, string> = {
  admisso_arm_1: "Admissão",
  seguimento_arm_1: "Seguimento",
  alta_arm_1: "Alta",
};

/** Índice campo → definição, montado uma vez a partir do dicionário do site. */
const CAMPOS: ReadonlyMap<string, FieldDef> = new Map(
  ALL_INSTRUMENTS.flatMap((inst) => inst.fields.map((f) => [f.name, f] as const)),
);

/** Quebra "mecanismo_trauma___1" em base + valor da choice. */
function partesCheckbox(campo: string): { base: string; item: string } | null {
  const i = campo.indexOf("___");
  return i === -1 ? null : { base: campo.slice(0, i), item: campo.slice(i + 3) };
}

/** Rótulo legível do campo — inclui o item quando é checkbox. */
export function rotuloCampo(campo: string): string {
  const ck = partesCheckbox(campo);
  if (ck) {
    const def = CAMPOS.get(ck.base);
    const escolha = def?.choices?.find((c) => String(c.value) === ck.item);
    const base = def?.label ?? ck.base;
    return escolha ? `${base}: ${escolha.label}` : `${base} (opção ${ck.item})`;
  }
  if (campo.endsWith("_complete")) return "Status do instrumento";
  return CAMPOS.get(campo)?.label ?? campo;
}

/** Valor legível: traduz código de escolha pro texto e anexa a unidade. */
export function valorLegivel(campo: string, valor: string): string {
  if (valor === "") return "(vazio)";
  if (partesCheckbox(campo)) return valor === "1" ? "marcado" : "não marcado";
  const def = CAMPOS.get(campo);
  if (!def) return valor;
  const escolha = def.choices?.find((c) => String(c.value) === valor);
  if (escolha) return escolha.label;
  return def.unit ? `${valor} ${def.unit}` : valor;
}

/** "21" e "21.0" são o mesmo número — diferença de escrita, não de dado. */
function mesmoNumero(a: string, b: string): boolean {
  if (!/^-?\d+([.,]\d+)?$/.test(a) || !/^-?\d+([.,]\d+)?$/.test(b)) return false;
  return Number(a.replace(",", ".")) === Number(b.replace(",", "."));
}

/** Chave que casa uma linha nossa com a linha correspondente lá. */
function chaveLinha(l: LinhaRedcap): string {
  return [
    l.redcap_event_name ?? "",
    l.redcap_repeat_instrument ?? "",
    l.redcap_repeat_instance ?? "",
  ].join("|");
}

/** "Seguimento dia 3 — 17/07/2026" / "Admissão". */
function ondeLegivel(linha: RedcapRecord, laMesmo: LinhaRedcap | undefined): string {
  const evento = EVENTO_LABEL[linha.redcap_event_name ?? ""] ?? linha.redcap_event_name ?? "—";
  const inst = linha.redcap_repeat_instance;
  if (!inst) return evento;
  const data = linha.data_seg || laMesmo?.data_seg || "";
  const m = data.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dataBr = m ? ` — ${m[3]}/${m[2]}/${m[1]}` : "";
  return `${evento} dia ${inst}${dataBr}`;
}

/**
 * Confronta os registros a enviar com as linhas exportadas do REDCap.
 * `linhasLa` vem do export flat daquele record (content=record, type=flat).
 */
export function compararComRedcap(
  records: RedcapRecord[],
  linhasLa: LinhaRedcap[],
): DiffExport {
  const laPorChave = new Map(linhasLa.map((l) => [chaveLinha(l), l]));
  const out: DiffExport = {
    preenche: 0,
    iguais: 0,
    soFormato: 0,
    substitui: [],
    mantidosLa: 0,
    datasDivergentes: [],
  };

  for (const rec of records) {
    const la = laPorChave.get(chaveLinha(rec));
    const onde = ondeLegivel(rec, la);
    for (const [campo, novo] of Object.entries(rec)) {
      if (CTRL.has(campo) || campo.endsWith("_complete")) continue;
      const atual = la?.[campo] ?? "";
      if (atual === "") {
        out.preenche += 1;
        continue;
      }
      if (atual === novo) {
        out.iguais += 1;
        continue;
      }
      // Checkbox desmarcado lá que vamos marcar: preenchimento, não substituição.
      if (partesCheckbox(campo) && atual === "0") {
        out.preenche += 1;
        continue;
      }
      if (mesmoNumero(atual, novo)) {
        out.soFormato += 1;
        continue;
      }
      const item: CampoDiff = {
        campo,
        rotulo: rotuloCampo(campo),
        onde,
        atual: valorLegivel(campo, atual),
        novo: valorLegivel(campo, novo),
      };
      // Data do seguimento divergindo é sintoma de instância desalinhada, não um
      // campo qualquer — sai separado pra virar alerta próprio na tela.
      if (campo === "data_seg" && rec.redcap_repeat_instance) out.datasDivergentes.push(item);
      out.substitui.push(item);
    }

    // Checkbox marcado lá e não marcado aqui: o envio não desmarca (nunca apaga).
    if (la) {
      for (const [campo, valor] of Object.entries(la)) {
        if (valor !== "1" || !partesCheckbox(campo)) continue;
        if (rec[campo] === undefined) out.mantidosLa += 1;
      }
    }
  }

  return out;
}
