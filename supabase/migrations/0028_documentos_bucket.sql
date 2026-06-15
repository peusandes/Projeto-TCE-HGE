-- Migration: 0028_documentos_bucket
-- Bucket privado pros documentos de membro (RG, CPF, comprovante, etc.).
-- Acesso é SEMPRE mediado por URLs assinadas geradas no servidor (admin client),
-- então não dependemos de policies de storage pra usuário final.

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;
