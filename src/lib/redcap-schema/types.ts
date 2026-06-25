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
  /**
   * Campo calc na UI (auto-calculado pra conveniência) mas que o REDCap guarda
   * como campo NORMAL (text/number), não como @CALC. Nesses casos o REDCap NÃO
   * recalcula sozinho, então o valor calculado PRECISA ser exportado — senão
   * chega vazio no REDCap e vira digitação manual. Quando o REDCap também é
   * @CALC (idade, tempos), deixar false: o REDCap recalcula a partir das fontes
   * e mandar o valor seria rejeitado. (Verificado via content=metadata: só iss,
   * gcs_admissao e gcs_minus_p_admissao são plain number no REDCap.)
   */
  exportCalc?: boolean;

  // Descriptive — bloco informativo, sem input
  content?: string | ((ctx: FormContext) => string);

  // Identificador de seção. Usado pra agrupar visualmente os campos.
  section?: string;

  /** Placeholder. */
  placeholder?: string;

  /** URL externa de ajuda (ex.: guia AIS no Google Docs). Em headers vira um botão "Como fazer". */
  helpUrl?: string;
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
