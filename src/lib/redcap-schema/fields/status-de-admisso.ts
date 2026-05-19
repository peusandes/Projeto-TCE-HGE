import type { InstrumentDef } from "../types";
import { SIM_NAO, CENTRO } from "../options";

export const STATUS_DE_ADMISSO: InstrumentDef = {
  id: "status_de_admisso",
  title: "Status de admissão",
  shortTitle: "Admissão",
  phase: 1,
  fields: [
    {
      name: "record_id",
      label: "Nome do paciente",
      type: "text",
      required: true,
      note: "Vincula este registro à exportação para o REDCap. Pré-preenchido com o nome do paciente.",
    },
    {
      name: "centro",
      label: "Centro",
      type: "dropdown",
      choices: CENTRO,
      required: true,
      note: "Padrão: Hospital Geral do Estado.",
    },
    {
      name: "tcle_coletado",
      label: "TCLE coletado?",
      type: "yesno",
      choices: SIM_NAO,
      required: true,
      note: "Se não coletado e o paciente ainda está na unidade, lembre de manter este instrumento como Incomplete.",
    },
  ],
};
