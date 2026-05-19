-- Migration: 0009_verificacao_alta
-- Coluna adicional pra rastrear "alta no Doutore ≠ alta hospitalar".
-- Quando o pesquisador marca um paciente como ALTA mas precisa confirmar no
-- HGE, o card fica amarelo (PENDENTE_HGE). Se ele depois descobre que era
-- só queda do mapa de neurocirurgia no Doutore (paciente ainda internado),
-- marca como FORA_DOUTORE e o card mantém um sinal laranja persistente.

alter table public.pacientes
  add column if not exists verificacao_alta text
    check (verificacao_alta in ('PENDENTE_HGE','FORA_DOUTORE'));

alter table public.mapa_entries
  add column if not exists verificacao_alta text
    check (verificacao_alta in ('PENDENTE_HGE','FORA_DOUTORE'));

-- Index pra filtros futuros ("quantos pendentes ainda preciso verificar?")
create index if not exists pacientes_verificacao_alta_idx
  on public.pacientes(verificacao_alta)
  where verificacao_alta is not null;
