import type { InstrumentDef } from "../types";
import {
  SIM_NAO,
  ORIGEM_INTERNACAO,
  MECANISMO_TRAUMA,
  ENTORPECENTES_TIPO,
} from "../options";
import { isYesField, checkboxHas } from "../branching";
import {
  calcTempoTraumaPorta,
  calcGcs,
  calcGcsMinusP,
  calcISS,
} from "../calculations";

export const HISTORIA_ADMISSAO: InstrumentDef = {
  id: "historia_admissao",
  title: "Histórico da admissão",
  shortTitle: "Admissão",
  phase: 1,
  fields: [
    {
      name: "hora_admissao",
      label: "Hora de admissão",
      type: "datetime",
      note: "Olhar o primeiro prontuário no sistema.",
    },
    {
      name: "hora_trauma",
      label: "Hora do trauma",
      type: "datetime",
      note: "Olhar prontuários mais antigos, preferencialmente médicos.",
    },
    {
      name: "tempo_trauma_porta",
      label: "Tempo trauma → porta",
      type: "calc",
      calc: calcTempoTraumaPorta,
      calcLabel: "diferença entre hora do trauma e hora de admissão",
      calcUnit: "h",
    },
    {
      name: "origem_internacao",
      label: "Origem da internação",
      type: "radio",
      choices: ORIGEM_INTERNACAO,
    },
    {
      name: "mecanismo_trauma",
      label: "Mecanismo do trauma",
      type: "checkbox",
      choices: MECANISMO_TRAUMA,
      note: "Marque todas que se encaixam.",
    },
    {
      name: "qual_mecanismo",
      label: "Qual outro mecanismo?",
      type: "text",
      showWhen: checkboxHas("mecanismo_trauma", 10),
    },
    {
      name: "interconsulta",
      label: "Interconsulta",
      type: "yesno",
      choices: SIM_NAO,
      note: "Olhar lista de interconsulta dos últimos 4 dias.",
    },
    {
      name: "tempo_interconsulta",
      label: "Tempo até interconsulta (h)",
      type: "number",
      min: 0,
      showWhen: isYesField("interconsulta"),
      unit: "h",
    },
    {
      name: "intubacao",
      label: "Intubação",
      type: "yesno",
      choices: SIM_NAO,
    },
    {
      name: "entorpecentes",
      label: "Uso de entorpecentes",
      type: "yesno",
      choices: SIM_NAO,
    },
    {
      name: "tipo_entorpecente",
      label: "Tipo de entorpecente",
      type: "checkbox",
      choices: ENTORPECENTES_TIPO,
      showWhen: isYesField("entorpecentes"),
    },

    // AIS
    {
      name: "_h_ais",
      label: "Abbreviated Injury Scale (AIS)",
      type: "descriptive",
      section: "header",
      content: "",
      helpUrl: "https://docs.google.com/document/d/1LnXTBE50BYgQ6gM2FEe_-AbhOGOqYzHeUrPbZBJXdug/edit?usp=sharing",
    },
    { name: "geral_ais",          label: "AIS geral",                type: "number", min: 0, max: 6, integer: true, required: true },
    { name: "cabeca_pescoco_ais", label: "AIS cabeça/pescoço",       type: "number", min: 0, max: 6, integer: true, required: true },
    { name: "face_ais",           label: "AIS face",                 type: "number", min: 0, max: 6, integer: true, required: true },
    { name: "torax_ais",          label: "AIS tórax",                type: "number", min: 0, max: 6, integer: true, required: true },
    { name: "abdome_ais",         label: "AIS abdome",               type: "number", min: 0, max: 6, integer: true, required: true },
    { name: "extremidades_ais",   label: "AIS extremidades",         type: "number", min: 0, max: 6, integer: true, required: true },
    {
      name: "iss",
      label: "ISS — Injury Severity Score",
      type: "calc",
      calc: calcISS,
      calcLabel: "Soma dos quadrados dos 3 maiores AIS. Se qualquer AIS = 6, ISS = 75.",
      required: true,
    },

    // Neuro
    { name: "_h_neuro", label: "Avaliação neurológica", type: "descriptive", section: "header", content: "" },
    { name: "ocular_admissao",  label: "Glasgow — ocular",  type: "number", min: 1, max: 4, integer: true, required: true },
    { name: "verbal_admissao",  label: "Glasgow — verbal",  type: "number", min: 1, max: 6, integer: true, required: true },
    { name: "motor_admissao",   label: "Glasgow — motor",   type: "number", min: 1, max: 6, integer: true, required: true },
    { name: "pupilas_admissao", label: "Pupilas reativas",  type: "number", min: 0, max: 2, integer: true, required: true, note: "Quantidade de pupilas REATIVAS." },
    {
      name: "gcs_admissao",
      label: "GCS — total",
      type: "calc",
      calc: calcGcs,
      calcLabel: "ocular + verbal + motor",
    },
    {
      name: "gcs_minus_p_admissao",
      label: "GCS−P",
      type: "calc",
      calc: calcGcsMinusP,
      calcLabel: "GCS - (2 - pupilas reativas)",
    },

    // Monitorização
    { name: "_h_monitor", label: "Monitorização", type: "descriptive", section: "header", content: "" },
    { name: "pas_adm",         label: "PAS (mmHg)",       type: "number", min: 0, integer: true, required: true, unit: "mmHg" },
    { name: "pad_adm",         label: "PAD (mmHg)",       type: "number", min: 0, integer: true, required: true, unit: "mmHg" },
    { name: "fc_adm",          label: "FC (bpm)",         type: "number", min: 0, integer: true, required: true, unit: "bpm" },
    { name: "spo2_adm",        label: "SpO₂ (%)",         type: "number", min: 0, max: 100, integer: true, required: true, unit: "%" },
    { name: "fr_adm",          label: "FR (irpm)",        type: "number", min: 0, integer: true, required: true, unit: "irpm" },
    { name: "temperatura_adm", label: "Temperatura (°C)", type: "number", min: 25, max: 45, required: true, unit: "°C" },
  ],
};
