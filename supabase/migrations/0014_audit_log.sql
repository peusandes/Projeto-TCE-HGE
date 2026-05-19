-- Migration: 0014_audit_log
-- Tabela de auditoria pra mudanças em pacientes/plantoes/coletas — exigência
-- típica de CEP/compliance pra projetos com dados sensíveis.
-- Trigger captura INSERT/UPDATE/DELETE e registra o ator (auth.uid()).

create table if not exists public.audit_log (
  id            bigserial primary key,
  occurred_at   timestamptz not null default now(),
  actor         uuid references public.pesquisadores(id) on delete set null,
  actor_email   text,
  acao          text not null check (acao in ('INSERT','UPDATE','DELETE')),
  tabela        text not null,
  registro_id   text,
  dados_antes   jsonb,
  dados_depois  jsonb
);

create index if not exists audit_log_occurred_at_idx
  on public.audit_log(occurred_at desc);

create index if not exists audit_log_tabela_idx
  on public.audit_log(tabela, occurred_at desc);

alter table public.audit_log enable row level security;

-- Só admin lê o log. Insert é feito pelo trigger (security definer).
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated using (public.is_current_user_admin());

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_email text;
  v_id text;
begin
  v_actor := auth.uid();
  if v_actor is not null then
    select email into v_email from auth.users where id = v_actor;
  end if;

  if (tg_op = 'INSERT') then
    v_id := (new.id)::text;
    insert into public.audit_log (actor, actor_email, acao, tabela, registro_id, dados_depois)
    values (v_actor, v_email, 'INSERT', tg_table_name, v_id, to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    v_id := (new.id)::text;
    insert into public.audit_log (actor, actor_email, acao, tabela, registro_id, dados_antes, dados_depois)
    values (v_actor, v_email, 'UPDATE', tg_table_name, v_id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'DELETE') then
    v_id := (old.id)::text;
    insert into public.audit_log (actor, actor_email, acao, tabela, registro_id, dados_antes)
    values (v_actor, v_email, 'DELETE', tg_table_name, v_id, to_jsonb(old));
    return old;
  end if;

  return null;
end;
$$;

-- Aplica em pacientes, coletas_redcap, plantoes. Mapa_entries é snapshot
-- alto-volume, não-crítico — fica fora pra economizar storage do log.
drop trigger if exists audit_pacientes on public.pacientes;
create trigger audit_pacientes
  after insert or update or delete on public.pacientes
  for each row execute function public.audit_trigger();

drop trigger if exists audit_plantoes on public.plantoes;
create trigger audit_plantoes
  after insert or update or delete on public.plantoes
  for each row execute function public.audit_trigger();

drop trigger if exists audit_coletas_redcap on public.coletas_redcap;
create trigger audit_coletas_redcap
  after insert or update or delete on public.coletas_redcap
  for each row execute function public.audit_trigger();
