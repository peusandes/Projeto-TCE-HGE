/**
 * Mapeia a "PROCEDENCIA" impressa no laudo do HGE para o código do campo
 * `local_pct` do seguimento (ver LOCAL_PCT em redcap-schema/options.ts):
 *   1 = UTI · 2 = Enfermaria · 3 = Emergência · 4 = Centro Cirúrgico
 *
 * Regras combinadas com o Pedro:
 *   - UTI 1/2/3...           → UTI
 *   - UI 1/2/3, Ortopedia,
 *     OBS 1/2/3, Sala amarela → Enfermaria
 *   - Sala vermelha          → Emergência
 *   - CC                     → Centro Cirúrgico
 */
export const LOCAL_PCT_LABEL: Record<number, string> = {
  1: "UTI",
  2: "Enfermaria",
  3: "Emergência",
  4: "Centro Cirúrgico",
};

export function classificarLocal(procedencia: string | null): number | null {
  if (!procedencia) return null;
  const p = procedencia
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();

  if (/^UTI\b/.test(p) || /\bUTI\s*\d/.test(p)) return 1;
  if (/^CC\b/.test(p) || /CENTRO\s+CIR/.test(p)) return 4;
  if (/SALA\s+VERMELHA/.test(p) || /\bEMERGENCIA\b/.test(p)) return 3;
  if (
    /^UI\b/.test(p) ||
    /\bUI\s*\d/.test(p) ||
    /ORTOPEDIA/.test(p) ||
    /^OBS\b/.test(p) ||
    /OBSERVA/.test(p) ||
    /SALA\s+AMARELA/.test(p)
  ) {
    return 2;
  }
  return null;
}
