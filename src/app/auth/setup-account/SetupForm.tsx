"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { completarSetup } from "./actions";
import { cn, errMsg } from "@/lib/utils";

const FIELD_LABEL = "text-[10px] uppercase tracking-editorial text-ash";
const FIELD_INPUT =
  "bg-paper-deep/50 border-hairline focus-visible:border-cobalt focus-visible:ring-0";

export function SetupForm({
  email,
  initialNome,
}: {
  email: string;
  initialNome: string;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(initialNome);
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [pending, startTransition] = useTransition();

  const senhaTooShort = senha.length > 0 && senha.length < 8;
  const senhaOk = senha.length >= 8;
  const match = confirmar.length > 0 && senha === confirmar;
  const mismatch = confirmar.length > 0 && senha !== confirmar;
  const nomeOk = nome.trim().split(/\s+/).length >= 2;
  const podeSalvar = useMemo(
    () => nomeOk && senhaOk && match && !pending,
    [nomeOk, senhaOk, match, pending],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeOk) {
      toast.warning("Digite seu nome completo (nome + sobrenome).");
      return;
    }
    if (senhaTooShort) {
      toast.warning("Senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (mismatch) {
      toast.error("As senhas não conferem.");
      return;
    }
    startTransition(async () => {
      try {
        await completarSetup({ nome: nome.trim(), senha });
        toast.success("Cadastro concluído");
        router.replace("/plantoes");
        router.refresh();
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast.error("Erro ao concluir cadastro", { description: errMsg(err) });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-hairline bg-paper p-6 space-y-5">
      <div className="space-y-1.5">
        <Label className={FIELD_LABEL}>Email</Label>
        <p className="text-[14px] text-graphite font-medium bg-paper-deep/60 border border-hairline rounded-md px-3 py-2.5">
          {email}
        </p>
        <p className="text-[10px] text-ash">Liberado pelo administrador. Não pode ser alterado aqui.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nome" className={FIELD_LABEL}>
          Nome completo
        </Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          autoComplete="name"
          placeholder="Ex.: Pedro Sandes"
          className={FIELD_INPUT}
        />
        {nome.length > 0 && !nomeOk && (
          <p className="text-[10px] text-saffron flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Inclua nome e sobrenome.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senha" className={FIELD_LABEL}>
          Senha
        </Label>
        <div className="relative">
          <Input
            id="senha"
            type={showSenha ? "text" : "password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            className={cn(FIELD_INPUT, "pr-11")}
          />
          <button
            type="button"
            onClick={() => setShowSenha((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center text-ash hover:text-graphite"
            aria-label={showSenha ? "Esconder senha" : "Mostrar senha"}
          >
            {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {senhaTooShort && (
          <p className="text-[10px] text-saffron flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Pelo menos 8 caracteres.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmar" className={FIELD_LABEL}>
          Confirmar senha
        </Label>
        <Input
          id="confirmar"
          type={showSenha ? "text" : "password"}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="Repita a senha"
          className={cn(
            FIELD_INPUT,
            mismatch && "border-vermillion focus-visible:border-vermillion",
          )}
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

      <Button type="submit" size="lg" className="w-full" disabled={!podeSalvar}>
        {pending ? "Salvando..." : "Concluir cadastro"}
      </Button>
    </form>
  );
}
