"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { atualizarPerfil } from "@/app/(app)/perfil/actions";

const FIELD_LABEL = "text-[10px] uppercase tracking-editorial text-ash";
const FIELD_INPUT =
  "bg-paper-soft border-hairline focus-visible:border-cobalt focus-visible:ring-0";

type Props = {
  initialNome: string;
  email: string;
};

export function PerfilForm({ initialNome, email }: Props) {
  const router = useRouter();
  const [nome, setNome] = useState(initialNome);
  const [pending, startTransition] = useTransition();

  const nomeChanged = nome.trim() !== initialNome.trim();
  const nomeOk = nome.trim().split(/\s+/).length >= 2;

  function handleSave() {
    if (!nomeChanged) return;
    if (!nomeOk) {
      toast.warning("Inclua nome e sobrenome.");
      return;
    }
    startTransition(async () => {
      try {
        await atualizarPerfil({ nome: nome.trim() });
        toast.success("Nome atualizado");
        router.refresh();
      } catch (err) {
        toast.error("Erro ao salvar", { description: String(err) });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome" className={FIELD_LABEL}>Nome completo</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={FIELD_INPUT}
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label className={FIELD_LABEL}>Email</Label>
        <p className="text-[14px] text-graphite bg-paper-soft border border-hairline rounded-md px-3 py-2.5 font-medium">
          {email}
        </p>
        <p className="text-[11px] text-ash">
          Não pode ser alterado por aqui. Solicite a Pedro Sandes Pereira.
        </p>
      </div>
      <Button
        onClick={handleSave}
        disabled={!nomeChanged || !nomeOk || pending}
        className="w-full"
        size="lg"
      >
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </div>
  );
}
