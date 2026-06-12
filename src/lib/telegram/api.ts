/**
 * Cliente mínimo da Bot API do Telegram. Só o que o bot de exames precisa:
 * mandar mensagem, mandar com botões inline, responder callback e baixar o
 * arquivo enviado. Token vem de TELEGRAM_BOT_TOKEN (server-only).
 */

const API = "https://api.telegram.org";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN ausente no ambiente.");
  return t;
}

export type InlineButton = { text: string; callback_data: string };

async function call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} falhou: ${json.description ?? res.status}`);
  return json.result as T;
}

export async function sendMessage(
  chatId: number,
  text: string,
  opts: { buttons?: InlineButton[][] } = {},
): Promise<void> {
  await call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(opts.buttons ? { reply_markup: { inline_keyboard: opts.buttons } } : {}),
  });
}

export async function answerCallbackQuery(id: string, text?: string): Promise<void> {
  await call("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });
}

/** Remove os botões de uma mensagem (após o usuário escolher uma opção). */
export async function clearButtons(chatId: number, messageId: number): Promise<void> {
  try {
    await call("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
  } catch {
    // não-fatal
  }
}

/** Baixa um arquivo do Telegram (getFile → download) e devolve os bytes. */
export async function downloadFile(fileId: string): Promise<ArrayBuffer> {
  const file = await call<{ file_path: string }>("getFile", { file_id: fileId });
  const res = await fetch(`${API}/file/bot${token()}/${file.file_path}`);
  if (!res.ok) throw new Error(`Download do arquivo falhou: ${res.status}`);
  return res.arrayBuffer();
}
