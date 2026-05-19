import type { InstrumentDef } from "../types";
import {
  SIM_NAO,
  LOCAL_PCT,
  SITIO_INFECCAO,
  ANTICONVULSIVANTES,
} from "../options";
import { isYesField, checkboxHas, and } from "../branching";

export const SEGUIMENTO: InstrumentDef = {
  id: "seguimento",
  title: "Seguimento",
  shortTitle: "Seguimento",
  phase: 2,
  fields: [
    { name: "data_seg",     label: "Data do seguimento", type: "date",  required: true },
    { name: "ligante_seg",  label: "Ligantes",            type: "text",  required: true },
    {
      name: "local_pct",
      label: "Local do paciente",
      type: "radio",
      choices: LOCAL_PCT,
      required: true,
    },

    {
      name: "infeccao",
      label: "Infecção ou uso de antibióticos?",
      type: "yesno",
      choices: SIM_NAO,
    },
    {
      name: "sitio_infeccao",
      label: "Sítio de infecção",
      type: "checkbox",
      choices: SITIO_INFECCAO,
      showWhen: isYesField("infeccao"),
    },

    {
      name: "uso_de_anticonvulsivante",
      label: "Uso de anticonvulsivante",
      type: "yesno",
      choices: SIM_NAO,
      required: true,
    },
    {
      name: "anticonvulsivante",
      label: "Qual(is) anticonvulsivante(s)?",
      type: "checkbox",
      choices: ANTICONVULSIVANTES,
      required: true,
      showWhen: isYesField("uso_de_anticonvulsivante"),
    },
    {
      name: "qual_anticonvulsivante",
      label: "Especifique o outro anticonvulsivante",
      type: "text",
      showWhen: and(
        isYesField("uso_de_anticonvulsivante"),
        checkboxHas("anticonvulsivante", 5),
      ),
    },

    { name: "iot",          label: "IOT — Intubação orotraqueal", type: "yesno", choices: SIM_NAO },
    { name: "tqt",          label: "TQT — Traqueostomia",          type: "yesno", choices: SIM_NAO },
    { name: "crise_epilep", label: "Crise epiléptica",             type: "yesno", choices: SIM_NAO },

    // Lab panel — seguimento
    { name: "_h_sangue_seg",    label: "Exame de sangue", type: "descriptive", section: "header", content: "" },
    { name: "hemacias_seg",     label: "Hemácias",       type: "text" },
    { name: "hemoglobina_seg",  label: "Hemoglobina",    type: "text" },
    { name: "hematocrito_seg",  label: "Hematócrito",    type: "text" },

    { name: "_h_leuco_seg",       label: "Leucograma", type: "descriptive", section: "header", content: "" },
    { name: "leucograma_total_seg", label: "Leucograma total", type: "text" },
    { name: "linfocitos_seg",       label: "Linfócitos",       type: "text", required: true },
    { name: "eosinofilos_seg",      label: "Eosinófilos",      type: "text" },
    { name: "neutrofilos_seg",      label: "Neutrófilos segmentados", type: "text", required: true },
    { name: "bastoes_seg",          label: "Bastões",           type: "text", required: true },

    { name: "_h_coag_seg",  label: "Coagulograma", type: "descriptive", section: "header", content: "" },
    { name: "plaquetas_seg", label: "Plaquetas", type: "text", required: true },
    { name: "tp_seg",        label: "TP",         type: "text" },
    { name: "ttpa_seg",      label: "TTPa",       type: "text" },
    { name: "rni_seg",       label: "RNI",        type: "text" },

    { name: "_h_eletro_seg", label: "Eletrólitos / metabólitos", type: "descriptive", section: "header", content: "" },
    {
      name: "hgt_seg",
      label: "HGT (primeiro do dia)",
      type: "number",
      required: true,
      min: 0,
      note: "Colete apenas o primeiro HGT do dia.",
    },
    { name: "bicarbonato_seg", label: "Bicarbonato", type: "text", required: true },
    { name: "creatinina_seg",  label: "Creatinina",  type: "text", required: true },
    { name: "ureia_seg",       label: "Ureia",       type: "text" },
    { name: "sodio_seg",       label: "Sódio",       type: "text" },
    { name: "calcio_seg",      label: "Cálcio",      type: "text" },
    { name: "potassio_seg",    label: "Potássio",    type: "text" },
    { name: "lactato_seg",     label: "Lactato",     type: "text" },
    { name: "cpk_seg",         label: "CPK",         type: "text" },
  ],
};
