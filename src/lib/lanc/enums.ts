/**
 * Enums + labels do domínio absorvido do lanc-app (gestão da liga, estágio,
 * escala TCE, pacientes da extensão). Espelha o padrão de src/lib/domain/enums.ts
 * (const array + type + label record). Valores batem com os CHECKs das migrations
 * 0026/0027.
 */

export const PROFILE_STATUS = ["ATIVO", "INATIVO", "CALOURO"] as const;
export type ProfileStatus = (typeof PROFILE_STATUS)[number];
export const PROFILE_STATUS_LABEL: Record<ProfileStatus, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  CALOURO: "Calouro",
};

export const TURNO = ["MANHA", "TARDE"] as const;
export type Turno = (typeof TURNO)[number];
export const TURNO_LABEL: Record<Turno, string> = { MANHA: "Manhã", TARDE: "Tarde" };

// 0=Dom .. 6=Sab (Date.getDay())
export const DIA_SEMANA_LABEL: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};
export const DIA_SEMANA_CURTO: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

/** Dias com turno da TARDE no estágio (Seg/Ter/Qui/Sex); resto só manhã. */
export const DIAS_COM_TARDE: ReadonlySet<number> = new Set([1, 2, 4, 5]);
export function turnosDoDia(diaSemana: number): Turno[] {
  return DIAS_COM_TARDE.has(diaSemana) ? ["MANHA", "TARDE"] : ["MANHA"];
}
/** Ordem de exibição da grade: Seg→Dom. */
export const DIAS_ORDEM: number[] = [1, 2, 3, 4, 5, 6, 0];

export const ESTAGIO_SOLIC_TIPO = ["ENTRAR", "TROCAR", "SAIR"] as const;
export type EstagioSolicTipo = (typeof ESTAGIO_SOLIC_TIPO)[number];
export const ESTAGIO_SOLIC_TIPO_LABEL: Record<EstagioSolicTipo, string> = {
  ENTRAR: "Entrar",
  TROCAR: "Trocar",
  SAIR: "Sair",
};

export const ESTAGIO_SOLIC_STATUS = ["PENDENTE", "APROVADA", "RECUSADA", "CANCELADA"] as const;
export type EstagioSolicStatus = (typeof ESTAGIO_SOLIC_STATUS)[number];

export const ESTAGIO_OCORRENCIA_TIPO = ["FALTA", "TROCA"] as const;
export type EstagioOcorrenciaTipo = (typeof ESTAGIO_OCORRENCIA_TIPO)[number];

export const TCE_LOCAL = ["HOSPITAL_SUBURBIO", "HOSPITAL_GERAL_ESTADO"] as const;
export type TceLocal = (typeof TCE_LOCAL)[number];
export const TCE_LOCAL_LABEL: Record<TceLocal, string> = {
  HOSPITAL_SUBURBIO: "Hospital do Subúrbio",
  HOSPITAL_GERAL_ESTADO: "Hospital Geral do Estado",
};

export const TCE_COLETA_STATUS = ["ABERTA", "FECHADA", "REALIZADA", "CANCELADA"] as const;
export type TceColetaStatus = (typeof TCE_COLETA_STATUS)[number];

export const TCE_ESCALA_ROLE = ["COLETOR", "RESERVA"] as const;
export type TceEscalaRole = (typeof TCE_ESCALA_ROLE)[number];

export const TCE_DISP_STATUS = ["DISPONIVEL", "INDISPONIVEL", "TALVEZ"] as const;
export type TceDispStatus = (typeof TCE_DISP_STATUS)[number];

export const PACIENTE_FLUXO = ["TCE_BABY", "ANEURISMA_BABY"] as const;
export type PacienteFluxo = (typeof PACIENTE_FLUXO)[number];
export const PACIENTE_FLUXO_LABEL: Record<PacienteFluxo, string> = {
  TCE_BABY: "TCE Baby",
  ANEURISMA_BABY: "Aneurisma Baby",
};

export const PACIENTE_STATUS_EXT = ["ADMISSAO", "NO_MAPA", "FORA_DO_MAPA", "ALTA"] as const;
export type PacienteStatusExt = (typeof PACIENTE_STATUS_EXT)[number];
export const PACIENTE_STATUS_EXT_LABEL: Record<PacienteStatusExt, string> = {
  ADMISSAO: "Admissão",
  NO_MAPA: "No mapa",
  FORA_DO_MAPA: "Fora do mapa",
  ALTA: "Alta",
};
/** Transições válidas do fluxo do paciente da extensão (espelha o lanc-app). */
export const PACIENTE_STATUS_EXT_PROXIMOS: Record<PacienteStatusExt, PacienteStatusExt[]> = {
  ADMISSAO: ["NO_MAPA", "ALTA"],
  NO_MAPA: ["FORA_DO_MAPA", "ALTA"],
  FORA_DO_MAPA: ["NO_MAPA", "ALTA"],
  ALTA: [],
};

export const DOCUMENTO_STATUS = ["PENDENTE", "APROVADO", "REJEITADO"] as const;
export type DocumentoStatus = (typeof DOCUMENTO_STATUS)[number];

export const SIGNUP_STATUS = ["PENDING", "APPROVED", "REJECTED"] as const;
export type SignupStatus = (typeof SIGNUP_STATUS)[number];
