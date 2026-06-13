import { describe, it, expect } from "vitest";
import { mapearParaAlta } from "../map-alta";

describe("mapearParaAlta", () => {
  it("converte as chaves de seguimento para as da alta (nomes legados)", () => {
    const r = mapearParaAlta({
      hemoglobina_seg: "9.2",
      hematocrito_seg: "28.7",
      plaquetas_seg: "510",
      bicarbonato_seg: "24.2",
      calcio_seg: "8.2",
      neutrofilos_seg: "11.47",
    });
    expect(r).toEqual({
      hemoglobinas_alta: "9.2",
      hematocritos_alta: "28.7",
      plaquetas_alta: "510",
      bicarbonato_variable: "24.2",
      calcio_alta: "8.2",
      neutrofilos_alta: "11.47",
    });
  });

  it("ignora chaves que não são laboratoriais mapeados", () => {
    const r = mapearParaAlta({ data_seg: "2026-05-12", local_pct: 1, sodio_seg: "146" });
    expect(r).toEqual({ sodio_alta: "146" });
  });
});
