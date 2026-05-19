import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { OnlineBadge } from "./OnlineBadge";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full bg-paper safe-top">
      <div className="flex h-12 items-center justify-between px-5">
        <Link href="/plantoes" className="flex items-baseline gap-3 min-tap">
          <span className="font-display text-[22px] leading-none font-bold tracking-tight text-ink">
            LANC<span className="text-cobalt">.</span>
          </span>
          <span className="hidden xs:inline text-[10px] uppercase tracking-ultra text-ash">
            Coleta TCE
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <OnlineBadge />
          <button
            type="button"
            className="size-9 rounded-full border border-hairline flex items-center justify-center text-graphite hover:text-ink hover:border-cobalt/60 transition-colors"
            aria-label="Perfil"
          >
            <User className="h-4 w-4" strokeWidth={1.6} />
          </button>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="size-9 rounded-full flex items-center justify-center text-graphite hover:text-vermillion transition-colors min-tap"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.6} />
            </button>
          </form>
        </div>
      </div>
      <div className="h-px bg-hairline mx-5" />
    </header>
  );
}
