-- Migration: 0032_redcap_export_default_on
-- Pedro pediu: todo paciente NOVO já nasce liberado pra exportar pro REDCap
-- (são as novas admissões). Em vez de habilitar caminho-por-caminho (adicionar
-- manual, import Excel/RPC, bot do Telegram), muda o DEFAULT da coluna pra true
-- — cobre TODOS os caminhos de criação, presentes e futuros, de uma vez.
--
-- Legados já existentes (criados quando o default era false) seguem como estão
-- (default não altera linha existente). A trava de existência canônica continua
-- impedindo duplicar quem já está no REDCap, então liberar por padrão é seguro.
--
-- (As novas admissões já criadas no plantão atual — Antonio, "Ignorado…" — foram
-- liberadas à parte; esta migration cuida só das FUTURAS.)

alter table public.pacientes
  alter column redcap_export_habilitado set default true;
