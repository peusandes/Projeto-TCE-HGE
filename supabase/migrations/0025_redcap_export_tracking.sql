-- Migration: 0025_redcap_export_tracking
-- Marca quando um paciente foi exportado pro REDCap (botão "Enviar para o
-- REDCap"). O trigger audit_pacientes já registra a mudança em audit_log.
-- redcap_id (já existente) guarda o record_id retornado pelo REDCap.

alter table public.pacientes
  add column if not exists redcap_exportado_em timestamptz;

create index if not exists pacientes_redcap_exportado_em_idx
  on public.pacientes(redcap_exportado_em);
