-- Migration: 0022_pacientes_delete_all_researchers
-- Libera exclusão de paciente pra QUALQUER pesquisador autenticado, não só
-- admin. Antes (migration 0011) só admin podia deletar — os demais clicavam
-- em "Excluir paciente" e o DELETE afetava 0 linhas em silêncio (RLS negava
-- sem erro), dando impressão de sucesso mas sem apagar nada.
--
-- Equipe é fechada (pesquisadores criados pelo admin no Supabase Dashboard) e
-- o botão já exige digitar "EXCLUIR" pra confirmar. O cascade (mapa_entries,
-- coletas_redcap, anexos) roda no nível do banco e NÃO é filtrado por estas
-- policies de delete, então basta relaxar pacientes_delete.

drop policy if exists pacientes_delete on public.pacientes;
create policy pacientes_delete on public.pacientes
  for delete to authenticated
  using (true);
