import type { InstrumentDef } from "../types";
import { SIM_NAO, SITIO_INFECCAO, DESTINO_ALTA } from "../options";
import { isYesField, eq } from "../branching";

export const ALTA: InstrumentDef = {
  id: "alta",
  title: "Alta",
  shortTitle: "Alta",
  phase: 3,
  fields: [
    {
      name: "hora_alta",
      label: "Hora da alta",
      type: "datetime",
      required: true,
      note: "Olhar o último prontuário no sistema.",
    },
    {
      name: "pesquisador",
      label: "Ligantes",
      type: "text",
      required: true,
    },
    {
      name: "obito",
      label: "Óbito",
      type: "yesno",
      choices: SIM_NAO,
    },
    {
      name: "infeccao_intern",
      label: "Infecção durante o internamento",
      type: "yesno",
      choices: SIM_NAO,
    },
    {
      name: "tipo_infecc_intern",
      label: "Tipo de infecção no internamento",
      type: "checkbox",
      choices: SITIO_INFECCAO,
      showWhen: isYesField("infeccao_intern"),
    },
    {
      name: "destino",
      label: "Destino da alta",
      type: "radio",
      choices: DESTINO_ALTA,
      showWhen: eq("obito", 0),
    },
    {
      name: "adicioanr_agenda",
      label: "Paciente já está na agenda de 30, 90 e 180 dias (após o trauma)?",
      type: "yesno",
      choices: SIM_NAO,
      showWhen: eq("obito", 0),
    },
    {
      name: "pendencias_anteriores",
      label: "Pendências anteriores resolvidas?",
      type: "yesno",
      choices: SIM_NAO,
      note: "Verificar se tudo está verde no REDCap.",
    },

    // Lab panel — alta (com nomes legados preservados exatos)
    { name: "_h_sangue_alta", label: "Exame de sangue", type: "descriptive", section: "header", content: "" },
    { name: "hemacias_alta",       label: "Hemácias",       type: "text" },
    { name: "hemoglobinas_alta",   label: "Hemoglobina",    type: "text" },
    { name: "hematocritos_alta",   label: "Hematócrito",    type: "text" },

    { name: "_h_leuco_alta", label: "Leucograma", type: "descriptive", section: "header", content: "" },
    { name: "leucograma_total_alta", label: "Leucograma total", type: "text" },
    { name: "linfocitos_alta",       label: "Linfócitos",       type: "text" },
    { name: "eosinofilos_alta",      label: "Eosinófilos",      type: "text" },
    { name: "neutrofilos_alta",      label: "Neutrófilos segmentados", type: "number", min: 0 },
    { name: "bastoes_alta",          label: "Bastões",           type: "number", min: 0 },

    { name: "_h_coag_alta",  label: "Coagulograma", type: "descriptive", section: "header", content: "" },
    { name: "plaquetas_alta", label: "Plaquetas", type: "text" },
    { name: "tp_alta",        label: "TP",         type: "text" },
    { name: "ttpa_alta",      label: "TTPa",       type: "text" },
    { name: "rni_alta",       label: "RNI",        type: "number", min: 0 },

    { name: "_h_eletro_alta", label: "Eletrólitos / metabólitos", type: "descriptive", section: "header", content: "" },
    {
      name: "primeiro_hgt_dia_alta",
      label: "HGT (primeiro do dia)",
      type: "number",
      required: true,
      min: 0,
      note: "Apenas o primeiro do dia.",
    },
    {
      name: "bicarbonato_variable",
      label: "Bicarbonato",
      type: "number",
      required: true,
      note: "Nome técnico legado no REDCap (bicarbonato_variable).",
    },
    { name: "creatinina_alta", label: "Creatinina", type: "text", required: true },
    { name: "ureia_alta",      label: "Ureia",      type: "text" },
    { name: "sodio_alta",      label: "Sódio",      type: "text" },
    { name: "calcio_alta",     label: "Cálcio",     type: "text" },
    { name: "potassio_alta",   label: "Potássio",   type: "text" },
    { name: "lactato_alta",    label: "Lactato",    type: "text" },
    { name: "cpk_alta",        label: "CPK",        type: "text" },
  ],
};
