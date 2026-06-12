/**
 * Helpers de número para laudos do HGE (formato brasileiro: vírgula decimal,
 * ponto de milhar). O REDCap guarda tudo como string, com PONTO decimal.
 */

/**
 * Mantém o valor como impresso no laudo, só trocando a vírgula decimal por
 * ponto e removendo o ponto de milhar. Não arredonda nem reformata.
 *   "15,2"   → "15.2"
 *   "43,0"   → "43.0"   (mantém o decimal, conforme combinado)
 *   "1.526,0"→ "1526.0"
 *   "193"    → "193"
 */
export function valorImpresso(raw: string): string {
  return raw.trim().replace(/\./g, "").replace(",", ".");
}

/** Converte número BR cru em Number. "1.800" → 1800; "68,1" → 68.1. */
export function brToNumber(raw: string): number | null {
  const s = raw.trim().replace(/\./g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Divide um valor absoluto do leucograma por 1000 e formata sem zeros à
 * direita (até 3 casas). É o que o protocolo pede: 13400 → "13.4",
 * 11470 → "11.47", 6333 → "6.333", 19 → "0.019", 0 → "0".
 */
export function porMil(absoluto: number): string {
  const v = Number((absoluto / 1000).toFixed(3));
  return String(v);
}
