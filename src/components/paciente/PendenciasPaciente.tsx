import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { Paciente, Anexo } from "@/lib/domain/types";
import type { ColetaRedcapRow } from "@/lib/data/redcap";

type Props = {
  paciente: Paciente;
  coletas: ColetaRedcapRow[];
  anexos: Anexo[];
};

type Pendencia = {
  level: "warning" | "info";
  text: string;
};

/**
 * Server component que avalia inconsistências entre o estado do paciente,
 * suas coletas REDCap e anexos. Mostra como lista de itens (cada um =
 * uma observação que vale a pena resolver). NÃO bloqueia nada — só avisa.
 */
export function PendenciasPaciente({ paciente, coletas, anexos }: Props) {
  const pendencias: Pendencia[] = [];

  const hasComplete = (tipo: string) =>
    coletas.some((c) => c.instrument === tipo && c.status === "COMPLETE");

  // 1) Histórico admissão completo mas dados demográficos faltando — sem
  //    contatos, GOS-E vira impossível.
  if (hasComplete("historia_admissao") && !hasComplete("dados_demograficos")) {
    pendencias.push({
      level: "warning",
      text:
        "Histórico da admissão completo, mas Dados Demográficos ainda não — preencha telefones pra possibilitar GOS-E.",
    });
  }

  // 2) Alta completa mas dados demográficos faltando — mesma justificativa.
  if (hasComplete("alta") && !hasComplete("dados_demograficos")) {
    pendencias.push({
      level: "warning",
      text:
        "Alta completa, mas Dados Demográficos não — sem telefones, ligações de GOS-E vão falhar.",
    });
  }

  // 3) TCLE marcado como Assinado mas sem nenhum anexo do tipo TCLE_ASSINADO.
  if (paciente.tcle_status === "ASSINADO") {
    const temAnexoTcle = anexos.some((a) => a.tipo_anexo === "TCLE_ASSINADO");
    if (!temAnexoTcle) {
      pendencias.push({
        level: "warning",
        text:
          "TCLE marcado como Assinado, mas nenhum anexo do tipo TCLE_ASSINADO foi enviado.",
      });
    }
  }

  // 4) Anexos TCLE_ASSINADO existem mas paciente está com TCLE pendente.
  if (paciente.tcle_status === "PENDENTE") {
    const temAnexoTcle = anexos.some((a) => a.tipo_anexo === "TCLE_ASSINADO");
    if (temAnexoTcle) {
      pendencias.push({
        level: "info",
        text:
          "Há anexo de TCLE assinado, mas o status do paciente ainda está como Pendente — atualize pra Assinado.",
      });
    }
  }

  // 5) Paciente em ADM com seguimento já completo — auto-marca SEG sugerido.
  if (paciente.situacao === "ADM" && hasComplete("seguimento")) {
    pendencias.push({
      level: "info",
      text:
        "Já existe seguimento completo, mas o paciente está como Admissão — considere mudar para Seguimento.",
    });
  }

  // 6) Histórico admissão sem trauma datetime preenchido (GOS-E vai falhar
  //    de calcular).
  const histColeta = coletas.find((c) => c.instrument === "historia_admissao");
  if (histColeta && !histColeta.data.hora_trauma) {
    pendencias.push({
      level: "warning",
      text:
        "Histórico da admissão sem hora do trauma — GOS-E 30/90/180 não vai aparecer nos lembretes.",
    });
  }

  // 7) Coletas marcadas REDCap mas record_id (redcap_id no paciente) vazio.
  const algumaComplete = coletas.some((c) => c.status === "COMPLETE");
  if (algumaComplete && !paciente.redcap_id) {
    pendencias.push({
      level: "info",
      text:
        "Coleta REDCap já tem dados completos, mas o ID do paciente no REDCap (record_id) está vazio — preencha pra facilitar exportação.",
    });
  }

  if (pendencias.length === 0) {
    return (
      <div className="rounded-lg border border-moss/30 bg-moss/[0.05] px-3.5 py-3 flex items-center gap-2.5">
        <CheckCircle2 className="h-4 w-4 text-moss shrink-0" strokeWidth={1.8} />
        <p className="text-[12px] text-graphite leading-snug">
          Nenhuma pendência cross-form detectada.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-saffron/30 bg-saffron/[0.05] p-3 space-y-2">
      <div className="flex items-center gap-2 px-1">
        <AlertCircle className="h-3.5 w-3.5 text-saffron" strokeWidth={2} />
        <span className="text-[10px] uppercase tracking-editorial text-saffron font-semibold">
          {pendencias.length} pendência{pendencias.length > 1 ? "s" : ""} no paciente
        </span>
      </div>
      <ul className="space-y-1.5 pl-5">
        {pendencias.map((p, i) => (
          <li
            key={i}
            className={`text-[11.5px] leading-snug list-disc ${
              p.level === "warning" ? "text-graphite" : "text-ash"
            }`}
          >
            {p.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
