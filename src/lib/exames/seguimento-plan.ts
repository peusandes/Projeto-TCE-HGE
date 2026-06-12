import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

/** Seguimento já existente no banco (para um paciente). */
export type SeguimentoExistente = {
  seq: number;
  /** data_seg em ISO (YYYY-MM-DD), ou null se ainda não preenchida. */
  dataIso: string | null;
};

export type PlanoItem = {
  seq: number;
  dataIso: string;
  /** true = é o dia do exame (recebe os laboratoriais); false = dia em branco. */
  isExame: boolean;
  /** "criar" um novo seguimento, ou "atualizar" um já existente nessa data. */
  modo: "criar" | "atualizar";
};

export type Plano = {
  itens: PlanoItem[];
  /** seq do dia do exame. */
  seqExame: number;
  /** número do dia do exame contando a admissão como dia 1. */
  diaExame: number;
  avisos: string[];
};

export type PlanoErro = { erro: string };

/**
 * Monta o plano de seguimentos do dia 1 (admissão) até o dia do exame.
 *
 *  - O dia da admissão é o seguimento 1; cada dia seguinte é +1.
 *  - Dias entre o último seguimento existente e o exame são criados EM BRANCO
 *    (só com data_seg), pra não deixar buraco.
 *  - Se já existe um seguimento naquela data, ele é reutilizado (não duplica).
 *  - Nunca sobrescreve um seguimento existente de OUTRA data: nesse caso o novo
 *    dia recebe um seq livre no fim e emitimos um aviso de desalinhamento.
 *
 * Trabalha com datas-calendário (ignora horário da admissão).
 */
export function planejarSeguimentos(input: {
  admissaoIso: string;
  exameIso: string;
  existentes: SeguimentoExistente[];
}): Plano | PlanoErro {
  const admissao = parseISO(input.admissaoIso);
  const exame = parseISO(input.exameIso);
  if (Number.isNaN(admissao.getTime())) return { erro: "Data de admissão inválida." };
  if (Number.isNaN(exame.getTime())) return { erro: "Data do exame inválida." };

  const diaExame = differenceInCalendarDays(exame, admissao) + 1;
  if (diaExame < 1) {
    return { erro: "O exame é anterior à data de admissão." };
  }

  const avisos: string[] = [];
  const porData = new Map<string, SeguimentoExistente>();
  const seqsUsados = new Set<number>();
  let maxSeq = 0;
  for (const e of input.existentes) {
    if (e.dataIso) porData.set(e.dataIso, e);
    seqsUsados.add(e.seq);
    if (e.seq > maxSeq) maxSeq = e.seq;
  }

  const itens: PlanoItem[] = [];
  let seqExame = diaExame;

  for (let k = 1; k <= diaExame; k++) {
    const dataIso = format(addDays(admissao, k - 1), "yyyy-MM-dd");
    const isExame = k === diaExame;
    const existente = porData.get(dataIso);

    if (existente) {
      // Já há um seguimento nessa data: só mexemos nele se for o do exame.
      if (isExame) {
        seqExame = existente.seq;
        itens.push({ seq: existente.seq, dataIso, isExame: true, modo: "atualizar" });
      }
      continue;
    }

    // Precisa criar. Tenta usar seq = número do dia; se ocupado, joga pro fim.
    let seq: number;
    if (!seqsUsados.has(k)) {
      seq = k;
    } else {
      maxSeq += 1;
      seq = maxSeq;
      avisos.push(`Dia ${k} (${dataIso}): seq ${k} já estava em uso, criado como seq ${seq}.`);
    }
    seqsUsados.add(seq);
    if (seq > maxSeq) maxSeq = seq;
    if (isExame) seqExame = seq;

    itens.push({ seq, dataIso, isExame, modo: "criar" });
  }

  return { itens, seqExame, diaExame, avisos };
}
