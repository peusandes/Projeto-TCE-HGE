import Link from "next/link";
import Image from "next/image";
import { LogOut, User } from "lucide-react";
import { OnlineBadge } from "./OnlineBadge";
import { getCurrentPesquisador } from "@/lib/data/pesquisadores";

export async function AppHeader() {
  const me = await getCurrentPesquisador();

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
          <Link
            href="/perfil"
            className="relative size-9 rounded-full overflow-hidden border border-hairline flex items-center justify-center text-graphite hover:text-ink hover:border-cobalt/60 transition-colors bg-paper-soft"
            aria-label="Perfil"
          >
            {me?.avatar_url ? (
              <Image
                src={me.avatar_url}
                alt={me.nome || "Perfil"}
                fill
                sizes="36px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <User className="h-4 w-4" strokeWidth={1.6} />
            )}
          </Link>
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
