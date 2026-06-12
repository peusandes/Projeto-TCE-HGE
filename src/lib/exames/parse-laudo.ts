import type { FormData } from "@/lib/redcap-schema/types";
import type { LaudoParse } from "./types";
import { valorImpresso, brToNumber, porMil } from "./numero";
import { classificarLocal } from "./local";

/**
 * Parser determinístico do laudo padrão do Laboratório de Análises Clínicas
 * do HGE. Trabalha sobre o TEXTO já extraído do PDF.
 *
 * Regras combinadas com o Pedro (ver conversa):
 *  - Decimal sempre com PONTO.
 *  - Hemácias / Hemoglobina / Hematócrito: o valor como impresso (só o número,
 *    sem ×10⁶, sem g/dL, sem %).
 *  - Leucograma: usa a coluna ABSOLUTA (mm³), ignora a %, e divide por 1000.
 *    Preenche só: leucócitos totais, linfócitos, eosinófilos, segmentados,
 *    bastões.
 *  - Plaquetas: valor em mil/µL como impresso (193, não 193000).
 *  - Coagulograma: NÃO preenche TP (unidade difere de outro centro). Preenche
 *    TTPa e RNI.
 *  - Gasometria: bicarbonato (HCO3) e lactato. Sódio só vem da gaso se NÃO
 *    houver sódio sérico.
 *  - Creatinina, ureia, cálcio (sérico, mg/dL), potássio (sérico) e CPK:
 *    preenche se reportado; senão deixa em branco.
 *  - HGT: nunca preenchido (é glicemia capilar, não vem no laudo).
 *  - Vários exames iguais no arquivo → considera o PRIMEIRO (match.* já pega a
 *    primeira ocorrência no texto).
 */

/** Captura o primeiro número que aparece logo após um rótulo. */
function aposRotulo(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m && m[1] ? m[1] : null;
}

/**
 * Extrai o valor ABSOLUTO de uma linha do leucograma. A linha tem o formato
 * "<rótulo>: [<%>] <absoluto> <faixa de referência>". Cortamos no início da
 * faixa de referência (primeiro "n - n") e, do que sobra, pegamos a coluna
 * absoluta (segunda quando há %, primeira quando só há um número).
 */
function leucoAbsoluto(text: string, rotulo: RegExp): number | null {
  const m = text.match(rotulo);
  if (!m || m.index == null) return null;
  let trecho = text.slice(m.index + m[0].length, m.index + m[0].length + 80);

  const faixa = trecho.search(/\d[\d.]*\s*[-–]\s*\d/);
  if (faixa >= 0) trecho = trecho.slice(0, faixa);

  const nums = trecho.match(/\d+(?:,\d+)?/g);
  if (!nums || nums.length === 0) return null;
  const abs = nums.length >= 2 ? nums[1] : nums[0];
  return brToNumber(abs);
}

// Campos copiados direto (valor como impresso). Tokens curtos usam \b pra não
// casar dentro de palavras (ex.: "Lac" em "correlacionar").
const DIRETOS: { key: string; re: RegExp }[] = [
  { key: "hemacias_seg", re: /Hem[áa]cias[^\d]*([\d.,]+)/i },
  { key: "hemoglobina_seg", re: /Hemoglobina[^\d]*([\d.,]+)/i },
  { key: "hematocrito_seg", re: /Hemat[óo]crito[^\d]*([\d.,]+)/i },
  { key: "ttpa_seg", re: /TTPA[^\d]*([\d.,]+)/i },
  { key: "rni_seg", re: /\bRNI\b(?!\s*\()[^\d]*([\d.,]+)/i },
  { key: "bicarbonato_seg", re: /HCO3[^\d]*([\d.,]+)/i },
  { key: "lactato_seg", re: /\b(?:Lactato|Lac)\b[^\d]*([\d.,]+)/i },
  { key: "creatinina_seg", re: /CREATININA[^\d]*([\d.,]+)/i },
  { key: "ureia_seg", re: /UR[ÉE]IA[^\d]*([\d.,]+)/i },
  { key: "calcio_seg", re: /C[ÁA]LCIO[^\d]*([\d.,]+)/i },
  { key: "potassio_seg", re: /POT[ÁA]SSIO[^\d]*([\d.,]+)/i },
  { key: "cpk_seg", re: /(?:CREATINOFOSFOQUINASE|\bCPK\b)[^\d]*([\d.,]+)/i },
];

// Linhas do leucograma → divididas por 1000.
const LEUCO: { key: string; re: RegExp }[] = [
  { key: "leucograma_total_seg", re: /Leuc[óo]citos\s+Totais[^:]*:\s*/i },
  { key: "neutrofilos_seg", re: /Neutr[óo]filos\s+Segmentados[^:]*:\s*/i },
  { key: "linfocitos_seg", re: /Linf[óo]citos(?!\s+At[íi]picos)[^:]*:\s*/i },
  { key: "eosinofilos_seg", re: /Eosin[óo]filos[^:]*:\s*/i },
  { key: "bastoes_seg", re: /Neutr[óo]filos\s+em\s+Bast[ãa]o[^:]*:\s*/i },
];

export function parseLaudo(text: string): LaudoParse {
  const dados: FormData = {};
  const avisos: string[] = [];

  for (const { key, re } of DIRETOS) {
    const raw = aposRotulo(text, re);
    if (raw != null) dados[key] = valorImpresso(raw);
  }

  // Plaquetas: "Contagem de Plaquetas ... : 193 mil/uL". Salvaguarda: se vier
  // em /µL (ex.: 193000), normaliza pra mil/µL.
  const plRaw = aposRotulo(text, /Plaquetas[^\d]*([\d.,]+)/i);
  if (plRaw != null) {
    const n = brToNumber(plRaw);
    dados.plaquetas_seg = n != null && n > 2000 ? porMil(n) : valorImpresso(plRaw);
  }

  for (const { key, re } of LEUCO) {
    const abs = leucoAbsoluto(text, re);
    if (abs != null) dados[key] = porMil(abs);
  }

  // Sódio: prioriza o sérico; só usa o da gaso (Na+) se não houver sérico.
  const sodioSerico = aposRotulo(text, /S[ÓO]DIO\s+S[ÉE]RICO[^\d]*([\d.,]+)/i);
  const sodioGaso = aposRotulo(text, /\bNa\b\+?[^\d]*([\d.,]+)/i);
  const sodio = sodioSerico ?? sodioGaso;
  if (sodio != null) dados.sodio_seg = valorImpresso(sodio);

  const pacientePdf = (() => {
    const m = text.match(/PACIENTE:\s*(.+?)\s*(?:NASCIMENTO|CPF|SEXO|REG)/is);
    return m ? m[1].replace(/\s+/g, " ").trim() : null;
  })();

  const nascimentoIso = (() => {
    const m = text.match(/NASCIMENTO:?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  })();

  const procedencia = (() => {
    const m = text.match(
      /PROCED[ÊE]NCIA:\s*([^\n]+?)\s*(?:M[ÉE]DICO|PROTOCOLO|CADASTRO|$)/i,
    );
    return m ? m[1].trim() : null;
  })();

  const localPct = classificarLocal(procedencia);
  if (procedencia && localPct == null) {
    avisos.push(`Procedência "${procedencia}" não reconhecida — local do paciente ficou em branco.`);
  }

  return { dados, pacientePdf, nascimentoIso, procedencia, localPct, avisos };
}
