-- Migration: 0002_indexes_triggers
-- Performance + integridade.

-- Índices em FK e campos de busca
create index pacientes_plantao_id_idx       on public.pacientes(plantao_id);
create index pacientes_setor_situacao_idx   on public.pacientes(setor, situacao);
create index mapa_entries_plantao_id_idx    on public.mapa_entries(plantao_id);
create index mapa_entries_paciente_id_idx   on public.mapa_entries(paciente_id);
create index coletas_paciente_id_idx        on public.coletas_redcap(paciente_id);
create index coletas_plantao_id_idx         on public.coletas_redcap(plantao_id);
create index anexos_paciente_id_idx         on public.anexos(paciente_id);
create index anexos_plantao_id_idx          on public.anexos(plantao_id);
create index anexos_processado_idx          on public.anexos(processado);
create index plantoes_data_idx              on public.plantoes(data desc);

-- Trigger: atualiza_em automático em pacientes
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger pacientes_set_updated_at
  before update on public.pacientes
  for each row execute function public.set_updated_at();

-- Trigger: cria pesquisador automaticamente ao registrar em auth.users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.pesquisadores (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
