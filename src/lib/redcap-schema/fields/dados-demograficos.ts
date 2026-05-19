import type { InstrumentDef } from "../types";
import { SEXO, ETNIA } from "../options";
import { calcIdade } from "../calculations";

export const DADOS_DEMOGRAFICOS: InstrumentDef = {
  id: "dados_demograficos",
  title: "Dados demográficos e de coleta",
  shortTitle: "Demográfico",
  phase: 1,
  fields: [
    {
      name: "nome_ligante",
      label: "Ligantes",
      type: "text",
      required: true,
      identifier: true,
      note: "Quem coletou o dado.",
    },
    {
      name: "data_coleta",
      label: "Data da coleta",
      type: "date",
      required: true,
    },
    { name: "_h_paciente", label: "Dados do paciente", type: "descriptive", section: "header", content: "" },
    {
      name: "contato_1",
      label: "Telefone 1",
      type: "text",
      required: true,
      placeholder: "(00) 00000-0000",
    },
    {
      name: "contato_2",
      label: "Telefone 2",
      type: "text",
      required: true,
      placeholder: "(00) 00000-0000",
    },
    {
      name: "contato_3",
      label: "Telefone 3",
      type: "text",
      required: true,
      note: "Se tiver mais que 3 números, adicionar nos comentários.",
      placeholder: "(00) 00000-0000",
    },
    {
      name: "prontuario",
      label: "Prontuário",
      type: "text",
      required: true,
    },
    {
      name: "data_nascimento",
      label: "Data de nascimento",
      type: "date",
    },
    {
      name: "idade",
      label: "Idade",
      type: "calc",
      calc: calcIdade,
      calcLabel: "anos completos entre nascimento e coleta",
      calcUnit: "anos",
    },
    {
      name: "sexo",
      label: "Sexo",
      type: "radio",
      choices: SEXO,
    },
    {
      name: "etnia",
      label: "Etnia",
      type: "radio",
      choices: ETNIA,
      note: "Como classificado no sistema do HS.",
    },
    {
      name: "procedencia",
      label: "Procedência",
      type: "text",
      note: "Apenas a cidade.",
    },
  ],
};
