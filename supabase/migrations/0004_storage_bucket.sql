-- Migration: 0004_storage_bucket
-- Bucket privado `anexos-tce` para fotos e PDFs de prontuários.

insert into storage.buckets (id, name, public)
values ('anexos-tce', 'anexos-tce', false)
on conflict (id) do nothing;

-- Policies: authenticated pode ler, fazer upload, atualizar e deletar
create policy "anexos_tce_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'anexos-tce');

create policy "anexos_tce_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'anexos-tce');

create policy "anexos_tce_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'anexos-tce')
  with check (bucket_id = 'anexos-tce');

create policy "anexos_tce_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'anexos-tce');
