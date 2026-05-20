-- Migration: 0019_responsavel_paciente
--
-- Permite que um pesquisador "reserve" um paciente dentro do plantão
-- atual, sinalizando aos demais que ele é o responsável por aquele
-- atendimento. Feature opcional — não bloqueia ninguém, só ajuda a
-- organização do plantão (quem faz o que).
--
-- Escopo intencional: a reserva vive em mapa_entries, então morre quando
-- o plantão é finalizado. A função clonar_mapa_anterior NÃO inclui
-- responsavel_id na lista de copy, então o próximo plantão clona o mapa
-- com responsavel_id=null pra todo mundo (zera quem faz o quê).

alter table public.mapa_entries
  add column if not exists responsavel_id uuid
    references public.pesquisadores(id) on delete set null;

-- Index parcial — só responsaveis preenchidos (a maioria fica null).
create index if not exists mapa_entries_responsavel_idx
  on public.mapa_entries(responsavel_id)
  where responsavel_id is not null;

comment on column public.mapa_entries.responsavel_id is
  'Pesquisador que reservou esse paciente no plantão. NULL = sem responsável. Não é copiado pelo clonar_mapa_anterior (nasce sempre limpo no plantão novo).';
