"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errMsg } from "@/lib/utils";

export function LoginForm() {
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Falha no login", { description: error.message });
        setPending(false);
        return;
      }
      toast.success("Bem-vindo!");
      // Hard nav: garante refresh dos Server Components + execução de middleware
      // sem ficar preso num useTransition se a navegação tomar tempo.
      // Validação anti-open-redirect: só aceita paths relativos que começam
      // com "/" mas não com "//" (que vira protocol-relative URL pra outro host).
      const raw = search.get("redirect");
      const safe =
        raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/plantoes";
      window.location.href = safe;
    } catch (err) {
      toast.error("Erro", { description: errMsg(err) });
      setPending(false);
    }
  }

  async function handleReset() {
    if (!email) {
      toast.warning("Digite seu email primeiro");
      return;
    }
    const supabase = createClient();
    // Sempre redireciona pra produção, independente de onde o user clicou
    // (se foi de localhost, ainda assim o email manda pro app em prod).
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://projetotce.com/auth/callback?next=/plantoes",
    });
    if (error) toast.error("Erro ao enviar email", { description: error.message });
    else toast.success("Email enviado", { description: "Verifique sua caixa de entrada." });
  }

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-6 space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[10px] uppercase tracking-editorial text-ash">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="bg-paper-deep/50 border-hairline focus-visible:border-cobalt focus-visible:ring-0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[10px] uppercase tracking-editorial text-ash">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-paper-deep/50 border-hairline focus-visible:border-cobalt focus-visible:ring-0"
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Entrando..." : "Entrar"}
        </Button>
        <button
          type="button"
          onClick={handleReset}
          className="block w-full text-center text-[11px] tracking-editorial uppercase text-ash hover:text-graphite"
        >
          Esqueci minha senha
        </button>
      </form>
    </div>
  );
}
