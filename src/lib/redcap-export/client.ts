import type { RedcapRecord } from "./transform";

/**
 * Cliente da API REST do REDCap — só o método de IMPORT de registros.
 * Token e URL ficam em env (server-only): REDCAP_API_URL, REDCAP_API_TOKEN.
 *
 * SEGURANÇA:
 *  - overwriteBehavior=normal → só preenche o que enviamos; NUNCA apaga campos
 *    já existentes no REDCap.
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

/** Tenta extrair o record_id atribuído pela auto-numeração do REDCap. */
function parseAutoId(json: unknown): string | undefined {
  // returnContent=auto_ids costuma vir como ["enviado,atribuido", ...].
  if (Array.isArray(json) && json.length > 0) {
    const first = json[0];
    if (typeof first === "string") {
      const partes = first.split(",");
      return (partes[1] ?? partes[0])?.trim() || undefined;
    }
    if (first && typeof first === "object") {
      const o = first as Record<string, unknown>;
      const v = o.record_id ?? o.id ?? Object.values(o)[0];
      return v != null ? String(v) : undefined;
    }
  }
  return undefined;
}

export type ImportResult = { count: number; novoRecordId?: string };

/**
 * Importa registros pro REDCap. Com forceAutoNumber=true (paciente novo), o
 * REDCap ignora o record_id enviado, atribui um novo e o retornamos.
 */
export async function importarRegistros(
  records: RedcapRecord[],
  opts: { forceAutoNumber?: boolean } = {},
): Promise<ImportResult> {
  const { url, token } = config();

  const body = new URLSearchParams({
    token,
    content: "record",
    action: "import",
    format: "json",
    type: "flat",
    overwriteBehavior: "normal",
    returnContent: opts.forceAutoNumber ? "auto_ids" : "count",
    data: JSON.stringify(records),
  });
  if (opts.forceAutoNumber) body.set("forceAutoNumber", "true");

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`REDCap recusou a importação (${res.status}): ${text.slice(0, 500)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inesperada do REDCap: ${text.slice(0, 300)}`);
  }

  if (opts.forceAutoNumber) {
    return { count: 1, novoRecordId: parseAutoId(json) };
  }
  const count = (json as { count?: number })?.count;
  return { count: typeof count === "number" ? count : 0 };
}
