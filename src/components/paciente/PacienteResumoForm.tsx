"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
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
import { revalidarPacienteRoutes } from "@/app/(app)/pacientes/[id]/actions";
import { ExcluirPacienteButton } from "./ExcluirPacienteButton";
import { EnviarRedcapButton } from "./EnviarRedcapButton";
import { performWithSync } from "@/lib/sync/perform";
import type { UpdatePacientePayload } from "@/lib/sync/executors";
import type { Paciente } from "@/lib/domain/types";
import { debounce, cn, errMsg } from "@/lib/utils";
import { ConfirmAltaDialog } from "./ConfirmAltaDialog";
import { VerificacaoAltaBanner, ForaDoutoreBanner } from "./VerificacaoAltaBanner";

const FIELD_LABEL = "text-[10px] uppercase tracking-editorial text-ash";
const FIELD_INPUT =
  "bg-paper-deep/50 border-hairline focus-visible:border-cobalt focus-visible:ring-0";

export function PacienteResumoForm({
  paciente,
  plantaoContextoId,
}: {
  paciente: Paciente;
  /** Plantão "atual" pra onde voltar e revalidar. Quando ausente, usa o
   *  plantão de origem do paciente (legado / link direto). */
  plantaoContextoId?: string;
}) {
  const plantaoAtivoId = plantaoContextoId ?? paciente.plantao_id;
  const [nome, setNome] = useState(paciente.nome);
  const [leito, setLeito] = useState(paciente.leito ?? "");
  const [setor, setSetor] = useState<Setor>(paciente.setor);
  const [situacao, setSituacao] = useState<Situacao>(paciente.situacao);
  const [tcle, setTcle] = useState<TcleStatus>(paciente.tcle_status);
  const [descricao, setDescricao] = useState(paciente.descricao ?? "");
  const [comentarios, setComentarios] = useState(paciente.comentarios ?? "");
  const [motivo, setMotivo] = useState(paciente.motivo_exclusao ?? "");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmAlta, setConfirmAlta] = useState(false);
  const [verificacao, setVerificacao] = useState<VerificacaoAlta | null>(
    paciente.verificacao_alta,
  );
  const [, startTransition] = useTransition();
  // Snapshot inicial pra detectar mudança real (em vez de "primeiro render"
  // que pulava o save se a primeira ação fosse marcar ALTA imediatamente).
  const initial = useRef({
    nome: paciente.nome,
    leito: paciente.leito ?? "",
    setor: paciente.setor,
    situacao: paciente.situacao,
    tcle: paciente.tcle_status,
    descricao: paciente.descricao ?? "",
    comentarios: paciente.comentarios ?? "",
    motivo: paciente.motivo_exclusao ?? "",
    verificacao: paciente.verificacao_alta,
  });

  const save = useRef(
    debounce(async (patch: UpdatePacientePayload["patch"]) => {
      setSaving(true);
      startTransition(async () => {
        try {
          const res = await performWithSync<UpdatePacientePayload>(
            "update_paciente",
            { id: paciente.id, plantao_id: plantaoAtivoId, patch },
            { silent: true },
          );
          setSavedAt(new Date());
          // Online + sync OK: invalida o cache RSC das telas pai e do detalhe
          // pra que ao voltar pra /pacientes ou /plantoes a situação já esteja
          // atualizada — sem precisar de refresh manual.
          if (res === "synced") {
            revalidarPacienteRoutes(plantaoAtivoId, paciente.id).catch(() => {
              // fire-and-forget; se falhar, próxima nav cuida
            });
          }
        } catch (err) {
          toast.error("Erro ao salvar", { description: errMsg(err) });
        } finally {
          setSaving(false);
        }
      });
    }, 800),
  ).current;

  useEffect(() => {
    const ini = initial.current;
    // Só salva se algo de fato divergiu do snapshot inicial. Cobre o caso
    // do guard antigo (ignora mount) sem perder o primeiro toque do usuário.
    const mudou =
      nome !== ini.nome ||
      leito !== ini.leito ||
      setor !== ini.setor ||
      situacao !== ini.situacao ||
      tcle !== ini.tcle ||
      descricao !== ini.descricao ||
      comentarios !== ini.comentarios ||
      motivo !== ini.motivo ||
      verificacao !== ini.verificacao;
    if (!mudou) return;
    save({
      nome,
      leito: leito || null,
      setor,
      situacao,
      tcle_status: tcle,
      descricao: descricao || null,
      comentarios: comentarios || null,
      motivo_exclusao: motivo || null,
      verificacao_alta: verificacao,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, leito, setor, situacao, tcle, descricao, comentarios, motivo, verificacao]);

  // Não perder edições: grava o save pendente ao DESMONTAR (navegar no app) e ao
  // ESCONDER/FECHAR a aba do navegador.
  useEffect(() => {
    const onPageHide = () => save.flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save.flush();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      save.flush();
    };
  }, [save]);


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
          REDCap ID (definido pelo envio)
        </Label>
        <Input
          id="redcap"
          value={paciente.redcap_id ?? ""}
          readOnly
          placeholder="Vazio até enviar ao REDCap"
          className={cn(FIELD_INPUT, "font-mono bg-paper-deep/70 text-graphite cursor-not-allowed")}
          title="Definido automaticamente ao enviar para o REDCap"
        />
      </div>

      <div className="pt-4 border-t border-hairline">
        <EnviarRedcapButton
          pacienteId={paciente.id}
          pacienteNome={paciente.nome}
          habilitado={paciente.redcap_export_habilitado}
        />
      </div>

      <div className="pt-4 border-t border-hairline">
        <ExcluirPacienteButton
          pacienteId={paciente.id}
          pacienteNome={paciente.nome}
          plantaoId={plantaoAtivoId}
        />
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
