import { shortId } from "@/lib/utils";
import type { TipoAnexo } from "@/lib/domain/enums";
import { format } from "date-fns";

export function buildStoragePath(input: {
  paciente_id: string;
  tipo_anexo: TipoAnexo;
  data_referencia: string | null;
  filename: string;
}): string {
  // Extension: pega só a última parte após ".", remove qualquer / ou \
  // (defesa contra path traversal em filename hostil) e limita 8 chars
  // alfanuméricos. Garante que extension nunca contenha separador de path.
  const rawExt = input.filename.split(".").pop()?.toLowerCase() || "bin";
  const ext = rawExt.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const dateLabel = input.data_referencia || format(new Date(), "yyyy-MM-dd");
  return `${input.paciente_id}/${input.tipo_anexo}_${dateLabel}_${shortId()}.${ext}`;
}
