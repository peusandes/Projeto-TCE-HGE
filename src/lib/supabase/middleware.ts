import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/offline"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const isSetup = path.startsWith("/auth/setup-account");
  const isAdminRoute = path.startsWith("/admin");

  // Não autenticado tentando entrar em rota privada → login
  if (!user && !isPublic && !isSetup) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/plantoes";
    return NextResponse.redirect(url);
  }

  // Usuário logado mas sem setup concluído → /auth/setup-account
  if (user && !isSetup && !isPublic) {
    const { data: pesquisador } = await supabase
      .from("pesquisadores")
      .select("setup_complete, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (pesquisador && !pesquisador.setup_complete) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/setup-account";
      return NextResponse.redirect(url);
    }

    // Gate de rotas admin
    if (isAdminRoute && !pesquisador?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/plantoes";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
