-- Migration: 0021_concluido_em
--
-- Permite marcar um paciente como "concluído" dentro de um plantão
-- específico — ou seja, o pesquisador que reservou já terminou o que
-- tinha que fazer com aquele paciente naquele dia (TCLE, REDCap forms,
-- exames anexados, etc.). Visualmente o pill da reserva fica verde.
--
-- Escopo intencional: a conclusão vive em mapa_entries junto da reserva,
-- então morre junto quando o plantão termina. A função clonar_mapa_anterior
-- (0020) NÃO inclui concluido_em na lista de copy — o próximo plantão
-- começa com todo mundo "não concluído" (zera quem cuidou de quem no
-- novo dia).

alter table public.mapa_entries
  add column if not exists concluido_em timestamptz;

-- Index parcial — só os concluídos (a maioria fica null durante o plantão).
create index if not exists mapa_entries_concluido_idx
  on public.mapa_entries(concluido_em)
  where concluido_em is not null;

comment on column public.mapa_entries.concluido_em is
  'Quando o responsável marcou esse paciente como concluído no plantão. NULL = ainda em aberto. Não é copiado pelo clonar_mapa_anterior (nasce sempre null no plantão novo).';
