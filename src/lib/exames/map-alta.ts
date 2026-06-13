import type { FormData } from "@/lib/redcap-schema/types";

/**
 * Mapeia as chaves laboratoriais do seguimento (..._seg) para os nomes
 * (legados, exatos) do instrumento "alta". Usado quando o exame é do dia da
 * alta — os laboratoriais vão pra alta, não pro seguimento.
 *
 * TP e HGT ficam de fora (o parser nunca preenche tp_seg/hgt_seg).
 */
export const SEG_PARA_ALTA: Record<string, string> = {
  hemacias_seg: "hemacias_alta",
  hemoglobina_seg: "hemoglobinas_alta", // plural no REDCap
  hematocrito_seg: "hematocritos_alta", // plural no REDCap
  leucograma_total_seg: "leucograma_total_alta",
  linfocitos_seg: "linfocitos_alta",
  eosinofilos_seg: "eosinofilos_alta",
  neutrofilos_seg: "neutrofilos_alta",
  bastoes_seg: "bastoes_alta",
  plaquetas_seg: "plaquetas_alta",
  ttpa_seg: "ttpa_alta",
  rni_seg: "rni_alta",
  bicarbonato_seg: "bicarbonato_variable", // nome técnico legado
  lactato_seg: "lactato_alta",
  sodio_seg: "sodio_alta",
  creatinina_seg: "creatinina_alta",
  ureia_seg: "ureia_alta",
  calcio_seg: "calcio_alta",
  potassio_seg: "potassio_alta",
  cpk_seg: "cpk_alta",
};

export function mapearParaAlta(dadosSeg: FormData): FormData {
  const out: FormData = {};
  for (const [k, v] of Object.entries(dadosSeg)) {
    const alvo = SEG_PARA_ALTA[k];
    if (alvo) out[alvo] = v;
  }
  return out;
}
