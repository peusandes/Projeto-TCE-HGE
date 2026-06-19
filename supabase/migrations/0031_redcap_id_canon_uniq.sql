-- Migration: 0031_redcap_id_canon_uniq
-- Fecha a corrida de duplicata (DEDUP-01). A dedup por nome canônico vivia só no
-- app (check-then-act, lê antes do claim) e o índice de redcap_id era por STRING
-- EXATA — então "José Silva" e "JOSE SILVA" (mesma pessoa) podiam virar 2 records
-- no REDCap. Aqui a unicidade CANÔNICA passa a ser garantida pelo BANCO: o 2º
-- claim de um nome canonicamente igual falha por constraint (claimCriacao já
-- trata o erro e mostra mensagem amigável). A dedup em JS fica só como UX.
--
-- Hoje nenhum paciente tem redcap_id (a criação do índice não conflita).

-- Canonicaliza nome: minúsculas + remove acentos PT-BR. IMMUTABLE (translate é
-- determinístico) — necessário pra usar em índice; evita a extensão unaccent
-- (que não é IMMUTABLE por padrão e cai em schema separado no Supabase).
create or replace function public.nome_canon(t text)
returns text language sql immutable parallel safe as $$
  select lower(translate(
    coalesce(t, ''),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
    'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
  ))
$$;

create unique index if not exists pacientes_redcap_id_canon_uniq
  on public.pacientes (public.nome_canon(redcap_id))
  where redcap_id is not null;
