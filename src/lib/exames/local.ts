import type { Setor } from "@/lib/domain/enums";

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

/**
 * Infere o SETOR do mapa (enum de pacientes/mapa_entries) a partir da
 * procedência do PDF, pra criar um paciente novo. Retorna null quando não dá
 * pra encaixar com segurança (emergência, CC, ortopedia, sala amarela/vermelha
 * etc. não têm setor equivalente) — nesse caso o bot pergunta o setor.
 */
export function inferirSetor(procedencia: string | null): Setor | null {
  if (!procedencia) return null;
  const p = procedencia
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();

  if (/UTI\s*0?1(?!\d)/.test(p)) return "UTI_1";
  if (/UTI\s*0?2(?!\d)/.test(p)) return "UTI_2";
  if (/UTI\s*0?3(?!\d)/.test(p)) return "UTI_3";
  if (/\bUI\s*0?1(?!\d)/.test(p)) return "UI1";
  if (/\bUI\s*0?[23](?!\d)/.test(p)) return "UI2_3";
  if (/OBSERVA|^OBS\b/.test(p)) return "OBSERVACAO_1";
  if (/\bTRM\b/.test(p)) return "TRM";
  return null;
}

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
