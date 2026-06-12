import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extrai o texto de um PDF (laudo do HGE) a partir dos bytes baixados do
 * Telegram. Usa unpdf (pdf.js empacotado, sem dependência nativa — roda no
 * runtime Node do Vercel). Retorna todas as páginas concatenadas.
 */
export async function extrairTextoPdf(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: true });
  const text = result.text as unknown as string | string[];
  return Array.isArray(text) ? text.join("\n") : text;
}
