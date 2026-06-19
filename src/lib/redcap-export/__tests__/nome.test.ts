import { describe, it, expect } from "vitest";
import { normalizeNome, canonNome } from "../nome";

describe("normalizeNome (vira o record_id)", () => {
  it("trim + colapsa espaços, preserva caixa/acento", () => {
    expect(normalizeNome("  José   da  Silva ")).toBe("José da Silva");
  });
});

describe("canonNome (dedup de pessoa)", () => {
  it("iguala grafias divergentes (caixa/acento)", () => {
    expect(canonNome("José da Silva")).toBe(canonNome("JOSE DA SILVA"));
    expect(canonNome("José da Silva")).toBe(canonNome("  josé  da   silva "));
  });
  it("remove acento de verdade", () => {
    expect(canonNome("João Conceição")).toBe("joao conceicao");
  });
  it("distingue pessoas diferentes", () => {
    expect(canonNome("José da Silva")).not.toBe(canonNome("Maria Souza"));
  });
});
