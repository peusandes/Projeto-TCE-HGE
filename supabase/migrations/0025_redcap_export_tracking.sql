-- Migration: 0025_redcap_export_tracking
-- Estado do envio de um paciente pro REDCap (botão "Enviar para o REDCap").
-- O trigger audit_pacientes já registra as mudanças em audit_log.
--   redcap_id (já existente) = record_id retornado pelo REDCap.
--   redcap_exportado_em      = quando o último envio concluiu.
--   redcap_export_iniciado_em= quando um envio (criação) foi reservado (claim).
--   redcap_export_status     = null | ENVIANDO | ENVIADO | ERRO | ID_PENDENTE
--                              (ID_PENDENTE bloqueia recriar e evitar duplicata).

alter table public.pacientes
  add column if not exists redcap_exportado_em       timestamptz,
  add column if not exists redcap_export_iniciado_em timestamptz,
  add column if not exists redcap_export_status      text;

create index if not exists pacientes_redcap_exportado_em_idx
  on public.pacientes(redcap_exportado_em);

-- Rede de segurança no banco contra dois pacientes com o mesmo record_id.
create unique index if not exists pacientes_redcap_id_uniq
  on public.pacientes(redcap_id)
  where redcap_id is not null;
