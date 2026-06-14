import { describe, it, expect } from "vitest";
import { coletasParaRegistros, assertRecordIdUnico, type ColetaParaExport } from "../transform";

describe("coletasParaRegistros", () => {
  it("funde instrumentos únicos no registro base + 1 linha por seguimento", () => {
    const coletas: ColetaParaExport[] = [
      { tipo: "dados_demograficos", seq: 1, status: "COMPLETE", dados: { nome_ligante: "Ana", sexo: 0 } },
      { tipo: "seguimento", seq: 1, status: "INCOMPLETE", dados: { data_seg: "2026-05-12", hemoglobina_seg: "15.2" } },
      { tipo: "seguimento", seq: 2, status: "INCOMPLETE", dados: { data_seg: "2026-05-13", plaquetas_seg: "193" } },
    ];
    const recs = coletasParaRegistros("42", coletas);

    expect(recs).toHaveLength(3); // base + 2 seguimentos
    const base = recs[0];
    expect(base.record_id).toBe("42");
    expect(base.nome_ligante).toBe("Ana");
    expect(base.sexo).toBe("0");
    expect(base.dados_demograficos_complete).toBe("2");
    expect(base.redcap_repeat_instrument).toBeUndefined();

    const seg1 = recs[1];
    expect(seg1.record_id).toBe("42");
    expect(seg1.redcap_repeat_instrument).toBe("seguimento");
    expect(seg1.redcap_repeat_instance).toBe("1");
    expect(seg1.hemoglobina_seg).toBe("15.2");
    expect(seg1.seguimento_complete).toBe("0");

    expect(recs[2].redcap_repeat_instance).toBe("2");
    expect(recs[2].plaquetas_seg).toBe("193");
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

  it("mapeia status → _complete (0/1/2)", () => {
    const mk = (status: string) =>
      coletasParaRegistros("1", [{ tipo: "alta", seq: 1, status, dados: { hemacias_alta: "3.0" } }])[0]
        .alta_complete;
    expect(mk("INCOMPLETE")).toBe("0");
    expect(mk("UNVERIFIED")).toBe("1");
    expect(mk("COMPLETE")).toBe("2");
  });

  it("longitudinal: inclui redcap_event_name quando passado", () => {
    const recs = coletasParaRegistros("1", [
      { tipo: "seguimento", seq: 1, status: "INCOMPLETE", dados: { data_seg: "2026-05-12" } },
    ], { eventName: "evento_unico_arm_1" });
    expect(recs[0].redcap_event_name).toBe("evento_unico_arm_1");
    expect(recs[1].redcap_event_name).toBe("evento_unico_arm_1");
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
