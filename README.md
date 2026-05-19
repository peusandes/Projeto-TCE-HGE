# LANC · Coleta TCE

PWA mobile-first para coleta de campo do protocolo de **Traumatismo Cranioencefálico (TCE)** da Liga Acadêmica de Neurocirurgia da Bahia (LANC) no Hospital Geral do Estado (HGE).

Não substitui o REDCap — **alimenta** o REDCap.

---

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + componentes shadcn-style escritos à mão
- **Supabase** (Postgres + Auth + Storage)
- **Tipografia**: Fraunces (display) + IBM Plex Sans (body) + IBM Plex Mono (numerais) via `next/font/google`
- **Direção estética**: "Atlas Clínico" — editorial, sóbrio, números grandes como âncoras visuais. Detalhes em `design-mockups/PROPOSAL.md`.

---

## Setup local

### 1. Pré-requisitos

- Node 20+ (testado em v25 via nvm)
- pnpm 9+

```bash
nvm use 20  # ou superior
corepack enable  # se pnpm não estiver disponível
```

### 2. Instalar dependências

```bash
cd lanc-tce
pnpm install
```

Se aparecer aviso sobre `unrs-resolver`/scripts ignorados, está OK — o `pnpm-workspace.yaml` já libera o necessário.

### 3. Criar projeto Supabase (manual)

1. Abra https://supabase.com/dashboard → **New project**
2. Nome: `lanc-tce-coleta` · Região: **South America (São Paulo)** · Plano: Free se disponível
3. Em **Project Settings → API**, copie:
   - `Project URL` (ex.: `https://abcd1234.supabase.co`)
   - chave `anon / public` (ou `sb_publishable_...` se sua org já usa o formato novo)
4. Cole em `.env.local` (use `.env.local.example` como modelo):

```bash
cp .env.local.example .env.local
# edite com seus valores
```

### 4. Aplicar migrations

No **SQL Editor** do dashboard Supabase, abra cada arquivo abaixo (nesta ordem), cole e rode:

1. `supabase/migrations/0001_initial_schema.sql` — tabelas (pesquisadores, plantoes, pacientes, mapa_entries, coletas_redcap, anexos)
2. `supabase/migrations/0002_indexes_triggers.sql` — índices + triggers
3. `supabase/migrations/0003_rls_policies.sql` — RLS single-tenant LANC
4. `supabase/migrations/0004_storage_bucket.sql` — bucket privado `anexos-tce`
5. `supabase/migrations/0005_bulk_seed_rpc.sql` — RPCs `bulk_seed_plantao` e `clonar_mapa_anterior`
6. `supabase/migrations/0006_admin_and_setup.sql` — colunas `is_admin` + `setup_complete` em `pesquisadores`, trigger atualizado

### 5. Configurar URLs de redirect no Supabase

Em **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3030` (em dev) ou `https://seu-dominio.vercel.app` (produção)
- **Redirect URLs**: adicione `http://localhost:3030/auth/callback` (e o equivalente de produção)

Isso é necessário para os links de convite por email funcionarem.

### 6. Criar sua conta admin

```bash
pnpm seed:admin pedrosandesp@gmail.com SuaSenhaForte123 "Pedro Sandes"
```

(O argumento de nome é opcional — se omitir, você define no primeiro login.)

O script:
- Cria (ou atualiza) o usuário em `auth.users` com senha
- Confirma o email (sem precisar verificar)
- Marca `is_admin=true` em `pesquisadores`
- É idempotente (rodar de novo só atualiza)

Requer `SUPABASE_SERVICE_ROLE_KEY` em `.env.local` — pegue em **Project Settings → API → service_role (secret) → Reveal**.

### 7. Convidar outros pesquisadores

Não use o dashboard. Logado como admin, abra **/admin/pesquisadores** no app — tem form de convite por email. O Supabase envia o email automaticamente (SMTP padrão; trocar pra Resend depois).

Cada pesquisador convidado clica no link do email, define **nome completo + senha + confirmação** numa tela de boas-vindas, e entra no app. Senha < 8 caracteres ou senhas diferentes bloqueiam o submit.

### 8. Rodar em dev

```bash
pnpm dev
```

App em http://localhost:3030 (ou outra porta se :3000 estiver ocupada).

### 6. Rodar em dev

```bash
pnpm dev
```

App em http://localhost:3000 — vai redirecionar para `/login`.

> **Requer internet no primeiro build** para baixar as fontes (Fraunces, IBM Plex Sans/Mono via `next/font/google`). Depois do download, as fontes ficam self-hosted dentro do bundle.

### 7. Type-check / Build / Lint

```bash
pnpm type-check   # tsc --noEmit
pnpm lint
pnpm build        # produção
```

---

## Fluxo de uso

1. **Login** com email/senha do pesquisador
2. **/plantoes** → **+ Novo plantão** (data, pesquisadores, opcional: clonar mapa anterior sem ALTA/EXCLUSAO)
3. **/plantoes/[id]** → adicionar pacientes manualmente ou via **Importar Excel** (botão flutuante à esquerda; aceita o formato do mapa LANC — ver `lib/parser/excel-mapa.ts`)
4. **/pacientes/[id]** → 3 abas:
   - **Resumo**: auto-save com debounce 800ms, indicador "salvo · HH:MM" no topo, timeline de evolução por plantão
   - **REDCap**: placeholder com JSON livre (campos completos virão depois)
   - **Anexos**: tirar foto ou anexar PDF, com tipo + data de referência + descrição. Compressão automática de imagens (≤1.5MB / 1920px).
5. **/anexos** → visão consolidada com filtros por tipo/status, marcar como **Feito** após transcrever pro REDCap

---

## Deploy (Vercel)

```bash
# Na raiz do projeto lanc-tce (não na pasta-mãe "CLAUDE PROJETO TCE/"):
vercel
```

No dashboard Vercel, em **Settings → Environment Variables**, adicione as mesmas variáveis do `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Promova para produção. Cole o domínio Vercel em **Supabase → Authentication → URL Configuration** como **Site URL** e em **Redirect URLs** (`https://seu-dominio.vercel.app/auth/callback`) — necessário para reset de senha.

---

## Estrutura

```
lanc-tce/
├── src/
│   ├── app/
│   │   ├── (auth)/login/             # login com email+senha
│   │   ├── (app)/                    # rotas autenticadas (header + bottom-nav)
│   │   │   ├── plantoes/             # lista + detalhe (mapa por setor)
│   │   │   ├── pacientes/[id]/       # detalhe com tabs
│   │   │   └── anexos/               # visão consolidada
│   │   ├── auth/                     # callback + signout
│   │   ├── layout.tsx                # fontes (Fraunces, Plex), metadata, manifest
│   │   ├── manifest.ts               # PWA manifest
│   │   └── globals.css               # tokens shadcn + utilitários paper/grain
│   ├── components/
│   │   ├── ui/                       # primitivos shadcn-style (button, input, drawer, tabs...)
│   │   ├── shell/                    # AppHeader, BottomNav
│   │   ├── plantao/                  # cards, drawers, mapa, excel import
│   │   ├── paciente/                 # form resumo, timeline, REDCap placeholder, anexos tab
│   │   └── anexos/                   # uploader (camera + compressão), galeria, overview
│   ├── lib/
│   │   ├── supabase/{client,server,middleware}.ts
│   │   ├── domain/{enums,types}.ts   # enums + tipos espelhando schema
│   │   ├── data/{plantoes,pacientes}.ts  # queries server-side
│   │   ├── parser/excel-mapa.ts      # parser do mapa em .xlsx
│   │   └── utils/storage-path.ts
│   └── middleware.ts                  # refresh de sessão Supabase
├── supabase/migrations/               # 5 migrations SQL aplicáveis pelo Dashboard
├── design-mockups/                    # 3 mockups HTML + PROPOSAL.md (Atlas Clínico)
└── public/
    ├── icons/                         # PWA: 192, 512, maskable
    └── logo-lanc*.png
```

---

## Sistema de design — "Atlas Clínico"

**Tipografia**
- Display: **Fraunces** (variable, axes opsz + SOFT) — datas, leitos, títulos
- Body: **IBM Plex Sans** — UI geral
- Mono: **IBM Plex Mono** — IDs, contagens, REDCap ID

**Paleta**
| Token | HEX | HSL | Uso |
|---|---|---|---|
| paper | `#F5F2EC` | `42 28% 94%` | fundo (cor-de-papel quente) |
| paper-deep | `#EBE7DD` | `42 25% 89%` | sub-cards, inputs |
| hairline | `#D9D2C4` | `38 24% 81%` | bordas/filetes |
| ink | `#0A1628` | `218 62% 10%` | texto principal |
| graphite | `#374151` | — | texto secundário |
| ash | `#6B7280` | — | texto muted |
| cobalt | `#1E3A8A` | `224 64% 33%` | primário (ações, marcadores ativos) |
| saffron | `#B45309` | — | TCLE pendente |
| moss | `#3F6B4C` | — | TCLE assinado, SEG |
| vermillion | `#B91C1C` | — | crítico, destrutivo |
| plum | `#5B21B6` | — | ALTA |

**Princípios**
- Números grandes (leitos, datas) como **âncoras visuais** — leitura periférica rápida em plantão
- Filetes editoriais (1px hairline) em vez de cards inflados — densidade sem perder ar
- Setor com regra dupla `[mono numeral] ─── nome em italic ─── [contagem]`
- Status (situação) como filete colorido de 2px no canto esquerdo do card (não compete por espaço)
- Auto-save com indicador discreto no header do form (bolinha pulsante + "salvo · HH:MM")
- Pacientes com EXCLUSÃO ficam levemente apagados (text-slate + line-through fino) — não somem do mapa

Mockups completos em `design-mockups/01-plantoes.html`, `02-mapa-plantao.html`, `03-paciente-detalhe.html`. Abra no browser para ver o resultado-alvo.

---

## Próximos passos (não implementados ainda)

| Item | Notas |
|---|---|
| **Offline-completo (Dexie + fila de sync)** | A v1 é online-first com Server Actions. Plano detalhado em `/Users/pedrosandes/.claude/plans/glimmering-crunching-wadler.md` (mutation_queue, conflict last-write-wins, Background Sync API). |
| **Service Worker / PWA instalável** | Manifest pronto (`/manifest.webmanifest`), faltam SW (`@serwist/next`) e Background Sync wiring. App já é "installable" no Android Chrome com banner; iOS Safari requer Adicionar à Tela Inicial. |
| **Campos completos REDCap** | Hoje é placeholder JSON. Próxima entrega: forms tipados por seção (admissão, GCS/NIHSS, exames, desfecho, alta). |
| **Exportador automatizado REDCap via API** | Botão "Exportar" no paciente: POST para REDCap API, grava `redcap_id` + `status='EXPORTADO_REDCAP'` em `coletas_redcap`. |
| **Notificações push** | Para lembrar de seguimento 24h/48h após admissão. |
| **Multi-tenancy / RLS por grupo** | Hoje single-tenant LANC. Hardening para suportar múltiplas ligas/protocolos. |
| **Reconciliação de conflitos com UI dedicada** | Quando o sync engine estiver no ar. |
| **OCR automático de anexos** | Preenchimento parcial do REDCap a partir de fotos de exames. |
| **Dark mode noturno (auto)** | Para plantão em ala mal iluminada. |
| **Swipe-actions no card** | Mover de setor, marcar alta, excluir — sem abrir o paciente. |

---

## Decisões registradas

- **Single-tenant**: RLS permite tudo para `authenticated`. Não há admin role nem grupos. Suficiente para a LANC; reavaliar se outras ligas vierem.
- **Server actions + Supabase JS no client para uploads**: server actions para mutações triviais (plantão, paciente, REDCap), client para uploads de anexo (precisa do progresso da barra). Sem REST custom.
- **xlsx via CDN tarball**: o pacote `xlsx` oficial não está no npm; baixamos do `cdn.sheetjs.com`. Já configurado no `package.json`.
- **Sem TanStack Query na v1**: Server Components + revalidatePath são suficientes. Adicionar quando offline-completo entrar.
- **Sem dark mode na v1**: paleta paper foi desenhada para iluminação variável; dark mode noturno é melhoria futura.

---

## Suporte

- Plano completo do projeto: `/Users/pedrosandes/.claude/plans/glimmering-crunching-wadler.md`
- Design rationale: `design-mockups/PROPOSAL.md`
- Para consultar dados/erros do Supabase, use `SUPABASE_PROJECT_ID` em `.env.local` para acessar via dashboard ou MCP.
