import { describe, it, expect } from "vitest";
import { classificarLocal, inferirSetor } from "../local";

describe("classificarLocal (local_pct do seguimento)", () => {
  it("UTI / UI / vazio", () => {
    expect(classificarLocal("UTI 02")).toBe(1);
    expect(classificarLocal("UI1")).toBe(2);
    expect(classificarLocal("UI3")).toBe(2);
    expect(classificarLocal("Sala vermelha")).toBe(3);
    expect(classificarLocal("CC")).toBe(4);
    expect(classificarLocal("Qualquer coisa")).toBeNull();
  });
});

describe("inferirSetor (setor do mapa, paciente novo)", () => {
  it("UTI 1/2/3", () => {
    expect(inferirSetor("UTI 01")).toBe("UTI_1");
    expect(inferirSetor("UTI 02")).toBe("UTI_2");
    expect(inferirSetor("UTI 03")).toBe("UTI_3");
  });

  it("UI", () => {
    expect(inferirSetor("UI1")).toBe("UI1");
    expect(inferirSetor("UI2")).toBe("UI2_3");
    expect(inferirSetor("UI3")).toBe("UI2_3");
  });

  it("observação e TRM", () => {
    expect(inferirSetor("OBS 1")).toBe("OBSERVACAO_1");
    expect(inferirSetor("TRM")).toBe("TRM");
  });

  it("não encaixáveis → null (pergunta o setor)", () => {
    expect(inferirSetor("Sala vermelha")).toBeNull();
    expect(inferirSetor("CC")).toBeNull();
    expect(inferirSetor("Ortopedia")).toBeNull();
    expect(inferirSetor(null)).toBeNull();
  });
});
