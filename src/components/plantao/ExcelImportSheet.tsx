"use client";

import { useState, useTransition } from "react";
import { FileSpreadsheet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { parseExcelMapa, type ExcelParseResult } from "@/lib/parser/excel-mapa";
import { bulkSeed } from "@/app/(app)/plantoes/[id]/actions";
import { SETOR_LABEL } from "@/lib/domain/enums";
import { errMsg } from "@/lib/utils";

export function ExcelImportSheet({
  plantaoId,
  open,
  onClose,
}: {
  plantaoId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [parsed, setParsed] = useState<ExcelParseResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [pending, startTransition] = useTransition();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const result = parseExcelMapa(buf);
      setParsed(result);
    } catch (err) {
      toast.error("Erro ao ler planilha", { description: errMsg(err) });
    }
  }

  function handleImport() {
    if (!parsed) return;
    startTransition(async () => {
      try {
        await bulkSeed(
          plantaoId,
          parsed.pacientes.map((p) => ({
            nome: p.nome,
            setor: p.setor,
            leito: p.leito,
            situacao: p.situacao,
            tcle_status: p.tcle_status,
            descricao: p.descricao,
            comentarios: p.comentarios,
          })),
        );
        toast.success(`${parsed.pacientes.length} pacientes importados`);
        setParsed(null);
        setFileName("");
        onClose();
      } catch (err) {
        toast.error("Erro ao importar", { description: errMsg(err) });
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Importar mapa do Excel</DrawerTitle>
          <DrawerDescription>
            Aceita a estrutura do Excel do plantão (Leito · Identificação · Situação · REDCAP · TCLE · Descrição · Comentários).
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 cursor-pointer hover:bg-blue-50 transition-colors">
            <FileSpreadsheet className="h-8 w-8 text-blue-700" />
            <span className="text-sm font-medium text-blue-900">
              {fileName || "Selecionar arquivo .xlsx"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
          </label>

          {parsed && (
            <div className="space-y-3">
              {parsed.pesquisadores.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium">Pesquisadores detectados:</span>{" "}
                  {parsed.pesquisadores.join(", ")}
                </div>
              )}
              <div className="rounded-md border bg-white">
                <div className="px-3 py-2 border-b text-xs font-semibold text-muted-foreground">
                  {parsed.pacientes.length} pacientes encontrados
                </div>
                <ul className="max-h-64 overflow-y-auto divide-y text-sm">
                  {parsed.pacientes.map((p, i) => (
                    <li key={i} className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {p.leito && <span className="text-xs text-blue-700 font-medium">{p.leito}</span>}
                        <span className="font-medium">{p.nome}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {SETOR_LABEL[p.setor]} · {p.situacao} · TCLE {p.tcle_status}
                        {p.descricao ? ` · ${p.descricao}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {parsed.warnings.length > 0 && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Avisos do parser:
                  </div>
                  <ul className="list-disc pl-5">
                    {parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button
            type="button"
            size="lg"
            disabled={!parsed || parsed.pacientes.length === 0 || pending}
            onClick={handleImport}
          >
            {pending
              ? "Importando..."
              : parsed
                ? `Importar ${parsed.pacientes.length} pacientes`
                : "Importar"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
