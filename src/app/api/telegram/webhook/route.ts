import { NextResponse, type NextRequest } from "next/server";
import { webhookSecretOk, usuarioAutorizado } from "@/lib/telegram/auth";
import { sendMessage } from "@/lib/telegram/api";
import { handleUpdate, type TgUpdate } from "@/lib/exames/fluxo";
import { registrarUpdate } from "@/lib/exames/repo";

// Runtime Node (não edge): precisamos de Buffer/pdf.js e do service role.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RawUpdate = TgUpdate & { update_id?: number };

function fromId(u: RawUpdate): number | undefined {
  return u.message?.from?.id ?? u.callback_query?.from?.id;
}

function chatId(u: RawUpdate): number | undefined {
  return u.message?.chat?.id ?? u.callback_query?.message?.chat.id;
}

export async function POST(request: NextRequest) {
  if (!webhookSecretOk(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: RawUpdate;
  try {
    update = (await request.json()) as RawUpdate;
  } catch {
    return NextResponse.json({ ok: true }); // payload inválido: nada a fazer
  }

  // Sempre respondemos 200 pro Telegram não ficar reenviando.
  try {
    // Idempotência: ignora reentregas do mesmo update.
    if (typeof update.update_id === "number") {
      const novo = await registrarUpdate(update.update_id);
      if (!novo) return NextResponse.json({ ok: true });
    }

    const uid = fromId(update);
    if (!usuarioAutorizado(uid)) {
      const cid = chatId(update);
      if (cid) {
        await sendMessage(
          cid,
          "🔒 Você não está autorizado a usar este bot. Peça ao administrador para liberar seu ID do Telegram.",
        ).catch(() => {});
      }
      return NextResponse.json({ ok: true });
    }

    await handleUpdate(update);
  } catch (err) {
    const cid = chatId(update);
    const detalhe = err instanceof Error ? err.message : String(err);
    if (cid) {
      await sendMessage(cid, `❌ Erro ao processar: ${detalhe}`).catch(() => {});
    }
    console.error("[telegram-webhook]", detalhe);
  }

  return NextResponse.json({ ok: true });
}

// Healthcheck simples (abrir a URL no navegador).
export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram-webhook" });
}
