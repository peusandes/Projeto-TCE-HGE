/**
 * Distância de edição clássica (Levenshtein). Two-row DP — O(n*m) tempo,
 * O(min(n,m)) memória. Bom o bastante para nomes curtos (até ~80 chars).
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Garante que `a` seja o mais curto pra economizar RAM no row.
  if (a.length > b.length) [a, b] = [b, a];

  const aLen = a.length;
  const bLen = b.length;
  let prev = new Array<number>(aLen + 1);
  let curr = new Array<number>(aLen + 1);

  for (let i = 0; i <= aLen; i++) prev[i] = i;

  for (let j = 1; j <= bLen; j++) {
    curr[0] = j;
    const bj = b.charCodeAt(j - 1);
    for (let i = 1; i <= aLen; i++) {
      const cost = a.charCodeAt(i - 1) === bj ? 0 : 1;
      const del = prev[i] + 1;
      const ins = curr[i - 1] + 1;
      const sub = prev[i - 1] + cost;
      curr[i] = del < ins ? (del < sub ? del : sub) : ins < sub ? ins : sub;
    }
    [prev, curr] = [curr, prev];
  }
  return prev[aLen];
}

/**
 * Score 0..1 normalizado pelo comprimento do mais longo. 1 = idêntico,
 * 0 = totalmente diferente. Útil pra comparar strings de tamanhos diferentes
 * num único threshold.
 */
export function similarityRatio(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(a, b) / longest;
}
