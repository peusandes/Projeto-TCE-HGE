import Image from "next/image";

export const metadata = { title: "Offline — LANC TCE" };

export default function OfflinePage() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-paper-grain px-5 py-10">
      <div className="text-center space-y-6 max-w-sm">
        <Image
          src="/logo-lanc.png"
          alt="LANC"
          width={64}
          height={64}
          className="rounded-xl mx-auto opacity-60"
        />
        <div>
          <h1 className="font-display text-[32px] font-light text-ink leading-tight">
            Sem conexão<span className="font-display-italic text-ash">.</span>
          </h1>
          <p className="mt-3 text-[13px] text-graphite leading-relaxed">
            Você está offline. As últimas páginas visitadas continuam disponíveis no cache.
            Quando a internet voltar, esta tela vai recarregar automaticamente.
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-editorial text-ash">
          LANC · Coleta TCE
        </p>
      </div>
    </div>
  );
}
