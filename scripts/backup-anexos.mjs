#!/usr/bin/env node
/**
 * scripts/backup-anexos.mjs
 *
 * Sincroniza o bucket Storage `anexos-tce` do Supabase pra disco local.
 * Incremental — só baixa arquivos que ainda não estão no destino
 * (compara path + tamanho). Storage do Supabase não é incluído no backup
 * automático do Postgres, então essa rotina é o que protege contra
 * perda de fotos de prontuário.
 *
 * Uso:
 *   pnpm backup:anexos                  # destino default: ~/Backups/lanc-tce-anexos
 *   pnpm backup:anexos /caminho/custom  # destino custom
 *
 * Agendar no macOS (semanal):
 *   crontab -e
 *   0 3 * * 0 cd /caminho/lanc-tce && /opt/homebrew/bin/pnpm backup:anexos >> ~/lanc-backup.log 2>&1
 *
 * Requer .env.local com:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Saída: cria estrutura espelho em
 *   <destino>/<paciente_id>/<tipo>_<data>_<short>.{ext}
 */

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

// Envs vêm via `--env-file=.env.local` (Node 20+).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "anexos-tce";

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("[backup] Faltando envs. Configure .env.local com");
  console.error("         NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const DEST = process.argv[2] ?? path.join(homedir(), "Backups", "lanc-tce-anexos");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`[backup] Origem: ${SUPABASE_URL} / bucket ${BUCKET}`);
console.log(`[backup] Destino: ${DEST}`);
console.log("");

/**
 * Storage do Supabase é organizado em "folders" virtuais. list() é raso,
 * então recursamos manualmente — cada paciente vira um folder pelo
 * path convention {paciente_id}/file.ext.
 */
async function listAll(prefix = "") {
  const all = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(`list ${prefix || "/"}: ${error.message}`);
  for (const item of data ?? []) {
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    // metadata é o jeito que Supabase Storage diferencia arquivo de folder
    if (item.id === null || item.metadata === null) {
      // folder — recursa
      const nested = await listAll(full);
      all.push(...nested);
    } else {
      all.push({
        path: full,
        size: item.metadata?.size ?? 0,
        contentType: item.metadata?.mimetype ?? "application/octet-stream",
      });
    }
  }
  return all;
}

async function alreadyHas(localPath, remoteSize) {
  if (!existsSync(localPath)) return false;
  try {
    const s = await stat(localPath);
    return s.size === remoteSize;
  } catch {
    return false;
  }
}

async function downloadOne(remotePath, localPath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(remotePath);
  if (error) throw new Error(`download ${remotePath}: ${error.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, buf);
}

async function main() {
  await mkdir(DEST, { recursive: true });
  const items = await listAll("");
  console.log(`[backup] ${items.length} arquivos no bucket`);
  let baixados = 0;
  let pulados = 0;
  let falhados = 0;
  for (const item of items) {
    const localPath = path.join(DEST, item.path);
    if (await alreadyHas(localPath, item.size)) {
      pulados++;
      continue;
    }
    try {
      await downloadOne(item.path, localPath);
      baixados++;
      // Mostra a cada 10 baixados pra não inundar log
      if (baixados % 10 === 0) {
        console.log(`[backup] ${baixados} baixados, ${pulados} já existiam...`);
      }
    } catch (err) {
      falhados++;
      console.error(`[backup] FALHA em ${item.path}: ${err.message}`);
    }
  }
  console.log("");
  console.log(`[backup] Concluído.`);
  console.log(`  baixados: ${baixados}`);
  console.log(`  já existiam: ${pulados}`);
  console.log(`  falhas: ${falhados}`);
  if (falhados > 0) process.exit(2);
}

main().catch((err) => {
  console.error("[backup] ERRO FATAL:", err);
  process.exit(1);
});
