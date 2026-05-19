-- Migration: 0010_coleta_multi_seq
-- Permite múltiplas instâncias do mesmo instrumento por paciente (caso do
-- seguimento: cada dia de seguimento é uma coleta separada). A unicidade
-- agora é por (paciente_id, tipo, seq) em vez de (paciente_id, tipo).

alter table public.coletas_redcap
  add column if not exists seq integer not null default 1;

-- Troca o índice unique antigo pelo novo, que inclui seq
drop index if exists public.coletas_redcap_paciente_tipo_idx;

create unique index if not exists coletas_redcap_paciente_tipo_seq_idx
  on public.coletas_redcap(paciente_id, tipo, seq);

-- Index pra ordenar/listar várias seq do mesmo (paciente, tipo)
create index if not exists coletas_redcap_paciente_tipo_seq_order_idx
  on public.coletas_redcap(paciente_id, tipo, seq asc);
