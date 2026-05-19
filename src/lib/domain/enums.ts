export const SETORES = [
  "OBSERVACAO_1",
  "UI1",
  "UI2_3",
  "UTI_1",
  "UTI_2",
  "UTI_3",
  "TRM",
  "FORA_DO_MAPA",
  "ALTAS",
] as const;
export type Setor = (typeof SETORES)[number];

export const SETOR_LABEL: Record<Setor, string> = {
  OBSERVACAO_1: "OBSERVAÇÃO 1",
  UI1: "UNIDADE INTERMEDIÁRIA 1 (UI1)",
  UI2_3: "UNIDADE INTERMEDIÁRIA 2/3 (UI2/3)",
  UTI_1: "UTI 1",
  UTI_2: "UTI 2",
  UTI_3: "UTI 3",
  TRM: "TRM",
  FORA_DO_MAPA: "FORA DO MAPA",
  ALTAS: "ALTAS",
};

export const SETOR_SHORT: Record<Setor, string> = {
  OBSERVACAO_1: "Obs 1",
  UI1: "UI 1",
  UI2_3: "UI 2/3",
  UTI_1: "UTI 1",
  UTI_2: "UTI 2",
  UTI_3: "UTI 3",
  TRM: "TRM",
  FORA_DO_MAPA: "Fora do mapa",
  ALTAS: "Altas",
};

export const SITUACOES = ["ADM", "SEG", "EXCLUSAO", "ALTA"] as const;
export type Situacao = (typeof SITUACOES)[number];

export const SITUACAO_LABEL: Record<Situacao, string> = {
  ADM: "Admissão",
  SEG: "Seguimento",
  EXCLUSAO: "Exclusão",
  ALTA: "Alta",
};

export const SITUACAO_BADGE_CLASS: Record<Situacao, string> = {
  ADM: "bg-blue-600 text-white hover:bg-blue-700",
  SEG: "bg-teal-600 text-white hover:bg-teal-700",
  EXCLUSAO: "bg-slate-500 text-white hover:bg-slate-600",
  ALTA: "bg-purple-600 text-white hover:bg-purple-700",
};

/**
 * Estado de verificação da alta. NULL = sem dúvida.
 *  - PENDENTE_HGE: usuário marcou ALTA no app mas ainda precisa checar no
 *    sistema do HGE (alta no Doutore pode ser só queda do mapa da
 *    neurocirurgia, não alta hospitalar real). Card fica amarelo.
 *  - FORA_DOUTORE: depois de checar, descobriu que paciente segue
 *    internado — só sumiu do Doutore. Card mantém sinal laranja.
 */
export const VERIFICACAO_ALTA = ["PENDENTE_HGE", "FORA_DOUTORE"] as const;
export type VerificacaoAlta = (typeof VERIFICACAO_ALTA)[number];

export const VERIFICACAO_ALTA_LABEL: Record<VerificacaoAlta, string> = {
  PENDENTE_HGE: "Verificar alta no HGE",
  FORA_DOUTORE: "Fora do mapa Doutore",
};

export const TCLE_STATUS = ["PENDENTE", "ASSINADO", "RECUSADO", "NA"] as const;
export type TcleStatus = (typeof TCLE_STATUS)[number];

export const TCLE_LABEL: Record<TcleStatus, string> = {
  PENDENTE: "Pendente",
  ASSINADO: "Assinado",
  RECUSADO: "Recusado",
  NA: "N/A",
};

export const TCLE_BADGE_CLASS: Record<TcleStatus, string> = {
  PENDENTE: "bg-amber-500 text-white hover:bg-amber-600",
  ASSINADO: "bg-emerald-600 text-white hover:bg-emerald-700",
  RECUSADO: "bg-red-600 text-white hover:bg-red-700",
  NA: "bg-slate-300 text-slate-700 hover:bg-slate-400",
};

export const TIPOS_ANEXO = [
  "ADMISSAO",
  "EXAME_LABORATORIAL",
  "EXAME_IMAGEM",
  "HGT",
  "EVOLUCAO_MEDICA",
  "PRESCRICAO",
  "BOLETIM_NEURO",
  "TCLE_ASSINADO",
  "OUTRO",
] as const;
export type TipoAnexo = (typeof TIPOS_ANEXO)[number];

export const TIPO_ANEXO_LABEL: Record<TipoAnexo, string> = {
  ADMISSAO: "Admissão",
  EXAME_LABORATORIAL: "Exame laboratorial",
  EXAME_IMAGEM: "Exame de imagem",
  HGT: "HGT",
  EVOLUCAO_MEDICA: "Evolução médica",
  PRESCRICAO: "Prescrição",
  BOLETIM_NEURO: "Boletim neurocirúrgico",
  TCLE_ASSINADO: "TCLE assinado",
  OUTRO: "Outro",
};

export const STATUS_PLANTAO = ["EM_ANDAMENTO", "FINALIZADO"] as const;

export const STATUS_COLETA = ["RASCUNHO", "COMPLETO", "EXPORTADO_REDCAP"] as const;
export type StatusColeta = (typeof STATUS_COLETA)[number];

export const TIPO_COLETA = [
  "ADMISSAO",
  "SEGUIMENTO_24H",
  "SEGUIMENTO_48H",
  "ALTA",
] as const;
export type TipoColeta = (typeof TIPO_COLETA)[number];
