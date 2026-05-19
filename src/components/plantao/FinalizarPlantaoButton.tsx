"use client";

import { useTransition } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { finalizarPlantao } from "@/app/(app)/plantoes/actions";

export function FinalizarPlantaoButton({ plantaoId }: { plantaoId: string }) {
  const [pending, startTransition] = useTransition();
  function handleClick() {
    if (!confirm("Finalizar este plantão? Após finalizar, ele fica somente leitura.")) return;
    startTransition(async () => {
      try {
        await finalizarPlantao(plantaoId);
        toast.success("Plantão finalizado");
      } catch (err) {
        toast.error("Erro ao finalizar", { description: String(err) });
      }
    });
  }
  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      <Lock className="h-4 w-4 mr-1" /> Finalizar
    </Button>
  );
}
