-- Migration: 0020_clone_inclui_exclusao
-- Antes: clonar_mapa_anterior pulava pacientes em ALTA e EXCLUSAO.
-- Agora: inclui EXCLUSAO no mapa do novo plantão. Pacientes excluídos
-- continuam visíveis (riscados no card) pro pesquisador acompanhar — só
-- ALTA continua de fora, porque já saíram do hospital.

create or replace function public.clonar_mapa_anterior(
  p_plantao_origem  uuid,
  p_plantao_destino uuid
)
returns integer
language plpgsql security definer
as $$
declare
  contador integer := 0;
begin
  insert into public.mapa_entries (
    plantao_id, paciente_id, setor, leito, situacao, tcle_status,
    descricao, comentarios, verificacao_alta, ordem
  )
  select
    p_plantao_destino,
    me.paciente_id,
    me.setor,
    me.leito,
    me.situacao,
    me.tcle_status,
    me.descricao,
    me.comentarios,
    me.verificacao_alta,
    me.ordem
  from public.mapa_entries me
  where me.plantao_id = p_plantao_origem
    and me.situacao <> 'ALTA'
  on conflict (plantao_id, paciente_id) do nothing;

  get diagnostics contador = row_count;
  return contador;
end;
$$;
