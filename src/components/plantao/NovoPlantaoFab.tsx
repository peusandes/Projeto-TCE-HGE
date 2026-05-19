"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { criarPlantao } from "@/app/(app)/plantoes/actions";
import { errMsg } from "@/lib/utils";

export function NovoPlantaoFab() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [pesquisadoresStr, setPesquisadoresStr] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [clonar, setClonar] = useState(true);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pesquisadores = pesquisadoresStr
      .split(/,| e | & /i)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!data || pesquisadores.length === 0) {
      toast.warning("Preencha data e pelo menos um pesquisador");
      return;
    }
    startTransition(async () => {
      try {
        await criarPlantao({
          data,
          pesquisadores,
          observacoes: observacoes || undefined,
          clonar_anterior: clonar,
        });
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast.error("Erro ao criar plantão", { description: errMsg(err) });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-30 inline-flex items-center gap-2 px-5 h-12 rounded-full bg-cobalt text-white shadow-lg active:scale-[0.98] transition-transform safe-bottom"
        aria-label="Novo plantão"
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} />
        <span className="text-[14px] font-medium tracking-tight">Novo plantão</span>
      </button>

      <Drawer open={open} dismissible={false} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <DrawerTitle className="font-display text-[22px] font-light text-ink">
                  Novo plantão
                  <span className="font-display-italic text-ash">.</span>
                </DrawerTitle>
                <DrawerDescription className="mt-1">
                  Crie o mapa do plantão. Você pode clonar o mapa do plantão anterior
                  (sem ALTA ou EXCLUSÃO).
                </DrawerDescription>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="size-9 -mr-1 -mt-1 shrink-0 rounded-full flex items-center justify-center text-graphite hover:text-ink hover:bg-paper-soft transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>
          </DrawerHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="data" className="text-[10px] uppercase tracking-editorial text-ash">
                Data
              </Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pesq" className="text-[10px] uppercase tracking-editorial text-ash">
                Pesquisadores
              </Label>
              <Input
                id="pesq"
                placeholder="Ex.: Pedro Sandes, Theo Campos"
                value={pesquisadoresStr}
                onChange={(e) => setPesquisadoresStr(e.target.value)}
                required
              />
              <p className="text-[11px] text-ash">Separe com vírgula ou &quot; e &quot;.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs" className="text-[10px] uppercase tracking-editorial text-ash">
                Observações
              </Label>
              <Textarea
                id="obs"
                rows={3}
                placeholder="Notas sobre o plantão"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-3 p-3 rounded-xl border border-hairline bg-paper-deep/40 cursor-pointer">
              <Checkbox checked={clonar} onCheckedChange={(v) => setClonar(Boolean(v))} />
              <div className="space-y-0.5">
                <p className="text-[13px] font-medium text-ink">Clonar mapa anterior</p>
                <p className="text-[11px] text-ash leading-snug">
                  Copia pacientes ativos do último plantão. Exclui ALTA e EXCLUSÃO.
                </p>
              </div>
            </label>
            <DrawerFooter>
              <Button type="submit" size="lg" disabled={pending}>
                {pending ? "Criando..." : "Criar plantão"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}
