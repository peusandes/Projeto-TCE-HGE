"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  imageSrc: string;
  imageAlt: string;
  /** Conteúdo extra renderizado abaixo do título (ex.: legenda). */
  legend?: React.ReactNode;
  /** Aspect ratio aproximado da imagem pra evitar layout shift. */
  aspectRatio?: number;
};

/**
 * Cartão expansível com mapa. Tocar abre/fecha; quando aberto, um botão
 * "ampliar" abre o mapa em fullscreen pra olhar de perto.
 */
export function MapaCollapsible({
  title,
  subtitle,
  imageSrc,
  imageAlt,
  legend,
  aspectRatio = 16 / 10,
}: Props) {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "rounded-xl border bg-paper-soft overflow-hidden transition-colors",
          open ? "border-cobalt/40" : "border-hairline hover:border-cobalt/30",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left min-tap"
          aria-expanded={open}
        >
          <span
            className={cn(
              "size-8 rounded-md flex items-center justify-center shrink-0 transition-colors",
              open
                ? "bg-cobalt text-white"
                : "bg-paper border border-hairline text-cobalt-soft",
            )}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                open && "rotate-180",
              )}
              strokeWidth={2}
            />
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="text-[14px] font-semibold text-ink leading-tight">
              {title}
            </h4>
            {subtitle && (
              <p className="text-[11px] text-ash leading-tight mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </button>

        {open && (
          <div className="px-4 pb-4 pt-1 space-y-3 animate-in fade-in slide-in-from-top-1">
            {legend && (
              <div className="text-[12px] text-graphite leading-relaxed">
                {legend}
              </div>
            )}
            <div className="relative bg-paper rounded-lg overflow-hidden border border-hairline">
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="absolute top-2 right-2 z-10 size-9 rounded-md bg-paper-deep/90 backdrop-blur border border-hairline flex items-center justify-center text-ink hover:bg-paper-deep transition-colors shadow-sm"
                aria-label="Ampliar mapa"
              >
                <Maximize2 className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={1600}
                height={Math.round(1600 / aspectRatio)}
                className="w-full h-auto"
                priority={false}
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>
            <p className="text-[10px] uppercase tracking-editorial text-ash text-center">
              Toque na imagem ou no ícone pra ampliar
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen viewer */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-paper-deep/95 backdrop-blur flex flex-col safe-top safe-bottom animate-in fade-in"
          onClick={() => setFullscreen(false)}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
            <h3 className="text-[14px] font-semibold text-ink truncate flex-1">
              {title}
            </h3>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="size-10 rounded-md bg-paper border border-hairline flex items-center justify-center text-ink hover:bg-paper-soft transition-colors shrink-0"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" strokeWidth={1.8} />
            </button>
          </div>
          <div
            className="flex-1 overflow-auto p-4 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={2400}
              height={Math.round(2400 / aspectRatio)}
              className="max-w-full h-auto rounded-lg shadow-2xl bg-paper"
              priority
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </>
  );
}
