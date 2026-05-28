"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { UserPlus, X, Check, Undo2 } from "lucide-react";
import {
  reservarPaciente,
  liberarPaciente,
  concluirPaciente,
  desfazerConclusaoPaciente,
} from "@/app/(app)/plantoes/[id]/responsavel-actions";
import { ResponsavelAvatar, type ResponsavelInfo } from "./ResponsavelAvatar";
import { cn, errMsg } from "@/lib/utils";

type Props = {
  mapaEntryId: string;
  responsavel: ResponsavelInfo | null;
  /** Paciente concluído no plantão? Pill fica verde. */
  concluido?: boolean;
  currentUserId: string;
  isAdmin?: boolean;
  /** Plantão finalizado → só display, sem ações */
  readOnly?: boolean;
  /** Variante visual: "compact" pro card do mapa, "full" pra header do paciente */
  variant?: "compact" | "full";
};

/**
 * Controle de reserva + conclusão do paciente no plantão.
 *
 * Estados:
 *  - Sem responsável + não-readOnly: botão "Reservar"
 *  - Com responsável + sou eu: pill cobalt com "Você" + ✓ concluir + ✕ liberar
 *  - Com responsável + sou eu + concluído: pill MOSS verde com "Você" + ↺ desfazer + ✕ liberar
 *  - Com responsável + outra pessoa: pill cinza + nome
 *  - readOnly + concluído: pill verde só display
 *  - readOnly + sem responsável: nada
 *
 * Conclusão e reserva são isoladas por plantão (concluido_em vive em
 * mapa_entries, fora do clonar_mapa_anterior).
 */
export function ResponsavelControl({
  mapaEntryId,
  responsavel,
  concluido = false,
  currentUserId,
  isAdmin = false,
  readOnly = false,
  variant = "compact",
}: Props) {
  const [pending, startTransition] = useTransition();
  const isMine = responsavel?.id === currentUserId;
  const canLiberar = isMine || isAdmin;
  const canConcluir = isMine || isAdmin;

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

  function handleConcluir(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        await concluirPaciente(mapaEntryId);
        toast.success("Paciente concluído");
      } catch (err) {
        toast.error("Não foi possível concluir", { description: errMsg(err) });
      }
    });
  }

  function handleDesfazer(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        await desfazerConclusaoPaciente(mapaEntryId);
        toast.success("Conclusão desfeita");
      } catch (err) {
        toast.error("Não foi possível desfazer", { description: errMsg(err) });
      }
    });
  }

  if (readOnly && !responsavel) return null;

  if (readOnly && responsavel) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5",
          concluido
            ? "bg-moss/[0.12] border border-moss/30"
            : "bg-paper-soft border border-hairline",
          variant === "full" && "px-2.5 py-1",
        )}
      >
        <ResponsavelAvatar responsavel={responsavel} size={variant === "full" ? "md" : "sm"} />
        <span
          className={cn(
            "text-[11px] truncate",
            concluido ? "text-moss font-medium" : "text-graphite",
            variant === "full" && "text-[12px]",
          )}
        >
          {responsavel.nome.split(/\s+/)[0]}
          {concluido && " · concluído"}
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

  // Tem responsavel — display + ações
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 transition-colors",
        concluido
          ? "bg-moss/[0.12] border border-moss/35"
          : isMine
            ? "bg-cobalt/[0.08] border border-cobalt/20"
            : "bg-paper-soft border border-hairline",
        variant === "full" && "px-2.5 py-1",
      )}
    >
      <ResponsavelAvatar responsavel={responsavel} size={variant === "full" ? "md" : "sm"} />
      <span
        className={cn(
          "text-[11px] truncate",
          concluido
            ? "text-moss font-medium"
            : isMine
              ? "text-cobalt-soft font-medium"
              : "text-graphite",
          variant === "full" && "text-[12px]",
        )}
      >
        {isMine ? "Você" : responsavel.nome.split(/\s+/)[0]}
        {concluido && " · ok"}
      </span>

      {canConcluir && !concluido && (
        <button
          type="button"
          onClick={handleConcluir}
          disabled={pending}
          className={cn(
            "size-4 rounded-full inline-flex items-center justify-center text-ash hover:text-moss hover:bg-moss/[0.12] transition-colors",
            pending && "opacity-50",
          )}
          aria-label="Marcar paciente como concluído"
          title="Concluir"
        >
          <Check className="h-2.5 w-2.5" strokeWidth={2.4} />
        </button>
      )}

      {canConcluir && concluido && (
        <button
          type="button"
          onClick={handleDesfazer}
          disabled={pending}
          className={cn(
            "size-4 rounded-full inline-flex items-center justify-center text-moss hover:text-ash hover:bg-paper-soft transition-colors",
            pending && "opacity-50",
          )}
          aria-label="Desfazer conclusão"
          title="Desfazer conclusão"
        >
          <Undo2 className="h-2.5 w-2.5" strokeWidth={2.2} />
        </button>
      )}

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
          title="Liberar reserva"
        >
          <X className="h-2.5 w-2.5" strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}
