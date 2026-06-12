-- Migration: 0023_telegram_bot
-- Estado do bot do Telegram que preenche os seguimentos a partir de PDFs de
-- exame. Duas tabelas:
--   - telegram_pending: perguntas aguardando resposta (paciente ambíguo,
--     data de admissão desconhecida, nascimento divergente). Guarda o exame já
--     parseado no payload pra retomar quando o usuário responder.
--   - telegram_processed_updates: dedup de update_id (Telegram reentrega).
--
-- RLS habilitado SEM policies de propósito: só o service role (admin client do
-- webhook) acessa. Usuários autenticados do app não leem nem escrevem aqui.

create table if not exists public.telegram_pending (
  id          uuid primary key default gen_random_uuid(),
  chat_id     bigint not null,
  user_id     bigint not null,
  kind        text not null check (kind in ('await_patient','await_admission','await_birthdate')),
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists telegram_pending_chat_idx
  on public.telegram_pending(chat_id, created_at desc);

create table if not exists public.telegram_processed_updates (
  update_id    bigint primary key,
  processed_at timestamptz not null default now()
);

alter table public.telegram_pending          enable row level security;
alter table public.telegram_processed_updates enable row level security;
