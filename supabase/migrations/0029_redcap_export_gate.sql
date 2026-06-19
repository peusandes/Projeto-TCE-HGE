-- Migration: 0029_redcap_export_gate
-- Gate do botão "Exportar para o REDCap": SÓ pacientes habilitados podem ser
-- enviados. Novas admissões = true; legados = false (ficam intocados no REDCap).
--
-- Nota de numeração: 0026/0027/0028 foram a fusão (CANCELADA) do lanc-app —
-- chegaram a ser aplicadas em produção (tabelas aditivas, hoje órfãs), mas os
-- arquivos vivem só na branch merge/lanc-app. Esta é a próxima livre na main.

alter table public.pacientes
  add column if not exists redcap_export_habilitado boolean not null default false;

comment on column public.pacientes.redcap_export_habilitado is
  'Só pacientes com true podem ser exportados pro REDCap (novas admissões). Legados ficam false. O guard no servidor confere isto antes de enviar; a UI esconde/explica o botão quando false.';

-- Backfill p/ TESTE: habilita os pacientes do plantão MAIS RECENTE (o de hoje),
-- identificados via mapa_entries (pacientes é estado global; o clone de plantão
-- copia só mapa_entries). Legados seguem false. O editor mostra quantas linhas
-- foram afetadas — confira se bate com o plantão que você vai testar.
update public.pacientes p
set redcap_export_habilitado = true
where exists (
  select 1
  from public.mapa_entries me
  where me.paciente_id = p.id
    and me.plantao_id = (
      select id from public.plantoes order by data desc, criado_em desc limit 1
    )
);
