-- Migration: 0007_redcap_instruments
-- Adapta coletas_redcap para o schema real do REDCap TCE 3.0 (PID 2080):
--   - tipo = instrument name (11 possíveis)
--   - status = INCOMPLETE | UNVERIFIED | COMPLETE (REDCap form status)
--   - UNIQUE(paciente_id, tipo) — uma coleta por instrumento por paciente

alter table public.coletas_redcap drop constraint if exists coletas_redcap_tipo_check;
alter table public.coletas_redcap drop constraint if exists coletas_redcap_status_check;

alter table public.coletas_redcap
  add constraint coletas_redcap_tipo_check check (tipo in (
    'status_de_admisso',
    'dados_demograficos',
    'historia_pregressa',
    'historia_admissao',
    'neuroimagem_admissao',
    'seguimento',
    'dados_de_cirurgia',
    'alta',
    'gose_30d',
    'gose_90d',
    'gose_180d'
  ));

alter table public.coletas_redcap alter column status drop default;
alter table public.coletas_redcap
  add constraint coletas_redcap_status_check check (status in (
    'INCOMPLETE', 'UNVERIFIED', 'COMPLETE'
  ));
alter table public.coletas_redcap alter column status set default 'INCOMPLETE';

-- Migra registros antigos (placeholder JSON) para INCOMPLETE
update public.coletas_redcap
set status = case
  when status = 'RASCUNHO' then 'INCOMPLETE'
  when status = 'COMPLETO' then 'COMPLETE'
  when status = 'EXPORTADO_REDCAP' then 'COMPLETE'
  else 'INCOMPLETE'
end
where status not in ('INCOMPLETE','UNVERIFIED','COMPLETE');

-- Mapeia tipos antigos pra novos (caso já tenha rascunho)
update public.coletas_redcap
set tipo = case
  when tipo = 'ADMISSAO' then 'historia_admissao'
  when tipo = 'SEGUIMENTO_24H' then 'seguimento'
  when tipo = 'SEGUIMENTO_48H' then 'seguimento'
  when tipo = 'ALTA' then 'alta'
  else tipo
end
where tipo in ('ADMISSAO','SEGUIMENTO_24H','SEGUIMENTO_48H','ALTA');

-- Garante unicidade por (paciente, instrumento)
create unique index if not exists coletas_redcap_paciente_tipo_idx
  on public.coletas_redcap(paciente_id, tipo);

-- Coluna pra rastrear o último editor (útil quando vários pesquisadores tocam)
alter table public.coletas_redcap
  add column if not exists atualizado_em timestamptz not null default now();

create or replace function public.set_coleta_atualizada_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists coletas_set_atualizado_em on public.coletas_redcap;
create trigger coletas_set_atualizado_em
  before update on public.coletas_redcap
  for each row execute function public.set_coleta_atualizada_em();
