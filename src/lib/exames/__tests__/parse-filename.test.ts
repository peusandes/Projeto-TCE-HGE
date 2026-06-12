import { describe, it, expect } from "vitest";
import { parseFilename } from "../parse-filename";

const HOJE = new Date(2026, 5, 12); // 12/06/2026

describe("parseFilename", () => {
  it("nome + data DD_MM, ano inferido do envio", () => {
    const r = parseFilename("Joao de Freitas 12_05.pdf", HOJE);
    expect(r.nome).toBe("Joao de Freitas");
    expect(r.dataIso).toBe("2026-05-12");
    expect(r.anoInferido).toBe(true);
  });

  it("data no futuro sem ano → assume ano anterior", () => {
    const r = parseFilename("Maria Silva 20_12.pdf", HOJE);
    expect(r.dataIso).toBe("2025-12-20");
  });

  it("ano explícito de 4 dígitos", () => {
    const r = parseFilename("Robson de Jesus 18_05_2026.pdf", HOJE);
    expect(r.nome).toBe("Robson de Jesus");
    expect(r.dataIso).toBe("2026-05-18");
    expect(r.anoInferido).toBe(false);
  });

  it("ano de 2 dígitos", () => {
    const r = parseFilename("Ana 03_01_25.pdf", HOJE);
    expect(r.dataIso).toBe("2025-01-03");
  });

  it("aceita separadores . e -", () => {
    expect(parseFilename("Carlos 07-06.pdf", HOJE).dataIso).toBe("2026-06-07");
    expect(parseFilename("Carlos 07.06.pdf", HOJE).dataIso).toBe("2026-06-07");
  });

  it("sem data no nome → dataIso null", () => {
    const r = parseFilename("Exame Fulano.pdf", HOJE);
    expect(r.dataIso).toBeNull();
    expect(r.nome).toBe("Exame Fulano");
  });

  it("data impossível (31/02) → null", () => {
    expect(parseFilename("Fulano 31_02.pdf", HOJE).dataIso).toBeNull();
  });
});
