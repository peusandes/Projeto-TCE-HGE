-- Migration: 0012_clone_verificacao_alta
-- Atualiza clonar_mapa_anterior pra propagar verificacao_alta entre plantões.
-- Sem isso, paciente marcado como "Possível alta" perdia o sinal amarelo
-- ao virar plantão (a coluna existia em mapa_entries mas não era copiada).

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
    and me.situacao not in ('ALTA', 'EXCLUSAO')
  on conflict (plantao_id, paciente_id) do nothing;

  get diagnostics contador = row_count;
  return contador;
end;
$$;
