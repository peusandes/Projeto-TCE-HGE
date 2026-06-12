-- Migration: 0024_telegram_users
-- Usuários do Telegram liberados a usar o bot. O acesso é por código
-- compartilhado: quem manda o TELEGRAM_ACCESS_CODE certo é inserido aqui
-- automaticamente (self-enrollment), sem precisar coletar IDs um a um.
-- RLS habilitado sem policies = só o service role (webhook) acessa.

create table if not exists public.telegram_users (
  user_id    bigint primary key,
  nome       text,
  created_at timestamptz not null default now()
);

alter table public.telegram_users enable row level security;
