import { describe, it, expect } from "vitest";
import { validateField, validateInstrument } from "./validations";
import type { FormContext } from "./types";

function ctx(
  data: Record<string, unknown> = {},
  others: Record<string, Record<string, unknown>> = {},
): FormContext {
  return {
    data: data as FormContext["data"],
    others: others as FormContext["others"],
    paciente: { id: "p1", nome: "Teste" },
  };
}

describe("validateField — historia_admissao", () => {
  it("alerta quando admissão é anterior ao trauma", () => {
    const c = ctx({
      hora_trauma: "2026-05-19T10:00:00",
      hora_admissao: "2026-05-19T08:00:00",
    });
    const msg = validateField("historia_admissao", "hora_admissao", c);
    expect(msg).toMatch(/anterior ao trauma/i);
  });

  it("não alerta quando admissão é depois do trauma", () => {
    const c = ctx({
      hora_trauma: "2026-05-19T08:00:00",
      hora_admissao: "2026-05-19T10:00:00",
    });
    expect(validateField("historia_admissao", "hora_admissao", c)).toBeNull();
  });

  it("alerta data futura para trauma", () => {
    const c = ctx({ hora_trauma: "2999-01-01T00:00:00" });
    expect(validateField("historia_admissao", "hora_trauma", c)).toMatch(/futuro/i);
  });
});

describe("validateField — alta", () => {
  it("alerta quando alta é anterior à admissão (cross-form)", () => {
    const c = ctx(
      { hora_alta: "2026-05-19T08:00:00" },
      { historia_admissao: { hora_admissao: "2026-05-19T10:00:00" } },
    );
    const msg = validateField("alta", "hora_alta", c);
    expect(msg).toMatch(/anterior à admissão/i);
  });

  it("aceita alta no mesmo dia depois da admissão", () => {
    const c = ctx(
      { hora_alta: "2026-05-19T18:00:00" },
      { historia_admissao: { hora_admissao: "2026-05-19T08:00:00" } },
    );
    expect(validateField("alta", "hora_alta", c)).toBeNull();
  });
});

describe("validateField — dados_de_cirurgia", () => {
  it("alerta quando término ≤ início", () => {
    const c = ctx({
      hora_inicio_cirurgia: "2026-05-19T10:00:00",
      hora_termino_cirurgia: "2026-05-19T09:00:00",
    });
    expect(validateField("dados_de_cirurgia", "hora_termino_cirurgia", c)).toMatch(
      /anterior ou igual/i,
    );
  });

  it("alerta cirurgia > 12h", () => {
    const c = ctx({
      hora_inicio_cirurgia: "2026-05-19T08:00:00",
      hora_termino_cirurgia: "2026-05-19T22:00:00",
    });
    expect(validateField("dados_de_cirurgia", "hora_termino_cirurgia", c)).toMatch(/Duração/i);
  });

  it("alerta cirurgia antes da admissão (cross-form)", () => {
    const c = ctx(
      { hora_inicio_cirurgia: "2026-05-19T06:00:00" },
      { historia_admissao: { hora_admissao: "2026-05-19T10:00:00" } },
    );
    expect(validateField("dados_de_cirurgia", "hora_inicio_cirurgia", c)).toMatch(
      /antes da admissão/i,
    );
  });

  it("alerta anestesia após início", () => {
    const c = ctx({
      hora_anestesia: "2026-05-19T10:30:00",
      hora_inicio_cirurgia: "2026-05-19T10:00:00",
    });
    expect(validateField("dados_de_cirurgia", "hora_anestesia", c)).toMatch(/após início/i);
  });
});

describe("validateField — gose", () => {
  it("alerta GOS-E 30d feito muito cedo", () => {
    // Trauma 35 dias atrás, ligação só 5 dias depois — fora da janela 30 ± 14
    const trauma = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const lig = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const c = ctx({ data_ligacao: lig }, { historia_admissao: { hora_trauma: trauma } });
    expect(validateField("gose_30d", "data_ligacao", c)).toMatch(/esperado ~30d/i);
  });

  it("aceita GOS-E 30d na janela ~30d ± 14d", () => {
    // Trauma 30 dias atrás, ligação hoje
    const trauma = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const lig = new Date().toISOString();
    const c = ctx({ data_ligacao: lig }, { historia_admissao: { hora_trauma: trauma } });
    expect(validateField("gose_30d", "data_ligacao", c)).toBeNull();
  });

  it("alerta GOS-E 90d muito atrasado", () => {
    // Trauma 250 dias atrás, ligação hoje (muito além de 90 + 30)
    const trauma = new Date(Date.now() - 250 * 24 * 60 * 60 * 1000).toISOString();
    const lig = new Date().toISOString();
    const c = ctx({ data_ligacao: lig }, { historia_admissao: { hora_trauma: trauma } });
    expect(validateField("gose_90d", "data_ligacao", c)).toMatch(/esperado ~90d/i);
  });
});

describe("validateField — dados_demograficos", () => {
  it("alerta data de nascimento futura", () => {
    const c = ctx({ data_nascimento: "2999-01-01" });
    expect(validateField("dados_demograficos", "data_nascimento", c)).toMatch(/futuro/i);
  });

  it("alerta coleta anterior ao nascimento", () => {
    const c = ctx({
      data_nascimento: "1990-01-01",
      data_coleta: "1989-01-01",
    });
    expect(validateField("dados_demograficos", "data_coleta", c)).toMatch(/anterior ao nascimento/i);
  });
});

describe("validateInstrument", () => {
  it("retorna múltiplos warnings simultaneamente", () => {
    const c = ctx(
      {
        hora_inicio_cirurgia: "2026-05-19T06:00:00",
        hora_termino_cirurgia: "2026-05-19T05:00:00",
        hora_anestesia: "2026-05-19T07:00:00",
      },
      { historia_admissao: { hora_admissao: "2026-05-19T10:00:00" } },
    );
    const warnings = validateInstrument("dados_de_cirurgia", c);
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it("retorna lista vazia quando tudo OK", () => {
    const c = ctx({
      hora_trauma: "2026-05-19T08:00:00",
      hora_admissao: "2026-05-19T10:00:00",
    });
    expect(validateInstrument("historia_admissao", c)).toEqual([]);
  });
});
