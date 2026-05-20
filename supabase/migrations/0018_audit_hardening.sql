-- Migration: 0018_audit_hardening
--
-- Audit findings:
--  1. gose_tentativas INSERT estava permissivo demais (`with check (true)`)
--     — permitia inserir tentativa atribuída a outro pesquisador. Agora
--     valida que tentado_por = auth.uid() (ou null pra contas sem perfil).
--  2. Index faltando em mapa_entries(setor, situacao) — queries de filtro
--     no mapa do plantão faziam tablescan.

-- ============================================================
-- 1. gose_tentativas INSERT: restringe a tentado_por = caller
-- ============================================================
drop policy if exists gose_tentativas_insert on public.gose_tentativas;
create policy gose_tentativas_insert on public.gose_tentativas
  for insert to authenticated
  with check (tentado_por = auth.uid() or tentado_por is null);

-- ============================================================
-- 2. Index pra filtro setor+situacao no mapa do plantão
-- ============================================================
create index if not exists mapa_entries_setor_situacao_idx
  on public.mapa_entries(setor, situacao);
