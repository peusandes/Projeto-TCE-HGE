import type { FormContext, FormData } from "./types";

const arrIncludes = (v: unknown, target: number): boolean => Array.isArray(v) && v.includes(target);
const isYes = (v: unknown): boolean => v === 1 || v === "1";
const isNo = (v: unknown): boolean => v === 0 || v === "0";

/** Cria um predicate "campo X é igual a valor V". */
export const eq = (field: string, value: number | string) =>
  (ctx: FormContext) => ctx.data[field] === value;

/** Campo X é "Sim" (=1). */
export const isYesField = (field: string) =>
  (ctx: FormContext) => isYes(ctx.data[field]);

/** Campo X (checkbox) contém o valor V. */
export const checkboxHas = (field: string, value: number) =>
  (ctx: FormContext) => arrIncludes(ctx.data[field], value);

/** Combinações lógicas. */
export const and =
  (...fns: Array<(ctx: FormContext) => boolean>) =>
  (ctx: FormContext) =>
    fns.every((f) => f(ctx));

export const not =
  (fn: (ctx: FormContext) => boolean) =>
  (ctx: FormContext) =>
    !fn(ctx);

export { isYes, isNo, arrIncludes };
export type { FormContext, FormData };
