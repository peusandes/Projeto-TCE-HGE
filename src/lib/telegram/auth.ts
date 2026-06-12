/**
 * Autorização do webhook do Telegram.
 *
 *  - Segredo do webhook: o Telegram envia o header
 *    `X-Telegram-Bot-Api-Secret-Token` igual ao que registramos no setWebhook.
 *    Bloqueia quem chamar a URL sem ser o Telegram.
 *  - Allowlist de usuários: só IDs numéricos listados em
 *    TELEGRAM_ALLOWED_USER_IDS (separados por vírgula) podem mandar exames.
 */

export function webhookSecretOk(req: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true; // sem segredo configurado, não bloqueia (dev)
  return req.headers.get("x-telegram-bot-api-secret-token") === expected;
}

/**
 * Allowlist estática por env (opcional, p/ "admins" fixos). O acesso normal é
 * por código compartilhado (self-enrollment na tabela telegram_users) — ver
 * garantirAcesso() em lib/exames/fluxo.ts.
 */
export function usuarioNaEnvAllowlist(userId: number | undefined | null): boolean {
  if (userId == null) return false;
  const raw = process.env.TELEGRAM_ALLOWED_USER_IDS;
  if (!raw || raw.trim() === "") return false;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(String(userId));
}
