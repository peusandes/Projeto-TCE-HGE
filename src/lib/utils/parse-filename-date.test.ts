import { describe, it, expect } from "vitest";
import { parseDateFromFilename } from "./parse-filename-date";

describe("parseDateFromFilename", () => {
  it("acha DD_MM no padrão clássico de exame", () => {
    expect(parseDateFromFilename("Hemograma_18_05.pdf", 2026)).toBe("2026-05-18");
    expect(parseDateFromFilename("Lab_03_01.pdf", 2026)).toBe("2026-01-03");
  });

  it("aceita DD-MM e DD.MM", () => {
    expect(parseDateFromFilename("exame 18-05-2026.pdf", 2026)).toBe("2026-05-18");
    expect(parseDateFromFilename("scan.18.05.pdf", 2026)).toBe("2026-05-18");
  });

  it("usa ano explícito quando presente (4 dígitos)", () => {
    expect(parseDateFromFilename("Lab_18_05_2025.pdf", 2026)).toBe("2025-05-18");
  });

  it("ignora sufixos de 2 dígitos (ambíguo) — usa só DD_MM com ano atual", () => {
    // "lab_18_05_24" — 24 poderia ser dia, mês ou ano. Não chuta — usa só
    // "18_05" e ano atual.
    expect(parseDateFromFilename("lab_18_05_24.pdf", 2026)).toBe("2026-05-18");
  });

  it("retorna null quando não tem padrão", () => {
    expect(parseDateFromFilename("Hemograma.pdf", 2026)).toBeNull();
    expect(parseDateFromFilename("scan_001.pdf", 2026)).toBeNull();
  });

  it("rejeita datas inválidas", () => {
    expect(parseDateFromFilename("lab_45_05.pdf", 2026)).toBeNull(); // dia 45
    expect(parseDateFromFilename("lab_18_15.pdf", 2026)).toBeNull(); // mês 15
    expect(parseDateFromFilename("lab_31_02.pdf", 2026)).toBeNull(); // 31/fev
    expect(parseDateFromFilename("lab_00_05.pdf", 2026)).toBeNull(); // dia 0
  });

  it("pula matches inválidos e pega o próximo válido", () => {
    // 2024_15 → 24 não é mês válido (>12) → pula → 15_05 → válido
    expect(parseDateFromFilename("scan_2024_15_05.pdf", 2026)).toBe("2026-05-15");
  });

  it("ignora números grandes (3+ dígitos no início)", () => {
    expect(parseDateFromFilename("img_12345.pdf", 2026)).toBeNull();
    expect(parseDateFromFilename("123_45.pdf", 2026)).toBeNull();
  });

  it("pega o primeiro match quando há múltiplos válidos", () => {
    expect(parseDateFromFilename("lab_05_03_18_06.pdf", 2026)).toBe("2026-03-05");
  });

  it("usa ano atual quando currentYear não passado", () => {
    const expectedYear = new Date().getFullYear();
    const r = parseDateFromFilename("lab_18_05.pdf");
    expect(r).toBe(`${expectedYear}-05-18`);
  });

  it("ignora extensão na hora de procurar", () => {
    expect(parseDateFromFilename("doc.pdf", 2026)).toBeNull();
    expect(parseDateFromFilename("18_05.pdf", 2026)).toBe("2026-05-18");
  });
});
