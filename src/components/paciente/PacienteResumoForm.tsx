"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
  type VerificacaoAlta,
} from "@/lib/domain/enums";
import { deletarPaciente, revalidarPacienteRoutes } from "@/app/(app)/pacientes/[id]/actions";
import { performWithSync } from "@/lib/sync/perform";
import type { UpdatePacientePayload } from "@/lib/sync/executors";
import type { Paciente } from "@/lib/domain/types";
import { debounce, cn } from "@/lib/utils";
import { ConfirmAltaDialog } from "./ConfirmAltaDialog";
import { VerificacaoAltaBanner, ForaDoutoreBanner } from "./VerificacaoAltaBanner";

const FIELD_LABEL = "text-[10px] uppercase tracking-editorial text-ash";
const FIELD_INPUT =
  "bg-paper-deep/50 border-hairline focus-visible:border-cobalt focus-visible:ring-0";

export function PacienteResumoForm({ paciente }: { paciente: Paciente }) {
  const router = useRouter();
  const [nome, setNome] = useState(paciente.nome);
  const [leito, setLeito] = useState(paciente.leito ?? "");
  const [setor, setSetor] = useState<Setor>(paciente.setor);
  const [situacao, setSituacao] = useState<Situacao>(paciente.situacao);
  const [tcle, setTcle] = useState<TcleStatus>(paciente.tcle_status);
  const [descricao, setDescricao] = useState(paciente.descricao ?? "");
  const [comentarios, setComentarios] = useState(paciente.comentarios ?? "");
  const [motivo, setMotivo] = useState(paciente.motivo_exclusao ?? "");
  const [redcapId, setRedcapId] = useState(paciente.redcap_id ?? "");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmAlta, setConfirmAlta] = useState(false);
  const [verificacao, setVerificacao] = useState<VerificacaoAlta | null>(
    paciente.verificacao_alta,
  );
  const [, startTransition] = useTransition();
  const firstRender = useRef(true);

  const save = useRef(
    debounce(async (patch: UpdatePacientePayload["patch"]) => {
      setSaving(true);
      startTransition(async () => {
        try {
          const res = await performWithSync<UpdatePacientePayload>(
            "update_paciente",
            { id: paciente.id, plantao_id: paciente.plantao_id, patch },
            { silent: true },
          );
          setSavedAt(new Date());
          // Online + sync OK: invalida o cache RSC das telas pai e do detalhe
          // pra que ao voltar pra /pacientes ou /plantoes a situação já esteja
          // atualizada — sem precisar de refresh manual.
          if (res === "synced") {
            revalidarPacienteRoutes(paciente.plantao_id, paciente.id).catch(() => {
              // fire-and-forget; se falhar, próxima nav cuida
            });
          }
        } catch (err) {
          toast.error("Erro ao salvar", { description: String(err) });
        } finally {
          setSaving(false);
        }
      });
    }, 800),
  ).current;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    save({
      nome,
      leito: leito || null,
      setor,
      situacao,
      tcle_status: tcle,
      descricao: descricao || null,
      comentarios: comentarios || null,
      motivo_exclusao: motivo || null,
      redcap_id: redcapId || null,
      verificacao_alta: verificacao,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, leito, setor, situacao, tcle, descricao, comentarios, motivo, redcapId, verificacao]);

  async function handleDelete() {
    if (!confirm(`Excluir paciente "${paciente.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deletarPaciente(paciente.id);
      toast.success("Paciente excluído");
      router.push(`/plantoes/${paciente.plantao_id}`);
    } catch (err) {
      toast.error("Erro ao excluir", { description: String(err) });
    }
  }

  return (
    <div className="space-y-4">
      {verificacao === "PENDENTE_HGE" && (
        <VerificacaoAltaBanner
          setorAtual={setor}
          leitoAtual={leito || null}
          onConfirmAlta={() => {
            setVerificacao(null);
            setSituacao("ALTA");
          }}
          onNaoFoiAlta={({ setor: s, leito: l }) => {
            // Volta pra ADM caso situacao já tivesse virado ALTA antes
            if (situacao === "ALTA") setSituacao("ADM");
            setSetor(s);
            setLeito(l ?? "");
            setVerificacao("FORA_DOUTORE");
          }}
        />
      )}

      {verificacao === "FORA_DOUTORE" && (
        <ForaDoutoreBanner onLimpar={() => setVerificacao(null)} />
      )}

      <div className="flex items-center justify-end gap-2 text-[10px] tracking-wide text-ash font-mono">
        <span
          className={cn(
            "size-1.5 rounded-full",
            saving ? "bg-saffron animate-pulse" : "bg-moss",
          )}
        />
        {saving
          ? "salvando..."
          : savedAt
            ? `salvo · ${savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
            : "auto-salva ao editar"}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome" className={FIELD_LABEL}>Nome</Label>
        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className={FIELD_INPUT} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="leito" className={FIELD_LABEL}>Leito</Label>
          <Input id="leito" value={leito} onChange={(e) => setLeito(e.target.value)} className={FIELD_INPUT} />
        </div>
        <div className="space-y-2">
          <Label className={FIELD_LABEL}>Setor</Label>
          <Select value={setor} onValueChange={(v) => setSetor(v as Setor)}>
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SETORES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SETOR_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className={FIELD_LABEL}>Situação</Label>
          <Select
            value={situacao}
            onValueChange={(v) => {
              const next = v as Situacao;
              // Pop-up quando alterar PARA alta (mas não bloqueia voltar pra outro estado).
              if (next === "ALTA" && situacao !== "ALTA") {
                setConfirmAlta(true);
                return;
              }
              setSituacao(next);
            }}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SITUACOES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SITUACAO_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={FIELD_LABEL}>TCLE</Label>
          <Select value={tcle} onValueChange={(v) => setTcle(v as TcleStatus)}>
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TCLE_STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {TCLE_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc" className={FIELD_LABEL}>Descrição</Label>
        <Input id="desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} className={FIELD_INPUT} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="com" className={FIELD_LABEL}>Comentários do plantão</Label>
        <Textarea id="com" rows={3} value={comentarios} onChange={(e) => setComentarios(e.target.value)} className={FIELD_INPUT} />
      </div>

      {situacao === "EXCLUSAO" && (
        <div className="space-y-2">
          <Label htmlFor="motivo" className={FIELD_LABEL}>
            Motivo de exclusão
          </Label>
          <Textarea
            id="motivo"
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: TCE >48h, AVC, tumor, etc."
            className={FIELD_INPUT}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="redcap" className={FIELD_LABEL}>
          REDCap ID (após exportação)
        </Label>
        <Input
          id="redcap"
          value={redcapId}
          onChange={(e) => setRedcapId(e.target.value)}
          placeholder="Vazio até exportar"
          className={cn(FIELD_INPUT, "font-mono")}
        />
      </div>

      <div className="pt-4 border-t border-hairline">
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-1.5" /> Excluir paciente
        </Button>
      </div>

      <ConfirmAltaDialog
        open={confirmAlta}
        pacienteNome={nome}
        onConfirm={() => {
          // Confirmou: vira ALTA, limpa qualquer pendência.
          setSituacao("ALTA");
          setVerificacao(null);
          setConfirmAlta(false);
        }}
        onCancel={() => {
          // "Vou checar no HGE": NÃO altera situação, marca card como amarelo
          // até o pesquisador resolver pelo banner de verificação.
          setVerificacao("PENDENTE_HGE");
          setConfirmAlta(false);
        }}
      />
    </div>
  );
}
