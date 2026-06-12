import { describe, it, expect } from "vitest";
import { planejarSeguimentos, type Plano } from "../seguimento-plan";

function asPlano(r: ReturnType<typeof planejarSeguimentos>): Plano {
  if ("erro" in r) throw new Error(`esperava plano, veio erro: ${r.erro}`);
  return r;
}

describe("planejarSeguimentos", () => {
  it("sem seguimentos: cria do dia 1 (admissão) até o exame, só o exame com labs", () => {
    const p = asPlano(
      planejarSeguimentos({
        admissaoIso: "2026-05-12",
        exameIso: "2026-05-15",
        existentes: [],
      }),
    );
    expect(p.diaExame).toBe(4);
    expect(p.seqExame).toBe(4);
    expect(p.itens.map((i) => i.seq)).toEqual([1, 2, 3, 4]);
    expect(p.itens.map((i) => i.dataIso)).toEqual([
      "2026-05-12",
      "2026-05-13",
      "2026-05-14",
      "2026-05-15",
    ]);
    expect(p.itens.filter((i) => i.isExame)).toHaveLength(1);
    expect(p.itens.find((i) => i.isExame)?.seq).toBe(4);
    expect(p.itens.every((i) => i.modo === "criar")).toBe(true);
  });

  it("gap: preenche só os dias faltantes entre o último seguimento e o exame", () => {
    const p = asPlano(
      planejarSeguimentos({
        admissaoIso: "2026-05-12",
        exameIso: "2026-05-18", // dia 7
        existentes: [
          { seq: 1, dataIso: "2026-05-12" },
          { seq: 2, dataIso: "2026-05-13" },
        ],
      }),
    );
    expect(p.diaExame).toBe(7);
    // dias 3,4,5,6,7 precisam ser criados (1 e 2 já existem)
    expect(p.itens.map((i) => i.seq)).toEqual([3, 4, 5, 6, 7]);
    expect(p.seqExame).toBe(7);
    expect(p.itens.find((i) => i.seq === 7)?.isExame).toBe(true);
  });

  it("exame numa data que já tem seguimento → atualiza, não duplica", () => {
    const p = asPlano(
      planejarSeguimentos({
        admissaoIso: "2026-05-12",
        exameIso: "2026-05-14",
        existentes: [
          { seq: 1, dataIso: "2026-05-12" },
          { seq: 2, dataIso: "2026-05-13" },
          { seq: 3, dataIso: "2026-05-14" },
        ],
      }),
    );
    expect(p.itens).toHaveLength(1);
    expect(p.itens[0]).toMatchObject({ seq: 3, isExame: true, modo: "atualizar" });
  });

  it("exame no próprio dia da admissão → único seguimento (dia 1)", () => {
    const p = asPlano(
      planejarSeguimentos({
        admissaoIso: "2026-05-12",
        exameIso: "2026-05-12",
        existentes: [],
      }),
    );
    expect(p.diaExame).toBe(1);
    expect(p.itens).toEqual([
      { seq: 1, dataIso: "2026-05-12", isExame: true, modo: "criar" },
    ]);
  });

  it("exame antes da admissão → erro", () => {
    const r = planejarSeguimentos({
      admissaoIso: "2026-05-12",
      exameIso: "2026-05-10",
      existentes: [],
    });
    expect("erro" in r).toBe(true);
  });
});
