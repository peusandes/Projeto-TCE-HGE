"use client";

import { AnexoUploader } from "@/components/anexos/AnexoUploader";
import { AnexoGaleria } from "@/components/anexos/AnexoGaleria";
import type { Paciente, Anexo } from "@/lib/domain/types";

export function AnexosTab({
  paciente,
  anexos,
  plantaoContextoId,
}: {
  paciente: Paciente;
  anexos: Anexo[];
  plantaoContextoId?: string;
}) {
  return (
    <div className="space-y-6">
      <AnexoUploader paciente={paciente} plantaoContextoId={plantaoContextoId} />
      <AnexoGaleria anexos={anexos} />
    </div>
  );
}
