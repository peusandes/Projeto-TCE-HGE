-- Migration: 0005_bulk_seed_rpc
-- RPC para criar múltiplos pacientes + entradas no mapa numa única transação,
-- a partir do parser de Excel.

-- Espera receber um JSONB array no formato:
-- [{nome, setor, leito, situacao, tcle_status, descricao, comentarios}, ...]
create or replace function public.bulk_seed_plantao(
  p_plantao_id uuid,
  p_pacientes  jsonb
)
returns setof public.pacientes
language plpgsql security definer
as $$
declare
  item jsonb;
  novo_paciente public.pacientes;
  contador integer := 0;
begin
  if jsonb_typeof(p_pacientes) <> 'array' then
    raise exception 'p_pacientes deve ser um array JSON';
  end if;

  for item in select * from jsonb_array_elements(p_pacientes)
  loop
    insert into public.pacientes (
      plantao_id, nome, setor, leito, situacao, tcle_status, descricao, comentarios
    ) values (
      p_plantao_id,
      coalesce(item->>'nome', 'Sem nome'),
      coalesce(item->>'setor', 'FORA_DO_MAPA'),
      item->>'leito',
      coalesce(item->>'situacao', 'ADM'),
      coalesce(item->>'tcle_status', 'PENDENTE'),
      item->>'descricao',
      item->>'comentarios'
    )
    returning * into novo_paciente;

    insert into public.mapa_entries (
      plantao_id, paciente_id, setor, leito, situacao, tcle_status,
      descricao, comentarios, ordem
    ) values (
      p_plantao_id,
      novo_paciente.id,
      novo_paciente.setor,
      novo_paciente.leito,
      novo_paciente.situacao,
      novo_paciente.tcle_status,
      novo_paciente.descricao,
      novo_paciente.comentarios,
      contador
    );

    contador := contador + 1;
    return next novo_paciente;
  end loop;

  return;
end;
$$;

-- Clona mapa de um plantão para outro, ignorando pacientes com ALTA ou EXCLUSAO
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
    descricao, comentarios, ordem
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
    me.ordem
  from public.mapa_entries me
  where me.plantao_id = p_plantao_origem
    and me.situacao not in ('ALTA', 'EXCLUSAO')
  on conflict (plantao_id, paciente_id) do nothing;

  get diagnostics contador = row_count;
  return contador;
end;
$$;
