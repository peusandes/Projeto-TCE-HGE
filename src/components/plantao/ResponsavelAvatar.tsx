import Image from "next/image";
import { cn } from "@/lib/utils";

export type ResponsavelInfo = {
  id: string;
  nome: string;
  avatar_url: string | null;
};

function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Avatar redondo do responsável. Se tem avatar_url usa Image (não otimizado
 * porque vem do Supabase Storage); senão mostra iniciais em fundo cobalt.
 * Tamanhos: xs=16, sm=20, md=28.
 */
export function ResponsavelAvatar({
  responsavel,
  size = "sm",
  showName = false,
  className,
}: {
  responsavel: ResponsavelInfo;
  size?: "xs" | "sm" | "md";
  showName?: boolean;
  className?: string;
}) {
  const sizeClass = {
    xs: "size-4 text-[8px]",
    sm: "size-5 text-[9px]",
    md: "size-7 text-[10px]",
  }[size];
  const pixelSize = size === "xs" ? 16 : size === "sm" ? 20 : 28;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full overflow-hidden bg-cobalt/15 text-cobalt-soft font-semibold inline-flex items-center justify-center shrink-0 relative ring-1 ring-cobalt/20",
          sizeClass,
        )}
        aria-label={`Responsável: ${responsavel.nome}`}
      >
        {responsavel.avatar_url ? (
          <Image
            src={responsavel.avatar_url}
            alt={responsavel.nome}
            width={pixelSize}
            height={pixelSize}
            className="object-cover"
            unoptimized
          />
        ) : (
          <span>{iniciais(responsavel.nome)}</span>
        )}
      </span>
      {showName && (
        <span className="text-[11px] text-graphite truncate">
          {responsavel.nome.split(/\s+/)[0]}
        </span>
      )}
    </span>
  );
}
