import type { InstrumentDef } from "../types";
import { SIM_NAO, NEOPLASIA } from "../options";
import { isYesField, eq } from "../branching";

export const HISTORIA_PREGRESSA: InstrumentDef = {
  id: "historia_pregressa",
  title: "História médica pregressa",
  shortTitle: "História pregressa",
  phase: 1,
  fields: [
    { name: "has", label: "HAS — Hipertensão arterial sistêmica", type: "yesno", choices: SIM_NAO },
    { name: "diabetes", label: "Diabetes", type: "yesno", choices: SIM_NAO },
    { name: "dislipidemia", label: "Dislipidemia", type: "yesno", choices: SIM_NAO },
    { name: "anticoagulante", label: "Uso prévio de anticoagulante", type: "yesno", choices: SIM_NAO },
    {
      name: "historico_epilepsia",
      label: "Histórico de epilepsia",
      type: "yesno",
      choices: SIM_NAO,
      required: true,
    },
    { name: "avc_ait", label: "AVC / AIT prévio", type: "yesno", choices: SIM_NAO },
    {
      name: "historico_tce",
      label: "Histórico de TCE nos últimos 3 meses?",
      type: "yesno",
      choices: SIM_NAO,
    },
    {
      name: "internacao_prev",
      label: "Com internação?",
      type: "yesno",
      choices: SIM_NAO,
      showWhen: isYesField("historico_tce"),
    },
    {
      name: "neoplasia",
      label: "Neoplasia",
      type: "radio",
      choices: NEOPLASIA,
    },
    {
      name: "qual_neoplasia",
      label: "Qual neoplasia?",
      type: "text",
      showWhen: eq("neoplasia", 3),
    },
    {
      name: "tabagismo",
      label: "Tabagismo",
      type: "yesno",
      choices: SIM_NAO,
    },
    {
      name: "abstemio_tabagismo",
      label: "Atualmente abstêmio?",
      type: "yesno",
      choices: SIM_NAO,
      showWhen: isYesField("tabagismo"),
    },
    {
      name: "etilismo",
      label: "Etilismo",
      type: "yesno",
      choices: SIM_NAO,
    },
    {
      name: "abstemio_etilismo",
      label: "Atualmente abstêmio?",
      type: "yesno",
      choices: SIM_NAO,
      showWhen: isYesField("etilismo"),
    },
  ],
};
