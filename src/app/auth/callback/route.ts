import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Supabase tem dois formatos de link de email:
 *  - Antigo (PKCE): ?code=xxx               → exchangeCodeForSession
 *  - Novo (OTP):    ?token_hash=xxx&type=…  → verifyOtp
 * Projeto novo (~2024+) usa o formato OTP por default. Sem tratar isso, o
 * link do convite cai no fallback `/login?error` e o pesquisador acha que
 * tem que se cadastrar / logar.
 *
 * `next` é validado contra open-redirect (sem // pra outro host).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get("next"), "/plantoes");

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&detail=${encodeURIComponent(error.message)}`,
    );
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&detail=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&detail=no_token`);
}
