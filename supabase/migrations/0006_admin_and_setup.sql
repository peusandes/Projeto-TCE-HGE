-- Migration: 0006_admin_and_setup
-- Adiciona is_admin (perfil) e setup_complete (primeiro login concluído).
-- Atualiza o trigger handle_new_user para refletir os novos campos.

alter table public.pesquisadores
  add column if not exists is_admin        boolean not null default false,
  add column if not exists setup_complete  boolean not null default false;

create index if not exists pesquisadores_is_admin_idx on public.pesquisadores(is_admin) where is_admin = true;

-- Recria o trigger: pesquisador é criado já com nome vindo do user_meta_data
-- (se preenchido pelo seed/admin) e setup_complete refletindo se há nome real.
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
    v_nome is not null  -- só completo se veio nome explícito no metadata
  )
  on conflict (id) do update set
    email          = excluded.email,
    is_admin       = greatest(public.pesquisadores.is_admin, excluded.is_admin),
    nome           = case when public.pesquisadores.setup_complete then public.pesquisadores.nome else excluded.nome end,
    setup_complete = greatest(public.pesquisadores.setup_complete::int, excluded.setup_complete::int)::boolean;

  return new;
end;
$$;
