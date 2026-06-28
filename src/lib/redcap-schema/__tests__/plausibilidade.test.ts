import { describe, it, expect } from "vitest";
import {
  checarValor,
  checarDados,
  faixaDoCampo,
  mensagemSuspeito,
  CAMPO_BASE,
  FAIXAS_PLAUSIVEIS,
} from "../plausibilidade";

describe("plausibilidade — checarValor", () => {
  it("hemácias 0.0059 (exame trocado) → suspeito baixo", () => {
    const s = checarValor("hemacias_seg", "0.0059");
    expect(s).not.toBeNull();
    expect(s!.motivo).toBe("baixo");
    expect(s!.rotulo).toBe("Hemácias");
    expect(s!.min).toBe(2);
  });

  it("hemácias 4.5 (normal) → ok", () => {
    expect(checarValor("hemacias_seg", "4.5")).toBeNull();
  });

  it("hemácias exatamente no limite (2) → ok (inclusive)", () => {
    expect(checarValor("hemacias_seg", "2")).toBeNull();
  });

  it("sódio 26 → suspeito baixo (limite 105)", () => {
    const s = checarValor("sodio_seg", "26");
    expect(s!.motivo).toBe("baixo");
    expect(s!.min).toBe(105);
  });

  it("sódio 140 (normal) → ok", () => {
    expect(checarValor("sodio_seg", "140")).toBeNull();
  });

  it("valor muito alto → suspeito alto", () => {
    const s = checarValor("sodio_seg", "999");
    expect(s!.motivo).toBe("alto");
    expect(s!.max).toBe(180);
  });

  it("aceita vírgula decimal (BR)", () => {
    expect(checarValor("hemacias_seg", "0,5")!.motivo).toBe("baixo");
    expect(checarValor("hemacias_seg", "4,5")).toBeNull();
  });

  it("vazio / não-numérico / fora de escopo → null (não inventa suspeita)", () => {
    expect(checarValor("hemacias_seg", "")).toBeNull();
    expect(checarValor("hemacias_seg", null)).toBeNull();
    expect(checarValor("hemacias_seg", "abc")).toBeNull();
    expect(checarValor("campo_inexistente", "0.001")).toBeNull();
    expect(checarValor("record_id", "Fulano")).toBeNull();
  });

  it("variantes de alta mapeiam pro mesmo conceito", () => {
    expect(checarValor("sodio_alta", "26")!.motivo).toBe("baixo");
    expect(checarValor("hemoglobinas_alta", "1")!.motivo).toBe("baixo"); // plural legado
    expect(checarValor("bicarbonato_variable", "999")!.motivo).toBe("alto");
    expect(checarValor("primeiro_hgt_dia_alta", "2")!.motivo).toBe("baixo");
  });
});

describe("plausibilidade — checarDados", () => {
  it("varre e devolve só os suspeitos", () => {
    const suspeitos = checarDados({
      hemacias_seg: "0.0059",
      sodio_seg: "140", // ok
      potassio_seg: "0.1", // baixo
      data_seg: "2026-01-01", // fora de escopo
    });
    const campos = suspeitos.map((s) => s.campo).sort();
    expect(campos).toEqual(["hemacias_seg", "potassio_seg"]);
  });
});

describe("plausibilidade — integridade do mapa", () => {
  it("todo campo aponta pra um conceito existente", () => {
    for (const base of Object.values(CAMPO_BASE)) {
      expect(FAIXAS_PLAUSIVEIS[base], `faixa ausente: ${base}`).toBeDefined();
    }
  });

  it("toda faixa tem min < max", () => {
    for (const [k, f] of Object.entries(FAIXAS_PLAUSIVEIS)) {
      expect(f.min, k).toBeLessThan(f.max);
    }
  });
});

describe("plausibilidade — mensagem", () => {
  it("texto claro pro caso clássico", () => {
    const s = checarValor("hemacias_seg", "0.0059")!;
    expect(mensagemSuspeito(s)).toContain("Hemácias");
    expect(mensagemSuspeito(s)).toContain("outro exame");
  });

  it("faixaDoCampo resolve o conceito", () => {
    expect(faixaDoCampo("sodio_alta")?.rotulo).toBe("Sódio");
    expect(faixaDoCampo("nao_existe")).toBeNull();
  });
});
