#!/usr/bin/env node
/**
 * scripts/migrate-lanc-app.mjs
 *
 * Migra os DADOS do app de Extensão do João Pedro (lanc-app, Prisma/Supabase)
 * para o nosso Supabase (projetotce.com), nas tabelas aditivas criadas pelas
 * migrations 0026/0027/0028.
 *
 * ── O QUE FAZ ────────────────────────────────────────────────────────────────
 *  1. IDENTIDADE: lê os Profile do JP. Para cada email:
 *       - se já existe um usuário no NOSSO Auth (mesma pessoa) → reaproveita o uuid (MERGE);
 *       - senão → cria/convida no nosso Auth (decisão do Pedro: re-convidar por email).
 *     Monta o mapa  Profile.id (cuid)  →  pesquisadores.id (uuid).
 *  2. Atualiza `pesquisadores` com os campos de membro (role, status, cargos, etc.).
 *  3. Importa as demais tabelas (documentos, escalas, pacientes da extensão, etc.),
 *     traduzindo profileId(cuid) → pesquisador_id(uuid) e camelCase → snake_case.
 *
 * ── SEGURANÇA ────────────────────────────────────────────────────────────────
 *  - SÓ faz INSERT/UPSERT nas tabelas NOVAS do merge + cria usuários no Auth.
 *  - NUNCA toca em pacientes / coletas_redcap / anexos (dado de pesquisa).
 *  - DRY-RUN por padrão: sem `--commit` ele só lê a origem e mostra o plano.
 *  - Idempotente: PKs nossas são text = os cuids do JP; re-rodar faz upsert, não duplica.
 *  - Os ARQUIVOS do Storage (PDFs de documentos/certificados) NÃO entram aqui —
 *    é um passo à parte (este script traz só os metadados/storage_path).
 *
 * ── USO ──────────────────────────────────────────────────────────────────────
 *    node scripts/migrate-lanc-app.mjs                 # dry-run (não escreve nada)
 *    node scripts/migrate-lanc-app.mjs --commit        # escreve dados + cria usuários (SEM e-mail)
 *    node scripts/migrate-lanc-app.mjs --commit --invite  # idem + dispara convite por e-mail
 *
 * ── ENV (.env.local) ─────────────────────────────────────────────────────────
 *    NEXT_PUBLIC_SUPABASE_URL=...           (nosso projeto)
 *    SUPABASE_SERVICE_ROLE_KEY=...          (nosso projeto — service_role, secreto)
 *    SOURCE_DATABASE_URL=postgresql://...   (connection string de LEITURA do Supabase do JP)
 */
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Datas (DATE = OID 1082) voltam como string 'YYYY-MM-DD' — evita drift de fuso.
pg.types.setTypeParser(1082, (v) => v);

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadDotEnv(resolve(process.cwd(), ".env.local"));

const COMMIT = process.argv.includes("--commit");
const INVITE = process.argv.includes("--invite");
const INVITE_REDIRECT = "https://projetotce.com/auth/callback?next=/auth/setup-account";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sourceUrl = process.env.SOURCE_DATABASE_URL;

if (!url || !serviceKey) {
  console.error("\n❌ Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local (nosso projeto).\n");
  process.exit(1);
}
if (!sourceUrl) {
  console.error(
    "\n❌ Falta SOURCE_DATABASE_URL em .env.local — connection string de LEITURA do Supabase do JP.\n" +
      "   (Dashboard do JP → Settings → Database → Connection string → URI)\n",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const source = new pg.Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });

const log = (...a) => console.log(...a);
const banner = COMMIT ? (INVITE ? "COMMIT + INVITE" : "COMMIT (sem e-mail)") : "DRY-RUN (nada será escrito)";

// ── Helpers de origem (Postgres do JP) ──────────────────────────────────────
async function tableExists(name) {
  const { rows } = await source.query("select to_regclass($1) as t", [`public."${name}"`]);
  return rows[0].t != null;
}
async function fetchAll(name) {
  const { rows } = await source.query(`select * from "${name}"`);
  return rows;
}

// ── Helpers de destino (nosso Supabase) ─────────────────────────────────────
async function listAllAuthUsers() {
  const all = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return all;
}
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
async function upsertAll(table, rows, conflict = "id") {
  for (const batch of chunk(rows, 500)) {
    const { error } = await admin.from(table).upsert(batch, { onConflict: conflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

const idMap = new Map(); // Profile.id (cuid) → pesquisadores.id (uuid)
const newUids = new Set(); // uuids recém criados (não-merge) — para definir nome

// ── Fase 1: identidade ──────────────────────────────────────────────────────
async function migrarIdentidade() {
  log("\n┌─ IDENTIDADE (Profile → Auth + pesquisadores) ─────────────");
  const profiles = await fetchAll("Profile");
  const authUsers = await listAllAuthUsers();
  const emailToUid = new Map();
  for (const u of authUsers) if (u.email) emailToUid.set(u.email.toLowerCase(), u.id);

  const stats = { merge: 0, criar: 0, convidar: 0, semEmail: 0, erro: 0 };

  for (const p of profiles) {
    const email = (p.email || "").trim().toLowerCase();
    if (!email) {
      stats.semEmail++;
      continue;
    }
    const existing = emailToUid.get(email);
    if (existing) {
      idMap.set(p.id, existing);
      stats.merge++;
      continue;
    }
    if (!COMMIT) {
      idMap.set(p.id, `DRYRUN:${email}`);
      INVITE ? stats.convidar++ : stats.criar++;
      continue;
    }
    try {
      let uid;
      if (INVITE) {
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: INVITE_REDIRECT });
        if (error) throw error;
        uid = data.user.id;
        stats.convidar++;
      } else {
        const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
        if (error) throw error;
        uid = data.user.id;
        stats.criar++;
      }
      emailToUid.set(email, uid);
      idMap.set(p.id, uid);
      newUids.add(uid);
    } catch (e) {
      stats.erro++;
      log(`   ⚠️  ${email}: ${e.message ?? e}`);
    }
  }

  log(`   Profiles na origem: ${profiles.length}`);
  log(`   → merge (já existem no nosso Auth): ${stats.merge}`);
  log(`   → ${INVITE ? "convidar por e-mail" : "criar (sem e-mail)"}: ${INVITE ? stats.convidar : stats.criar}`);
  if (stats.semEmail) log(`   → sem e-mail (pulados): ${stats.semEmail}`);
  if (stats.erro) log(`   → erros: ${stats.erro}`);

  // Atualiza campos de membro em pesquisadores (só para uuids reais).
  if (COMMIT) {
    let upd = 0;
    for (const p of profiles) {
      const uid = idMap.get(p.id);
      if (!uid || uid.startsWith("DRYRUN:")) continue;
      const patch = {
        role: p.role ?? "MEMBER",
        status: p.status ?? "ATIVO",
        is_diretor: p.isDiretor ?? false,
        is_secretario: p.isSecretario ?? false,
      };
      if (p.role === "ADMIN") patch.is_admin = true;
      if (p.matricula) patch.matricula = p.matricula;
      if (p.semestre != null) patch.semestre = p.semestre;
      if (p.telefone) patch.telefone = p.telefone;
      if (p.diretoria) patch.diretoria = p.diretoria;
      if (p.cargoEspecial) patch.cargo_especial = p.cargoEspecial;
      if (p.avatarUrl) patch.avatar_url = p.avatarUrl;
      if (newUids.has(uid) && p.fullName) patch.nome = p.fullName; // não sobrescreve nome de quem já era pesquisador
      const { error } = await admin.from("pesquisadores").update(patch).eq("id", uid);
      if (error) log(`   ⚠️  pesquisadores ${p.email}: ${error.message}`);
      else upd++;
    }
    log(`   pesquisadores atualizados: ${upd}`);
  } else {
    log("   (dry-run: pesquisadores seriam atualizados com role/status/cargos/etc.)");
  }
  log("└───────────────────────────────────────────────────────────");
}

// ── Fase 2: tabelas (ordem respeita FKs) ────────────────────────────────────
// translate = colunas (nome de ORIGEM) que são profileId-like (cuid → uuid).
// required = subset de translate que NÃO pode ser null (linha é pulada se não mapear).
const TABLES = [
  { src: "AllowedUser", dst: "allowed_users", cols: { id: "id", email: "email", fullName: "nome", cohort: "cohort", source: "source", bannedAt: "banned_at", createdAt: "criado_em" } },
  { src: "SignupRequest", dst: "signup_requests", cols: { id: "id", email: "email", fullName: "nome", matricula: "matricula", semestre: "semestre", message: "mensagem", status: "status", reviewedBy: "revisado_por", reviewedAt: "revisado_em", createdAt: "criado_em", updatedAt: "atualizado_em" } },
  { src: "Documento", dst: "documentos", cols: { id: "id", profileId: "pesquisador_id", tipo: "tipo", nomeArquivo: "nome_arquivo", storagePath: "storage_path", status: "status", validade: "validade", uploadedAt: "enviado_em", reviewedAt: "revisado_em", reviewedBy: "revisado_por", observacoes: "observacoes" }, translate: ["profileId"], required: ["profileId"] },
  { src: "Cracha", dst: "crachas", cols: { id: "id", profileId: "pesquisador_id", codigo: "codigo", status: "status", emitidoAt: "emitido_em", expiraAt: "expira_em", emitidoPor: "emitido_por" }, translate: ["profileId"], required: ["profileId"] },
  { src: "Certificado", dst: "certificados", cols: { id: "id", profileId: "pesquisador_id", tipo: "tipo", descricao: "descricao", semestre: "semestre", ano: "ano", horaAtividades: "hora_atividades", pdfStoragePath: "pdf_storage_path", emitidoAt: "emitido_em", emitidoPor: "emitido_por" }, translate: ["profileId"], required: ["profileId"] },
  { src: "EstagioSlot", dst: "estagio_slots", cols: { id: "id", data: "data", turno: "turno", capacidade: "capacidade", createdAt: "criado_em" } },
  { src: "EstagioSignup", dst: "estagio_signups", cols: { id: "id", slotId: "slot_id", profileId: "pesquisador_id", displayName: "display_name", status: "status", signedUpAt: "signed_up_at", cancelledAt: "cancelado_em" }, translate: ["profileId"] },
  { src: "EstagioAlocacao", dst: "estagio_alocacoes", cols: { id: "id", profileId: "pesquisador_id", diaSemana: "dia_semana", turno: "turno", ativo: "ativo", createdAt: "criado_em", createdBy: "criado_por" }, translate: ["profileId"], required: ["profileId"] },
  { src: "EstagioSolicitacao", dst: "estagio_solicitacoes", cols: { id: "id", profileId: "pesquisador_id", tipo: "tipo", deDiaSemana: "de_dia_semana", deTurno: "de_turno", paraDiaSemana: "para_dia_semana", paraTurno: "para_turno", mensagem: "mensagem", status: "status", reviewedBy: "revisado_por", reviewedAt: "revisado_em", respostaMotivo: "resposta_motivo", createdAt: "criado_em", updatedAt: "atualizado_em" }, translate: ["profileId"], required: ["profileId"] },
  { src: "EstagioOcorrencia", dst: "estagio_ocorrencias", cols: { id: "id", profileId: "pesquisador_id", data: "data", diaSemana: "dia_semana", turno: "turno", tipo: "tipo", motivo: "motivo", substitutoProfileId: "substituto_pesquisador_id", createdAt: "criado_em" }, translate: ["profileId", "substitutoProfileId"], required: ["profileId"] },
  { src: "TceColeta", dst: "tce_coletas", cols: { id: "id", data: "data", local: "local", turno: "turno", capacidadeMax: "capacidade_max", status: "status", observacoes: "observacoes", createdAt: "criado_em" } },
  { src: "TceDisponibilidade", dst: "tce_disponibilidades", cols: { id: "id", coletaId: "coleta_id", profileId: "pesquisador_id", status: "status", notas: "notas", submittedAt: "submetido_em" }, translate: ["profileId"], required: ["profileId"] },
  { src: "TceEscala", dst: "tce_escalas", cols: { id: "id", coletaId: "coleta_id", profileId: "pesquisador_id", displayName: "display_name", role: "role", confirmedAt: "confirmado_em", assignedBy: "atribuido_por", createdAt: "criado_em" }, translate: ["profileId"] },
  { src: "TcePresenca", dst: "tce_presencas", cols: { id: "id", escalaId: "escala_id", profileId: "pesquisador_id", presente: "presente", observacoes: "observacoes", registradoAt: "registrado_em", registradoPor: "registrado_por" }, translate: ["profileId"], required: ["profileId"] },
  { src: "Paciente", dst: "pacientes_extensao", cols: { id: "id", fluxo: "fluxo", nome: "nome", leito: "leito", diagnostico: "diagnostico", dataAdmissao: "data_admissao", statusAtual: "status_atual", altaReportadaAt: "alta_reportada_em", altaReportadaPor: "alta_reportada_por", registradoPor: "registrado_por", observacoes: "observacoes", createdAt: "criado_em", updatedAt: "atualizado_em" } },
  { src: "PacienteStatusEvento", dst: "paciente_status_eventos", cols: { id: "id", pacienteId: "paciente_id", status: "status", registradoEm: "registrado_em", registradoPor: "registrado_por", observacoes: "observacoes" } },
  { src: "Settings", dst: "settings", cols: { key: "key", value: "value", updatedBy: "atualizado_por", updatedAt: "atualizado_em" }, conflict: "key" },
];

async function migrarTabela(spec) {
  if (!(await tableExists(spec.src))) {
    log(`  • ${spec.src} → ${spec.dst}: tabela inexistente na origem — pulada`);
    return;
  }
  const rows = await fetchAll(spec.src);
  const out = [];
  let pulados = 0;
  for (const r of rows) {
    const obj = {};
    for (const [s, t] of Object.entries(spec.cols)) obj[t] = r[s] ?? null;
    let drop = false;
    for (const tcol of spec.translate ?? []) {
      const tgt = spec.cols[tcol];
      const cuid = r[tcol];
      if (cuid == null) {
        obj[tgt] = null;
      } else {
        const uid = idMap.get(cuid);
        if (!uid) {
          if ((spec.required ?? []).includes(tcol)) {
            drop = true;
            break;
          }
          obj[tgt] = null;
        } else {
          obj[tgt] = uid;
        }
      }
    }
    if (drop) pulados++;
    else out.push(obj);
  }
  if (COMMIT) await upsertAll(spec.dst, out, spec.conflict ?? "id");
  log(`  • ${spec.src} → ${spec.dst}: ${out.length} linha(s)${pulados ? `, ${pulados} pulada(s) (profile sem mapa)` : ""}${COMMIT ? "" : " [dry-run]"}`);
}

async function main() {
  log(`\n🔁 Migração lanc-app → projetotce.com   [${banner}]`);
  await source.connect();
  try {
    await migrarIdentidade();
    log("\n┌─ TABELAS ─────────────────────────────────────────────────");
    for (const spec of TABLES) await migrarTabela(spec);
    log("└───────────────────────────────────────────────────────────");
    log(
      COMMIT
        ? "\n✅ Concluído. Confira no app. Os ARQUIVOS do Storage (PDFs) são um passo à parte."
        : "\n👀 Dry-run concluído. Rode com --commit para escrever (e --invite para disparar os convites).",
    );
  } finally {
    await source.end();
  }
}

main().catch((e) => {
  console.error("\n❌ Erro:", e.message ?? e);
  process.exit(1);
});
