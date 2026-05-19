"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, ArrowLeft } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log no console pra ficar visível no Vercel runtime logs.
    // eslint-disable-next-line no-console
    console.error("[lanc-error]", error);
    // Envia pro Sentry — no-op se DSN não estiver setado.
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-paper-grain px-5 py-10">
      <div className="w-full max-w-sm text-center space-y-6">
        <Image
          src="/logo-lanc.png"
          alt="LANC"
          width={64}
          height={64}
          className="mx-auto rounded-2xl opacity-60"
          priority
        />

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-vermillion">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
            <p className="font-mono text-[10px] uppercase tracking-ultra">
              Algo deu errado
            </p>
          </div>
          <h1 className="font-display text-[28px] leading-tight font-medium text-ink">
            Tropeçamos aqui
          </h1>
          <p className="text-[13px] text-graphite leading-relaxed">
            Foi algo do servidor ou da conexão. Suas mudanças salvas ainda
            estão seguras no Supabase / na fila offline. Pode tentar de novo
            ou voltar pra tela inicial.
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] text-ash pt-2">
              ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 items-stretch">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-md bg-cobalt text-white text-[13px] font-medium hover:bg-cobalt/90 transition-colors"
          >
            <RefreshCcw className="h-4 w-4" strokeWidth={1.8} />
            Tentar de novo
          </button>
          <Link
            href="/plantoes"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-md border border-hairline text-[13px] font-medium text-graphite hover:bg-paper-soft transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Voltar pra plantões
          </Link>
        </div>

        <p className="text-[10px] uppercase tracking-editorial text-ash pt-2">
          Se persistir, fale com Pedro Sandes Pereira.
        </p>
      </div>
    </div>
  );
}
