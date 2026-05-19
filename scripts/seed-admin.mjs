#!/usr/bin/env node
/**
 * scripts/seed-admin.mjs
 *
 * Cria (ou promove) um pesquisador como admin do LANC TCE.
 * Uso:
 *   pnpm seed:admin <email> <senha> [nome completo]
 *
 * Requer .env.local com:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Idempotente: se o usuário já existe, atualiza senha + nome + marca admin.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv(resolve(process.cwd(), ".env.local"));

const [email, password, ...nomeParts] = process.argv.slice(2);
const nome = nomeParts.length ? nomeParts.join(" ") : null;

if (!email || !password) {
  console.error("\n❌ Uso: pnpm seed:admin <email> <senha> [nome completo]\n");
  process.exit(1);
}
if (password.length < 8) {
  console.error("\n❌ Senha precisa ter pelo menos 8 caracteres.\n");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "\n❌ Faltam variáveis em .env.local:\n   NEXT_PUBLIC_SUPABASE_URL\n   SUPABASE_SERVICE_ROLE_KEY\n\nCopie a service_role key em https://supabase.com/dashboard/project/<seu-id>/settings/api → 'service_role' (secret)\n",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`→ Procurando usuário ${email}...`);

  // Busca usuário existente
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId;
  if (existing) {
    console.log(`→ Usuário existe (${existing.id}). Atualizando senha + metadata...`);
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        ...(nome ? { nome } : {}),
        is_admin: true,
      },
    });
    if (error) throw error;
    userId = data.user.id;
  } else {
    console.log("→ Criando usuário novo...");
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...(nome ? { nome } : {}),
        is_admin: true,
      },
    });
    if (error) throw error;
    userId = data.user.id;
  }

  // Garante is_admin + setup_complete (independente do trigger)
  const patch = {
    is_admin: true,
    setup_complete: Boolean(nome),
  };
  if (nome) patch.nome = nome;

  const { error: updErr } = await admin.from("pesquisadores").update(patch).eq("id", userId);
  if (updErr) throw updErr;

  console.log(`✅ Admin pronto: ${email}`);
  console.log(`   user_id: ${userId}`);
  console.log(`   nome: ${nome ?? "(será definido no primeiro login)"}`);
  console.log(`   is_admin: true`);
  console.log(`   setup_complete: ${Boolean(nome)}`);
  console.log(`\nAgora abra http://localhost:3030/login e entre.`);
}

main().catch((err) => {
  console.error("\n❌ Erro:", err.message ?? err);
  process.exit(1);
});
