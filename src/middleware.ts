import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Exclui a rota do webhook do Telegram: ela se autentica pelo segredo +
    // service role; passar pelo middleware de sessão a redirecionava pra
    // /login (307), e o Telegram não segue redirect. O mesmo vale pro
    // Vercel Cron (api/cron), que se autentica com CRON_SECRET.
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js|api/telegram/webhook|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
