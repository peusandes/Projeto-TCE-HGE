import { describe, expect, it } from "vitest";
import { dataCorte, emLotes, filtrarOrfaos } from "./retencao";

describe("dataCorte", () => {
  it("volta 30 dias por padrão", () => {
    const agora = new Date("2026-10-31T06:00:00Z");
    expect(dataCorte(agora).toISOString()).toBe("2026-10-01T06:00:00.000Z");
  });
});

describe("emLotes", () => {
  it("quebra em lotes do tamanho pedido", () => {
    expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(emLotes([], 2)).toEqual([]);
  });
});

describe("filtrarOrfaos", () => {
  const corte = new Date("2026-10-01T00:00:00Z");
  it("só pega arquivo sem linha e mais velho que o corte", () => {
    const arquivos = [
      { path: "p1/velho-com-linha.jpg", criadoEm: "2026-09-01T00:00:00Z" },
      { path: "p1/velho-orfao.jpg", criadoEm: "2026-09-01T00:00:00Z" },
      { path: "p1/novo-orfao.jpg", criadoEm: "2026-10-20T00:00:00Z" },
      { path: "p1/sem-data.jpg", criadoEm: null },
    ];
    expect(filtrarOrfaos(arquivos, new Set(["p1/velho-com-linha.jpg"]), corte)).toEqual([
      "p1/velho-orfao.jpg",
    ]);
  });
});
