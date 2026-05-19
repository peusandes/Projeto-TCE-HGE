"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const FIELD_LABEL = "text-[10px] uppercase tracking-editorial text-ash";
const FIELD_INPUT =
  "bg-paper-deep/50 border-hairline focus-visible:border-cobalt focus-visible:ring-0";

export function ResetPasswordForm() {
  const router = useRouter();
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [show, setShow] = useState(false);
  const [pending, startTransition] = useTransition();

  const novaTooShort = nova.length > 0 && nova.length < 8;
  const match = confirmar.length > 0 && nova === confirmar;
  const mismatch = confirmar.length > 0 && nova !== confirmar;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nova.length < 8) {
      toast.warning("Senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (nova !== confirmar) {
      toast.error("As senhas não conferem.");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: nova });
      if (error) {
        toast.error("Erro ao redefinir", { description: error.message });
        return;
      }
      toast.success("Senha redefinida");
      // Hard nav garante refresh dos cookies + middleware re-roda
      window.location.href = "/plantoes";
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-hairline bg-paper p-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nova" className={FIELD_LABEL}>Nova senha</Label>
        <div className="relative">
          <Input
            id="nova"
            type={show ? "text" : "password"}
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            className={cn(FIELD_INPUT, "pr-11")}
            required
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center text-ash hover:text-graphite"
            aria-label={show ? "Esconder" : "Mostrar"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {novaTooShort && (
          <p className="text-[10px] text-saffron flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Pelo menos 8 caracteres.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="conf" className={FIELD_LABEL}>Confirmar nova senha</Label>
        <Input
          id="conf"
          type={show ? "text" : "password"}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          autoComplete="new-password"
          className={cn(
            FIELD_INPUT,
            mismatch && "border-vermillion/40 focus-visible:border-vermillion",
          )}
          required
        />
        {mismatch && (
          <p className="text-[10px] text-vermillion flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> As senhas não conferem.
          </p>
        )}
        {match && (
          <p className="text-[10px] text-moss flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Tudo certo.
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
