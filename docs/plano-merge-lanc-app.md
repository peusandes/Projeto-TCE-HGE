# Plano de merge — lanc-app (JP) → projetotce.com

Entregável pro **João Pedro revisar antes de qualquer código**. Nada vai pra `main`;
execução (depois de aprovado) será em branch `merge/lanc-app` + PR.

## Princípios

- **projetotce.com é a base** (mais avançado). O lanc-app **complementa** (gestão da
  liga, escala HS/HGE, frequência, TCE Baby, estágio, admin de membros) — **não
  substitui** a coleta de TCE que já existe aqui.
- **Dado de paciente é sagrado:** as tabelas de pesquisa (`pacientes`,
  `coletas_redcap`, `anexos`, `plantoes`, `mapa_entries`) **não são alteradas de
  forma destrutiva**. Tudo do lanc-app entra **por adição** (tabelas/rotas novas),
  com RLS isolando o que é da liga/extensão do que é pesquisa.
- Banco único (Supabase) e **auth única**.

## Como as features do lanc-app entram

Tudo vira **áreas novas** dentro do app, sem tocar na coleta existente:
- `/projeto-tce/hs`, `/projeto-tce/hge`, `/projeto-tce/frequencia` — escalas de coleta + frequência (só leitura/gestão de escala; **não** é a coleta REDCap).
- `/estagio/escala`, `/estagio/solicitacoes` — escala observacional recorrente + aprovação.
- `/estagio/tce-baby`, `/estagio/aneurisma-baby` — rastreio de fluxo do paciente (Admissão→No Mapa→Fora do Mapa→Alta).
- `/admin/membros` (expandir), `/admin/documentos`, `/admin/settings`.

## Modelo de dados — o que reconciliar vs. trazer

**Reconciliar (não duplicar):**
- **`Profile` → estender `pesquisadores`.** Adicionar `role` (MEMBER/ADMIN), `status`,
  `diretoria`, `is_diretor`, `is_secretario`, `cargo_especial`, matricula, semestre.
  Sem tabela `Profile` separada. PKs compatíveis (ambas atreladas a `auth.users`).
- **`AuditEvent` → usar nosso `audit_log`** (já temos trigger automático).

**Manter SEPARADO de propósito (conceitos diferentes — NÃO fundir nas tabelas de pesquisa):**
- **`Paciente` (TCE Baby/Aneurisma) ≠ nosso `pacientes`.** O dele é rastreio de fluxo
  da liga; o nosso é a coleta de pesquisa com dado clínico. Vira tabela própria (ex.:
  `pacientes_extensao`), **sem encostar** em `pacientes`.
- **`TceColeta`/`TceEscala`/`TcePresenca`/`TceDisponibilidade` ≠ nossos `plantoes`/`coletas_redcap`.**
  O dele é *escala* de quem vai coletar; o nosso é o *dado* coletado. Tabelas próprias.
- **`Documento` (membros) ≠ nosso `anexos` (pacientes).** Tabela própria.

**Trazer (novo, sem equivalente):** `signup_requests`, `allowed_users`, `documentos`,
`crachas`, `certificados`, `estagio_*` (alocacao/solicitacao/ocorrencia/slot/signup),
`tce_*` (escala/coleta/presenca/disponibilidade), `pacientes_extensao` +
`paciente_status_eventos`, `settings`. Todas com **RLS por papel**.

**Bug conhecido a corrigir na migração:** ~10 ligantes duplicados em `TceEscala`
(`displayName` solto vs `profileId` linkado ao Profile). Ao migrar, **consolidar
linkando ao pesquisador** — não trazer a duplicação.

## ⚠️ Decisão crítica 1 — Prisma vs. nosso padrão (Supabase SSR + SQL + RLS)

O lanc-app usa **Prisma** (conecta no Postgres via `DATABASE_URL`); o nosso usa
**Supabase SSR + RLS**. **Importante:** o Prisma conecta com credencial de serviço e
**ignora o RLS** — ou seja, a proteção a nível de banco que hoje blinda o dado de
paciente **deixaria de valer** nas queries via Prisma (a segurança passaria a depender
de checagem manual em cada query no código).

**Minha recomendação: NÃO adotar Prisma. Portar as features do lanc-app pro nosso
padrão (Supabase SSR + SQL + RLS).** Dá mais trabalho (reescrever as queries dele),
mas preserva o RLS sobre o dado de paciente e mantém um padrão único. Como o
projetotce.com é a base, faz sentido manter a arquitetura dele.
*(É uma decisão de vocês + JP — registrei o trade-off; se preferirem Prisma, dá pra
fazer, mas aí precisamos de guards de autorização rigorosos em TODA query e aceitar
abrir mão do RLS como rede de segurança.)*

## ⚠️ Decisão crítica 2 — versões de framework

O lanc-app é **Next 16 / React 19 / Tailwind 4 / ESLint 9**; o nosso é **Next 14.2 /
React 18 / Tailwind 3**. **Não dá pra empacotar um upgrade gigante de framework JUNTO
com o merge** — seria muita mudança quebrável de uma vez sobre o app de produção com
dado de paciente.

**Recomendação:** ou (a) manter nossas versões e adaptar o código dele, ou (b) fazer o
upgrade de framework como um passo **separado e validado ANTES** do merge. Decidir com JP.

## Auth unificada (uma só)

- Estender `pesquisadores` com `role`/`status`/cargos (acima). Sem `Profile`.
- Manter nosso fluxo de **convite por admin**; **adicionar** o fluxo de
  **signup com aprovação** do lanc-app como opção (tabela `signup_requests`: público
  pede → admin aprova → vira convite). `allowed_users` como allowlist opcional.
- **Um middleware**: o nosso, com gates por papel (`/admin` → is_admin; `/extensao` e
  `/estagio` → role/diretoria; pesquisa segue como está). Migrar os usuários do
  lanc-app pro auth canônico preservando a senha.
- Portar a lógica de permissões dele (`src/lib/cargos.ts`) pra um helper nosso.

## Segurança da migração de banco

- **Backup** dos dois bancos antes.
- Banco de pesquisa = **canônico**, base intocada; tudo do lanc-app entra por adição.
- Migrar dados + usuários do lanc-app pro canônico; **testar numa cópia/branch do
  Supabase** antes de tocar produção.
- Migrations no nosso padrão SQL (próxima = 0026+).

## Ordem de execução (na branch `merge/lanc-app`, com PR no fim)

0. (Pré) Decidir as 2 decisões críticas acima. Opcional: criar org da LANC no GitHub.
1. **Schema aditivo:** migrations SQL das tabelas novas + extensão de `pesquisadores`
   + RLS por papel. (Não toca tabelas de pesquisa.)
2. **Auth/papéis:** middleware com gates + signup-approval + migração de usuários.
3. **Features por área**, portadas pro nosso padrão: estágio (escala/solicitações) →
   TCE Baby → escalas TCE (HS/HGE/frequência) → admin (membros/documentos/settings).
4. **Deploy em preview** (Vercel), validação (type-check/lint/build/testes), conferência.
5. **PR** pra revisão do JP. Só então `main` + um Vercel + um domínio.

## Perguntas abertas (Pedro + JP)

1. **Prisma ou nosso padrão Supabase/SQL/RLS?** (recomendo o nosso — ver Decisão 1.)
2. **Upgrade de framework:** manter nossas versões e adaptar, ou subir Next16/React19/TW4 antes?
3. **Usuários:** todos logam na mesma conta? O signup público com aprovação fica ligado?
4. **Domínio final** da casa única e qual Supabase é o canônico (recomendo o de pesquisa).
5. **TCE Baby vs pacientes de pesquisa:** confirmam que ficam separados (são coisas diferentes)?
