import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortId(): string {
  // Usa crypto.randomUUID quando disponível pra reduzir risco de colisão em
  // lotes concorrentes (várias fotos subindo em paralelo).
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Extrai mensagem útil de qualquer erro (Error, PostgrestError do Supabase,
 * objeto sem toString, etc.). Evita o "[object Object]" que aparecia em
 * vários toasts.
 */
export function errMsg(err: unknown): string {
  if (!err) return "Erro desconhecido";
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const e = err as { message?: unknown; error?: unknown; details?: unknown };
    if (typeof e.message === "string") return e.message;
    if (typeof e.error === "string") return e.error;
    if (typeof e.details === "string") return e.details;
    try {
      return JSON.stringify(err);
    } catch {
      return "Erro desconhecido";
    }
  }
  return String(err);
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  wait: number,
): T & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  const debounced = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const a = lastArgs;
      lastArgs = null;
      if (a) fn(...a);
    }, wait);
  }) as T & { cancel: () => void; flush: () => void };
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };
  // Executa imediatamente a última chamada pendente (se houver). Útil pra não
  // perder edições ao desmontar/fechar a página.
  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs) {
      const a = lastArgs;
      lastArgs = null;
      fn(...a);
    }
  };
  return debounced;
}
