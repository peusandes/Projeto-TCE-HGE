"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { alterarRole, alterarCargo } from "@/app/(app)/admin/membros/actions";
import { errMsg } from "@/lib/utils";
import { cargoLabel, type DiretoriaValue, type CargoEspecialValue, type RoleValue } from "@/lib/lanc/cargos";

const SELECT = "rounded-md border border-hairline bg-paper-deep/50 px-2 py-1 text-xs focus:border-cobalt focus:outline-none";

type Props = {
  id: string;
  role: RoleValue;
  diretoria: DiretoriaValue | null;
  isDiretor: boolean;
  isSecretario: boolean;
  cargoEspecial: CargoEspecialValue | null;
};

export function MembroCargoControls(m: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [edit, setEdit] = useState(false);
  const [diretoria, setDiretoria] = useState<DiretoriaValue | "">(m.diretoria ?? "");
  const [isDiretor, setIsDiretor] = useState(m.isDiretor);
  const [isSecretario, setIsSecretario] = useState(m.isSecretario);
  const [cargoEsp, setCargoEsp] = useState<CargoEspecialValue | "">(m.cargoEspecial ?? "");

  function toggleAdmin() {
    startTransition(async () => {
      try {
        await alterarRole(m.id, m.role === "ADMIN" ? "MEMBER" : "ADMIN");
        toast.success("Papel atualizado");
        router.refresh();
      } catch (e) {
        toast.error("Erro", { description: errMsg(e) });
      }
    });
  }

  function salvarCargo() {
    startTransition(async () => {
      try {
        await alterarCargo(m.id, {
          diretoria: diretoria || null,
          isDiretor,
          isSecretario,
          cargoEspecial: cargoEsp || null,
        });
        toast.success("Cargo atualizado");
        setEdit(false);
        router.refresh();
      } catch (e) {
        toast.error("Erro", { description: errMsg(e) });
      }
    });
  }

  return (
    <div className="mt-1 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-ash">{cargoLabel({ role: m.role, diretoria: m.diretoria, isDiretor: m.isDiretor, isSecretario: m.isSecretario, cargoEspecial: m.cargoEspecial })}</span>
        <button type="button" onClick={toggleAdmin} disabled={pending} className="rounded border border-hairline px-2 py-0.5 hover:bg-paper-deep disabled:opacity-50">
          {m.role === "ADMIN" ? "Remover admin" : "Tornar admin"}
        </button>
        <button type="button" onClick={() => setEdit((v) => !v)} className="rounded border border-hairline px-2 py-0.5 hover:bg-paper-deep">
          {edit ? "Fechar" : "Editar cargo"}
        </button>
      </div>

      {edit && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-hairline bg-paper-deep/40 p-2 text-xs">
          <label className="flex items-center gap-1">
            Diretoria
            <select className={SELECT} value={diretoria} onChange={(e) => setDiretoria(e.target.value as DiretoriaValue | "")}>
              <option value="">—</option>
              <option value="EXTENSAO">Extensão</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={isDiretor} onChange={(e) => setIsDiretor(e.target.checked)} /> Diretor
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={isSecretario} onChange={(e) => setIsSecretario(e.target.checked)} /> Secretário
          </label>
          <label className="flex items-center gap-1">
            Cargo especial
            <select className={SELECT} value={cargoEsp} onChange={(e) => setCargoEsp(e.target.value as CargoEspecialValue | "")}>
              <option value="">—</option>
              <option value="PESQUISADOR_TCE_BABY">Pesquisador TCE baby</option>
            </select>
          </label>
          <Button type="button" size="sm" onClick={salvarCargo} disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      )}
    </div>
  );
}
