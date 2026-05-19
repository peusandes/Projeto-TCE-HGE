-- Migration: 0011_admin_delete_rls
-- Restringe DELETE em tabelas críticas a usuários admin. Antes qualquer
-- pesquisador autenticado podia chamar supabase.from(...).delete() direto
-- do client e apagar dados de outros (incluindo plantões inteiros).
-- Server actions já checam is_admin, mas RLS é segunda camada.

-- Helper: existe pra economizar repetição
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.pesquisadores where id = auth.uid()),
    false
  );
$$;

-- Plantões: só admin deleta (cascateia pacientes, mapa, coletas, anexos)
drop policy if exists plantoes_delete on public.plantoes;
create policy plantoes_delete on public.plantoes
  for delete to authenticated
  using (public.is_current_user_admin());

-- Pacientes: só admin deleta diretamente. Cascade do plantão continua valendo.
drop policy if exists pacientes_delete on public.pacientes;
create policy pacientes_delete on public.pacientes
  for delete to authenticated
  using (public.is_current_user_admin());

-- Coletas REDCap: só admin. Cascade ainda funciona.
drop policy if exists coletas_redcap_delete on public.coletas_redcap;
create policy coletas_redcap_delete on public.coletas_redcap
  for delete to authenticated
  using (public.is_current_user_admin());

-- Anexos: pesquisador pode deletar o próprio (caso de uso real:
-- corrigir foto errada que ele acabou de subir). Admin pode deletar tudo.
drop policy if exists anexos_delete on public.anexos;
create policy anexos_delete on public.anexos
  for delete to authenticated
  using (
    public.is_current_user_admin()
    or enviado_por = auth.uid()
  );

-- Mapa entries: só admin. UI nunca apaga isolado (sempre via cascade).
drop policy if exists mapa_entries_delete on public.mapa_entries;
create policy mapa_entries_delete on public.mapa_entries
  for delete to authenticated
  using (public.is_current_user_admin());

-- Pesquisadores: ninguém deleta direto. Auth.users tem cascade.
drop policy if exists pesquisadores_delete on public.pesquisadores;
create policy pesquisadores_delete on public.pesquisadores
  for delete to authenticated
  using (public.is_current_user_admin());
