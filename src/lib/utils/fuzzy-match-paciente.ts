import { similarityRatio } from "./levenshtein";

/**
 * Faz matching fuzzy de um nome extraído de filename contra a lista de
 * pacientes do plantão. Retorna candidatos ranqueados por score, e
 * classifica o resultado em uma das 4 categorias:
 *
 *  - AUTO       — top score ≥ 0.85 e gap pra 2º ≥ 0.20  → atribuído sem fricção
 *  - SUGERIDO   — top score ≥ 0.65 e gap pra 2º ≥ 0.15  → mostra como sugestão
 *  - AMBIGUO    — top score ≥ 0.40 mas não destaca o suficiente → bloqueia até resolver
 *  - NAO_ATRIBUIDO — score < 0.40 ou input vazio        → bloqueia até resolver
 *
 * Gap ajuda a evitar autoatribuição quando há dois pacientes muito parecidos
 * (ex.: "JOÃO SILVA" vs "JOÃO SILVEIRA" no mesmo plantão).
 *
 * Importante: a função recebe nomes JÁ extraídos. A normalização (lowercase,
 * sem acentos, etc.) é feita internamente — não dependa da caller.
 */

export const FUZZY_THRESHOLDS = {
  AUTO_MIN: 0.85,
  AUTO_GAP_MIN: 0.2,
  SUGGEST_MIN: 0.65,
  SUGGEST_GAP_MIN: 0.15,
  AMBIGUOUS_MIN: 0.4,
} as const;

export type FuzzyClassification =
  | "AUTO"
  | "SUGERIDO"
  | "AMBIGUO"
  | "NAO_ATRIBUIDO";

export type PacienteCandidate = {
  paciente_id: string;
  nome: string;
};

export type ScoredCandidate = PacienteCandidate & {
  score: number;
};

export type FuzzyMatchResult = {
  classification: FuzzyClassification;
  /** top candidato (null se NAO_ATRIBUIDO) */
  top: ScoredCandidate | null;
  /** Top-3 candidatos ordenados (até 3, pode ser menor) */
  candidates: ScoredCandidate[];
};

/** Normalização: lowercase, sem acentos, collapse whitespace. */
export function normalizeName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score de match entre um candidato (nome do filename) e um nome de
 * paciente. Combina:
 *  - similaridade Levenshtein da string inteira (base)
 *  - bônus quando todos os tokens do candidato aparecem no nome do
 *    paciente (caso "primeiro nome só" — "Joao" → "Joao Silva")
 *  - similaridade token-a-token (recupera casos onde tokens estão
 *    desordenados ou o filename tem subset menor)
 *
 * O bônus de "subset de tokens" é importante: pesquisador raramente
 * escreve o nome completo no filename — "Maria 18_05" deveria casar
 * com "Maria Silva da Costa".
 */
export function scoreNameMatch(
  candidateName: string,
  pacienteName: string,
): number {
  const a = normalizeName(candidateName);
  const b = normalizeName(pacienteName);
  if (!a || !b) return 0;
  if (a === b) return 1;

  // Base: levenshtein da string toda
  const baseScore = similarityRatio(a, b);

  // Token-set: cada token do candidato encontra melhor match em b
  const aTokens = a.split(" ").filter(Boolean);
  const bTokens = b.split(" ").filter(Boolean);
  if (aTokens.length === 0 || bTokens.length === 0) return baseScore;

  let perTokenSum = 0;
  let perfectTokenMatches = 0;
  for (const at of aTokens) {
    let best = 0;
    for (const bt of bTokens) {
      const s = similarityRatio(at, bt);
      if (s > best) best = s;
      if (best === 1) break;
    }
    perTokenSum += best;
    if (best >= 0.95) perfectTokenMatches += 1;
  }
  const tokenScore = perTokenSum / aTokens.length;

  // Cobertura: fração de tokens do candidato que casaram quase-perfeitamente.
  // Quando alta, sinaliza que o filename é subset legítimo do nome real.
  const coverage = perfectTokenMatches / aTokens.length;

  // Combinação ponderada: tokenScore puxa pra cima quando há subset bom;
  // baseScore garante que strings totalmente diferentes não sobem só por
  // uma coincidência tokenizada.
  // coverage entra como bônus pra quando TODOS os tokens do candidato
  // têm match (típico de primeiro nome + sobrenome curto no filename).
  const combined =
    0.45 * baseScore + 0.45 * tokenScore + 0.1 * coverage;
  return Math.max(baseScore, combined);
}

export function matchPacienteByFilename(
  candidateName: string | null,
  pacientes: readonly PacienteCandidate[],
): FuzzyMatchResult {
  if (!candidateName || pacientes.length === 0) {
    return { classification: "NAO_ATRIBUIDO", top: null, candidates: [] };
  }

  const scored: ScoredCandidate[] = pacientes
    .map((p) => ({ ...p, score: scoreNameMatch(candidateName, p.nome) }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0] ?? null;
  const second = scored[1] ?? null;
  const candidates = scored.slice(0, 3);

  if (!top || top.score < FUZZY_THRESHOLDS.AMBIGUOUS_MIN) {
    return { classification: "NAO_ATRIBUIDO", top: null, candidates };
  }

  const gap = second ? top.score - second.score : 1;

  if (
    top.score >= FUZZY_THRESHOLDS.AUTO_MIN &&
    gap >= FUZZY_THRESHOLDS.AUTO_GAP_MIN
  ) {
    return { classification: "AUTO", top, candidates };
  }

  if (
    top.score >= FUZZY_THRESHOLDS.SUGGEST_MIN &&
    gap >= FUZZY_THRESHOLDS.SUGGEST_GAP_MIN
  ) {
    return { classification: "SUGERIDO", top, candidates };
  }

  return { classification: "AMBIGUO", top, candidates };
}
