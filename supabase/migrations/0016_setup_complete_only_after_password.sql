-- Migration: 0016_setup_complete_only_after_password
--
-- BUG: trigger handle_new_user marcava setup_complete=true só por ter nome
-- no raw_user_meta_data — convite com nome pré-preenchido pulava o
-- /auth/setup-account, e o pesquisador caía logado sem senha definida.
-- Quando tentava trocar senha em /perfil, pedia "senha atual" que nunca
-- existiu (o invite gera só um token OTP, não uma senha).
--
-- FIX: setup_complete só vira true quando o pesquisador concluir o fluxo
-- de setup-account (que define senha). Trigger nunca seta como true.
--
-- Também consertamos pesquisadores existentes que estão com setup_complete=true
-- mas o auth.user correspondente NUNCA fez signInWithPassword (last_sign_in_at
-- corresponde apenas ao link de invite). Como heurística segura, NÃO resetamos
-- automaticamente — exigiria validar contra auth.users que essa lib não expõe
-- bem via SQL. Quem entrou e foi forçado pra alterar senha pode pedir reset
-- pelo /login.

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
    false  -- SEMPRE false; só vira true quando o pesquisador concluir setup-account
  )
  on conflict (id) do update set
    email    = excluded.email,
    is_admin = greatest(public.pesquisadores.is_admin, excluded.is_admin),
    -- Preserva o nome existente se já definido; senão usa o do metadata
    nome     = case when public.pesquisadores.setup_complete then public.pesquisadores.nome else excluded.nome end;
    -- IMPORTANTE: não tocamos em setup_complete no UPDATE.
end;
$$;

-- Pesquisadores criados ANTES desta migration podem estar com setup_complete=true
-- sem ter senha. Aqui zeramos APENAS quem nunca fez login com senha:
-- last_sign_in_at é null OU foi feito via OTP (raw_user_meta_data sem provider=email).
-- Heurística simples: se o pesquisador nunca acessou /perfil pra atualizar senha,
-- ele cairá no setup_account na próxima entrada. Pesquisadores que já operam
-- (ex: admin Pedro) ficam intactos.
--
-- Política: NÃO mexer automaticamente. Se houver caso problemático, admin
-- roda manualmente no SQL Editor:
--   update pesquisadores set setup_complete = false where email = 'fulano@x.com';
