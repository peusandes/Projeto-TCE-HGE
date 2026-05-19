"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  url?: string;
  urlLabel?: string;
  login: string;
  password: string;
  /** Nota extra renderizada abaixo das credenciais (ex.: "tudo minúsculo"). */
  note?: string;
  /** Cor de destaque do card. */
  accent?: "cobalt" | "saffron" | "moss" | "plum" | "vermillion";
};

const ACCENT_RING: Record<NonNullable<Props["accent"]>, string> = {
  cobalt: "border-cobalt/25 bg-cobalt/[0.04]",
  saffron: "border-saffron/30 bg-saffron/[0.06]",
  moss: "border-moss/25 bg-moss/[0.05]",
  plum: "border-plum/25 bg-plum/[0.05]",
  vermillion: "border-vermillion/25 bg-vermillion/[0.05]",
};

const ACCENT_DOT: Record<NonNullable<Props["accent"]>, string> = {
  cobalt: "bg-cobalt",
  saffron: "bg-saffron",
  moss: "bg-moss",
  plum: "bg-plum",
  vermillion: "bg-vermillion",
};

export function CredentialCard({
  title,
  url,
  urlLabel,
  login,
  password,
  note,
  accent = "cobalt",
}: Props) {
  const [showPass, setShowPass] = useState(false);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`, { duration: 1500 });
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", ACCENT_RING[accent])}>
      <div className="flex items-center gap-2">
        <span className={cn("size-1.5 rounded-full", ACCENT_DOT[accent])} />
        <h4 className="text-[13px] font-semibold text-ink leading-none">{title}</h4>
      </div>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-2 rounded-md border border-hairline bg-paper px-3 py-2 hover:border-cobalt/60 transition-colors"
        >
          <span className="text-[12px] text-cobalt-soft font-mono truncate">
            {urlLabel ?? url}
          </span>
          <ExternalLink className="h-3.5 w-3.5 text-ash group-hover:text-cobalt-soft shrink-0" />
        </a>
      )}

      <div className="grid grid-cols-[auto,1fr,auto] items-center gap-x-3 gap-y-2 text-[12px]">
        {/* LOGIN */}
        <span className="text-[10px] uppercase tracking-editorial text-ash">Login</span>
        <code className="font-mono text-ink truncate select-all">{login}</code>
        <CopyBtn onClick={() => copy(login, "Login")} ariaLabel="Copiar login" />

        {/* SENHA */}
        <span className="text-[10px] uppercase tracking-editorial text-ash">Senha</span>
        <div className="flex items-center gap-1.5 min-w-0">
          <code className="font-mono text-ink truncate select-all">
            {showPass ? password : "•".repeat(Math.max(password.length, 6))}
          </code>
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="size-7 rounded-md text-ash hover:text-ink flex items-center justify-center shrink-0"
            aria-label={showPass ? "Esconder senha" : "Mostrar senha"}
          >
            {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <CopyBtn onClick={() => copy(password, "Senha")} ariaLabel="Copiar senha" />
      </div>

      {note && (
        <p className="text-[11px] text-graphite leading-snug italic">{note}</p>
      )}
    </div>
  );
}

function CopyBtn({ onClick, ariaLabel }: { onClick: () => void; ariaLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        onClick();
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        "size-7 rounded-md border flex items-center justify-center shrink-0 transition-colors",
        copied
          ? "border-moss/60 bg-moss/10 text-moss"
          : "border-hairline bg-paper text-ash hover:text-cobalt-soft hover:border-cobalt/50",
      )}
      aria-label={ariaLabel}
    >
      {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
