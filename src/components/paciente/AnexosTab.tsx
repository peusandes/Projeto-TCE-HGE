"use client";

import { AnexoUploader } from "@/components/anexos/AnexoUploader";
import { AnexoGaleria } from "@/components/anexos/AnexoGaleria";
import { RETENCAO_DIAS } from "@/lib/anexos/retencao";
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
      <p className="text-xs text-muted-foreground px-1">
        Anexos são apagados automaticamente {RETENCAO_DIAS} dias após o envio
        (inclusive TCLE). Baixe o que precisar guardar.
      </p>
      <AnexoGaleria anexos={anexos} />
    </div>
  );
}
