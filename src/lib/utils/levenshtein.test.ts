import { describe, it, expect } from "vitest";
import { levenshtein, similarityRatio } from "./levenshtein";

describe("levenshtein", () => {
  it("zero pra strings iguais", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
    expect(levenshtein("", "")).toBe(0);
  });

  it("comprimento da outra string quando uma é vazia", () => {
    expect(levenshtein("", "kitten")).toBe(6);
    expect(levenshtein("kitten", "")).toBe(6);
  });

  it("substituição simples", () => {
    expect(levenshtein("kitten", "sitten")).toBe(1);
  });

  it("caso clássico kitten/sitting = 3", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });

  it("insert/delete", () => {
    expect(levenshtein("abc", "abcd")).toBe(1);
    expect(levenshtein("abcd", "abc")).toBe(1);
  });

  it("ordem dos argumentos não importa", () => {
    expect(levenshtein("longer string", "short")).toBe(
      levenshtein("short", "longer string"),
    );
  });
});

describe("similarityRatio", () => {
  it("1 pra idênticas", () => {
    expect(similarityRatio("joao silva", "joao silva")).toBe(1);
  });

  it("0 pra completamente diferentes", () => {
    expect(similarityRatio("aaa", "bbb")).toBe(0);
  });

  it("alto pra typo pequeno em nome", () => {
    const r = similarityRatio("gerson barretto", "gerson barreto");
    expect(r).toBeGreaterThan(0.9);
  });

  it("retorna 1 pra duas strings vazias", () => {
    expect(similarityRatio("", "")).toBe(1);
  });

  it("decresce monotonicamente com mais diferenças", () => {
    const a = similarityRatio("maria silva", "maria silva");
    const b = similarityRatio("maria silva", "maria silvas");
    const c = similarityRatio("maria silva", "maria xxxxx");
    expect(a).toBeGreaterThanOrEqual(b);
    expect(b).toBeGreaterThanOrEqual(c);
  });
});
