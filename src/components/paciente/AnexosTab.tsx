"use client";

import { AnexoUploader } from "@/components/anexos/AnexoUploader";
import { AnexoGaleria } from "@/components/anexos/AnexoGaleria";
import type { Paciente, Anexo } from "@/lib/domain/types";

export function AnexosTab({
  paciente,
  anexos,
}: {
  paciente: Paciente;
  anexos: Anexo[];
}) {
  return (
    <div className="space-y-6">
      <AnexoUploader paciente={paciente} />
      <AnexoGaleria anexos={anexos} />
    </div>
  );
}
