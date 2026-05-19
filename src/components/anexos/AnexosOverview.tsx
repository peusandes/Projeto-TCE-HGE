"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_ANEXO, TIPO_ANEXO_LABEL, type TipoAnexo } from "@/lib/domain/enums";
import type { Anexo } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type Row = Anexo & {
  pacientes: { id: string; nome: string } | null;
  plantoes: { id: string; data: string } | null;
};

export function AnexosOverview({ anexos }: { anexos: Row[] }) {
  const router = useRouter();
  const [tipoFilter, setTipoFilter] = useState<TipoAnexo | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDENTE" | "PROCESSADO">("ALL");
  const [urls, setUrls] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      anexos.filter((a) => {
        if (tipoFilter !== "ALL" && a.tipo_anexo !== tipoFilter) return false;
        if (statusFilter === "PENDENTE" && a.processado) return false;
        if (statusFilter === "PROCESSADO" && !a.processado) return false;
        return true;
      }),
    [anexos, tipoFilter, statusFilter],
  );

  useEffect(() => {
    if (filtered.length === 0) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.storage
        .from("anexos-tce")
        .createSignedUrls(
          filtered.map((a) => a.storage_path),
          60 * 60,
        );
      if (cancelled || !data) return;
      const map: Record<string, string> = {};
      data.forEach((row, i) => {
        if (row.signedUrl) map[filtered[i].id] = row.signedUrl;
      });
      setUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [filtered]);

  async function toggleProcessado(anexo: Row, value: boolean) {
    const supabase = createClient();
    await supabase.from("anexos").update({ processado: value }).eq("id", anexo.id);
    router.refresh();
  }

  if (anexos.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground border-dashed">
        Nenhum anexo enviado ainda. Abra um paciente e use a aba Anexos.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as TipoAnexo | "ALL")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os tipos</SelectItem>
              {TIPOS_ANEXO.map((t) => <SelectItem key={t} value={t}>{TIPO_ANEXO_LABEL[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as never)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="PENDENTE">Pendentes</SelectItem>
              <SelectItem value="PROCESSADO">Processados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} anexos</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {filtered.map((a) => {
          const url = urls[a.id];
          const isImage = a.mime_type.startsWith("image/");
          return (
            <Card
              key={a.id}
              className={cn(
                "relative overflow-hidden aspect-square",
                a.processado && "ring-2 ring-emerald-500",
              )}
            >
              <Link href={`/pacientes/${a.paciente_id}`} className="block h-full">
                {isImage && url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={a.descricao ?? "Anexo"} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full bg-slate-50 text-slate-400">
                    <FileText className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-2 text-white text-xs">
                  <Badge className="bg-blue-700 hover:bg-blue-700 text-[10px]">
                    {TIPO_ANEXO_LABEL[a.tipo_anexo]}
                  </Badge>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 text-white text-xs">
                  <p className="font-medium truncate">{a.pacientes?.nome ?? "—"}</p>
                  <p className="text-[10px] opacity-90">
                    {a.data_referencia &&
                      format(new Date(a.data_referencia + "T12:00:00"), "dd/MM", { locale: ptBR })}
                    {a.plantoes?.data && ` · plantão ${format(new Date(a.plantoes.data + "T12:00:00"), "dd/MM", { locale: ptBR })}`}
                  </p>
                </div>
              </Link>
              <label
                className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={a.processado}
                  onCheckedChange={(v) => toggleProcessado(a, Boolean(v))}
                  className="h-3.5 w-3.5"
                />
                Feito
              </label>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
