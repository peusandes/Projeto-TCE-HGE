import { describe, it, expect } from "vitest";

// Testes do classifier puro (mock data, sem Supabase). Validamos só a
// lógica de status — o resto é I/O.

function diasEntre(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / (24 * 60 * 60 * 1000));
}

function addDays(dateIso: string, days: number): string {
  const d = new Date(dateIso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Status = "atrasada" | "hoje" | "proxima" | "futura" | "concluida";

function classify(
  dataAlvo: string,
  hoje: string,
  isComplete: boolean,
): { status: Status; dias: number } {
  const dias = diasEntre(dataAlvo, hoje);
  if (isComplete) return { status: "concluida", dias };
  if (dias === 0) return { status: "hoje", dias };
  if (dias > 0) return { status: "atrasada", dias };
  if (dias >= -30) return { status: "proxima", dias };
  return { status: "futura", dias };
}

describe("classify GOS-E status", () => {
  const hoje = "2026-05-20";

  it("data exatamente hoje → hoje", () => {
    expect(classify("2026-05-20", hoje, false)).toEqual({
      status: "hoje",
      dias: 0,
    });
  });

  it("data já passou sem complete → atrasada com dias positivos", () => {
    expect(classify("2026-05-10", hoje, false)).toEqual({
      status: "atrasada",
      dias: 10,
    });
  });

  it("data nos próximos 30 dias → proxima", () => {
    expect(classify(addDays(hoje, 15), hoje, false).status).toBe("proxima");
    expect(classify(addDays(hoje, 30), hoje, false).status).toBe("proxima");
  });

  it("data depois de 30 dias → futura", () => {
    expect(classify(addDays(hoje, 45), hoje, false).status).toBe("futura");
    expect(classify(addDays(hoje, 180), hoje, false).status).toBe("futura");
  });

  it("isComplete sempre vira concluida, independente da data", () => {
    expect(classify("2025-01-01", hoje, true).status).toBe("concluida");
    expect(classify(hoje, hoje, true).status).toBe("concluida");
    expect(classify(addDays(hoje, 100), hoje, true).status).toBe("concluida");
  });

  it("dias_relativo: negativo = futuro, positivo = atrasado, zero = hoje", () => {
    expect(classify(addDays(hoje, 10), hoje, false).dias).toBe(-10);
    expect(classify(addDays(hoje, -10), hoje, false).dias).toBe(10);
    expect(classify(hoje, hoje, false).dias).toBe(0);
  });
});
