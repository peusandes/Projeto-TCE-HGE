import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Retenção de anexos: todo anexo (foto/PDF, de qualquer tipo, inclusive
 * TCLE) com mais de RETENCAO_DIAS é apagado do Storage E a linha some da
 * tabela `anexos`. Roda diariamente via Vercel Cron (/api/cron/limpar-anexos).
 *
 * Também varre o bucket atrás de arquivos órfãos (sem linha em `anexos`,
 * ex.: upload que falhou no meio, ou remoção do Storage que falhou) mais
 * velhos que o corte — esses também só ocupam espaço.
 */

export const RETENCAO_DIAS = 30;
export const BUCKET_ANEXOS = "anexos-tce";

// Storage aceita no máx. ~1000 paths por remove(); 100 mantém o request leve.
const LOTE_REMOVE = 100;
const LOTE_SELECT = 500;

export function dataCorte(agora: Date, dias = RETENCAO_DIAS): Date {
  return new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
}

export function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }
  return lotes;
}

/** Arquivos do bucket mais velhos que o corte e sem linha em `anexos`. */
export function filtrarOrfaos(
  arquivos: { path: string; criadoEm: string | null }[],
  pathsComLinha: Set<string>,
  corte: Date,
): string[] {
  return arquivos
    .filter((a) => !pathsComLinha.has(a.path))
    .filter((a) => a.criadoEm !== null && new Date(a.criadoEm) < corte)
    .map((a) => a.path);
}

export type ResultadoLimpeza = {
  dryRun: boolean;
  corte: string;
  linhasApagadas: number;
  arquivosApagados: number;
  orfaosApagados: number;
  bytesLiberados: number;
  erros: string[];
};

type Admin = SupabaseClient;

/** Lista recursiva do bucket (list() é raso; cada paciente é um "folder"). */
async function listarBucket(
  admin: Admin,
  prazo: number,
  prefixo = "",
): Promise<{ path: string; criadoEm: string | null }[]> {
  const todos: { path: string; criadoEm: string | null }[] = [];
  for (let offset = 0; ; offset += 1000) {
    if (Date.now() > prazo) throw new Error("varredura de órfãos parou no prazo (continua amanhã)");
    const { data, error } = await admin.storage
      .from(BUCKET_ANEXOS)
      .list(prefixo, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${prefixo || "/"}: ${error.message}`);
    for (const item of data ?? []) {
      const full = prefixo ? `${prefixo}/${item.name}` : item.name;
      if (item.id === null || item.metadata === null) {
        todos.push(...(await listarBucket(admin, prazo, full)));
      } else {
        todos.push({ path: full, criadoEm: item.created_at ?? null });
      }
    }
    if (!data || data.length < 1000) break;
  }
  return todos;
}

export async function limparAnexosExpirados(
  admin: Admin,
  // prazoMs: limite pra varredura de órfãos (a função da Vercel tem 300s).
  opts: { agora?: Date; dias?: number; dryRun?: boolean; prazoMs?: number } = {},
): Promise<ResultadoLimpeza> {
  const inicio = Date.now();
  const dryRun = opts.dryRun ?? false;
  const corte = dataCorte(opts.agora ?? new Date(), opts.dias);
  const res: ResultadoLimpeza = {
    dryRun,
    corte: corte.toISOString(),
    linhasApagadas: 0,
    arquivosApagados: 0,
    orfaosApagados: 0,
    bytesLiberados: 0,
    erros: [],
  };

  // 1. Anexos expirados (com linha no banco). Primeiro o arquivo, depois a
  //    linha — se o Storage falhar, a linha fica pra próxima rodada em vez
  //    de virar arquivo órfão invisível.
  const falharam = new Set<string>();
  for (let offset = 0; ; ) {
    const { data, error } = await admin
      .from("anexos")
      .select("id, storage_path, tamanho_bytes")
      .lt("enviado_em", corte.toISOString())
      .order("enviado_em", { ascending: true })
      .range(offset, offset + LOTE_SELECT - 1);
    if (error) {
      res.erros.push(`select anexos: ${error.message}`);
      break;
    }
    const lote = (data ?? []).filter((a) => !falharam.has(a.id));
    if (lote.length === 0) break;

    for (const sub of emLotes(lote, LOTE_REMOVE)) {
      const bytes = sub.reduce((s, a) => s + Number(a.tamanho_bytes ?? 0), 0);
      if (dryRun) {
        res.linhasApagadas += sub.length;
        res.arquivosApagados += sub.length;
        res.bytesLiberados += bytes;
        continue;
      }
      const paths = sub.map((a) => a.storage_path).filter(Boolean);
      // remove() não dá erro pra path que já não existe — só não o devolve.
      const { data: removidos, error: rmErr } = await admin.storage
        .from(BUCKET_ANEXOS)
        .remove(paths);
      if (rmErr) {
        res.erros.push(`storage remove: ${rmErr.message}`);
        sub.forEach((a) => falharam.add(a.id));
        continue;
      }
      const { error: delErr } = await admin
        .from("anexos")
        .delete()
        .in(
          "id",
          sub.map((a) => a.id),
        );
      if (delErr) {
        res.erros.push(`delete anexos: ${delErr.message}`);
        sub.forEach((a) => falharam.add(a.id));
        continue;
      }
      res.arquivosApagados += removidos?.length ?? 0;
      res.linhasApagadas += sub.length;
      res.bytesLiberados += bytes;
    }

    // Em dry-run nada some, então pagina; no modo real as linhas apagadas
    // saem do resultado e só as que falharam continuam (puladas via Set).
    offset = dryRun ? offset + LOTE_SELECT : falharam.size;
    if ((data ?? []).length < LOTE_SELECT) break;
  }

  // 2. Órfãos: arquivo no bucket sem linha em `anexos`, mais velho que o corte.
  try {
    const arquivos = await listarBucket(admin, inicio + (opts.prazoMs ?? Infinity));
    const pathsComLinha = new Set<string>();
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin
        .from("anexos")
        .select("storage_path")
        .range(offset, offset + 999);
      if (error) throw new Error(`select paths: ${error.message}`);
      (data ?? []).forEach((a) => pathsComLinha.add(a.storage_path));
      if (!data || data.length < 1000) break;
    }
    const orfaos = filtrarOrfaos(arquivos, pathsComLinha, corte);
    if (dryRun) {
      res.orfaosApagados = orfaos.length;
    } else {
      for (const sub of emLotes(orfaos, LOTE_REMOVE)) {
        const { data: removidos, error } = await admin.storage
          .from(BUCKET_ANEXOS)
          .remove(sub);
        if (error) res.erros.push(`storage remove órfãos: ${error.message}`);
        else res.orfaosApagados += removidos?.length ?? 0;
      }
    }
  } catch (err) {
    res.erros.push(err instanceof Error ? err.message : String(err));
  }

  return res;
}
