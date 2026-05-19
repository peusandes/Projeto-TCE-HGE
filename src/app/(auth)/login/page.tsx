import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar — LANC TCE" };

export default function LoginPage() {
  return (
    <div className="min-h-svh flex flex-col bg-paper-grain">
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
          <LoginForm />
          <p className="mt-5 text-center text-[11px] text-ash leading-relaxed max-w-[280px] mx-auto">
            Acesso restrito a pesquisadores cadastrados.
            <br />
            Solicite seu acesso ao coordenador da LANC.
          </p>
          <p className="mt-8 text-center text-[10px] uppercase tracking-editorial text-ash">
            Liga Acadêmica de Neurocirurgia da Bahia
          </p>
        </div>
      </div>
    </div>
  );
}
