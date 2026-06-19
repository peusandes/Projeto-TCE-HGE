import { describe, it, expect } from "vitest";
import { coletasParaRegistros, assertRecordIdUnico, type ColetaParaExport } from "../transform";

describe("coletasParaRegistros", () => {
  it("funde instrumentos do mesmo evento + 1 linha por seguimento (com evento)", () => {
    const coletas: ColetaParaExport[] = [
      { tipo: "dados_demograficos", seq: 1, status: "COMPLETE", dados: { nome_ligante: "Ana", sexo: 0 } },
      { tipo: "seguimento", seq: 1, status: "INCOMPLETE", dados: { data_seg: "2026-05-12", hemoglobina_seg: "15.2" } },
      { tipo: "seguimento", seq: 2, status: "INCOMPLETE", dados: { data_seg: "2026-05-13", plaquetas_seg: "193" } },
    ];
    const recs = coletasParaRegistros("42", coletas);

    expect(recs).toHaveLength(3); // admissão + 2 seguimentos
    const base = recs[0];
    expect(base.record_id).toBe("42");
    expect(base.redcap_event_name).toBe("admisso_arm_1");
    expect(base.nome_ligante).toBe("Ana");
    expect(base.sexo).toBe("0");
    expect(base.dados_demograficos_complete).toBe("2");
    expect(base.redcap_repeat_instrument).toBeUndefined();

    const seg1 = recs[1];
    expect(seg1.record_id).toBe("42");
    expect(seg1.redcap_event_name).toBe("seguimento_arm_1");
    expect(seg1.redcap_repeat_instrument).toBe("seguimento");
    expect(seg1.redcap_repeat_instance).toBe("1");
    expect(seg1.hemoglobina_seg).toBe("15.2");
    expect(seg1.seguimento_complete).toBeUndefined(); // INCOMPLETE não marca

    expect(recs[2].redcap_repeat_instance).toBe("2");
    expect(recs[2].plaquetas_seg).toBe("193");
  });

  it("agrupa por evento: admissão e alta viram 2 linhas distintas, em ordem", () => {
    const recs = coletasParaRegistros("1", [
      { tipo: "alta", seq: 1, status: "COMPLETE", dados: { hemacias_alta: "3.0" } },
      { tipo: "dados_demograficos", seq: 1, status: "COMPLETE", dados: { sexo: 0 } },
    ]);
    expect(recs).toHaveLength(2);
    expect(recs[0].redcap_event_name).toBe("admisso_arm_1"); // EVENT_ORDER: admissão antes de alta
    expect(recs[0].sexo).toBe("0");
    expect(recs[1].redcap_event_name).toBe("alta_arm_1");
    expect(recs[1].hemacias_alta).toBe("3.0");
  });

  it("cada instrumento vai pro seu evento (FORM_EVENT)", () => {
    const recs = coletasParaRegistros("1", [
      { tipo: "dados_demograficos", seq: 1, status: "COMPLETE", dados: { sexo: 0 } },
      { tipo: "seguimento", seq: 1, status: "INCOMPLETE", dados: { data_seg: "2026-05-12" } },
      { tipo: "alta", seq: 1, status: "COMPLETE", dados: { hemacias_alta: "3.0" } },
    ]);
    const bases = recs.filter((r) => !r.redcap_repeat_instrument);
    const byEvent = Object.fromEntries(bases.map((r) => [r.redcap_event_name, r]));
    expect(byEvent["admisso_arm_1"].sexo).toBe("0");
    expect(byEvent["alta_arm_1"].hemacias_alta).toBe("3.0");
    const seg = recs.find((r) => r.redcap_repeat_instrument === "seguimento");
    expect(seg?.redcap_event_name).toBe("seguimento_arm_1");
  });

  it("funde dois instrumentos do MESMO evento numa linha só", () => {
    const recs = coletasParaRegistros("1", [
      { tipo: "status_de_admisso", seq: 1, status: "COMPLETE", dados: { tcle: 1 } },
      { tipo: "dados_demograficos", seq: 1, status: "COMPLETE", dados: { sexo: 0 } },
    ]);
    expect(recs).toHaveLength(1);
    expect(recs[0].redcap_event_name).toBe("admisso_arm_1");
    expect(recs[0].tcle).toBe("1");
    expect(recs[0].sexo).toBe("0");
    expect(recs[0].status_de_admisso_complete).toBe("2");
    expect(recs[0].dados_demograficos_complete).toBe("2");
  });

  it("aborta colisão de campo entre instrumentos do mesmo evento", () => {
    expect(() =>
      coletasParaRegistros("1", [
        { tipo: "status_de_admisso", seq: 1, status: "INCOMPLETE", dados: { campo_x: "a" } },
        { tipo: "dados_demograficos", seq: 1, status: "INCOMPLETE", dados: { campo_x: "b" } },
      ]),
    ).toThrow(/Conflito de campo/i);
  });

  it("expande checkbox (array) em campo___valor = 1", () => {
    const recs = coletasParaRegistros("7", [
      { tipo: "historia_admissao", seq: 1, status: "COMPLETE", dados: { mecanismo_trauma: [2, 5] } },
    ]);
    expect(recs[0].mecanismo_trauma___2).toBe("1");
    expect(recs[0].mecanismo_trauma___5).toBe("1");
    expect(recs[0].mecanismo_trauma).toBeUndefined();
  });

  it("converte datetime T→espaço e ignora descritivos (_) e vazios", () => {
    const recs = coletasParaRegistros("7", [
      {
        tipo: "historia_admissao",
        seq: 1,
        status: "INCOMPLETE",
        dados: { hora_admissao: "2026-05-12T10:30", _h_ais: "x", obito: null, vazio: "" },
      },
    ]);
    expect(recs[0].hora_admissao).toBe("2026-05-12 10:30");
    expect(recs[0]._h_ais).toBeUndefined();
    expect(recs[0].obito).toBeUndefined();
    expect(recs[0].vazio).toBeUndefined();
  });

  it("_complete só quando COMPLETE e com dado (nunca rebaixa nem marca vazio)", () => {
    const mk = (status: string, dados: Record<string, unknown>) =>
      coletasParaRegistros("1", [{ tipo: "alta", seq: 1, status, dados }]);
    expect(mk("COMPLETE", { hemacias_alta: "3.0" })[0]?.alta_complete).toBe("2");
    expect(mk("INCOMPLETE", { hemacias_alta: "3.0" })[0]?.alta_complete).toBeUndefined();
    expect(mk("UNVERIFIED", { hemacias_alta: "3.0" })[0]?.alta_complete).toBeUndefined();
    // COMPLETE mas sem dado real → evento sem dado é descartado (array vazio)
    expect(mk("COMPLETE", {})).toHaveLength(0);
  });

  it("pula instância de seguimento sem nenhum dado real", () => {
    const recs = coletasParaRegistros("1", [
      { tipo: "dados_demograficos", seq: 1, status: "COMPLETE", dados: { sexo: 0 } },
      { tipo: "seguimento", seq: 1, status: "INCOMPLETE", dados: {} }, // vazia → some
      { tipo: "seguimento", seq: 2, status: "INCOMPLETE", dados: { hemoglobina_seg: "9.2" } },
    ]);
    // admissão + só o seguimento 2 (o 1 vazio foi pulado)
    expect(recs).toHaveLength(2);
    expect(recs[1].redcap_repeat_instance).toBe("2");
  });

  it("aborta se instrumento NÃO-repetível aparecer duplicado", () => {
    expect(() =>
      coletasParaRegistros("1", [
        { tipo: "alta", seq: 1, status: "COMPLETE", dados: { hemacias_alta: "3.0" } },
        { tipo: "alta", seq: 2, status: "COMPLETE", dados: { hemacias_alta: "4.0" } },
      ]),
    ).toThrow(/duplicad/i);
  });

  it("aborta instrumento sem evento mapeado", () => {
    expect(() =>
      coletasParaRegistros("1", [
        { tipo: "instrumento_inexistente", seq: 1, status: "COMPLETE", dados: { x: "1" } },
      ]),
    ).toThrow(/evento mapeado/i);
  });

  it("descarta valores inválidos (NaN, boolean, objeto)", () => {
    const recs = coletasParaRegistros("1", [
      {
        tipo: "historia_admissao",
        seq: 1,
        status: "INCOMPLETE",
        dados: { pas_adm: 120, ruimNaN: Number("x"), ruimBool: true, ruimObj: { a: 1 } },
      },
    ]);
    expect(recs[0].pas_adm).toBe("120");
    expect(recs[0].ruimNaN).toBeUndefined();
    expect(recs[0].ruimBool).toBeUndefined();
    expect(recs[0].ruimObj).toBeUndefined();
  });

  it("exclui campos CALC (REDCap recalcula) e record_id vindo no dados", () => {
    const recs = coletasParaRegistros("100", [
      {
        tipo: "historia_admissao",
        seq: 1,
        status: "COMPLETE",
        // iss/gcs_admissao são calc; record_id não pode sobrescrever o canônico
        dados: { iss: 25, gcs_admissao: 15, record_id: "999", pas_adm: 120 },
      },
    ]);
    expect(recs[0].record_id).toBe("100"); // canônico venceu
    expect(recs[0].iss).toBeUndefined();
    expect(recs[0].gcs_admissao).toBeUndefined();
    expect(recs[0].pas_adm).toBe("120"); // campo normal preservado
  });

  it("ISOLAÇÃO: todos os registros usam o mesmo record_id", () => {
    const coletas: ColetaParaExport[] = [
      { tipo: "dados_demograficos", seq: 1, status: "COMPLETE", dados: { sexo: 0 } },
      { tipo: "seguimento", seq: 1, status: "INCOMPLETE", dados: { data_seg: "2026-05-12" } },
      { tipo: "seguimento", seq: 2, status: "INCOMPLETE", dados: { data_seg: "2026-05-13" } },
    ];
    const recs = coletasParaRegistros("999", coletas);
    expect(new Set(recs.map((r) => r.record_id))).toEqual(new Set(["999"]));
    expect(() => assertRecordIdUnico(recs, "999")).not.toThrow();
  });
});

describe("assertRecordIdUnico (trava de segurança)", () => {
  it("lança se algum registro tiver record_id diferente", () => {
    const recs = [{ record_id: "1" }, { record_id: "2" }];
    expect(() => assertRecordIdUnico(recs, "1")).toThrow(/Trava de segurança/);
  });

  it("passa quando todos batem", () => {
    expect(() => assertRecordIdUnico([{ record_id: "5" }, { record_id: "5" }], "5")).not.toThrow();
  });
});
