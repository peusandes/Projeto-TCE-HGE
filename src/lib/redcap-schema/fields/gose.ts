import type { FormContext, InstrumentDef, InstrumentId } from "../types";
import { GOSE, SIM_NAO, CENTRO } from "../options";
import { isYesField, not, eq } from "../branching";

type Window = 30 | 90 | 180;

const centroLabel = (ctx: FormContext): string => {
  const c = ctx.others.status_de_admisso?.centro;
  const found = CENTRO.find((o) => o.value === c);
  return found ? `Centro: ${found.label}` : "Centro: —";
};

const telefonesContent = (ctx: FormContext): string => {
  const d = ctx.others.dados_demograficos ?? {};
  const t1 = d.contato_1 ?? "—";
  const t2 = d.contato_2 ?? "—";
  const t3 = d.contato_3 ?? "—";
  return `📞 Telefones cadastrados:\n1: ${t1}\n2: ${t2}\n3: ${t3}`;
};

/** Factory: gera o instrumento gose_{30,90,180}d. */
export function buildGoseInstrument(window: Window): InstrumentDef {
  const suf = `${window}d`;
  // O nome do campo "novo sangramento" varia de janela pra janela (legado no REDCap)
  const novoSangramentoName =
    window === 30 ? "novo_sangramento" : `novo_sangramento_${suf}`;

  return {
    id: `gose_${suf}` as InstrumentId,
    title: `GOS-E ${window} dias`,
    shortTitle: `GOS-E ${suf}`,
    phase: 4,
    fields: [
      {
        name: `pesquisad_${suf}`,
        label: "Ligantes",
        type: "text",
        required: true,
      },
      {
        name: `data_${suf}`,
        label: "Data da coleta",
        type: "date",
        required: true,
      },
      {
        name: `_d_telefones_${suf}`,
        label: "Telefones cadastrados",
        type: "descriptive",
        content: telefonesContent,
      },
      {
        name: `centro_pipe_${suf}`,
        label: "Centro",
        type: "descriptive",
        content: centroLabel,
      },
      {
        name: `fluxograma_gose_${suf}`,
        label: "Fluxograma GOS-E",
        type: "descriptive",
        content:
          "Use o fluxograma GOS-E como guia clínico. Avalie nesta ordem: independência, atividades de trabalho/lazer, relações sociais, retorno ao trabalho, vida em casa. (Imagem do fluxograma será adicionada aqui em breve.)",
      },
      {
        name: `gose_${suf}`,
        label: "Glasgow Outcome Scale-Extended (GOS-E)",
        type: "radio",
        choices: GOSE,
        required: true,
      },
      {
        name: `justif_gose_${suf}`,
        label: "Justificativa do GOS-E",
        type: "text",
      },
      // Aparecem só se paciente NÃO morreu (gose != 1)
      {
        name: `crise_epi_${suf}`,
        label: "Crise epiléptica",
        type: "yesno",
        choices: SIM_NAO,
        showWhen: (ctx) => {
          const v = ctx.data[`gose_${suf}`];
          return v !== null && v !== undefined && v !== "" && v !== 1 && v !== "1";
        },
      },
      {
        name: novoSangramentoName,
        label: "Novo episódio de sangramento intracraniano?",
        type: "yesno",
        choices: SIM_NAO,
        showWhen: (ctx) => {
          const v = ctx.data[`gose_${suf}`];
          return v !== null && v !== undefined && v !== "" && v !== 1 && v !== "1";
        },
      },
    ],
  };
}

export const GOSE_30D = buildGoseInstrument(30);
export const GOSE_90D = buildGoseInstrument(90);
export const GOSE_180D = buildGoseInstrument(180);

// Suprime warnings — helpers importados mas não usados diretamente aqui
void isYesField; void not; void eq;
