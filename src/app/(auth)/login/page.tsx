import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar — LANC TCE" };

// useSearchParams() no LoginForm força CSR — força a página inteira
// a ser dinâmica também (evita prerender error no build da Vercel).
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-paper-grain">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-4 mb-10">
            <Image
              src="/logo-lanc.png"
              alt="LANC"
              width={84}
              height={84}
              className="rounded-2xl shadow-[0_8px_24px_-12px_rgba(10,22,40,0.4)]"
              priority
            />
            <div className="text-center">
              <h1 className="font-display text-[28px] leading-none font-medium text-ink">
                LANC<span className="text-cobalt">.</span>
              </h1>
              <p className="font-display-italic text-[14px] text-graphite mt-2">
                Coleta TCE · HGE
              </p>
            </div>
          </div>
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
          <p className="mt-5 text-center text-[11px] text-ash leading-relaxed max-w-[280px] mx-auto">
            Acesso restrito a pesquisadores cadastrados.
            <br />
            Solicite seu acesso a Pedro Sandes Pereira.
          </p>
          <p className="mt-8 text-center text-[10px] uppercase tracking-editorial text-ash">
            Liga Acadêmica de Neurocirurgia da Bahia
          </p>

          {/* Crédito do desenvolvedor — exposto na tela de login */}
          <div className="mt-10 flex flex-col items-center gap-1">
            <span className="text-[9px] uppercase tracking-ultra text-ash">
              Desenvolvido por
            </span>
            <span className="font-display-italic text-[13px] text-saffron">
              Pedro Sandes Pereira
            </span>
            <span className="font-mono text-[10px] text-saffron/70">2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="rounded-2xl border border-hairline bg-paper p-6 space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-12 bg-hairline rounded" />
        <div className="h-11 bg-paper-soft rounded-md" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-12 bg-hairline rounded" />
        <div className="h-11 bg-paper-soft rounded-md" />
      </div>
      <div className="h-12 bg-cobalt/40 rounded-md" />
    </div>
  );
}
