"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { OnboardingTour } from "./OnboardingTour";

type Props = {
  nomePesquisador: string;
};

/**
 * Botão pra reabrir o tour a partir do /manual. Modo forced — não persiste
 * onboarded_at de novo (pesquisador veterano só quer rever, não desfazer).
 */
export function TourRetrigger({ nomePesquisador }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-cobalt/30 bg-cobalt/[0.06] px-3 py-2 text-[12px] font-medium text-cobalt-soft hover:bg-cobalt/[0.12] transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
        Ver o tour novamente
      </button>
      {open && (
        <OnboardingTour
          nomePesquisador={nomePesquisador}
          forced
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
