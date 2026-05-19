import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Página não encontrada — LANC TCE" };

export default function NotFound() {
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
          <p className="font-mono text-[10px] uppercase tracking-ultra text-ash">
            404 · Não encontrado
          </p>
          <h1 className="font-display text-[28px] leading-tight font-medium text-ink">
            Essa página sumiu
          </h1>
          <p className="text-[13px] text-graphite leading-relaxed">
            Talvez o plantão tenha sido excluído, ou o paciente removido. O
            link pode estar velho.
          </p>
        </div>

        <Link
          href="/plantoes"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-cobalt text-white text-[13px] font-medium hover:bg-cobalt/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Voltar pra plantões
        </Link>

        <p className="text-[10px] uppercase tracking-editorial text-ash pt-6">
          Liga Acadêmica de Neurocirurgia da Bahia
        </p>
      </div>
    </div>
  );
}
