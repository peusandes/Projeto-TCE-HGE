-- Migration: 0017_fix_handle_new_user_return
--
-- BUG: migration 0016 esqueceu o `return new;` no final da função
-- handle_new_user. plpgsql exige retorno explícito quando declarada
-- `returns trigger`. Resultado: INSERT em auth.users falhava
-- silenciosamente, quebrando convites (action retornava erro genérico
-- "Server Components error").

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_nome text;
  v_is_admin boolean;
begin
  v_nome     := nullif(new.raw_user_meta_data->>'nome', '');
  v_is_admin := coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false);

  insert into public.pesquisadores (id, nome, email, is_admin, setup_complete)
  values (
    new.id,
    coalesce(v_nome, split_part(new.email, '@', 1)),
    new.email,
    v_is_admin,
    false  -- SEMPRE false; só vira true em /auth/setup-account
  )
  on conflict (id) do update set
    email    = excluded.email,
    is_admin = greatest(public.pesquisadores.is_admin, excluded.is_admin),
    nome     = case when public.pesquisadores.setup_complete then public.pesquisadores.nome else excluded.nome end;
    -- setup_complete fica intacto no update — só pode mudar via /auth/setup-account

  return new;
end;
$$;
