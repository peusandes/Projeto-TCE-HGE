import type { InstrumentDef } from "../types";
import {
  SIM_NAO,
  LOCAL_FRATURA,
  TIPOS_HEMORRAGIA,
  LOCAL_HIP,
  HEMISFERIO,
  CISTERNAS,
} from "../options";
import { isYesField, checkboxHas, and } from "../branching";

export const NEUROIMAGEM_ADMISSAO: InstrumentDef = {
  id: "neuroimagem_admissao",
  title: "Neuroimagem da admissão",
  shortTitle: "Neuroimagem",
  phase: 1,
  fields: [
    {
      name: "data_do_exame",
      label: "Data do exame",
      type: "date",
      note: "Sempre da primeira TC de crânio.",
    },
    {
      name: "fratura_cranio",
      label: "Fratura de crânio",
      type: "yesno",
      choices: SIM_NAO,
    },
    {
      name: "local_fratura",
      label: "Local da fratura",
      type: "checkbox",
      choices: LOCAL_FRATURA,
      showWhen: isYesField("fratura_cranio"),
    },
    {
      name: "hemorragia_intracraniana",
      label: "Hemorragia intracraniana",
      type: "yesno",
      choices: SIM_NAO,
    },
    {
      name: "tipos_hemorragia",
      label: "Tipos de hemorragia",
      type: "checkbox",
      choices: TIPOS_HEMORRAGIA,
      note: "CRASH.",
      showWhen: isYesField("hemorragia_intracraniana"),
    },
    {
      name: "local_hip",
      label: "Local do hematoma intraparenquimatoso",
      type: "checkbox",
      choices: LOCAL_HIP,
      showWhen: and(isYesField("hemorragia_intracraniana"), checkboxHas("tipos_hemorragia", 3)),
    },
    {
      name: "hemisferio_acometido",
      label: "Hemisfério acometido",
      type: "checkbox",
      choices: HEMISFERIO,
      showWhen: isYesField("hemorragia_intracraniana"),
    },
    {
      name: "espessura_max_hematoma",
      label: "Espessura máxima do hematoma (cm)",
      type: "number",
      min: 0,
      unit: "cm",
      showWhen: isYesField("hemorragia_intracraniana"),
    },
    {
      name: "herniacao",
      label: "Herniação cerebral",
      type: "yesno",
      choices: SIM_NAO,
    },
    {
      name: "hidrocefalia",
      label: "Hidrocefalia",
      type: "yesno",
      choices: SIM_NAO,
    },
    {
      name: "cisternas_da_base",
      label: "Cisternas da base",
      type: "radio",
      choices: CISTERNAS,
    },
    {
      name: "desvio",
      label: "Desvio de linha média",
      type: "yesno",
      choices: SIM_NAO,
      required: true,
      note: "CRASH.",
    },
    {
      name: "desvio_tamanho",
      label: "Tamanho do desvio (mm)",
      type: "number",
      min: 0,
      unit: "mm",
      showWhen: isYesField("desvio"),
    },
  ],
};
