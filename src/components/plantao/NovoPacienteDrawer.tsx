"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SETORES,
  SETOR_LABEL,
  SITUACOES,
  SITUACAO_LABEL,
  TCLE_STATUS,
  TCLE_LABEL,
  type Setor,
  type Situacao,
  type TcleStatus,
} from "@/lib/domain/enums";
import { adicionarPaciente } from "@/app/(app)/plantoes/[id]/actions";
import { ConfirmAltaDialog } from "@/components/paciente/ConfirmAltaDialog";
import { errMsg } from "@/lib/utils";

export function NovoPacienteDrawer({
  plantaoId,
  setor,
  open,
  onClose,
}: {
  plantaoId: string;
  setor: Setor | null;
  open: boolean;
  onClose: () => void;
}) {
  const [nome, setNome] = useState("");
  const [leito, setLeito] = useState("");
  const [setorAtual, setSetorAtual] = useState<Setor>("FORA_DO_MAPA");
  const [situacao, setSituacao] = useState<Situacao>("ADM");
  const [tcle, setTcle] = useState<TcleStatus>("PENDENTE");
  const [descricao, setDescricao] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [pending, startTransition] = useTransition();
  const [confirmAlta, setConfirmAlta] = useState(false);

  useEffect(() => {
    if (open) {
      setSetorAtual(setor ?? "FORA_DO_MAPA");
      setNome("");
      setLeito("");
      setSituacao("ADM");
      setTcle("PENDENTE");
      setDescricao("");
      setComentarios("");
    }
  }, [open, setor]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.warning("Nome do paciente é obrigatório");
      return;
    }
    // Intercepta — pede confirmação no HGE antes de criar como ALTA.
    if (situacao === "ALTA") {
      setConfirmAlta(true);
      return;
    }
    salvar();
  }

  function salvar(overrides?: {
    situacao?: Situacao;
    verificacao_alta?: "PENDENTE_HGE" | null;
  }) {
    startTransition(async () => {
      try {
        await adicionarPaciente({
          plantao_id: plantaoId,
          nome: nome.trim(),
          setor: setorAtual,
          leito: leito.trim() || null,
          situacao: overrides?.situacao ?? situacao,
          tcle_status: tcle,
          descricao: descricao.trim() || null,
          comentarios: comentarios.trim() || null,
          verificacao_alta: overrides?.verificacao_alta ?? null,
        });
        toast.success(
          overrides?.verificacao_alta
            ? "Paciente adicionado — verificação pendente"
            : "Paciente adicionado",
        );
        onClose();
      } catch (err) {
        toast.error("Erro ao adicionar", { description: errMsg(err) });
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Novo paciente</DrawerTitle>
        </DrawerHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="leito">Leito</Label>
              <Input id="leito" value={leito} onChange={(e) => setLeito(e.target.value)} placeholder="Ex.: Leito 4" />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={setorAtual} onValueChange={(v) => setSetorAtual(v as Setor)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SETORES.map((s) => (
                    <SelectItem key={s} value={s}>{SETOR_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Situação</Label>
              <Select value={situacao} onValueChange={(v) => setSituacao(v as Situacao)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SITUACOES.map((s) => (
                    <SelectItem key={s} value={s}>{SITUACAO_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>TCLE</Label>
              <Select value={tcle} onValueChange={(v) => setTcle(v as TcleStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TCLE_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>{TCLE_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descrição</Label>
            <Input id="desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: TCE, AVC, Tumor" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="com">Comentários</Label>
            <Textarea id="com" rows={2} value={comentarios} onChange={(e) => setComentarios(e.target.value)} />
          </div>
          <DrawerFooter>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Salvando..." : "Adicionar paciente"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          </DrawerFooter>
        </form>

        <ConfirmAltaDialog
          open={confirmAlta}
          pacienteNome={nome.trim() || undefined}
          onConfirm={() => {
            setConfirmAlta(false);
            salvar();
          }}
          onCancel={() => {
            // "Vou checar no HGE": cria como ADM com verificação pendente
            // pra o pesquisador resolver depois pelo card amarelo.
            setConfirmAlta(false);
            salvar({ situacao: "ADM", verificacao_alta: "PENDENTE_HGE" });
          }}
        />
      </DrawerContent>
    </Drawer>
  );
}
