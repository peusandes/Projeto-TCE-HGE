import { describe, it, expect } from "vitest";
import {
  matchPacienteByFilename,
  scoreNameMatch,
  normalizeName,
  FUZZY_THRESHOLDS,
} from "./fuzzy-match-paciente";

const pacientesMock = [
  { paciente_id: "p1", nome: "Gerson Barretto Lopes" },
  { paciente_id: "p2", nome: "Maria Silva da Costa" },
  { paciente_id: "p3", nome: "João Pedro Sandes" },
  { paciente_id: "p4", nome: "Ana Carolina Souza" },
];

describe("normalizeName", () => {
  it("remove acentos", () => {
    expect(normalizeName("João da Silva")).toBe("joao da silva");
  });
  it("colapsa espaços", () => {
    expect(normalizeName("  joao   silva  ")).toBe("joao silva");
  });
  it("remove pontuação", () => {
    expect(normalizeName("D'Ávila-Costa")).toBe("d avila costa");
  });
});

describe("scoreNameMatch", () => {
  it("score 1 pra strings idênticas após normalize", () => {
    expect(scoreNameMatch("Gerson Barretto Lopes", "GERSON BARRETTO LOPES")).toBe(
      1,
    );
  });

  it("score alto pra typo único", () => {
    const s = scoreNameMatch("Gerson Barreto Lopes", "Gerson Barretto Lopes");
    expect(s).toBeGreaterThan(0.9);
  });

  it("score razoável quando filename traz só primeiro nome + sobrenome", () => {
    // "Maria Costa" vs "Maria Silva da Costa" — todos os tokens batem,
    // mas o nome real tem mais tokens. Não deve ser AUTO, mas pode ser
    // SUGERIDO.
    const s = scoreNameMatch("Maria Costa", "Maria Silva da Costa");
    expect(s).toBeGreaterThan(0.55);
  });

  it("score baixo pra nomes diferentes", () => {
    expect(scoreNameMatch("Pedro", "Maria Silva da Costa")).toBeLessThan(0.4);
  });
});

describe("matchPacienteByFilename", () => {
  it("classifica AUTO quando o nome é praticamente idêntico", () => {
    const r = matchPacienteByFilename("Gerson Barretto Lopes", pacientesMock);
    expect(r.classification).toBe("AUTO");
    expect(r.top?.paciente_id).toBe("p1");
  });

  it("classifica AUTO com typo leve quando não há outro paciente próximo", () => {
    const r = matchPacienteByFilename("Gerson Barreto Lopes", pacientesMock);
    expect(r.classification).toBe("AUTO");
    expect(r.top?.paciente_id).toBe("p1");
  });

  it("classifica NAO_ATRIBUIDO quando input vazio", () => {
    const r = matchPacienteByFilename(null, pacientesMock);
    expect(r.classification).toBe("NAO_ATRIBUIDO");
    expect(r.top).toBeNull();
  });

  it("classifica NAO_ATRIBUIDO quando lista vazia", () => {
    const r = matchPacienteByFilename("Joao Silva", []);
    expect(r.classification).toBe("NAO_ATRIBUIDO");
  });

  it("classifica NAO_ATRIBUIDO quando nada bate", () => {
    const r = matchPacienteByFilename("XYZ ZZZ Inexistente", pacientesMock);
    expect(r.classification).toBe("NAO_ATRIBUIDO");
  });

  it("não classifica AUTO quando há dois candidatos com scores muito próximos", () => {
    // Dois nomes praticamente intercambiáveis pra um input genérico: o gap
    // entre o 1º e 2º deve cair abaixo de AUTO_GAP_MIN e travar AMBIGUO.
    const pacientes = [
      { paciente_id: "j1", nome: "Joao Silva" },
      { paciente_id: "j2", nome: "Joao Silva Jr" },
    ];
    const r = matchPacienteByFilename("Joao Silva", pacientes);
    // O top score do j1 é 1.0; o do j2 também é alto. Gap pequeno bloqueia AUTO.
    expect(r.top?.paciente_id).toBe("j1");
    // Não exige AMBIGUO especificamente — o importante é que não auto-atribua
    // quando a diferença é pequena demais pra distinguir os dois.
    if (r.classification === "AUTO") {
      // Sanity: se for AUTO, o gap precisa estar acima do threshold
      const second = r.candidates[1];
      if (second) {
        expect(r.top!.score - second.score).toBeGreaterThanOrEqual(
          FUZZY_THRESHOLDS.AUTO_GAP_MIN,
        );
      }
    }
  });

  it("ranks com top primeiro", () => {
    const r = matchPacienteByFilename("Ana Carolina", pacientesMock);
    expect(r.candidates[0]?.paciente_id).toBe("p4");
    expect(r.top?.paciente_id).toBe("p4");
  });

  it("limita a top-3 candidates", () => {
    const r = matchPacienteByFilename("Joao", pacientesMock);
    expect(r.candidates.length).toBeLessThanOrEqual(3);
  });

  it("respeita os thresholds publicados", () => {
    // Sanity check da constante exportada
    expect(FUZZY_THRESHOLDS.AUTO_MIN).toBe(0.85);
    expect(FUZZY_THRESHOLDS.AUTO_GAP_MIN).toBe(0.2);
    expect(FUZZY_THRESHOLDS.SUGGEST_MIN).toBe(0.65);
    expect(FUZZY_THRESHOLDS.SUGGEST_GAP_MIN).toBe(0.15);
    expect(FUZZY_THRESHOLDS.AMBIGUOUS_MIN).toBe(0.4);
  });

  it("filename com primeiro nome único entrega AUTO ou SUGERIDO", () => {
    const r = matchPacienteByFilename("Gerson", pacientesMock);
    expect(["AUTO", "SUGERIDO"]).toContain(r.classification);
    expect(r.top?.paciente_id).toBe("p1");
  });

  it("filename com sobrenome único entrega AUTO ou SUGERIDO", () => {
    const r = matchPacienteByFilename("Barretto", pacientesMock);
    expect(["AUTO", "SUGERIDO"]).toContain(r.classification);
    expect(r.top?.paciente_id).toBe("p1");
  });
});
