import type { FormContext } from "./types";

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Parse → inteiro arredondado → clamp em [min, max]. Retorna null se não for
 * numérico. Usado nos escores (GCS/GCS-P/ISS) que vão EXPORTADOS pro REDCap como
 * campo number normal: garante que o valor calculado é sempre inteiro e dentro
 * da faixa válida, mesmo que o input venha sujo (decimal ou fora de faixa) — o
 * REDCap aceita qualquer número na API (não valida faixa no import), então a
 * trava tem que ser aqui pra nunca exportar "coisa errada".
 */
const intClamp = (v: unknown, min: number, max: number): number | null => {
  const n = num(v);
  if (n === null) return null;
  const r = Math.round(n);
  return r < min ? min : r > max ? max : r;
};

const date = (v: unknown): Date | null => {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
};

/** Diferença em anos completos entre nascimento e coleta. */
export function calcIdade(ctx: FormContext): number | null {
  const nasc = date(ctx.data.data_nascimento) ?? date(ctx.others.dados_demograficos?.data_nascimento);
  const coleta = date(ctx.data.data_coleta) ?? date(ctx.others.dados_demograficos?.data_coleta);
  if (!nasc || !coleta) return null;
  let years = coleta.getFullYear() - nasc.getFullYear();
  const m = coleta.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && coleta.getDate() < nasc.getDate())) years -= 1;
  return years < 0 ? null : years;
}

/** Diferença trauma → admissão em horas (decimais). */
export function calcTempoTraumaPorta(ctx: FormContext): number | null {
  const trauma = date(ctx.data.hora_trauma) ?? date(ctx.others.historia_admissao?.hora_trauma);
  const adm = date(ctx.data.hora_admissao) ?? date(ctx.others.historia_admissao?.hora_admissao);
  if (!trauma || !adm) return null;
  const diff = (adm.getTime() - trauma.getTime()) / 3_600_000; // ms → h
  return Math.round(diff * 10) / 10;
}

/**
 * Soma das partes do Glasgow (escala clínica: ocular 1-4, verbal 1-5, motor
 * 1-6). Componentes são arredondados e clampados na faixa clínica antes de somar
 * — o verbal vai só até 5 (mesmo que o campo aceite 6), então o GCS fica sempre
 * em [3,15], a faixa que o REDCap declara pro campo gcs_admissao.
 */
export function calcGcs(ctx: FormContext): number | null {
  const o = intClamp(ctx.data.ocular_admissao, 1, 4);
  const v = intClamp(ctx.data.verbal_admissao, 1, 5);
  const m = intClamp(ctx.data.motor_admissao, 1, 6);
  if (o === null || v === null || m === null) return null;
  return o + v + m; // ∈ [3,15]
}

/** GCS - (2 - pupilas reativas). Sempre inteiro em [1,15] (faixa do REDCap). */
export function calcGcsMinusP(ctx: FormContext): number | null {
  const gcs = calcGcs(ctx); // já ∈ [3,15]
  const p = intClamp(ctx.data.pupilas_admissao, 0, 2);
  if (gcs === null || p === null) return null;
  const result = gcs - (2 - p);
  return result < 1 ? 1 : result > 15 ? 15 : result;
}

/**
 * Injury Severity Score:
 * - Se qualquer AIS = 6 → 75
 * - Senão: soma dos quadrados dos 3 maiores AIS preenchidos.
 */
export function calcISS(ctx: FormContext): number | null {
  // AIS arredondado e clampado em [0,6] — garante que a regra "===6 → 75" não
  // seja burlada por decimal (ex.: 6.5) e que o ISS exportado fique em [0,75].
  const vs = [
    intClamp(ctx.data.cabeca_pescoco_ais, 0, 6),
    intClamp(ctx.data.face_ais, 0, 6),
    intClamp(ctx.data.torax_ais, 0, 6),
    intClamp(ctx.data.abdome_ais, 0, 6),
    intClamp(ctx.data.extremidades_ais, 0, 6),
    intClamp(ctx.data.geral_ais, 0, 6),
  ];
  const present = vs.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  if (present.some((v) => v === 6)) return 75;
  const top3 = [...present].sort((a, b) => b - a).slice(0, 3);
  return top3.reduce((sum, v) => sum + v * v, 0); // ≤ 5²·3 = 75
}

/** Tempo trauma → início da cirurgia, em horas. Usa hora_trauma da história de admissão. */
export function calcTempoTraumaCirurgia(ctx: FormContext): number | null {
  const trauma = date(ctx.others.historia_admissao?.hora_trauma);
  const inicioCir = date(ctx.data.hora_inicio_cirurgia);
  if (!trauma || !inicioCir) return null;
  const diff = (inicioCir.getTime() - trauma.getTime()) / 3_600_000;
  return Math.round(diff * 10) / 10;
}

/** Duração da cirurgia, em minutos. */
export function calcTempoCirurgico(ctx: FormContext): number | null {
  const inicio = date(ctx.data.hora_inicio_cirurgia);
  const termino = date(ctx.data.hora_termino_cirurgia);
  if (!inicio || !termino) return null;
  return Math.round((termino.getTime() - inicio.getTime()) / 60_000);
}
