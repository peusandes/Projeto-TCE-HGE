import { describe, it, expect } from "vitest";
import { compararComRedcap, rotuloCampo, valorLegivel } from "../diff";
import type { RedcapRecord } from "../transform";

const base = (extra: Record<string, string>): RedcapRecord => ({
  record_id: "Fulano de Tal",
  redcap_event_name: "seguimento_arm_1",
  redcap_repeat_instrument: "seguimento",
  redcap_repeat_instance: "1",
  ...extra,
});

describe("compararComRedcap", () => {
  it("classifica vazio→preenche, igual→igual, diferente→substitui", () => {
    const nossos = [base({ sodio_seg: "140", ureia_seg: "31", ligante_seg: "Guilherme" })];
    const la = [
      base({ sodio_seg: "", ureia_seg: "31", ligante_seg: "Emy" }),
    ];
    const d = compararComRedcap(nossos, la);
    expect(d.preenche).toBe(1);
    expect(d.iguais).toBe(1);
    expect(d.substitui).toHaveLength(1);
    expect(d.substitui[0]).toMatchObject({ campo: "ligante_seg", atual: "Emy", novo: "Guilherme" });
  });

  it("linha inexistente no REDCap conta tudo como preenchimento", () => {
    const d = compararComRedcap([base({ sodio_seg: "140" })], []);
    expect(d.preenche).toBe(1);
    expect(d.substitui).toHaveLength(0);
  });

  it("casa a linha certa por evento + instância (não mistura seguimentos)", () => {
    const nossos = [
      base({ redcap_repeat_instance: "1", sodio_seg: "140" }),
      base({ redcap_repeat_instance: "2", sodio_seg: "150" }),
    ];
    const la = [base({ redcap_repeat_instance: "2", sodio_seg: "999" })];
    const d = compararComRedcap(nossos, la);
    expect(d.preenche).toBe(1); // a instância 1 não existe lá
    expect(d.substitui).toHaveLength(1);
    expect(d.substitui[0].novo).toBe("150");
  });

  it("checkbox desmarcado lá que vamos marcar é preenchimento, não substituição", () => {
    const d = compararComRedcap(
      [base({ sitio_infeccao___12: "1" })],
      [base({ sitio_infeccao___12: "0" })],
    );
    expect(d.preenche).toBe(1);
    expect(d.substitui).toHaveLength(0);
  });

  it("conta caixa marcada só no REDCap (o envio nunca desmarca)", () => {
    const d = compararComRedcap(
      [base({ sitio_infeccao___1: "1" })],
      [base({ sitio_infeccao___1: "0", sitio_infeccao___3: "1" })],
    );
    expect(d.mantidosLa).toBe(1);
  });

  it("ignora campos de controle e _complete", () => {
    const d = compararComRedcap(
      [base({ seguimento_complete: "2" })],
      [base({ seguimento_complete: "0" })],
    );
    expect(d.substitui).toHaveLength(0);
    expect(d.preenche).toBe(0);
  });

  it("localiza o campo com evento, dia e data", () => {
    const d = compararComRedcap(
      [base({ data_seg: "2026-07-17", ligante_seg: "Nery" })],
      [base({ data_seg: "2026-07-17", ligante_seg: "Emy" })],
    );
    expect(d.substitui[0].onde).toBe("Seguimento dia 1 — 17/07/2026");
  });
});

describe("rótulos e valores legíveis", () => {
  it("usa o label do dicionário", () => {
    expect(rotuloCampo("sodio_seg")).not.toBe("sodio_seg");
  });

  it("checkbox mostra campo + item da escolha", () => {
    expect(rotuloCampo("sitio_infeccao___12")).toContain(":");
  });

  it("traduz código de escolha pro texto", () => {
    expect(valorLegivel("local_pct", "1")).not.toBe("1");
  });

  it("vazio vira (vazio)", () => {
    expect(valorLegivel("sodio_seg", "")).toBe("(vazio)");
  });
});

describe("ruído e alinhamento", () => {
  it("mesmo número escrito diferente não conta como substituição", () => {
    const d = compararComRedcap(
      [base({ cpk_seg: "14184.0", hematocrito_seg: "21.0" })],
      [base({ cpk_seg: "14184", hematocrito_seg: "21" })],
    );
    expect(d.soFormato).toBe(2);
    expect(d.substitui).toHaveLength(0);
  });

  it("valor numérico de fato diferente continua sendo substituição", () => {
    const d = compararComRedcap([base({ sodio_seg: "153.5" })], [base({ sodio_seg: "159" })]);
    expect(d.soFormato).toBe(0);
    expect(d.substitui).toHaveLength(1);
  });

  it("data do seguimento divergente vira alerta próprio (instância desalinhada)", () => {
    const d = compararComRedcap(
      [base({ redcap_repeat_instance: "14", data_seg: "2026-08-02" })],
      [base({ redcap_repeat_instance: "14", data_seg: "2026-07-28" })],
    );
    expect(d.datasDivergentes).toHaveLength(1);
    expect(d.datasDivergentes[0]).toMatchObject({ atual: "2026-07-28", novo: "2026-08-02" });
    expect(d.substitui).toHaveLength(1); // continua contando como substituição
  });
});
