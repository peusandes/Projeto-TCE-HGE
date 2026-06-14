-- Migration: 0027_lanc_estagio_tce
-- Absorve ESTÁGIO observacional, ESCALA do Projeto TCE (HS/HGE) e PACIENTES da
-- extensão (TCE Baby / Aneurisma Baby) do lanc-app, no nosso padrão (SQL+RLS).
-- Tudo aditivo. pesquisador_id → pesquisadores(id). IDs text (aceitam cuids do
-- lanc-app na migração de dados). NÃO confundir com as tabelas de PESQUISA:
--   - tce_coletas/tce_escalas = ESCALA (quem vai coletar), ≠ coletas_redcap (o dado).
--   - pacientes_extensao = rastreio de fluxo da liga, ≠ pacientes (coleta de pesquisa).

-- ── Estágio observacional ───────────────────────────────────────────────────
create table if not exists public.estagio_slots (
  id         text primary key default gen_random_uuid()::text,
  data       date not null,
  turno      text not null check (turno in ('MANHA','TARDE')),
  capacidade integer not null default 2,
  criado_em  timestamptz not null default now(),
  unique (data, turno)
);

create table if not exists public.estagio_signups (
  id            text primary key default gen_random_uuid()::text,
  slot_id       text not null references public.estagio_slots(id) on delete cascade,
  pesquisador_id uuid references public.pesquisadores(id) on delete set null,
  display_name  text,
  status        text not null default 'CONFIRMADO' check (status in ('CONFIRMADO','CANCELADO')),
  signed_up_at  timestamptz not null default now(),
  cancelado_em  timestamptz,
  unique (slot_id, pesquisador_id)
);
create index if not exists estagio_signups_slot_idx on public.estagio_signups(slot_id, status);
create index if not exists estagio_signups_pesq_idx on public.estagio_signups(pesquisador_id, status);

-- Alocação recorrente (dia fixo da semana). Fonte da verdade da grade.
create table if not exists public.estagio_alocacoes (
  id            text primary key default gen_random_uuid()::text,
  pesquisador_id uuid not null references public.pesquisadores(id) on delete cascade,
  dia_semana    integer not null check (dia_semana between 0 and 6), -- 0=Dom..6=Sab
  turno         text not null check (turno in ('MANHA','TARDE')),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  criado_por    text not null,
  unique (pesquisador_id, dia_semana, turno)
);
create index if not exists estagio_alocacoes_grade_idx on public.estagio_alocacoes(dia_semana, turno, ativo);

create table if not exists public.estagio_solicitacoes (
  id              text primary key default gen_random_uuid()::text,
  pesquisador_id  uuid not null references public.pesquisadores(id) on delete cascade,
  tipo            text not null check (tipo in ('ENTRAR','TROCAR','SAIR')),
  de_dia_semana   integer check (de_dia_semana between 0 and 6),
  de_turno        text check (de_turno in ('MANHA','TARDE')),
  para_dia_semana integer check (para_dia_semana between 0 and 6),
  para_turno      text check (para_turno in ('MANHA','TARDE')),
  mensagem        text,
  status          text not null default 'PENDENTE' check (status in ('PENDENTE','APROVADA','RECUSADA','CANCELADA')),
  revisado_por    text,
  revisado_em     timestamptz,
  resposta_motivo text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create index if not exists estagio_solic_status_idx on public.estagio_solicitacoes(status, criado_em);
drop trigger if exists estagio_solic_touch on public.estagio_solicitacoes;
create trigger estagio_solic_touch before update on public.estagio_solicitacoes
  for each row execute function public.touch_updated_at();

create table if not exists public.estagio_ocorrencias (
  id                       text primary key default gen_random_uuid()::text,
  pesquisador_id           uuid not null references public.pesquisadores(id) on delete cascade,
  data                     date not null,
  dia_semana               integer not null check (dia_semana between 0 and 6),
  turno                    text not null check (turno in ('MANHA','TARDE')),
  tipo                     text not null check (tipo in ('FALTA','TROCA')),
  motivo                   text,
  substituto_pesquisador_id uuid references public.pesquisadores(id) on delete set null,
  criado_em                timestamptz not null default now()
);
create index if not exists estagio_ocorr_data_idx on public.estagio_ocorrencias(data);

-- ── Projeto TCE — escala de coleta (HS/HGE) ─────────────────────────────────
create table if not exists public.tce_coletas (
  id            text primary key default gen_random_uuid()::text,
  data          date not null,
  local         text not null check (local in ('HOSPITAL_SUBURBIO','HOSPITAL_GERAL_ESTADO')),
  turno         text not null default 'MANHA' check (turno in ('MANHA','TARDE')),
  capacidade_max integer not null default 3,
  status        text not null default 'ABERTA' check (status in ('ABERTA','FECHADA','REALIZADA','CANCELADA')),
  observacoes   text,
  criado_em     timestamptz not null default now(),
  unique (data, local)
);
create index if not exists tce_coletas_data_idx on public.tce_coletas(data, status);

create table if not exists public.tce_disponibilidades (
  id            text primary key default gen_random_uuid()::text,
  coleta_id     text not null references public.tce_coletas(id) on delete cascade,
  pesquisador_id uuid not null references public.pesquisadores(id) on delete cascade,
  status        text not null check (status in ('DISPONIVEL','INDISPONIVEL','TALVEZ')),
  notas         text,
  submetido_em  timestamptz not null default now(),
  unique (pesquisador_id, coleta_id)
);
create index if not exists tce_disp_coleta_idx on public.tce_disponibilidades(coleta_id, status);

create table if not exists public.tce_escalas (
  id            text primary key default gen_random_uuid()::text,
  coleta_id     text not null references public.tce_coletas(id) on delete cascade,
  pesquisador_id uuid references public.pesquisadores(id) on delete set null,
  display_name  text,
  role          text not null check (role in ('COLETOR','RESERVA')),
  confirmado_em timestamptz,
  atribuido_por text not null,
  criado_em     timestamptz not null default now(),
  unique (coleta_id, pesquisador_id)
);
create index if not exists tce_escalas_coleta_idx on public.tce_escalas(coleta_id);
create index if not exists tce_escalas_pesq_idx on public.tce_escalas(pesquisador_id);

create table if not exists public.tce_presencas (
  id            text primary key default gen_random_uuid()::text,
  escala_id     text not null references public.tce_escalas(id) on delete cascade,
  pesquisador_id uuid not null references public.pesquisadores(id) on delete cascade,
  presente      boolean not null,
  observacoes   text,
  registrado_em timestamptz not null default now(),
  registrado_por text not null,
  unique (escala_id, pesquisador_id)
);

-- ── Pacientes da extensão (TCE Baby / Aneurisma Baby) — fluxo de status ──────
create table if not exists public.pacientes_extensao (
  id                text primary key default gen_random_uuid()::text,
  fluxo             text not null check (fluxo in ('TCE_BABY','ANEURISMA_BABY')),
  nome              text not null,
  leito             text,
  diagnostico       text,
  data_admissao     date not null,
  status_atual      text not null default 'ADMISSAO' check (status_atual in ('ADMISSAO','NO_MAPA','FORA_DO_MAPA','ALTA')),
  alta_reportada_em timestamptz,
  alta_reportada_por text,
  registrado_por    text not null,
  observacoes       text,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index if not exists pac_ext_fluxo_idx on public.pacientes_extensao(fluxo, status_atual);
drop trigger if exists pac_ext_touch on public.pacientes_extensao;
create trigger pac_ext_touch before update on public.pacientes_extensao
  for each row execute function public.touch_updated_at();

create table if not exists public.paciente_status_eventos (
  id            text primary key default gen_random_uuid()::text,
  paciente_id   text not null references public.pacientes_extensao(id) on delete cascade,
  status        text not null check (status in ('ADMISSAO','NO_MAPA','FORA_DO_MAPA','ALTA')),
  registrado_em timestamptz not null default now(),
  registrado_por text not null,
  observacoes   text
);
create index if not exists pac_evento_idx on public.paciente_status_eventos(paciente_id, registrado_em desc);

-- ── RLS (authenticated; guardas de papel ficam nas server actions) ──────────
do $$
declare t text;
begin
  for t in select unnest(array[
    'estagio_slots','estagio_signups','estagio_alocacoes','estagio_solicitacoes','estagio_ocorrencias',
    'tce_coletas','tce_disponibilidades','tce_escalas','tce_presencas',
    'pacientes_extensao','paciente_status_eventos'
  ]) loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t||'_all', t
    );
  end loop;
end $$;
