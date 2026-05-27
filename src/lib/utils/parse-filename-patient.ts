import { parseDateFromFilenameWithIndex } from "./parse-filename-date";

/**
 * Heurística: extrai o "nome do paciente" do filename, removendo a data
 * (se houver) e qualquer pontuação restante. O resto vira o candidato pra
 * fuzzy match contra a lista do plantão.
 *
 * Exemplos:
 *  - "Gerson Barretto Lopes 21_05.pdf"  → "Gerson Barretto Lopes"
 *  - "joao_silva_18-05-2026.jpg"        → "joao silva"
 *  - "Maria-da-Silva.HGT.18.05.heic"    → "Maria da Silva HGT"
 *  - "lab_18_05.pdf"                     → "lab"
 *  - "Foto IMG_20260518_142233.jpg"     → null (não há texto interpretável)
 *
 * Regras:
 *  - Tira extensão
 *  - Se achou data, fatia fora a data (pega antes + depois)
 *  - Substitui `_`, `-`, `.` por espaço (sem espelhar duplicados)
 *  - Colapsa whitespace
 *  - Remove tokens puramente numéricos (códigos de câmera, contadores)
 *  - Se restar <2 chars OU só números, retorna null
 */
export function parsePatientNameFromFilename(filename: string): string | null {
  const noExt = filename.replace(/\.[^.]+$/, "");
  const match = parseDateFromFilenameWithIndex(filename);

  let raw: string;
  if (match) {
    raw = (noExt.slice(0, match.start) + " " + noExt.slice(match.end)).trim();
  } else {
    raw = noExt;
  }

  // Trata separadores estruturais como espaço; preserva apóstrofo (D'Avila)
  // e remove parênteses/colchetes que aparecem em cópias ("Joao (1).jpg").
  const cleaned = raw
    .replace(/[_\-.]+/g, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;

  // Joga fora tokens 100% numéricos (IMG_2034, foto 0023, etc.)
  const tokens = cleaned
    .split(/\s+/)
    .filter((t) => !/^\d+$/.test(t))
    // Tokens muito curtos que sobram do parser (1 letra) — descarta exceto
    // se for o ÚNICO token (ex: nome inicial isolado, raro).
    .filter((t) => t.length >= 2 || /^[A-Za-zÀ-ÿ]$/.test(t));

  if (tokens.length === 0) return null;
  const finalName = tokens.join(" ").trim();
  if (finalName.length < 2) return null;
  return finalName;
}
