/**
 * Tenta extrair uma data do nome de arquivo seguindo padrões comuns que
 * pesquisadores usam ao nomear exames: "Lab_18_05.pdf", "Exame 18-05-2026.pdf",
 * "Hemograma.18.05.pdf", etc.
 *
 * Regras:
 *  - Procura DD[separador]MM[separador]YYYY (ano só se 4 dígitos)
 *  - Separadores aceitos: _ - .
 *  - Dia 1-31, mês 1-12 (valida data real — 31/02 não passa)
 *  - Sem ano explícito → usa o ano atual
 *  - Não aceita ano de 2 dígitos (ambíguo: "05_03_18" — 18 é dia? mês? ano?)
 *  - Pega o PRIMEIRO match válido
 *
 * Lookahead/behind `(?<!\d)` e `(?!\d)` evitam matchar números maiores tipo
 * "12345_67890" — `\b` não funcionaria porque `_` é word char em JS regex.
 *
 * Retorna ISO date "YYYY-MM-DD" ou null se não achar nada válido.
 */
export function parseDateFromFilename(
  filename: string,
  currentYear?: number,
): string | null {
  const year = currentYear ?? new Date().getFullYear();

  // Remove extensão pra não confundir parser
  const noExt = filename.replace(/\.[^.]+$/, "");

  // (?<!\d) = não precedido por dígito (boundary correto pra "_18_")
  // ano opcional, mas SÓ 4 dígitos (evita ambiguidade de "_24" como ano)
  const re = /(?<!\d)(\d{1,2})[_\-.](\d{1,2})(?:[_\-.](\d{4}))?(?!\d)/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(noExt)) !== null) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    if (day < 1 || day > 31 || month < 1 || month > 12) continue;

    const y = m[3] ? parseInt(m[3], 10) : year;

    // Valida data real (ex: 31/02 vira 03/03 no Date → rejeita)
    const d = new Date(y, month - 1, day);
    if (
      d.getFullYear() !== y ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      continue;
    }

    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}
