"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Users, BookOpen, CalendarDays, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

// `match` = prefixo de rota pra marcar como ativo (href é o destino do link).
const ITEMS = [
  { href: "/plantoes", label: "Plantões", icon: ClipboardList, match: "/plantoes" },
  { href: "/pacientes", label: "Pacientes", icon: Users, match: "/pacientes" },
  { href: "/estagio/escala", label: "Estágio", icon: CalendarDays, match: "/estagio" },
  { href: "/projeto-tce/hs", label: "TCE", icon: Stethoscope, match: "/projeto-tce" },
  { href: "/manual", label: "Manual", icon: BookOpen, match: "/manual" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-40 w-full bg-paper border-t border-hairline safe-bottom">
      <div className="grid grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = pathname.startsWith(match);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1.5 py-3 min-tap"
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  active ? "text-cobalt" : "text-ash",
                )}
                strokeWidth={1.6}
              />
              <span
                className={cn(
                  "text-[10px] uppercase tracking-editorial font-medium transition-colors",
                  active ? "text-cobalt" : "text-ash",
                )}
              >
                {label}
              </span>
              <span
                className={cn(
                  "block h-[2px] w-5 rounded-full transition-colors",
                  active ? "bg-cobalt" : "bg-transparent",
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
