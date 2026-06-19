import type { RedcapRecord } from "./transform";

/**
 * Cliente da API REST do REDCap — import + checagens read-only.
 * Token e URL ficam em env (server-only): REDCAP_API_URL, REDCAP_API_TOKEN.
 *
 * SEGURANÇA:
 *  - overwriteBehavior=normal → só preenche o que enviamos; NUNCA apaga campos
 *    já existentes no REDCap.
 *  - O record_id deste projeto é o NOME do paciente (sem auto-numeração). Criar =
 *    importar com record_id=nome. `recordExiste` permite barrar a criação quando
 *    o nome já existe (legado/homônimo), pra nunca sobrescrever.
 *  - O import só afeta os record_id presentes em `records` (garantido por
 *    assertRecordIdUnico antes de chamar aqui).
 */

export function redcapConfigurado(): boolean {
  return Boolean(process.env.REDCAP_API_URL && process.env.REDCAP_API_TOKEN);
}

function config(): { url: string; token: string } {
  const url = process.env.REDCAP_API_URL;
  const token = process.env.REDCAP_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "API do REDCap não configurada — defina REDCAP_API_URL e REDCAP_API_TOKEN no ambiente (Vercel).",
    );
  }
  return { url, token };
}

async function postForm(fields: Record<string, string>): Promise<{ status: number; text: string }> {
  const { url, token } = config();
  const body = new URLSearchParams({ token, format: "json", returnFormat: "json", ...fields });
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  return { status: res.status, text: await res.text() };
}

/**
 * Lê a configuração do projeto REDCap. Usado como TRAVA defensiva: este fluxo
 * assume record_id = nome (auto-numeração DESLIGADA). Se autonumber estiver
 * ligado, a action aborta.
 */
export async function getProjectInfo(): Promise<{ autonumber: boolean; longitudinal: boolean }> {
  const { status, text } = await postForm({ content: "project" });
  if (status < 200 || status >= 300) {
    throw new Error(`REDCap (project info) falhou (${status}): ${text.slice(0, 300)}`);
  }
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Resposta inesperada do REDCap (project info): ${text.slice(0, 200)}`);
  }
  const truthy = (v: unknown) => v === 1 || v === "1" || v === true;
  return {
    autonumber: truthy(j.record_autonumbering_enabled),
    longitudinal: truthy(j.is_longitudinal),
  };
}

/**
 * Confere se um record (por nome) JÁ EXISTE no REDCap. Read-only — exporta só o
 * campo record_id daquele id. Usado pra NUNCA sobrescrever um registro existente
 * (legado/homônimo) ao criar. Requer permissão de Export no token.
 */
export async function recordExiste(recordId: string): Promise<boolean> {
  const { status, text } = await postForm({
    content: "record",
    action: "export",
    type: "flat",
    "records[0]": recordId,
    "fields[0]": "record_id",
  });
  if (status < 200 || status >= 300) {
    throw new Error(`REDCap (checar existência) falhou (${status}): ${text.slice(0, 300)}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inesperada do REDCap (existência): ${text.slice(0, 200)}`);
  }
  return Array.isArray(json) && json.length > 0;
}

export type ImportResult = { count: number };

/**
 * Importa registros pro REDCap (overwriteBehavior=normal — nunca apaga).
 * SEM auto-numeração: o record_id enviado (o nome) é o id usado/criado.
 */
export async function importarRegistros(records: RedcapRecord[]): Promise<ImportResult> {
  const { status, text } = await postForm({
    content: "record",
    action: "import",
    type: "flat",
    overwriteBehavior: "normal",
    returnContent: "count",
    data: JSON.stringify(records),
  });
  if (status < 200 || status >= 300) {
    throw new Error(`REDCap recusou a importação (${status}): ${text.slice(0, 500)}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inesperada do REDCap: ${text.slice(0, 300)}`);
  }
  const count = (json as { count?: number })?.count;
  return { count: typeof count === "number" ? count : 0 };
}
