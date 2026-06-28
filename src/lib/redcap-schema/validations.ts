/**
 * Validações cruzadas de datas entre instrumentos REDCap.
 *
 * Filosofia: dados de pesquisa são bagunçados — paciente pode ter sido admitido
 * antes do trauma "oficial" registrado por viés de memória, hora de cirurgia
 * pode estar arredondada, etc. Por isso as validações NÃO bloqueiam o save.
 * Aparecem como WARNINGS amarelos pra revisão visual do pesquisador.
 *
 * Regras lê o contexto completo (data atual + others) e retorna `null` (OK)
 * ou uma string com a mensagem.
 */

import type { FormContext } from "./types";
import { checarValor, mensagemSuspeito } from "./plausibilidade";

export type DateWarning = {
  field: string;
  message: string;
};

const MS_DIA = 24 * 60 * 60 * 1000;

/** Tenta parsear "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm[:ss]" — retorna ms ou null. */
function parseDateMs(value: unknown): number | null {
  if (typeof value !== "string" || !value) return null;
  // REDCap usa YYYY-MM-DD (date) e YYYY-MM-DDTHH:mm (datetime)
  const t = Date.parse(value.length === 10 ? value + "T12:00:00" : value);
  return Number.isFinite(t) ? t : null;
}

function todayMs(): number {
  // Início do dia local — comparar "data hoje" sem se preocupar com horas
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function fmtData(value: unknown): string {
  const ms = parseDateMs(value);
  if (ms === null) return String(value ?? "—");
  const d = new Date(ms);
  return d.toLocaleDateString("pt-BR");
}

type Rule = {
  /** Campo dentro do instrumento corrente em que o warning aparece */
  field: string;
  /** Retorna mensagem se inválido, null se OK */
  check: (ctx: FormContext) => string | null;
};

const RULES: Record<string, Rule[]> = {
  dados_demograficos: [
    {
      field: "data_nascimento",
      check: ({ data }) => {
        const ms = parseDateMs(data.data_nascimento);
        if (ms === null) return null;
        if (ms > todayMs()) return "Data de nascimento no futuro.";
        return null;
      },
    },
    {
      field: "data_coleta",
      check: ({ data }) => {
        const coleta = parseDateMs(data.data_coleta);
        if (coleta === null) return null;
        if (coleta > todayMs()) return "Data da coleta no futuro.";
        const nasc = parseDateMs(data.data_nascimento);
        if (nasc !== null && coleta < nasc) {
          return "Coleta anterior ao nascimento.";
        }
        return null;
      },
    },
  ],

  historia_admissao: [
    {
      field: "hora_admissao",
      check: ({ data }) => {
        const trauma = parseDateMs(data.hora_trauma);
        const admissao = parseDateMs(data.hora_admissao);
        if (trauma === null || admissao === null) return null;
        if (admissao < trauma) {
          return `Admissão (${fmtData(data.hora_admissao)}) anterior ao trauma (${fmtData(data.hora_trauma)}).`;
        }
        if (admissao > todayMs()) return "Admissão no futuro.";
        return null;
      },
    },
    {
      field: "hora_trauma",
      check: ({ data }) => {
        const trauma = parseDateMs(data.hora_trauma);
        if (trauma === null) return null;
        if (trauma > todayMs()) return "Trauma no futuro.";
        return null;
      },
    },
  ],

  neuroimagem_admissao: [
    {
      field: "data_do_exame",
      check: ({ data, others }) => {
        const exame = parseDateMs(data.data_do_exame);
        if (exame === null) return null;
        if (exame > todayMs()) return "Data do exame no futuro.";
        const trauma = parseDateMs(others.historia_admissao?.hora_trauma);
        if (trauma !== null && exame < trauma - MS_DIA) {
          return `Exame muito antes do trauma (${fmtData(others.historia_admissao?.hora_trauma)}).`;
        }
        return null;
      },
    },
  ],

  dados_de_cirurgia: [
    {
      field: "hora_inicio_cirurgia",
      check: ({ data, others }) => {
        const inicio = parseDateMs(data.hora_inicio_cirurgia);
        if (inicio === null) return null;
        const admissao = parseDateMs(others.historia_admissao?.hora_admissao);
        if (admissao !== null && inicio < admissao) {
          return `Cirurgia iniciada antes da admissão (${fmtData(others.historia_admissao?.hora_admissao)}).`;
        }
        if (inicio > todayMs()) return "Início no futuro.";
        return null;
      },
    },
    {
      field: "hora_termino_cirurgia",
      check: ({ data }) => {
        const inicio = parseDateMs(data.hora_inicio_cirurgia);
        const fim = parseDateMs(data.hora_termino_cirurgia);
        if (inicio === null || fim === null) return null;
        if (fim <= inicio) return "Término anterior ou igual ao início.";
        // Cirurgia > 12h é improvável — alertar
        if (fim - inicio > 12 * 60 * 60 * 1000) {
          const horas = ((fim - inicio) / (60 * 60 * 1000)).toFixed(1);
          return `Duração de ${horas}h — confira.`;
        }
        return null;
      },
    },
    {
      field: "hora_anestesia",
      check: ({ data }) => {
        const anest = parseDateMs(data.hora_anestesia);
        const inicio = parseDateMs(data.hora_inicio_cirurgia);
        if (anest === null || inicio === null) return null;
        if (anest > inicio) return "Anestesia após início da cirurgia.";
        return null;
      },
    },
  ],

  alta: [
    {
      field: "hora_alta",
      check: ({ data, others }) => {
        const alta = parseDateMs(data.hora_alta);
        if (alta === null) return null;
        if (alta > todayMs()) return "Alta no futuro.";
        const admissao = parseDateMs(others.historia_admissao?.hora_admissao);
        if (admissao !== null && alta < admissao) {
          return `Alta anterior à admissão (${fmtData(others.historia_admissao?.hora_admissao)}).`;
        }
        return null;
      },
    },
  ],

  seguimento: [
    {
      field: "data_seg",
      check: ({ data, others }) => {
        const seg = parseDateMs(data.data_seg);
        if (seg === null) return null;
        if (seg > todayMs()) return "Seguimento no futuro.";
        const admissao = parseDateMs(others.historia_admissao?.hora_admissao);
        if (admissao !== null && seg < admissao) {
          return `Seguimento antes da admissão (${fmtData(others.historia_admissao?.hora_admissao)}).`;
        }
        return null;
      },
    },
  ],
};

// GOS-E são 3 instrumentos com o mesmo padrão — registram contra hora_trauma
function buildGoseRules(diasEsperados: number): Rule[] {
  return [
    {
      field: "data_ligacao",
      check: ({ data, others }) => {
        const lig = parseDateMs(data.data_ligacao);
        if (lig === null) return null;
        if (lig > todayMs()) return "Ligação no futuro.";
        const trauma = parseDateMs(others.historia_admissao?.hora_trauma);
        if (trauma === null) return null;
        const dias = Math.round((lig - trauma) / MS_DIA);
        const min = diasEsperados - 14;
        const max = diasEsperados + 30;
        if (dias < min) {
          return `Ligação ${dias} dias após trauma — esperado ~${diasEsperados}d.`;
        }
        if (dias > max) {
          return `Ligação ${dias} dias após trauma — esperado ~${diasEsperados}d.`;
        }
        return null;
      },
    },
  ];
}

RULES["gose_30d"] = buildGoseRules(30);
RULES["gose_90d"] = buildGoseRules(90);
RULES["gose_180d"] = buildGoseRules(180);

/** Avalia todas as regras do instrumento. Retorna lista de warnings por campo. */
export function validateInstrument(instrumentId: string, ctx: FormContext): DateWarning[] {
  const rules = RULES[instrumentId] ?? [];
  const out: DateWarning[] = [];
  for (const r of rules) {
    const msg = r.check(ctx);
    if (msg) out.push({ field: r.field, message: msg });
  }
  // Blindagem de plausibilidade: qualquer campo (lab/vital) fora da faixa vira
  // um warning — não bloqueia, só sinaliza pra revisão (ver plausibilidade.ts).
  for (const [campo, valor] of Object.entries(ctx.data)) {
    const s = checarValor(campo, valor);
    if (s) out.push({ field: campo, message: mensagemSuspeito(s) });
  }
  return out;
}

/** Helper pra um campo específico — usado em render inline */
export function validateField(
  instrumentId: string,
  fieldName: string,
  ctx: FormContext,
): string | null {
  const rules = RULES[instrumentId] ?? [];
  for (const r of rules) {
    if (r.field !== fieldName) continue;
    const msg = r.check(ctx);
    if (msg) return msg;
  }
  // Blindagem de plausibilidade do valor do próprio campo.
  const suspeito = checarValor(fieldName, ctx.data[fieldName]);
  if (suspeito) return mensagemSuspeito(suspeito);
  return null;
}
