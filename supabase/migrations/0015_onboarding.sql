-- Migration: 0015_onboarding
-- Marca quando o pesquisador concluiu (ou pulou) o tutorial inicial.
-- Mantém persistência cross-device — convidamos 1 pesquisador, ele pode
-- abrir no celular e no desktop sem refazer o tour.

alter table public.pesquisadores
  add column if not exists onboarded_at timestamptz;

-- Comentário pra documentar semântica
comment on column public.pesquisadores.onboarded_at is
  'Quando o pesquisador concluiu (ou pulou) o tour inicial. NULL = ainda vai ver na próxima entrada.';
