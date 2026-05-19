"use client";

import { useState, useTransition } from "react";
import { Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { convidarPesquisador } from "./actions";
import { errMsg } from "@/lib/utils";

const FIELD_LABEL = "text-[10px] uppercase tracking-editorial text-ash";
const FIELD_INPUT =
  "bg-paper-deep/50 border-hairline focus-visible:border-cobalt focus-visible:ring-0";

export function InvitarForm() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.warning("Digite um email pra convidar.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await convidarPesquisador({
          email: email.trim(),
          nome: nome.trim() || undefined,
        });
        toast.success("Convite enviado", {
          description: `Email enviado para ${result.email}. O pesquisador define nome e senha ao clicar no link.`,
        });
        setEmail("");
        setNome("");
      } catch (err) {
        toast.error("Não foi possível convidar", { description: errMsg(err) });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-paper rounded-2xl border border-hairline p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-cobalt" strokeWidth={1.8} />
        <h2 className="font-display-italic text-[15px] font-medium text-ink">
          Convidar pesquisador
        </h2>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-email" className={FIELD_LABEL}>
          Email
        </Label>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="pesquisador@exemplo.com"
          className={FIELD_INPUT}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-nome" className={FIELD_LABEL}>
          Nome (opcional)
        </Label>
        <Input
          id="invite-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Pré-preenche o nome no primeiro acesso"
          className={FIELD_INPUT}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <UserPlus className="h-4 w-4 mr-2" strokeWidth={1.8} />
        {pending ? "Enviando..." : "Enviar convite"}
      </Button>

      <p className="text-[11px] text-ash leading-relaxed">
        O Supabase envia um email com link de convite. Ao clicar, o pesquisador define
        nome completo + senha (mínimo 8 caracteres) numa tela de boas-vindas, e entra
        no app.
      </p>
    </form>
  );
}
