/**
 * Valida um path vindo de query param (ex: ?next=/foo, ?redirect=/bar)
 * pra evitar open-redirect. Aceita só paths relativos que começam com "/"
 * mas não com "//" (que viraria protocol-relative URL pra outro host).
 *
 * Retorna o path se válido, ou o fallback caso seja inseguro/null.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = "/"): string {
  if (typeof raw !== "string") return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  // Rejeita backslash (Edge/IE tratava como /)
  if (raw.includes("\\")) return fallback;
  return raw;
}
