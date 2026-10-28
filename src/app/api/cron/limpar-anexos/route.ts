import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limparAnexosExpirados } from "@/lib/anexos/retencao";

// Node (não edge): usa service role. Vercel Cron chama diariamente (vercel.json).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Vercel Cron manda `Authorization: Bearer $CRON_SECRET`. Pra rodar à mão:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/limpar-anexos?dry=1
 * `?dry=1` só conta o que seria apagado, sem apagar nada.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dry") === "1";
  try {
    const resultado = await limparAnexosExpirados(createAdminClient(), {
      dryRun,
      prazoMs: 240_000,
    });
    console.info("[limpar-anexos]", JSON.stringify(resultado));
    return NextResponse.json({ ok: resultado.erros.length === 0, ...resultado });
  } catch (err) {
    const detalhe = err instanceof Error ? err.message : String(err);
    console.error("[limpar-anexos]", detalhe);
    return NextResponse.json({ ok: false, erro: detalhe }, { status: 500 });
  }
}
