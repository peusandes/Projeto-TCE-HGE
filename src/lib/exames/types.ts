import type { FormData } from "@/lib/redcap-schema/types";

/**
 * Resultado de parsear um laudo laboratorial do HGE.
 * `dados` traz apenas os campos do seguimento que foram REALMENTE encontrados
 * no PDF (chaves = nomes das variáveis REDCap, ex.: "hemoglobina_seg"). Campos
 * não reportados ficam de fora — nunca gravamos null por cima do existente.
 */
export type LaudoParse = {
  /** Campos laboratoriais do seguimento extraídos (só os encontrados). */
  dados: FormData;
  /** Nome do paciente como impresso no PDF (campo PACIENTE), para conferência. */
  pacientePdf: string | null;
  /** Data de nascimento lida do PDF em ISO (YYYY-MM-DD), ou null. */
  nascimentoIso: string | null;
  /** PROCEDENCIA crua lida do PDF (ex.: "UTI 02"). */
  procedencia: string | null;
  /** local_pct resolvido (1..4) a partir da procedência, ou null. */
  localPct: number | null;
  /** Avisos não-fatais (ex.: procedência não reconhecida). */
  avisos: string[];
};

/** Resultado de parsear o nome do arquivo enviado no Telegram. */
export type FilenameParse = {
  /** Nome do paciente extraído (antes da data, sem a palavra "alta"). */
  nome: string;
  /** Data do exame em ISO (YYYY-MM-DD), ou null se não houver data no nome. */
  dataIso: string | null;
  /** true quando o ano não estava no nome e foi inferido. */
  anoInferido: boolean;
  /** true quando o nome do arquivo contém "alta" → exame do dia da alta. */
  isAlta: boolean;
};
