import type { InstrumentDef } from "../types";
import {
  SIM_NAO,
  TIPO_CIRURGIA,
  DRENAGEM,
  CARATER_CIRURGIA,
} from "../options";
import { isYesField } from "../branching";
import { calcTempoTraumaCirurgia, calcTempoCirurgico } from "../calculations";

export const DADOS_DE_CIRURGIA: InstrumentDef = {
  id: "dados_de_cirurgia",
  title: "Dados de cirurgia",
  shortTitle: "Cirurgia",
  phase: 2,
  fields: [
    {
      name: "necessidade_cirurgia",
      label: "Realizou cirurgia?",
      type: "yesno",
      choices: SIM_NAO,
      required: true,
    },

    {
      name: "tipo_cirurgia",
      label: "Tipo de cirurgia",
      type: "radio",
      choices: TIPO_CIRURGIA,
      showWhen: isYesField("necessidade_cirurgia"),
    },
    {
      name: "drenagem",
      label: "Drenagem do hematoma",
      type: "radio",
      choices: DRENAGEM,
      showWhen: isYesField("necessidade_cirurgia"),
    },
    {
      name: "carater_cirurgia",
      label: "Caráter da cirurgia",
      type: "radio",
      choices: CARATER_CIRURGIA,
      showWhen: isYesField("necessidade_cirurgia"),
    },

    {
      name: "hora_anestesia",
      label: "Hora da anestesia",
      type: "datetime",
      showWhen: isYesField("necessidade_cirurgia"),
    },
    {
      name: "hora_inicio_cirurgia",
      label: "Hora de início da cirurgia",
      type: "datetime",
      showWhen: isYesField("necessidade_cirurgia"),
    },
    {
      name: "hora_termino_cirurgia",
      label: "Hora de término da cirurgia",
      type: "datetime",
      showWhen: isYesField("necessidade_cirurgia"),
    },

    {
      name: "tempo_trauma_cirurgia",
      label: "Tempo trauma → cirurgia",
      type: "calc",
      calc: calcTempoTraumaCirurgia,
      calcLabel:
        "diferença entre hora do trauma (Histórico da admissão) e início da cirurgia",
      calcUnit: "h",
      showWhen: isYesField("necessidade_cirurgia"),
    },
    {
      name: "tempo_cirurgico",
      label: "Tempo cirúrgico",
      type: "calc",
      calc: calcTempoCirurgico,
      calcLabel: "duração entre início e término da cirurgia",
      calcUnit: "min",
      showWhen: isYesField("necessidade_cirurgia"),
    },

    {
      name: "transfusao_intraop",
      label: "Necessidade de transfusão intraoperatória",
      type: "yesno",
      choices: SIM_NAO,
      showWhen: isYesField("necessidade_cirurgia"),
    },
    {
      name: "complicacoes",
      label: "Complicações",
      type: "yesno",
      choices: SIM_NAO,
      showWhen: isYesField("necessidade_cirurgia"),
    },
    {
      name: "quais_complicacoes",
      label: "Quais complicações?",
      type: "text",
      showWhen: isYesField("complicacoes"),
    },
    {
      name: "dreno_pos_op",
      label: "Necessidade de dreno pós-operatório",
      type: "yesno",
      choices: SIM_NAO,
      showWhen: isYesField("necessidade_cirurgia"),
    },
  ],
};
