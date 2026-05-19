import { shortId } from "@/lib/utils";
import type { TipoAnexo } from "@/lib/domain/enums";
import { format } from "date-fns";

export function buildStoragePath(input: {
  paciente_id: string;
  tipo_anexo: TipoAnexo;
  data_referencia: string | null;
  filename: string;
}): string {
  const ext = input.filename.split(".").pop()?.toLowerCase() || "bin";
  const dateLabel = input.data_referencia || format(new Date(), "yyyy-MM-dd");
  return `${input.paciente_id}/${input.tipo_anexo}_${dateLabel}_${shortId()}.${ext}`;
}
