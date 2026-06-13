import { format, startOfDay, subYears } from "date-fns";
import type { FilenameParse } from "./types";

/**
 * Lê nome do paciente + data do exame a partir do nome do arquivo enviado no
 * Telegram. Ex.: "Joao de Freitas 12_05.pdf" → { nome: "Joao de Freitas",
 * dataIso: "2026-05-12" }.
 *
 * Formato da data no fim do nome: DD_MM ou DD_MM_AAAA (também aceita . - /).
 * Sem ano → usa o ano de `hoje`; se isso cair no futuro (ex.: exame "20_12"
 * enviado em janeiro), assume o ano anterior — exame do futuro não existe.
 */
/** Palavra "alta" isolada (cercada por início/fim ou separador). */
const ALTA_RE = /(?:^|[\s_.\-])alta(?=$|[\s_.\-])/i;

export function parseFilename(
  filename: string,
  hoje: Date = new Date(),
): FilenameParse {
  const semExt = filename.replace(/\.[a-z0-9]+$/i, "").trim();

  // "alta" no nome → exame do dia da alta. Remove a palavra antes de extrair
  // nome e data (aceita "Nome alta DD_MM" ou "Nome DD_MM alta").
  const isAlta = ALTA_RE.test(semExt);
  const base = semExt.replace(ALTA_RE, " ").replace(/\s+/g, " ").trim();

  const m = base.match(
    /^(.*?)[\s_.-]+(\d{1,2})[._\-/](\d{1,2})(?:[._\-/](\d{2,4}))?\s*$/,
  );

  if (!m) {
    return { nome: base.replace(/\s+/g, " ").trim(), dataIso: null, anoInferido: false, isAlta };
  }

  const nome = m[1].replace(/\s+/g, " ").trim();
  const dia = Number(m[2]);
  const mes = Number(m[3]);
  const anoRaw = m[4];

  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) {
    return { nome, dataIso: null, anoInferido: false, isAlta };
  }

  let anoInferido = false;
  let ano: number;
  if (anoRaw) {
    ano = anoRaw.length <= 2 ? 2000 + Number(anoRaw) : Number(anoRaw);
  } else {
    ano = hoje.getFullYear();
    anoInferido = true;
  }

  let d = new Date(ano, mes - 1, dia);
  // Data inválida (ex.: 31/02) → o JS rola pro mês seguinte; rejeita.
  if (d.getMonth() !== mes - 1 || d.getDate() !== dia) {
    return { nome, dataIso: null, anoInferido: false, isAlta };
  }

  if (anoInferido && startOfDay(d) > startOfDay(hoje)) {
    d = subYears(d, 1);
  }

  return { nome, dataIso: format(d, "yyyy-MM-dd"), anoInferido, isAlta };
}
