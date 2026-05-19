-- Migration: 0001_initial_schema
-- Tabelas base do sistema de coleta TCE/LANC.
-- Enums implementados como TEXT + CHECK (evita CREATE TYPE para facilitar evolução).

create extension if not exists "pgcrypto";

-- pesquisadores: espelha auth.users (1:1 via trigger)
create table public.pesquisadores (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null,
  criado_em   timestamptz not null default now()
);

-- plantoes
create table public.plantoes (
  id              uuid primary key default gen_random_uuid(),
  data            date not null,
  pesquisadores   text[] not null default '{}'::text[],
  observacoes     text,
  criado_em       timestamptz not null default now(),
  criado_por      uuid references public.pesquisadores(id) on delete set null,
  finalizado      boolean not null default false,
  finalizado_em   timestamptz
);

-- pacientes
create table public.pacientes (
  id                uuid primary key default gen_random_uuid(),
  plantao_id        uuid not null references public.plantoes(id) on delete cascade,
  nome              text not null,
  setor             text not null check (setor in (
    'OBSERVACAO_1','UI1','UI2_3','UTI_1','UTI_2','UTI_3','TRM','FORA_DO_MAPA','ALTAS'
  )),
  leito             text,
  situacao          text not null default 'ADM' check (situacao in (
    'ADM','SEG','EXCLUSAO','ALTA'
  )),
  redcap_id         text,
  tcle_status       text not null default 'PENDENTE' check (tcle_status in (
    'PENDENTE','ASSINADO','RECUSADO','NA'
  )),
  descricao         text,
  comentarios       text,
  motivo_exclusao   text,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

-- mapa_entries: snapshot do paciente por plantão
create table public.mapa_entries (
  id            uuid primary key default gen_random_uuid(),
  plantao_id    uuid not null references public.plantoes(id) on delete cascade,
  paciente_id   uuid not null references public.pacientes(id) on delete cascade,
  setor         text not null check (setor in (
    'OBSERVACAO_1','UI1','UI2_3','UTI_1','UTI_2','UTI_3','TRM','FORA_DO_MAPA','ALTAS'
  )),
  leito         text,
  situacao      text not null check (situacao in ('ADM','SEG','EXCLUSAO','ALTA')),
  tcle_status   text not null check (tcle_status in ('PENDENTE','ASSINADO','RECUSADO','NA')),
  descricao     text,
  comentarios   text,
  ordem         integer not null default 0,
  criado_em     timestamptz not null default now(),
  unique (plantao_id, paciente_id)
);

-- coletas_redcap: payload JSONB do formulário REDCap
create table public.coletas_redcap (
  id              uuid primary key default gen_random_uuid(),
  paciente_id     uuid not null references public.pacientes(id) on delete cascade,
  plantao_id      uuid not null references public.plantoes(id) on delete cascade,
  tipo            text not null check (tipo in (
    'ADMISSAO','SEGUIMENTO_24H','SEGUIMENTO_48H','ALTA'
  )),
  dados           jsonb not null default '{}'::jsonb,
  status          text not null default 'RASCUNHO' check (status in (
    'RASCUNHO','COMPLETO','EXPORTADO_REDCAP'
  )),
  coletado_por    uuid references public.pesquisadores(id) on delete set null,
  coletado_em     timestamptz not null default now()
);

-- anexos: metadados de fotos/PDFs no Storage
create table public.anexos (
  id                uuid primary key default gen_random_uuid(),
  paciente_id       uuid not null references public.pacientes(id) on delete cascade,
  plantao_id        uuid not null references public.plantoes(id) on delete cascade,
  storage_path      text not null,
  tipo_anexo        text not null check (tipo_anexo in (
    'ADMISSAO','EXAME_LABORATORIAL','EXAME_IMAGEM','HGT','EVOLUCAO_MEDICA',
    'PRESCRICAO','BOLETIM_NEURO','TCLE_ASSINADO','OUTRO'
  )),
  data_referencia   date,
  descricao         text,
  mime_type         text not null,
  tamanho_bytes     bigint not null default 0,
  enviado_por       uuid references public.pesquisadores(id) on delete set null,
  enviado_em        timestamptz not null default now(),
  processado        boolean not null default false
);
