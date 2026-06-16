-- Migration: 0026_lanc_membros
-- Absorve a camada de IDENTIDADE/MEMBROS/ADMIN do lanc-app (JP) no nosso padrão
-- (Supabase + SQL + RLS), SEM Prisma. O `Profile` do lanc-app é reconciliado
-- estendendo a nossa `pesquisadores` (id = auth.users). As demais tabelas são
-- NOVAS e aditivas — não tocam nas tabelas de pesquisa (pacientes/coletas_redcap).
--
-- IDs em `text` (não uuid) pra aceitar os cuids existentes do lanc-app na futura
-- migração de dados; novas linhas ganham um id gerado.

-- ── Gatilho reutilizável de atualizado_em ───────────────────────────────────
-- O schema inteiro usa a coluna PT-BR `atualizado_em`; nenhuma tabela tem
-- `updated_at`. Escrever no nome certo evita erro 42703 ("record new has no
-- field updated_at") em todo UPDATE das tabelas que usam este gatilho.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ── Profile → estende pesquisadores ─────────────────────────────────────────
alter table public.pesquisadores
  add column if not exists role          text    not null default 'MEMBER' check (role in ('MEMBER','ADMIN')),
  add column if not exists status        text    not null default 'ATIVO'  check (status in ('ATIVO','INATIVO','CALOURO')),
  add column if not exists matricula     text,
  add column if not exists semestre      integer,
  add column if not exists telefone      text,
  add column if not exists diretoria     text    check (diretoria is null or diretoria in ('EXTENSAO')),
  add column if not exists is_diretor    boolean not null default false,
  add column if not exists is_secretario boolean not null default false,
  add column if not exists cargo_especial text   check (cargo_especial is null or cargo_especial in ('PESQUISADOR_TCE_BABY'));

create unique index if not exists pesquisadores_matricula_uniq
  on public.pesquisadores(matricula) where matricula is not null;
create index if not exists pesquisadores_status_role_idx
  on public.pesquisadores(status, role);

-- ── allowed_users (allowlist de quem pode logar) ────────────────────────────
create table if not exists public.allowed_users (
  id         text primary key default gen_random_uuid()::text,
  email      text not null unique,
  nome       text,
  cohort     text,
  source     text not null default 'MANUAL',
  banned_at  timestamptz,
  criado_em  timestamptz not null default now()
);
create index if not exists allowed_users_cohort_idx on public.allowed_users(cohort);

-- ── signup_requests (cadastro com aprovação do admin) ───────────────────────
create table if not exists public.signup_requests (
  id          text primary key default gen_random_uuid()::text,
  email       text not null,
  nome        text not null,
  matricula   text,
  semestre    integer,
  mensagem    text,
  status      text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  revisado_por text,
  revisado_em timestamptz,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists signup_requests_status_idx on public.signup_requests(status, criado_em);
-- No máximo 1 solicitação PENDING por email; não trava re-tentativas após
-- rejeição/aprovação (nem a importação de histórico do lanc-app).
create unique index if not exists signup_requests_email_pending_uniq
  on public.signup_requests(email) where status = 'PENDING';
drop trigger if exists signup_requests_touch on public.signup_requests;
create trigger signup_requests_touch before update on public.signup_requests
  for each row execute function public.touch_updated_at();

-- ── documentos (docs do MEMBRO — distinto de anexos de paciente) ────────────
create table if not exists public.documentos (
  id            text primary key default gen_random_uuid()::text,
  pesquisador_id uuid not null references public.pesquisadores(id) on delete cascade,
  tipo          text not null,
  nome_arquivo  text not null,
  storage_path  text not null,
  status        text not null default 'PENDENTE' check (status in ('PENDENTE','APROVADO','REJEITADO')),
  validade      timestamptz,
  enviado_em    timestamptz not null default now(),
  revisado_em   timestamptz,
  revisado_por  text,
  observacoes   text
);
create index if not exists documentos_pesq_status_idx on public.documentos(pesquisador_id, status);

-- ── crachas ─────────────────────────────────────────────────────────────────
create table if not exists public.crachas (
  id           text primary key default gen_random_uuid()::text,
  pesquisador_id uuid not null references public.pesquisadores(id) on delete cascade,
  codigo       text not null unique,
  status       text not null default 'ATIVO' check (status in ('ATIVO','EXPIRADO','CANCELADO')),
  emitido_em   timestamptz not null default now(),
  expira_em    timestamptz not null,
  emitido_por  text not null
);
create index if not exists crachas_pesq_status_idx on public.crachas(pesquisador_id, status);

-- ── certificados ────────────────────────────────────────────────────────────
create table if not exists public.certificados (
  id              text primary key default gen_random_uuid()::text,
  pesquisador_id  uuid not null references public.pesquisadores(id) on delete cascade,
  tipo            text not null,
  descricao       text not null,
  semestre        integer not null,
  ano             integer not null,
  hora_atividades integer not null,
  pdf_storage_path text,
  emitido_em      timestamptz not null default now(),
  emitido_por     text not null
);
create index if not exists certificados_pesq_idx on public.certificados(pesquisador_id, ano, semestre);

-- ── settings (chave-valor) ──────────────────────────────────────────────────
create table if not exists public.settings (
  key         text primary key,
  value       text not null,
  atualizado_por text not null,
  atualizado_em timestamptz not null default now()
);

-- ── audit_event (eventos semânticos da liga — distinto do audit_log de trigger)
create table if not exists public.audit_event (
  id            bigserial primary key,
  user_id       text,
  actor_type    text not null check (actor_type in ('user','admin','system')),
  action        text not null,
  resource_type text,
  resource_id   text,
  metadata      jsonb,
  ip_address    text,
  user_agent    text,
  criado_em     timestamptz not null default now()
);
create index if not exists audit_event_action_idx on public.audit_event(action, criado_em desc);
create index if not exists audit_event_created_idx on public.audit_event(criado_em desc);

-- ── RLS: habilita e libera para authenticated (igual ao padrão do projeto;
-- a separação por papel é reforçada nas server actions). Nenhuma dessas tabelas
-- guarda dado de paciente de pesquisa. ──────────────────────────────────────
do $$
declare t text;
begin
  for t in select unnest(array[
    'allowed_users','signup_requests','documentos','crachas','certificados','settings','audit_event'
  ]) loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t||'_all', t
    );
  end loop;
end $$;
