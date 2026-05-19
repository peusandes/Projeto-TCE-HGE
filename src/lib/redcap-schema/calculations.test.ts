import { describe, it, expect } from "vitest";
import {
  calcIdade,
  calcTempoTraumaPorta,
  calcGcs,
  calcGcsMinusP,
  calcISS,
  calcTempoTraumaCirurgia,
  calcTempoCirurgico,
} from "./calculations";
import type { FormContext } from "./types";

function makeCtx(
  data: Record<string, unknown> = {},
  others: Record<string, Record<string, unknown>> = {},
): FormContext {
  return {
    data: data as FormContext["data"],
    others: others as FormContext["others"],
    paciente: { id: "p1", nome: "Teste" },
  };
}

describe("calcIdade", () => {
  it("retorna a idade completa entre nascimento e data de coleta", () => {
    const ctx = makeCtx({ data_nascimento: "1990-05-10", data_coleta: "2026-05-19" });
    expect(calcIdade(ctx)).toBe(36);
  });

  it("conta um ano a menos antes do aniversário", () => {
    const ctx = makeCtx({ data_nascimento: "1990-05-10", data_coleta: "2026-05-09" });
    expect(calcIdade(ctx)).toBe(35);
  });

  it("retorna null se faltar alguma data", () => {
    expect(calcIdade(makeCtx({ data_coleta: "2026-05-10" }))).toBeNull();
    expect(calcIdade(makeCtx({ data_nascimento: "1990-05-10" }))).toBeNull();
  });

  it("aceita data via others (de dados_demograficos)", () => {
    const ctx = makeCtx(
      {},
      { dados_demograficos: { data_nascimento: "1995-01-01", data_coleta: "2026-01-01" } },
    );
    expect(calcIdade(ctx)).toBe(31);
  });
});

describe("calcGcs", () => {
  it("soma o trio ocular+verbal+motor", () => {
    const ctx = makeCtx({ ocular_admissao: 4, verbal_admissao: 5, motor_admissao: 6 });
    expect(calcGcs(ctx)).toBe(15);
  });

  it("retorna null se faltar qualquer componente", () => {
    expect(calcGcs(makeCtx({ ocular_admissao: 4, verbal_admissao: 5 }))).toBeNull();
  });

  it("aceita strings numéricas (campo type=text)", () => {
    const ctx = makeCtx({ ocular_admissao: "1", verbal_admissao: "1", motor_admissao: "1" });
    expect(calcGcs(ctx)).toBe(3);
  });
});

describe("calcGcsMinusP", () => {
  it("subtrai (2 - pupilas) do GCS", () => {
    // GCS=15, p=2 (ambas reativas) → 15 - 0 = 15
    const ctx = makeCtx({
      ocular_admissao: 4,
      verbal_admissao: 5,
      motor_admissao: 6,
      pupilas_admissao: 2,
    });
    expect(calcGcsMinusP(ctx)).toBe(15);
  });

  it("uma pupila reativa subtrai 1", () => {
    const ctx = makeCtx({
      ocular_admissao: 4,
      verbal_admissao: 5,
      motor_admissao: 6,
      pupilas_admissao: 1,
    });
    expect(calcGcsMinusP(ctx)).toBe(14);
  });

  it("nenhuma reativa subtrai 2", () => {
    const ctx = makeCtx({
      ocular_admissao: 3,
      verbal_admissao: 4,
      motor_admissao: 5,
      pupilas_admissao: 0,
    });
    expect(calcGcsMinusP(ctx)).toBe(10);
  });

  it("nunca retorna menos que 1", () => {
    const ctx = makeCtx({
      ocular_admissao: 1,
      verbal_admissao: 1,
      motor_admissao: 1,
      pupilas_admissao: 0,
    });
    expect(calcGcsMinusP(ctx)).toBe(1);
  });
});

describe("calcISS", () => {
  it("soma dos quadrados dos 3 maiores AIS", () => {
    // AIS: 5,4,3,2,1,0 → top3=5,4,3 → 25+16+9=50
    const ctx = makeCtx({
      cabeca_pescoco_ais: 5,
      face_ais: 4,
      torax_ais: 3,
      abdome_ais: 2,
      extremidades_ais: 1,
      geral_ais: 0,
    });
    expect(calcISS(ctx)).toBe(50);
  });

  it("qualquer AIS=6 vira 75 automático", () => {
    const ctx = makeCtx({
      cabeca_pescoco_ais: 6,
      face_ais: 3,
      torax_ais: 2,
    });
    expect(calcISS(ctx)).toBe(75);
  });

  it("retorna null se nenhum AIS preenchido", () => {
    expect(calcISS(makeCtx({}))).toBeNull();
  });

  it("com apenas 1 ou 2 AIS, soma os quadrados existentes", () => {
    expect(calcISS(makeCtx({ torax_ais: 3 }))).toBe(9);
    expect(calcISS(makeCtx({ torax_ais: 3, abdome_ais: 4 }))).toBe(9 + 16);
  });
});

describe("calcTempoTraumaPorta", () => {
  it("retorna a diferença em horas (decimal arredondado a 1 casa)", () => {
    const ctx = makeCtx({
      hora_trauma: "2026-05-19T08:00:00",
      hora_admissao: "2026-05-19T10:30:00",
    });
    expect(calcTempoTraumaPorta(ctx)).toBe(2.5);
  });

  it("retorna null se faltar alguma das datas", () => {
    expect(
      calcTempoTraumaPorta(makeCtx({ hora_trauma: "2026-05-19T08:00:00" })),
    ).toBeNull();
  });
});

describe("calcTempoTraumaCirurgia", () => {
  it("usa hora_trauma de historia_admissao via others", () => {
    const ctx = makeCtx(
      { hora_inicio_cirurgia: "2026-05-19T12:00:00" },
      { historia_admissao: { hora_trauma: "2026-05-19T08:00:00" } },
    );
    expect(calcTempoTraumaCirurgia(ctx)).toBe(4);
  });
});

describe("calcTempoCirurgico", () => {
  it("retorna duração em minutos", () => {
    const ctx = makeCtx({
      hora_inicio_cirurgia: "2026-05-19T12:00:00",
      hora_termino_cirurgia: "2026-05-19T14:30:00",
    });
    expect(calcTempoCirurgico(ctx)).toBe(150);
  });
});
