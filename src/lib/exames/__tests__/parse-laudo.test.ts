import { describe, it, expect } from "vitest";
import { parseLaudo } from "../parse-laudo";

// Texto representativo extraído dos PDFs padrão do HGE (ex1/ex2/ex3 da conversa).
// Mantém os rótulos e colunas reais, incluindo os "leaders" pontilhados.

const EX1 = `
PACIENTE: PAULO RICARDO COSTA SANTOS
NASCIMENTO:10/08/1999 CPF:
SEXO:M REG.: 2026024895
PROCEDENCIA: UTI 02
MEDICO: GABRIELA TORRES
PROTOCOLO: 2605150360 CADASTRO:15/05/2026-19:14:32
HEMOGRAMA COMPLETO
Hemácias...................................: 5,2 x106/uL 3,9 a 5,3 x106/mm3 4,3 a 6,0 x106/uL3
Hemoglobina................................: 15,2 g/dL 12,0 a 16,0 g/dL 13,5 a 18,0 g/dL
Hematócrito................................: 43,0 % 35,0 a 47,0% 41,0 a 54,0 %
Leucócitos Totais...........................: 9300 mm³ 3.600 - 11.000 mm³
Neutrófilos em Bastão.......................: 0 0 - 5 0 - 500
Neutrófilos Segmentados.....................: 68,1 6333 40 - 78 1.800 - 7.000
Eosinófilos.................................: 0,2 19 1 - 5 0 - 700
Linfócitos..................................: 21,7 2018 20 - 5 800 - 4.500
Linfócitos Atípicos.........................: 0 0 - 4 0 - 100
Contagem de Plaquetas....................... : 193 mil/uL 150 a 450 mil/uL
GASOMETRIA VENOSA
HCO3 -act 24,2 mmol/L 22 - 28
Na+ 137,1 mmol/L 135 - 145
K+ 3,37 mmol/L 3.5 - 4.5
Ca2+ 1,14 mmol/L 1.15 - 1.30
Glu 88 mg/dL 63 - 108
Lac 1,31 mmol/L 0.5 - 2.2
TEMPO DE PROTROMBINA
Atividade Protrombínica: 80 a 120 %
RNI (Relação Normatizada Internacional): 0,80 a 1,25
ATIVIDADE PROTROMBÍNICA .......................................: 81%
RNI ...........................................................: 1,15
TTPA :34,0 segundo
URÉIA .........................................................: 22 mg/dL
CREATININA .............................................. :0,9 mg/dL
SÓDIO SERICO ..................................................: 136 mmol/L
POTÁSSIO ...................................................... : 3,5 mmol/L
MAGNÉSIO ...................................................... : 1,8 mg/dL
CREATINOFOSFOQUINASE ..........................................: 1526,0 U/L
ATENÇÃO: ... que possam correlacionar. CONSULTE SEU MÉDICO SEMPRE.
Impresso em :21/05/2026 às 15:56:06
`;

const EX2 = `
PACIENTE: PAULO RICARDO COSTA SANTOS
NASCIMENTO:10/08/1999 CPF: 8044664599
SEXO:M REG.: 19440957
PROCEDENCIA: UI1
MEDICO: CATIA CALDAS FERNANDES
HEMOGRAMA COMPLETO
Hemácias...................................: 4,6 x106/uL 3,9 a 5,3 x106/mm3 4,3 a 6,0 x106/uL3
Hemoglobina................................: 13,5 g/dL 12,0 a 16,0 g/dL 13,5 a 18,0 g/dL
Hematócrito................................: 38,6 % 35,0 a 47,0% 41,0 a 54,0 %
Leucócitos Totais...........................: 8900 mm³ 3.600 - 11.000 mm³
Neutrófilos em Bastão.......................: 0 0 - 5 0 - 500
Neutrófilos Segmentados.....................: 78,5 6987 40 - 78 1.800 - 7.000
Eosinófilos.................................: 0,0 0 1 - 5 0 - 700
Linfócitos..................................: 15,1 1344 20 - 5 800 - 4.500
Contagem de Plaquetas....................... : 435 mil/uL 150 a 450 mil/uL
URÉIA .........................................................: 32 mg/dL
CREATININA .............................................. :0,8 mg/dL
SÓDIO SERICO ..................................................: 142 mmol/L
POTÁSSIO ...................................................... : 4,3 mmol/L
MAGNÉSIO ...................................................... : 2,0 mg/dL
`;

const EX3 = `
PACIENTE: ROBSON DE JESUS CERQUEIRA
NASCIMENTO:04/09/1970 CPF:
SEXO:M REG.: 2026022352
PROCEDENCIA: UI3
MEDICO: ERLON ANDRADE
HEMOGRAMA COMPLETO
Hemácias...................................: 3,0 x106/uL 3,9 a 5,3 x106/mm3 4,3 a 6,0 x106/uL3
Hemoglobina................................: 9,2 g/dL 12,0 a 16,0 g/dL 13,5 a 18,0 g/dL
Hematócrito................................: 28,7 % 35,0 a 47,0% 41,0 a 54,0 %
Leucócitos Totais...........................: 13400 mm³ 3.600 - 11.000 mm³
Neutrófilos em Bastão.......................: 0 0 - 5 0 - 500
Neutrófilos Segmentados.....................: 85,6 11470 40 - 78 1.800 - 7.000
Eosinófilos.................................: 1,4 188 1 - 5 0 - 700
Linfócitos..................................: 5,8 777 20 - 5 800 - 4.500
Contagem de Plaquetas....................... : 510 mil/uL 150 a 450 mil/uL
URÉIA .........................................................: 69 mg/dL
CREATININA .............................................. :0,4 mg/dL
SÓDIO SERICO ..................................................: 146 mmol/L
POTÁSSIO ...................................................... : 4,2 mmol/L
CÁLCIO ........................................................: 8,2 mg/dL
MAGNÉSIO ...................................................... : 2,8 mg/dL
`;

describe("parseLaudo — ex1 (Paulo, UTI, gaso + coagulo + CPK)", () => {
  const r = parseLaudo(EX1);

  it("identifica paciente, nascimento e local", () => {
    expect(r.pacientePdf).toBe("PAULO RICARDO COSTA SANTOS");
    expect(r.nascimentoIso).toBe("1999-08-10");
    expect(r.procedencia).toBe("UTI 02");
    expect(r.localPct).toBe(1); // UTI
  });

  it("eritrograma como impresso (ponto decimal)", () => {
    expect(r.dados.hemacias_seg).toBe("5.2");
    expect(r.dados.hemoglobina_seg).toBe("15.2");
    expect(r.dados.hematocrito_seg).toBe("43.0");
  });

  it("leucograma absoluto ÷ 1000", () => {
    expect(r.dados.leucograma_total_seg).toBe("9.3");
    expect(r.dados.neutrofilos_seg).toBe("6.333");
    expect(r.dados.eosinofilos_seg).toBe("0.019");
    expect(r.dados.linfocitos_seg).toBe("2.018");
    expect(r.dados.bastoes_seg).toBe("0");
  });

  it("plaquetas em mil/µL", () => {
    expect(r.dados.plaquetas_seg).toBe("193");
  });

  it("coagulograma: TTPa e RNI do resultado (não a referência); TP ausente", () => {
    expect(r.dados.ttpa_seg).toBe("34.0");
    expect(r.dados.rni_seg).toBe("1.15");
    expect(r.dados.tp_seg).toBeUndefined();
  });

  it("gaso: bicarbonato e lactato; sódio do sérico (136), não da gaso (137,1)", () => {
    expect(r.dados.bicarbonato_seg).toBe("24.2");
    expect(r.dados.lactato_seg).toBe("1.31");
    expect(r.dados.sodio_seg).toBe("136");
  });

  it("séricos: creatinina, ureia, potássio, CPK; sem cálcio (não reportado)", () => {
    expect(r.dados.creatinina_seg).toBe("0.9");
    expect(r.dados.ureia_seg).toBe("22");
    expect(r.dados.potassio_seg).toBe("3.5");
    expect(r.dados.cpk_seg).toBe("1526.0");
    expect(r.dados.calcio_seg).toBeUndefined();
  });

  it("HGT nunca é preenchido", () => {
    expect(r.dados.hgt_seg).toBeUndefined();
  });
});

describe("parseLaudo — ex2 (Paulo, UI1, sem gaso/coagulo)", () => {
  const r = parseLaudo(EX2);

  it("local = enfermaria", () => {
    expect(r.localPct).toBe(2);
  });

  it("hemograma + séricos", () => {
    expect(r.dados.hemacias_seg).toBe("4.6");
    expect(r.dados.hemoglobina_seg).toBe("13.5");
    expect(r.dados.hematocrito_seg).toBe("38.6");
    expect(r.dados.leucograma_total_seg).toBe("8.9");
    expect(r.dados.neutrofilos_seg).toBe("6.987");
    expect(r.dados.eosinofilos_seg).toBe("0");
    expect(r.dados.linfocitos_seg).toBe("1.344");
    expect(r.dados.plaquetas_seg).toBe("435");
    expect(r.dados.creatinina_seg).toBe("0.8");
    expect(r.dados.ureia_seg).toBe("32");
    expect(r.dados.sodio_seg).toBe("142");
    expect(r.dados.potassio_seg).toBe("4.3");
  });

  it("sem coagulograma, gaso, cálcio ou CPK → ausentes", () => {
    expect(r.dados.ttpa_seg).toBeUndefined();
    expect(r.dados.rni_seg).toBeUndefined();
    expect(r.dados.bicarbonato_seg).toBeUndefined();
    expect(r.dados.lactato_seg).toBeUndefined();
    expect(r.dados.calcio_seg).toBeUndefined();
    expect(r.dados.cpk_seg).toBeUndefined();
  });
});

describe("parseLaudo — ex3 (Robson, UI3, com cálcio sérico)", () => {
  const r = parseLaudo(EX3);

  it("paciente e local", () => {
    expect(r.pacientePdf).toBe("ROBSON DE JESUS CERQUEIRA");
    expect(r.nascimentoIso).toBe("1970-09-04");
    expect(r.localPct).toBe(2);
  });

  it("hemograma + leucograma", () => {
    expect(r.dados.hemacias_seg).toBe("3.0");
    expect(r.dados.hemoglobina_seg).toBe("9.2");
    expect(r.dados.hematocrito_seg).toBe("28.7");
    expect(r.dados.leucograma_total_seg).toBe("13.4");
    expect(r.dados.neutrofilos_seg).toBe("11.47");
    expect(r.dados.eosinofilos_seg).toBe("0.188");
    expect(r.dados.linfocitos_seg).toBe("0.777");
    expect(r.dados.plaquetas_seg).toBe("510");
  });

  it("séricos incluindo cálcio (8.2)", () => {
    expect(r.dados.creatinina_seg).toBe("0.4");
    expect(r.dados.ureia_seg).toBe("69");
    expect(r.dados.sodio_seg).toBe("146");
    expect(r.dados.calcio_seg).toBe("8.2");
    expect(r.dados.potassio_seg).toBe("4.2");
  });
});
