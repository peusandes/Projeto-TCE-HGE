import type { FormContext } from "./types";

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

/** Soma das partes do Glasgow. */
export function calcGcs(ctx: FormContext): number | null {
  const o = num(ctx.data.ocular_admissao);
  const v = num(ctx.data.verbal_admissao);
  const m = num(ctx.data.motor_admissao);
  if (o === null || v === null || m === null) return null;
  return o + v + m;
}

/** GCS - (2 - pupilas reativas). */
export function calcGcsMinusP(ctx: FormContext): number | null {
  const gcs = calcGcs(ctx);
  const p = num(ctx.data.pupilas_admissao);
  if (gcs === null || p === null) return null;
  const result = gcs - (2 - p);
  return result < 1 ? 1 : result;
}

/**
 * Injury Severity Score:
 * - Se qualquer AIS = 6 → 75
 * - Senão: soma dos quadrados dos 3 maiores AIS preenchidos.
 */
export function calcISS(ctx: FormContext): number | null {
  const vs = [
    num(ctx.data.cabeca_pescoco_ais),
    num(ctx.data.face_ais),
    num(ctx.data.torax_ais),
    num(ctx.data.abdome_ais),
    num(ctx.data.extremidades_ais),
    num(ctx.data.geral_ais),
  ];
  const present = vs.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  if (present.some((v) => v === 6)) return 75;
  const top3 = [...present].sort((a, b) => b - a).slice(0, 3);
  return top3.reduce((sum, v) => sum + v * v, 0);
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
