-- Migration: 0003_rls_policies
-- RLS single-tenant (LANC). Qualquer usuário autenticado lê/escreve.
-- Hardening multi-grupo fica para v2.

alter table public.pesquisadores   enable row level security;
alter table public.plantoes        enable row level security;
alter table public.pacientes       enable row level security;
alter table public.mapa_entries    enable row level security;
alter table public.coletas_redcap  enable row level security;
alter table public.anexos          enable row level security;

-- Helper: policy "tudo para authenticated"
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'pesquisadores','plantoes','pacientes','mapa_entries','coletas_redcap','anexos'
  ]) loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_select', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      t || '_insert', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      t || '_update', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (true)',
      t || '_delete', t
    );
  end loop;
end $$;
