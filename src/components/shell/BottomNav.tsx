"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Users, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_ITEMS = [
  { href: "/plantoes", label: "Plantões", icon: ClipboardList },
  { href: "/pacientes", label: "Pacientes", icon: Users },
];

const ADMIN_ITEM = { href: "/admin/pesquisadores", label: "Admin", icon: Shield };

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS;
  return (
    <nav className="sticky bottom-0 z-40 w-full bg-paper border-t border-hairline safe-bottom">
      <div className={cn("grid", isAdmin ? "grid-cols-3" : "grid-cols-2")}>
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin/pesquisadores"
              ? pathname.startsWith("/admin")
              : pathname.startsWith(href);
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
