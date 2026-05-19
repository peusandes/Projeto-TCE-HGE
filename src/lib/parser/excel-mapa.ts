import * as XLSX from "xlsx";
import type { Setor, Situacao, TcleStatus } from "@/lib/domain/enums";

export type ExcelParseResult = {
  pesquisadores: string[];
  pacientes: Array<{
    nome: string;
    setor: Setor;
    leito: string | null;
    situacao: Situacao;
    tcle_status: TcleStatus;
    descricao: string | null;
    comentarios: string | null;
  }>;
  warnings: string[];
};

const SETOR_PATTERNS: Array<{ re: RegExp; setor: Setor }> = [
  { re: /^OBSERVA[CÇ][AÃ]O/i, setor: "OBSERVACAO_1" },
  { re: /^UNIDADE INTERMEDI[AÁ]RIA 2.*3|^UI\s*2.*3/i, setor: "UI2_3" },
  { re: /^UNIDADE INTERMEDI[AÁ]RIA 1|^UI\s*1/i, setor: "UI1" },
  { re: /^UTI\s*(?:I{3}|3)/i, setor: "UTI_3" },
  { re: /^UTI\s*(?:I{2}|2)/i, setor: "UTI_2" },
  { re: /^UTI\s*(?:I|1)/i, setor: "UTI_1" },
  { re: /^TRM/i, setor: "TRM" },
  { re: /^FORA DO MAPA/i, setor: "FORA_DO_MAPA" },
  { re: /^ALTAS?/i, setor: "ALTAS" },
];

function detectSetor(text: string): Setor | null {
  const t = text.trim();
  for (const { re, setor } of SETOR_PATTERNS) {
    if (re.test(t)) return setor;
  }
  return null;
}

function normalizeSituacao(raw: string | undefined): Situacao {
  const s = (raw ?? "").trim().toLowerCase();
  if (s.startsWith("adm")) return "ADM";
  if (s.startsWith("seg")) return "SEG";
  if (s.startsWith("excl")) return "EXCLUSAO";
  if (s.startsWith("alta")) return "ALTA";
  return "ADM";
}

function normalizeTcle(raw: string | undefined): TcleStatus {
  const s = (raw ?? "").trim().toUpperCase();
  if (s.startsWith("ASS")) return "ASSINADO";
  if (s.startsWith("REC")) return "RECUSADO";
  if (s.startsWith("PEND")) return "PENDENTE";
  if (s === "" || s === "-" || s === "N/A") return "NA";
  return "PENDENTE";
}

function parsePesquisadores(line: string): string[] {
  const match = line.match(/Pesquisadores?:\s*(.+)/i);
  if (!match) return [];
  return match[1]
    .split(/,| e | & /i)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function parseExcelMapa(buffer: ArrayBuffer): ExcelParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: false,
  });

  const result: ExcelParseResult = {
    pesquisadores: [],
    pacientes: [],
    warnings: [],
  };

  if (!rows.length) {
    result.warnings.push("Planilha vazia.");
    return result;
  }

  const firstRow = (rows[0] ?? []).map((c) => String(c ?? "")).join(" ");
  result.pesquisadores = parsePesquisadores(firstRow);

  // Detecta linha de cabeçalho (procura por "Leito" + "Identificação")
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i] ?? [];
    const cells = row.map((c) => String(c ?? "").toLowerCase());
    if (cells.includes("leito") && cells.some((c) => c.includes("identif"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    result.warnings.push("Cabeçalho não encontrado (esperado: Leito | Identificação | Situação | ...). Assumindo linha 2.");
    headerIdx = 1;
  }

  let currentSetor: Setor = "FORA_DO_MAPA";
  let setorJaDetectado = false;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const colA = String(row[0] ?? "").trim();
    const colB = String(row[1] ?? "").trim();
    const colC = String(row[2] ?? "").trim();
    const colE = String(row[4] ?? "").trim();
    const colF = String(row[5] ?? "").trim();
    const colG = String(row[6] ?? "").trim();

    const allEmpty = !colA && !colB && !colC && !colE && !colF && !colG;
    if (allEmpty) continue;

    // Linha de setor: só a coluna A preenchida E bate um padrão de setor
    const setorDetect = detectSetor(colA);
    if (setorDetect && !colB && !colC) {
      currentSetor = setorDetect;
      setorJaDetectado = true;
      continue;
    }

    // Paciente sem nome → ignora
    if (!colB) continue;

    if (!setorJaDetectado) {
      result.warnings.push(`Linha ${i + 1}: paciente "${colB}" sem setor definido acima — colocando em FORA_DO_MAPA.`);
    }

    result.pacientes.push({
      nome: colB,
      setor: currentSetor,
      leito: colA || null,
      situacao: normalizeSituacao(colC),
      tcle_status: normalizeTcle(colE),
      descricao: colF || null,
      comentarios: colG || null,
    });
  }

  return result;
}
