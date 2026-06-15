"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarSetting } from "@/app/(app)/admin/settings/actions";
import { errMsg } from "@/lib/utils";

export function SettingsEditor({ settings }: { settings: { key: string; value: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value])),
  );
  const [novaKey, setNovaKey] = useState("");
  const [novoValor, setNovoValor] = useState("");

  function salvar(key: string, value: string, limparNovo = false) {
    if (!key.trim()) {
      toast.warning("Chave obrigatória.");
      return;
    }
    startTransition(async () => {
      try {
        await salvarSetting(key.trim(), value);
        toast.success("Configuração salva");
        if (limparNovo) {
          setNovaKey("");
          setNovoValor("");
        }
        router.refresh();
      } catch (e) {
        toast.error("Erro", { description: errMsg(e) });
      }
    });
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {settings.map((s) => (
          <li key={s.key} className="rounded-lg border border-hairline bg-paper-deep/40 p-3">
            <p className="font-mono text-xs text-graphite">{s.key}</p>
            <div className="mt-1 flex gap-2">
              <Input
                value={valores[s.key] ?? ""}
                onChange={(e) => setValores((v) => ({ ...v, [s.key]: e.target.value }))}
                disabled={pending}
              />
              <Button type="button" size="sm" onClick={() => salvar(s.key, valores[s.key] ?? "")} disabled={pending}>
                Salvar
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-dashed border-hairline bg-paper-deep/30 p-3">
        <p className="mb-2 text-xs font-medium text-graphite">Nova configuração</p>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="chave" value={novaKey} onChange={(e) => setNovaKey(e.target.value)} className="flex-1" disabled={pending} />
          <Input placeholder="valor" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} className="flex-1" disabled={pending} />
          <Button type="button" size="sm" onClick={() => salvar(novaKey, novoValor, true)} disabled={pending}>
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
