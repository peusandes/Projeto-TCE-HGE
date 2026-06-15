"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarPacienteExtensao } from "@/app/(app)/estagio/actions";
import { errMsg } from "@/lib/utils";
import type { PacienteFluxo } from "@/lib/lanc/enums";

export function NovoPacienteExtensaoForm({ fluxo }: { fluxo: PacienteFluxo }) {
  const router = useRouter();
  const hoje = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState(hoje);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.warning("Nome obrigatório.");
      return;
    }
    startTransition(async () => {
      try {
        await criarPacienteExtensao({ fluxo, nome: nome.trim(), dataAdmissao });
        toast.success(`${nome.trim()} cadastrado (Admissão)`);
        setNome("");
        setDataAdmissao(hoje);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error("Erro ao cadastrar", { description: errMsg(err) });
      }
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4 mr-1.5" /> Novo paciente
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-hairline bg-paper-deep/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-ink">Cadastrar paciente</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-ash hover:text-ink" aria-label="cancelar">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nome-pac-ext">Nome do paciente *</Label>
        <Input
          id="nome-pac-ext"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={120}
          autoComplete="off"
          disabled={pending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="adm-pac-ext">Data de admissão *</Label>
        <Input
          id="adm-pac-ext"
          type="date"
          value={dataAdmissao}
          onChange={(e) => setDataAdmissao(e.target.value)}
          disabled={pending}
        />
        <p className="text-xs text-ash">
          No dia seguinte à admissão, o paciente vira <strong>No mapa</strong> automaticamente.
        </p>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Salvando…" : "Cadastrar"}
      </Button>
    </form>
  );
}
