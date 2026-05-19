"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Users, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/plantoes", label: "Plantões", icon: ClipboardList },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/manual", label: "Manual", icon: BookOpen },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-40 w-full bg-paper border-t border-hairline safe-bottom">
      <div className="grid grid-cols-3">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
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
