-- Migration: 0013_gose_tentativas
-- Tabela de tentativas de contato pros GOS-E (30/90/180 dias após trauma).
-- O lembrete só "desaparece" quando o pesquisador conclui o GOS-E (cria
-- coleta_redcap com status=COMPLETE). Tentativas de ligação não atendidas
-- ficam registradas pra histórico — várias por (paciente, janela) é OK.

create table if not exists public.gose_tentativas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  janela integer not null check (janela in (30, 90, 180)),
  tentado_em timestamptz not null default now(),
  tentado_por uuid references public.pesquisadores(id) on delete set null,
  observacao text
);

create index if not exists gose_tentativas_paciente_janela_idx
  on public.gose_tentativas(paciente_id, janela, tentado_em desc);

alter table public.gose_tentativas enable row level security;

drop policy if exists gose_tentativas_select on public.gose_tentativas;
create policy gose_tentativas_select on public.gose_tentativas
  for select to authenticated using (true);

drop policy if exists gose_tentativas_insert on public.gose_tentativas;
create policy gose_tentativas_insert on public.gose_tentativas
  for insert to authenticated with check (true);

drop policy if exists gose_tentativas_delete on public.gose_tentativas;
create policy gose_tentativas_delete on public.gose_tentativas
  for delete to authenticated using (public.is_current_user_admin());
