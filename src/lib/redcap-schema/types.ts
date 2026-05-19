// REDCap data dictionary — types

export type FieldType =
  | "text"
  | "number"
  | "date"          // text (date_dmy)
  | "datetime"      // text (datetime_dmy)
  | "yesno"
  | "radio"
  | "dropdown"
  | "checkbox"      // múltiplo
  | "calc"
  | "descriptive";

export type FieldChoice = { value: number; label: string };

/** Valor armazenado no jsonb `coletas_redcap.dados[variable]`. */
export type FieldValue = string | number | number[] | null;

export type FormData = Record<string, FieldValue>;

/** Contexto disponível durante render: dados deste form + dados de OUTROS forms já preenchidos. */
export type FormContext = {
  /** Dados atuais do form sendo renderizado. */
  data: FormData;
  /** Dados de outros instrumentos do mesmo paciente (chave = nome do instrument). */
  others: Record<string, FormData>;
  /** Snapshot leve do paciente (para preencher record_id, etc.). */
  paciente: { id: string; nome: string };
};

export type FieldDef = {
  /** Nome EXATO da variável no REDCap. Preservar — vira chave no jsonb. */
  name: string;
  /** Label legível mostrado na UI. */
  label: string;
  type: FieldType;
  required?: boolean;
  identifier?: boolean;
  note?: string;

  // Number-specific
  min?: number;
  max?: number;
  integer?: boolean;
  unit?: string;

  // Choice-based
  choices?: FieldChoice[];

  // Branching — só renderiza se retornar true
  showWhen?: (ctx: FormContext) => boolean;

  // Calculated — computa a partir do contexto
  calc?: (ctx: FormContext) => number | string | null;
  calcLabel?: string;
  calcUnit?: string;

  // Descriptive — bloco informativo, sem input
  content?: string | ((ctx: FormContext) => string);

  // Identificador de seção. Usado pra agrupar visualmente os campos.
  section?: string;

  /** Placeholder. */
  placeholder?: string;
};

export type InstrumentId =
  | "status_de_admisso"
  | "dados_demograficos"
  | "historia_pregressa"
  | "historia_admissao"
  | "neuroimagem_admissao"
  | "seguimento"
  | "dados_de_cirurgia"
  | "alta"
  | "gose_30d"
  | "gose_90d"
  | "gose_180d";

export type InstrumentDef = {
  id: InstrumentId;
  title: string;
  shortTitle: string;
  fields: FieldDef[];
  phase: 1 | 2 | 3 | 4;
};

export type FormStatus = "INCOMPLETE" | "UNVERIFIED" | "COMPLETE";
