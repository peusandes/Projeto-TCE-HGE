/**
 * Blindagem de plausibilidade dos valores laboratoriais / sinais vitais.
 *
 * Motivação: às vezes um PDF errado (outro exame) é mandado pro bot e o parser
 * extrai um número de magnitude absurda — ex.: hemácias = 0.0059 (era outro
 * campo) ou sódio = 26. Estas faixas NÃO são faixas de normalidade clínica —
 * são limites fisiológicos GROSSEIROS, largos de propósito, só pra pegar
 * "exame trocado / unidade errada / dígito a mais". Valor fora da faixa não é
 * bloqueado em lugar nenhum: vira uma CONFIRMAÇÃO ("tem certeza? enviar mesmo
 * assim?"), respeitando a filosofia do projeto (dado de pesquisa é bagunçado).
 *
 * Fonte ÚNICA de verdade, importada pelos 3 pontos: site (warning inline +
 * confirmação ao concluir), envio ao REDCap (gate no preview/ação) e bot do
 * Telegram (confirmação antes de gravar).
 *
 * As unidades seguem como o valor é ARMAZENADO no app (ver parse-laudo.ts):
 *  - leucograma/neutrófilos/linfócitos/eosinófilos/bastões em 10³/µL (÷1000)
 *  - plaquetas em mil/µL (ex.: 193, não 193000)
 *  - hemácias em 10⁶/µL; demais como impresso no laudo.
 */

export type Faixa = {
  /** Mínimo plausível (inclusive). */
  min: number;
  /** Máximo plausível (inclusive). */
  max: number;
  /** Rótulo curto pra mensagem (ex.: "Hemácias"). */
  rotulo: string;
  /** Unidade pra exibição (opcional). */
  unidade?: string;
};

// Faixas por CONCEITO (base). Cada conceito vale pra todas as variantes de
// instrumento (_seg, _alta, _adm…) via CAMPO_BASE abaixo. Limites largos: a
// ideia é pegar absurdo, não anormalidade clínica.
export const FAIXAS_PLAUSIVEIS: Record<string, Faixa> = {
  // ── Hemograma ──────────────────────────────────────────────────────────────
  hemacias: { min: 2, max: 8, rotulo: "Hemácias", unidade: "10⁶/µL" },
  hemoglobina: { min: 3, max: 22, rotulo: "Hemoglobina", unidade: "g/dL" },
  hematocrito: { min: 9, max: 65, rotulo: "Hematócrito", unidade: "%" },
  // ── Leucograma (10³/µL) ─────────────────────────────────────────────────────
  leucograma: { min: 0.1, max: 200, rotulo: "Leucograma", unidade: "10³/µL" },
  neutrofilos: { min: 0, max: 200, rotulo: "Neutrófilos", unidade: "10³/µL" },
  linfocitos: { min: 0, max: 200, rotulo: "Linfócitos", unidade: "10³/µL" },
  eosinofilos: { min: 0, max: 100, rotulo: "Eosinófilos", unidade: "10³/µL" },
  bastoes: { min: 0, max: 100, rotulo: "Bastões", unidade: "10³/µL" },
  // ── Coagulação ──────────────────────────────────────────────────────────────
  plaquetas: { min: 1, max: 2000, rotulo: "Plaquetas", unidade: "mil/µL" },
  ttpa: { min: 10, max: 250, rotulo: "TTPa", unidade: "s" },
  rni: { min: 0.5, max: 20, rotulo: "RNI", unidade: "" },
  // ── Bioquímica / eletrólitos / gaso ─────────────────────────────────────────
  sodio: { min: 105, max: 180, rotulo: "Sódio", unidade: "mEq/L" },
  potassio: { min: 1.5, max: 9.5, rotulo: "Potássio", unidade: "mEq/L" },
  calcio: { min: 4, max: 16, rotulo: "Cálcio", unidade: "mg/dL" },
  bicarbonato: { min: 3, max: 50, rotulo: "Bicarbonato", unidade: "mEq/L" },
  creatinina: { min: 0.1, max: 25, rotulo: "Creatinina", unidade: "mg/dL" },
  ureia: { min: 3, max: 500, rotulo: "Ureia", unidade: "mg/dL" },
  lactato: { min: 0.1, max: 300, rotulo: "Lactato", unidade: "" },
  cpk: { min: 1, max: 600000, rotulo: "CPK", unidade: "U/L" },
  hgt: { min: 10, max: 1500, rotulo: "HGT/Glicemia", unidade: "mg/dL" },
  // ── Sinais vitais (admissão) ────────────────────────────────────────────────
  pas: { min: 40, max: 320, rotulo: "PAS", unidade: "mmHg" },
  pad: { min: 20, max: 220, rotulo: "PAD", unidade: "mmHg" },
  fc: { min: 10, max: 320, rotulo: "FC", unidade: "bpm" },
  spo2: { min: 40, max: 100, rotulo: "SpO₂", unidade: "%" },
  fr: { min: 3, max: 90, rotulo: "FR", unidade: "irpm" },
  temperatura: { min: 28, max: 44, rotulo: "Temperatura", unidade: "°C" },
};

// Cada variável real (com sufixo de instrumento) → conceito. Explícito de
// propósito: nomes irregulares (hemoglobinas_alta plural, bicarbonato_variable,
// primeiro_hgt_dia_alta) não casam por simples remoção de sufixo.
export const CAMPO_BASE: Record<string, string> = {
  // sinais vitais
  pas_adm: "pas",
  pad_adm: "pad",
  fc_adm: "fc",
  spo2_adm: "spo2",
  fr_adm: "fr",
  temperatura_adm: "temperatura",
  // seguimento
  hemacias_seg: "hemacias",
  hemoglobina_seg: "hemoglobina",
  hematocrito_seg: "hematocrito",
  leucograma_total_seg: "leucograma",
  neutrofilos_seg: "neutrofilos",
  linfocitos_seg: "linfocitos",
  eosinofilos_seg: "eosinofilos",
  bastoes_seg: "bastoes",
  plaquetas_seg: "plaquetas",
  ttpa_seg: "ttpa",
  rni_seg: "rni",
  hgt_seg: "hgt",
  bicarbonato_seg: "bicarbonato",
  creatinina_seg: "creatinina",
  ureia_seg: "ureia",
  sodio_seg: "sodio",
  calcio_seg: "calcio",
  potassio_seg: "potassio",
  lactato_seg: "lactato",
  cpk_seg: "cpk",
  // alta (nomes legados, alguns no plural / técnicos)
  hemacias_alta: "hemacias",
  hemoglobinas_alta: "hemoglobina",
  hematocritos_alta: "hematocrito",
  leucograma_total_alta: "leucograma",
  neutrofilos_alta: "neutrofilos",
  linfocitos_alta: "linfocitos",
  eosinofilos_alta: "eosinofilos",
  bastoes_alta: "bastoes",
  plaquetas_alta: "plaquetas",
  ttpa_alta: "ttpa",
  rni_alta: "rni",
  primeiro_hgt_dia_alta: "hgt",
  bicarbonato_variable: "bicarbonato",
  creatinina_alta: "creatinina",
  ureia_alta: "ureia",
  sodio_alta: "sodio",
  calcio_alta: "calcio",
  potassio_alta: "potassio",
  lactato_alta: "lactato",
  cpk_alta: "cpk",
};

export type ValorSuspeito = {
  /** Nome real do campo (com sufixo). */
  campo: string;
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  unidade?: string;
  motivo: "baixo" | "alto";
};

/** Converte o valor armazenado (string PONTO, ou número) pra number. */
function paraNumero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  // Aceita decimal com vírgula (BR) por segurança, mesmo que o app use ponto.
  const normalizado = s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s.replace(/,/g, "");
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/** Resolve a faixa de um campo (pelo conceito). null se o campo não é blindado. */
export function faixaDoCampo(campo: string): Faixa | null {
  const base = CAMPO_BASE[campo];
  return base ? FAIXAS_PLAUSIVEIS[base] ?? null : null;
}

/**
 * Checa UM campo. Retorna o suspeito ou null (ok / fora de escopo / vazio /
 * não-numérico — não inventa suspeita sobre o que não dá pra avaliar).
 */
export function checarValor(campo: string, valor: unknown): ValorSuspeito | null {
  const faixa = faixaDoCampo(campo);
  if (!faixa) return null;
  const n = paraNumero(valor);
  if (n === null) return null;
  if (n < faixa.min) {
    return { campo, rotulo: faixa.rotulo, valor: n, min: faixa.min, max: faixa.max, unidade: faixa.unidade, motivo: "baixo" };
  }
  if (n > faixa.max) {
    return { campo, rotulo: faixa.rotulo, valor: n, min: faixa.min, max: faixa.max, unidade: faixa.unidade, motivo: "alto" };
  }
  return null;
}

/** Varre um objeto de dados e devolve todos os valores fora de faixa. */
export function checarDados(dados: Record<string, unknown>): ValorSuspeito[] {
  const out: ValorSuspeito[] = [];
  for (const [campo, valor] of Object.entries(dados)) {
    const s = checarValor(campo, valor);
    if (s) out.push(s);
  }
  return out;
}

function fmtUnidade(u?: string): string {
  return u ? ` ${u}` : "";
}

/** Mensagem curta e direta pra exibir o suspeito (site / bot / dialog). */
export function mensagemSuspeito(s: ValorSuspeito): string {
  const limite = s.motivo === "baixo" ? `mínimo ${s.min}` : `máximo ${s.max}`;
  return `${s.rotulo} = ${s.valor}${fmtUnidade(s.unidade)} — ${
    s.motivo === "baixo" ? "abaixo do" : "acima do"
  } ${limite} plausível. Confira se não é outro exame.`;
}
