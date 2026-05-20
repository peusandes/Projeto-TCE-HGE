"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";
import { reservarPaciente, liberarPaciente } from "@/app/(app)/plantoes/[id]/responsavel-actions";
import { ResponsavelAvatar, type ResponsavelInfo } from "./ResponsavelAvatar";
import { cn, errMsg } from "@/lib/utils";

type Props = {
  mapaEntryId: string;
  responsavel: ResponsavelInfo | null;
  currentUserId: string;
  isAdmin?: boolean;
  /** Plantão finalizado → só display, sem ações */
  readOnly?: boolean;
  /** Variante visual: "compact" pro card do mapa, "full" pra header do paciente */
  variant?: "compact" | "full";
};

/**
 * Controle de reserva do paciente.
 *  - Sem responsável + não-readOnly: mostra "Reservar" (botão pequeno)
 *  - Com responsável + sou eu: avatar + nome + ✕ pra liberar
 *  - Com responsável + outra pessoa: avatar + nome (admin vê ✕ pra liberar)
 *  - readOnly + responsável: avatar + nome só
 *  - readOnly + sem responsável: nada (não polui o card)
 */
export function ResponsavelControl({
  mapaEntryId,
  responsavel,
  currentUserId,
  isAdmin = false,
  readOnly = false,
  variant = "compact",
}: Props) {
  const [pending, startTransition] = useTransition();
  const isMine = responsavel?.id === currentUserId;
  const canLiberar = isMine || isAdmin;

  function handleReservar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        await reservarPaciente(mapaEntryId);
        toast.success("Paciente reservado pra você");
      } catch (err) {
        toast.error("Não foi possível reservar", { description: errMsg(err) });
      }
    });
  }

  function handleLiberar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        await liberarPaciente(mapaEntryId);
        toast.success("Reserva liberada");
      } catch (err) {
        toast.error("Não foi possível liberar", { description: errMsg(err) });
      }
    });
  }

  if (readOnly && !responsavel) return null;

  if (readOnly && responsavel) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5",
          variant === "compact" && "px-1.5 py-0.5",
        )}
      >
        <ResponsavelAvatar responsavel={responsavel} size={variant === "full" ? "md" : "sm"} />
        <span className="text-[11px] text-graphite truncate">
          {responsavel.nome.split(/\s+/)[0]}
        </span>
      </div>
    );
  }

  if (!responsavel) {
    return (
      <button
        type="button"
        onClick={handleReservar}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-hairline bg-paper-soft text-[10px] uppercase tracking-editorial text-ash hover:border-cobalt/40 hover:text-cobalt-soft active:scale-95 transition",
          variant === "compact" ? "px-2 py-0.5 leading-none" : "px-3 py-1.5 text-[11px]",
          pending && "opacity-50",
        )}
        aria-label="Reservar paciente pra mim"
      >
        <UserPlus className="h-3 w-3" strokeWidth={1.8} />
        <span>Reservar</span>
      </button>
    );
  }

  // Tem responsavel — display + opção de liberar
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 transition-colors",
        isMine ? "bg-cobalt/[0.08] border border-cobalt/20" : "bg-paper-soft border border-hairline",
        variant === "full" && "px-2.5 py-1",
      )}
    >
      <ResponsavelAvatar responsavel={responsavel} size={variant === "full" ? "md" : "sm"} />
      <span
        className={cn(
          "text-[11px] truncate",
          isMine ? "text-cobalt-soft font-medium" : "text-graphite",
          variant === "full" && "text-[12px]",
        )}
      >
        {isMine ? "Você" : responsavel.nome.split(/\s+/)[0]}
      </span>
      {canLiberar && (
        <button
          type="button"
          onClick={handleLiberar}
          disabled={pending}
          className={cn(
            "size-4 rounded-full inline-flex items-center justify-center text-ash hover:text-vermillion hover:bg-vermillion/[0.08] transition-colors",
            pending && "opacity-50",
          )}
          aria-label="Liberar reserva"
        >
          <X className="h-2.5 w-2.5" strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}
