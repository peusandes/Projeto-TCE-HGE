# Plano de integração — Pesquisa + Extensão (LANC)

Objetivo: unir o site da **Diretoria de Pesquisa** (este app — LANC TCE) e o site de
**Extensão** (do João Pedro) num **app único**, com **login compartilhado** e áreas
separadas de Pesquisa e Extensão.

> ⚠️ **Regra inegociável:** o banco da Pesquisa tem **dados de paciente reais e
> sensíveis** (400+ pacientes, projeto TCE). A base dele fica **intocada**; toda
> fusão de banco é feita com **backup antes**, **testada numa cópia/branch**, e
> nunca improvisada.

## Status

- ✅ Nosso lado mapeado (rotas/shell, auth, Supabase, design, deploy).
- ⏳ **Bloqueado:** falta acesso ao repo + Supabase + Vercel do João Pedro.
- Stack do site de Extensão: **Node.js** (confirmar se é Next.js — muda o esforço).
- Sem domínio próprio do lado da Extensão (não é problema).

## Arquitetura-alvo

Um app Next.js só, com duas áreas roteadas por **papel** do usuário:

- **Pesquisa** (já existe): `(app)` → `/plantoes`, `/pacientes`, `/admin`, etc.
- **Extensão** (novo): área `/extensao/*`.
- **Shell:** header/nav comuns (`src/components/shell/`), mostrando os itens de
  cada área conforme o papel do usuário (item novo "Extensão" entra no
  `ITEMS` de `src/components/shell/BottomNav.tsx`).
- **Um Supabase** (o da Pesquisa é o canônico) + **um Vercel** + **um domínio**.

## Login compartilhado (o ponto central)

Hoje: um único pool `auth.users`; perfil em `pesquisadores` (id→auth.users, nome,
email, `is_admin`, `setup_complete`). Sem cadastro público — admin convida. O
middleware (`src/lib/supabase/middleware.ts`) redireciona não-autenticado pra
`/login`, força `setup-account`, e tem gate de `/admin` por `is_admin`.

Para suportar dois tipos de usuário no MESMO auth:

1. Introduzir **papéis** por usuário (ex.: `pesquisa`, `extensao`, `admin`) — via
   uma coluna/tabela de papéis (a decidir: estender `pesquisadores` para uma
   tabela de perfil mais geral, ou criar `membros`/`papeis`).
2. **Middleware roteia por papel:** quem só tem `extensao` cai em `/extensao`;
   quem tem `pesquisa` vê a área de pesquisa; quem tem ambos vê as duas. Os gates
   por área espelham o gate de `/admin` que já existe.
3. **Migrar os usuários da Extensão** pro auth canônico **preservando as senhas**
   (Supabase admin API aceita import com hash). Assim ninguém perde o login.

## Banco (fusão dos dois Supabase) — etapa de maior cuidado

1. **Backup** dos dois bancos antes de qualquer coisa.
2. Banco da Pesquisa = **canônico**; tabelas da Extensão entram **por cima**
   (schema próprio ou prefixadas), com **RLS isolando por papel** (dado de
   Extensão não aparece pra quem é só Pesquisa e vice-versa).
3. **Migrar dados + usuários** da Extensão pro canônico.
4. Tudo **testado numa cópia/branch do Supabase** antes de tocar produção.
5. Migrations aplicadas no padrão atual (manual via dashboard; última = 0025).

## Vercel / domínio

- Os dois projetos viram **um** (deploy único). O projeto antigo da Extensão é
  aposentado; env vars consolidadas no projeto final.
- Domínio único da LANC (decidir: `projetotce.com` atual, um novo `lanc.org.br`,
  ou o que a liga preferir).

## Execução em etapas (reversível primeiro, banco por último)

0. **GitHub:** criar **organização da LANC**, mover os dois repos pra lá, Pedro +
   João Pedro como **donos/admins**. (Co-propriedade antes de fundir.)
1. **Código:** trazer as páginas/rotas da Extensão pra dentro do app, na área
   `/extensao`, unificando design/shell. Deploy em **preview** (sem tocar banco
   de produção).
2. **Papéis + middleware:** roteamento por papel e gates por área.
3. **Banco:** fusão do Supabase (backup → schema → dados → usuários → RLS),
   testada em cópia. ← etapa sensível, por último.
4. **Go-live:** um Vercel, um domínio; aposentar projetos antigos.

Cada etapa é validada (type-check/lint/build/testes) antes da seguinte. O banco de
pacientes só é tocado por adição (nunca destrutivo na base existente).

## O que preciso do João Pedro (desbloqueia tudo)

1. **Link do repositório** no GitHub + **acesso** (colaborador, ou mover pra org da LANC).
2. **Supabase dele:** acesso de leitura ao projeto **ou** um dump do schema
   (tabelas + RLS) e uma ideia de quantos usuários/dados existem.
3. **Vercel dele:** acesso ao projeto (Settings → Members) e a lista de **env vars** (nomes).
4. Confirmar a **stack exata** (Next.js? Express? outro Node?).

## Decisões pendentes (Pedro + João Pedro)

- **Usuários da Extensão** — quem são, e devem logar com a **mesma conta** da
  Pesquisa? (define a fusão de login)
- **Domínio final** da casa única da LANC.
- **Modelo de papéis** (estender `pesquisadores` vs. tabela nova de membros).
- Confirmar o **Supabase canônico** (recomendado: o da Pesquisa, com os pacientes).
