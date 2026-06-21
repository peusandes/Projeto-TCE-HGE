"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { TIPO_ANEXO_LABEL } from "@/lib/domain/enums";
import type { Anexo } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { ZoomableImage } from "./ZoomableImage";

type SignedUrlMap = Record<string, string>;

export function AnexoGaleria({ anexos }: { anexos: Anexo[] }) {
  const router = useRouter();
  const [urls, setUrls] = useState<SignedUrlMap>({});
  const [previewAnexo, setPreviewAnexo] = useState<Anexo | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (anexos.length === 0) return;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.storage
        .from("anexos-tce")
        .createSignedUrls(
          anexos.map((a) => a.storage_path),
          60 * 60,
        );
      if (cancelled || !data) return;
      const map: SignedUrlMap = {};
      data.forEach((row, i) => {
        if (row.signedUrl) map[anexos[i].id] = row.signedUrl;
      });
      setUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [anexos]);

  async function handleDelete(anexo: Anexo) {
    if (!confirm("Excluir este anexo?")) return;
    const supabase = createClient();
    await supabase.storage.from("anexos-tce").remove([anexo.storage_path]);
    const { error } = await supabase.from("anexos").delete().eq("id", anexo.id);
    if (error) toast.error("Erro ao excluir", { description: error.message });
    else {
      toast.success("Anexo excluído");
      router.refresh();
    }
  }

  if (anexos.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
        Nenhum anexo. Use os botões acima para começar.
      </Card>
    );
  }

  // Agrupa por tipo
  const grupos = anexos.reduce<Record<string, Anexo[]>>((acc, a) => {
    (acc[a.tipo_anexo] = acc[a.tipo_anexo] || []).push(a);
    return acc;
  }, {});

  // Todos os grupos em ordem cronológica crescente por data_referencia
  // (mais antigo primeiro). Sem data vai pro fim. Desempate por enviado_em
  // pra manter ordem estável quando vários do mesmo dia (ex.: HGT manhã/tarde
  // anexados no mesmo upload). data_referencia é ISO yyyy-MM-dd, então
  // localeCompare ordena cronologicamente.
  for (const tipo of Object.keys(grupos)) {
    grupos[tipo].sort((a, b) => {
      const da = a.data_referencia ?? "";
      const db = b.data_referencia ?? "";
      if (da && db && da !== db) return da.localeCompare(db);
      if (!da && db) return 1;
      if (da && !db) return -1;
      // Mesma data (ou ambos sem data): usa enviado_em pra desempate estável.
      return (a.enviado_em ?? "").localeCompare(b.enviado_em ?? "");
    });
  }

  return (
    <>
      <div className="space-y-4">
        {Object.entries(grupos).map(([tipo, items]) => (
          <div key={tipo} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
              {TIPO_ANEXO_LABEL[tipo as keyof typeof TIPO_ANEXO_LABEL]} ({items.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map((a) => {
                const url = urls[a.id];
                const isImage = a.mime_type.startsWith("image/");
                return (
                  <Card
                    key={a.id}
                    className={cn(
                      "relative overflow-hidden aspect-square cursor-pointer group",
                      a.processado && "ring-2 ring-emerald-500",
                    )}
                    onClick={() => setPreviewAnexo(a)}
                  >
                    {isImage && url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={a.descricao ?? "Anexo"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-slate-50 text-slate-400">
                        <FileText className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white text-xs">
                      {a.data_referencia && (
                        <p className="font-medium">
                          {format(new Date(a.data_referencia + "T12:00:00"), "dd/MM", { locale: ptBR })}
                        </p>
                      )}
                      {a.descricao && <p className="truncate opacity-90">{a.descricao}</p>}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!previewAnexo} onOpenChange={(o) => !o && setPreviewAnexo(null)}>
        <DialogContent className="max-w-3xl p-0 sm:p-0 overflow-hidden">
          <DialogTitle className="sr-only">Preview do anexo</DialogTitle>
          {previewAnexo && urls[previewAnexo.id] && (
            <div className="flex flex-col">
              {previewAnexo.mime_type.startsWith("image/") ? (
                <ZoomableImage
                  src={urls[previewAnexo.id]}
                  alt={previewAnexo.descricao ?? "Anexo"}
                />
              ) : (
                <iframe
                  src={urls[previewAnexo.id]}
                  className="w-full h-[80dvh]"
                  title="PDF preview"
                />
              )}
              <div className="p-4 space-y-2 bg-white">
                <p className="font-medium">
                  {TIPO_ANEXO_LABEL[previewAnexo.tipo_anexo]}
                  {previewAnexo.data_referencia && ` · ${format(new Date(previewAnexo.data_referencia + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}`}
                </p>
                {previewAnexo.descricao && (
                  <p className="text-sm text-muted-foreground">{previewAnexo.descricao}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={urls[previewAnexo.id]} target="_blank" rel="noopener">Abrir em nova aba</a>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      handleDelete(previewAnexo);
                      setPreviewAnexo(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> Excluir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
