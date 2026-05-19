-- Migration: 0008_perfil_avatar
-- Adiciona avatar_url em pesquisadores + bucket `avatares` (público)
-- com RLS que permite cada usuário gerenciar somente o próprio arquivo.

alter table public.pesquisadores
  add column if not exists avatar_url text;

-- Bucket público (qualquer um pode LER avatares; só o dono pode escrever)
insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', true)
on conflict (id) do nothing;

-- Policies: estrutura `avatares/{user_id}/arquivo.ext`
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatares_select_public'
  ) then
    create policy "avatares_select_public"
      on storage.objects for select
      to public
      using (bucket_id = 'avatares');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatares_insert_own'
  ) then
    create policy "avatares_insert_own"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'avatares'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatares_update_own'
  ) then
    create policy "avatares_update_own"
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'avatares'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'avatares'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatares_delete_own'
  ) then
    create policy "avatares_delete_own"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'avatares'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
