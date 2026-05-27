import { describe, it, expect } from "vitest";
import { parsePatientNameFromFilename } from "./parse-filename-patient";

describe("parsePatientNameFromFilename", () => {
  it("extrai nome com espaços e data com underscore", () => {
    // Caso âncora — o filename que o Peu validou manualmente
    expect(parsePatientNameFromFilename("Gerson Barretto Lopes 21_05.pdf")).toBe(
      "Gerson Barretto Lopes",
    );
  });

  it("converte underscore em espaço quando filename é all-underscore", () => {
    expect(parsePatientNameFromFilename("joao_silva_18-05-2026.jpg")).toBe(
      "joao silva",
    );
  });

  it("converte hífens e pontos em espaço", () => {
    expect(parsePatientNameFromFilename("Maria-da-Silva.HGT.18.05.heic")).toBe(
      "Maria da Silva HGT",
    );
  });

  it("preserva o nome quando não há data no filename", () => {
    expect(parsePatientNameFromFilename("Pedro Sandes.pdf")).toBe("Pedro Sandes");
  });

  it("retorna o nome curto se filename = só nome + extensão", () => {
    expect(parsePatientNameFromFilename("lab_18_05.pdf")).toBe("lab");
  });

  it("retorna null quando só sobra ruído numérico", () => {
    // Padrão típico de câmera Android: "IMG_20260518_142233" — o parser
    // vai casar data nele (20_26 inválido, mas 18_05/18_14/etc), e o que
    // resta é só "IMG" + números. "IMG" passa, então retorna "IMG".
    // Filename realmente sem texto:
    expect(parsePatientNameFromFilename("12345_67890.jpg")).toBeNull();
    expect(parsePatientNameFromFilename("0001.png")).toBeNull();
  });

  it("retorna null pra string vazia", () => {
    expect(parsePatientNameFromFilename(".pdf")).toBeNull();
  });

  it("trim e collapse de whitespace múltiplo", () => {
    expect(parsePatientNameFromFilename("  Joao   Silva   21_05.pdf  ")).toBe(
      "Joao Silva",
    );
  });

  it("lida com (1), (2) etc. de cópias do macOS/Windows", () => {
    expect(parsePatientNameFromFilename("Joao Silva (1) 21_05.pdf")).toBe(
      "Joao Silva",
    );
  });

  it("ignora extensão (case-insensitive)", () => {
    expect(parsePatientNameFromFilename("Ana Costa 18-05.PDF")).toBe("Ana Costa");
    expect(parsePatientNameFromFilename("Ana Costa 18-05.HEIC")).toBe("Ana Costa");
  });

  it("nome após a data também é capturado", () => {
    expect(parsePatientNameFromFilename("18_05 Joao Silva.pdf")).toBe(
      "Joao Silva",
    );
  });

  it("filename só com data retorna null (nada de paciente)", () => {
    expect(parsePatientNameFromFilename("18_05.pdf")).toBeNull();
    expect(parsePatientNameFromFilename("18-05-2026.jpg")).toBeNull();
  });

  it("preserva acentos", () => {
    expect(parsePatientNameFromFilename("João da Silva 21_05.pdf")).toBe(
      "João da Silva",
    );
  });
});
