-- Migration: 0030_redcap_export_gate_fix
-- Corrige o backfill da 0029. A 0029 habilitou via mapa_entries do plantão mais
-- recente — mas o clone de plantão COPIA mapa_entries, então isso arrasta
-- pacientes LEGADOS (carregados de plantões anteriores) e poderia até pegar um
-- plantão de data FUTURA (data desc sem filtro). Resultado: legados ficavam
-- redcap_export_habilitado=true, violando "só novas admissões".
--
-- Aqui: reseta tudo e habilita SÓ as novas admissões do plantão de hoje,
-- identificadas pela ORIGEM do paciente (pacientes.plantao_id = plantão de hoje),
-- nunca por mapa_entries, e nunca quem já tem record no REDCap.

update public.pacientes
set redcap_export_habilitado = false
where redcap_export_habilitado = true;

update public.pacientes p
set redcap_export_habilitado = true
where p.redcap_id is null
  and p.plantao_id = (
    select id from public.plantoes
    where data <= current_date
    order by data desc, criado_em desc
    limit 1
  );
