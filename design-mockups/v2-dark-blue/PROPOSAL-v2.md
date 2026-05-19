# Proposta v2 — "Night Shift OS"

> Mockups em `01-plantao-mapa.html`, `02-paciente-detalhe.html`, `03-login.html`. Abra no Chrome/Safari.

---

## 1. Direção estética

**Pivô completo:** sai o "Atlas Clínico" (paper cream + serif Fraunces) que ficou AI-generic editorial.
Entra **"Night Shift OS"** — dark mission-control clínico inspirado em Datadog/Grafana refinado, com identidade própria.

Princípios:
- **Dark mode honesto** — não pelo trend, mas porque pesquisador às 3h em ala mal iluminada PRECISA disso fisicamente. Reduz fadiga ocular, é melhor pra OLED.
- **Glow como sinalização semântica** — não decoração. Status crítico brilha, info passiva fica calma.
- **Density com ar** — cards apertados (gap-2/3) mas hero com respiração dramática (gradients + grid blueprint).
- **Numerais como dispositivo** — todos os números em **JetBrains Mono** com tabular-nums. Reforça "leitura de instrumento médico".
- **Microinterações com propósito** — `pulse-ring` nos ativos, `glow-breath` no FAB, `scan-line` no hero, focus-rings cobalto nos inputs. CSS-only.

---

## 2. Tipografia

| Uso | Família | Justificativa |
|---|---|---|
| Display + Body | **Onest** (Google Fonts, variable 300-800) | Geometria neutra-clínica, distinta de Inter, characterful sem ser frívola. Tabular figures por padrão. |
| Mono — TODOS os numerais (leitos, datas, contagens, REDCap ID, IDs de plantão) | **JetBrains Mono** | Coerente, técnica, evoca "monitor/terminal médico". Único uso de mono no app. |

Substitui o Fraunces (serif) e o IBM Plex (atual). Decisão deliberada de NÃO ter um pareamento serif+sans — a estética pede pura precisão sans + monospace, sem ornamento editorial.

---

## 3. Paleta — "Night Shift OS"

| Token Tailwind | HEX | HSL | Uso |
|---|---|---|---|
| `void` | `#06080F` | `223 41% 5%` | fundo principal (OLED-deep) |
| `void-deep` | `#03050B` | `225 50% 3%` | fundo borda externa do device |
| `surface` | `#0E1322` | `224 41% 10%` | cards/painéis |
| `surface-soft` | `#141A2C` | `222 35% 13%` | sub-surfaces, inputs hover |
| `surface-elev` | `#1A2238` | `223 36% 16%` | elevações, dropdowns |
| `line` | `#1F2941` | `222 35% 19%` | bordas mais fortes |
| `line-soft` | `#161D30` | `223 35% 14%` | divisores sutis |
| `cobalt-900` | `#0A1232` | `227 67% 12%` | gradient deep |
| `cobalt-700` | `#1E3A8A` | `224 64% 33%` | brand primário |
| `cobalt-500` | `#3B82F6` | `217 91% 60%` | interativo (botões, links, focus) |
| `cobalt-400` | `#60A5FA` | `213 94% 68%` | accent + fonte de glow |
| `cobalt-300` | `#93C5FD` | `212 96% 78%` | texto sobre cobalto, highlights |
| `text-primary` | `#F5F8FF` | `225 100% 98%` | texto principal |
| `text-secondary` | `#9AA4BF` | `224 17% 67%` | texto secundário |
| `text-muted` | `#5C667F` | `222 16% 43%` | muted, labels |
| `text-dim` | `#3D465E` | `223 21% 31%` | desabilitado |
| `saffron` | `#FBBF24` | — | TCLE pendente (com glow) |
| `emerald` | `#10B981` | — | TCLE assinado |
| `rose` | `#F87171` | — | destrutivo, TCLE recusado |
| `seg` | `#34D399` | — | situação SEG |
| `alta` | `#A78BFA` | — | situação ALTA |
| `excl` | `#6B7280` | — | EXCLUSAO |

---

## 4. Sistema de glows / shadows

```ts
boxShadow: {
  // Cards / painéis - depth padrão
  panel: 'inset 0 1px 0 rgba(255,255,255,0.045), 0 1px 0 rgba(0,0,0,0.6), 0 16px 32px -20px rgba(0,0,0,0.6)',

  // Glow primário - botões, cards ativos, focus rings
  'glow-blue': '0 0 28px -4px rgba(59,130,246,0.45), 0 0 1px 0 rgba(96,165,250,0.6) inset',
  'glow-blue-soft': '0 0 18px -4px rgba(59,130,246,0.25)',
  'glow-blue-deep': '0 0 32px -4px rgba(59,130,246,0.6), 0 0 1px 0 rgba(96,165,250,0.7) inset',

  // Glows semânticos
  'glow-emerald': '0 0 18px -4px rgba(16,185,129,0.35)',
  'glow-amber': '0 0 18px -4px rgba(251,191,36,0.35)',
  'glow-rose': '0 0 18px -4px rgba(248,113,113,0.35)',

  // FAB - breath glow
  'fab': '0 0 24px -4px rgba(59,130,246,0.45), 0 12px 28px -10px rgba(0,0,0,0.7)',
}
```

### Animações CSS-only
```css
@keyframes pulse-ring { /* halo expandindo nos ativos */ }
@keyframes glow-breath { /* FAB respira */ }
@keyframes scan { /* linha cobalto cruza hero — sutil */ }
@keyframes halo-breath { /* aura atrás do logo no login */ }
```

Todas no `tailwind.config.ts` como `animate-pulse-ring`, `animate-glow-breath`, etc.

---

## 5. Camadas de fundo

Cada tela tem 4 camadas empilhadas (z-axis):
1. **Base**: `bg-void` (#06080F)
2. **Ambient gradients radiais**: cobalto top + lighter bottom. Definidos em `globals.css` body bg.
3. **Grid blueprint**: 28px × 28px linhas cobalto 5%, mascarado por gradient elíptico no topo da tela. Só em hero zones (`.grid-blueprint` utility).
4. **Grain noise SVG**: 2.8% opacity, mix-blend-screen. Em todo container principal (`.grain::before` utility).

---

## 6. Componentes-chave

### Pills (status / TCLE)
```css
.pill {
  display:inline-flex; align-items:center; gap:6px;
  padding: 3px 9px 3px 8px; border-radius:999px;
  font-size:10px; font-weight:600; letter-spacing:0.06em;
  text-transform:uppercase; line-height:1;
  border: 1px solid;
}
.pill .dot { width:5px; height:5px; border-radius:999px; box-shadow:0 0 6px currentColor; }
```
Variantes: `.pill-adm`, `.pill-seg`, `.pill-excl`, `.pill-alta`, `.pill-pend`, `.pill-ok`, `.pill-rec`. Cada uma com cor + bg 10% + border 25% + (glow opcional para alertas).

### Patient card
- `bg: linear-gradient(180deg, rgba(20,26,44,0.85), rgba(14,19,34,0.85))`
- `border: 1px solid rgba(255,255,255,0.04)`
- `box-shadow: inset 0 1px 0 rgba(255,255,255,0.045), 0 1px 0 rgba(0,0,0,0.6), 0 16px 32px -20px rgba(0,0,0,0.6)`
- Filete colorido: `position:absolute; left:0; top:14px; bottom:14px; width:2px; border-radius:999px; box-shadow:0 0 12px currentColor`
- Hover: `border-cobalt-500/30` + `shadow-glow-blue-soft`
- Active (tap): `scale(0.985)`
- EXCLUSAO/ALTA: `opacity-60` + line-through em EXCLUSAO

### Sector header (regra editorial dupla)
```
[mono numeral cobalt 11px]  ────────  TÍTULO (uppercase tracking)  ────────  [count mono]  [chevron]
```
- Linhas: `bg-line` (1F2941) quando expandido, `bg-line-soft` (161D30) quando colapsado
- Setor vazio: tudo em `text-text-muted`, número vira "—"

### FAB
- Pill 48px alta
- Background: `linear-gradient(135deg, #3B82F6, #1E3A8A)`
- Circle interno 32px com gradient white-translucent
- Permanent `glow-breath` animation

### Tabs (paciente detalhe)
- Glass container 1px com 4 elementos
- Tab ativa: `bg: linear-gradient(180deg, rgba(59,130,246,0.18), rgba(59,130,246,0.06))` + inset highlight + glow
- Tab inativa: text-text-secondary, hover text-white

### Inputs
- `bg: rgba(20,26,44,0.55)` + `border: 1px solid rgba(255,255,255,0.06)`
- Focus: `border-cobalt-400/50` + `ring: 0 0 0 3px rgba(59,130,246,0.10)`
- Labels: `text-[10px] uppercase tracking-[0.2em] text-text-muted`

---

## 7. Mudanças por arquivo

### A. `tailwind.config.ts`
Substituir tokens semânticos do "Atlas Clínico" pelos do Night Shift. Adicionar `boxShadow` extension acima. Adicionar `keyframes` e `animation` (pulse-ring, glow-breath, scan, halo-breath). Família display/sans = Onest, mono = JetBrains Mono.

### B. `src/app/globals.css`
- Tokens CSS variables apontando para os novos HEX
- `body` background com gradients radiais cobalto + `void` base
- Utilities: `.bg-paper-grain` → `.bg-void-grain`, novo `.grid-blueprint`, `.scan-line`
- Remove utility `font-display-italic` (não tem mais Fraunces italic)
- Adiciona `.field-input` como classe utilitária base de input

### C. `src/app/layout.tsx`
Trocar fontes:
```tsx
import { Onest, JetBrains_Mono } from "next/font/google";
const onest = Onest({ subsets:["latin"], variable:"--font-onest", weight:["300","400","500","600","700","800"], display:"swap" });
const jbMono = JetBrains_Mono({ subsets:["latin"], variable:"--font-jb-mono", weight:["400","500","600"], display:"swap" });
```
Body: `font-sans antialiased bg-void text-text-primary min-h-svh`. Remover `bg-paper-grain` (vira `bg-void` + utility de grain aplicada no AppLayout).

### D. `src/components/shell/AppHeader.tsx`
- bg: `bg-void/80 backdrop-blur-xl border-b border-line-soft`
- LANC wordmark mantém — mas ponto cobalt-400 em vez de cobalt
- Botão User: `border-line` + hover `border-cobalt-500/40`
- OnlineBadge: refina cor (verde = `bg-seg`, vermelho = `bg-rose`)

### E. `src/components/shell/BottomNav.tsx`
- bg: glass com `backdrop-blur-xl` + `border-t border-white/5`
- Indicador ativo: barra 2px no TOPO (não embaixo) com shadow cobalto glow
- Texto ativo: `text-cobalt-300`, inativo: `text-text-muted`

### F. `src/components/plantao/PlantaoCard.tsx`
- Painel escuro com top highlight
- Numeral do dia em Mono JetBrains, com text-shadow cobalto
- Active card: gradient sub-bg cobalto 5% no canto
- Filete vertical esquerdo cobalto 3px no card ATIVO

### G. `src/components/plantao/PacienteCard.tsx`
- Painel surface escuro com `panel` class
- Leito numeral em JetBrains Mono 28px com text-shadow
- Filete lateral colorido com `box-shadow: 0 0 12px currentColor`
- Pills via novo sistema (`.pill` + variantes)
- EXCLUSAO/ALTA: `opacity-60` no card

### H. `src/components/plantao/PacienteBadges.tsx`
Reescrever pra usar `.pill` + classes semânticas (.pill-adm, .pill-pend, etc.). Dot com glow.

### I. `src/components/plantao/MapaPlantao.tsx`
- Setor header: regras editoriais duplas + numerais em mono + chevron rotate
- Setor vazio: tudo em text-muted, número = "—"
- Botão "+ adicionar em SETOR" no estilo cobalt outline

### J. `src/app/(app)/plantoes/[id]/page.tsx`
- Hero zone:
  - Wrapper `relative overflow-hidden` com `hero-light` + `grid-blueprint` overlays
  - Scan-line animation
  - Indicador "EM ANDAMENTO" com pulse-ring
  - Date numeral 88px JetBrains Mono com text-shadow cobalto
  - Pesquisadores em branco/secondary, sparkline SVG decorativo abaixo
  - Stat strip em glass card 4 colunas com divide-x branco 5%, cada número com glow correspondente

### K. `src/app/(app)/plantoes/page.tsx`
- Header da página: `Plantões.` com ponto cobalt-400, rule-dotted vira rule cobalto-fade
- EmptyState com painel dark + bordas cobalto sutis

### L. `src/app/(app)/pacientes/[id]/page.tsx`
- Hero do paciente em painel com grid blueprint
- Leito/Setor em mono cobalto-300
- Nome em Onest semibold 26px
- Tabs em glass-card com slider animado

### M. `src/components/paciente/PacienteResumoForm.tsx`
- Inputs todos com `.field-input` utility (bg-surface-soft + border-line)
- Focus ring cobalto
- Labels uppercase tracking text-muted
- Indicador "salvo" com dot seg

### N. `src/components/paciente/TimelineEvolucao.tsx`
- Linha vertical em `bg-line`
- Nó atual: `bg-cobalt-500` + `border-4 border-void` + `shadow-[0_0_12px_rgba(96,165,250,0.6)]`
- Nós passados: `bg-surface-soft` + `border border-line`

### O. `src/components/anexos/*` (AnexoUploader, AnexoGaleria, AnexosOverview)
- Botões grandes 📷 + 📎 com gradient cobalto + glow
- Cards de anexo (galeria): painel dark com hover glow
- Preview modal com bg void-deep

### P. `src/components/plantao/NovoPlantaoFab.tsx` + similar no MapaPlantao
- Gradient cobalto + glow-breath permanent
- Drawer interno também escurece (bg-surface)

### Q. `src/app/(auth)/login/page.tsx` + `login-form.tsx`
- Background com ambient + grid blueprint
- Logo com halo-breath radial atrás
- Form em painel glass dark
- Botão Entrar com gradient cobalto + glow-breath

### R. `src/app/auth/setup-account/SetupForm.tsx`
- Inputs `.field-input`
- Validações com texto saffron/rose
- Match OK com texto emerald + glow
- Botão Concluir com gradient cobalto

### S. `src/app/(app)/admin/pesquisadores/page.tsx` + `InvitarForm.tsx` + `RowActions.tsx`
- Cards de pesquisador em painel dark
- Pills "admin" cobalto-300, "convidado" saffron
- Form de convite em painel com label cobalto

### T. `src/app/offline/page.tsx`
- Mesmo tema dark, halo radial atrás do logo
- Ícone WiFi-off em cobalto-400/60

### U. `src/components/ui/sonner.tsx`
Configurar Toaster com tema dark:
```tsx
<Sonner
  position="top-center"
  theme="dark"
  toastOptions={{
    classNames: {
      toast: 'bg-surface-soft border-line text-text-primary',
      title: 'text-text-primary font-semibold',
      description: 'text-text-secondary',
    },
  }}
/>
```

### V. `src/components/ui/*` (button, input, drawer, dialog, etc.)
Atualizar variantes pra usar tokens novos:
- Button default: gradient cobalto + glow-blue
- Input: `.field-input` style
- Drawer/Dialog: `bg-surface` + `border-line`
- Card: `panel` class
- Select: dropdown dark

### W. `src/app/manifest.ts`
`theme_color: "#06080F"`, `background_color: "#06080F"`.

### X. `src/app/(app)/layout.tsx`
Wrapper com `bg-void text-text-primary` + relative + grain overlay.

---

## 8. Ordem de aplicação (impacto descrescente)

1. **Foundation** — `tailwind.config.ts` + `globals.css` + `layout.tsx` (fontes). Sem essas 3, nada vai.
2. **Shell** — `AppHeader` + `BottomNav` + `(app)/layout.tsx`. Tema visual presente em toda tela.
3. **Cards principais** — `PlantaoCard`, `PacienteCard`, `PacienteBadges` (novo Pill system). 80% do impacto visual.
4. **Mapa do plantão** — `MapaPlantao` + `plantoes/[id]/page.tsx` (hero zone com grid blueprint, stats, sparkline).
5. **Detalhe paciente** — `pacientes/[id]/page.tsx` + `PacienteResumoForm` + `TimelineEvolucao` + `RedcapPlaceholder`.
6. **Anexos** — uploader + galeria + overview.
7. **Auth flows** — login + setup-account + offline page.
8. **Admin** — pesquisadores page + invitar form + row actions.
9. **UI primitives** — drawer/dialog/select/tabs com tema dark.
10. **Toaster** — dark theme do sonner.

Type-check entre cada bloco. Smoke visual no Chrome devtools mobile (iPhone 14 Pro) entre 4-5.

---

## 9. Riscos / ressalvas

- **Onest CDN** — Google Fonts. Em cold start no Vercel pode pesar ~30kb adicionais vs Geist. Aceitável.
- **Animações** — `pulse-ring`, `glow-breath`, `scan` rodam em CSS puro (transform/box-shadow). Mas multiplicar muito em mobile baixo-fim pode dar overhead. Limitar `scan` só ao hero da tela ativa; FAB tem 1 só.
- **Backdrop blur** — usado em bottom nav e drawers. Safari iOS implementa nativo mas custa. Manter blur-xl no máximo (16px).
- **Grain noise SVG** — inline data URL, cache hit forte. Sem custo extra.
- **Contraste** — testar com simulador color-blind. Cobalt-400 + saffron + emerald + rose passam AA em fundo void na maioria; verificar com Lighthouse.
- **Print/light mode** — Não temos light mode. Decisão: app é único pra plantão noturno, NÃO ter light é parte da identidade.

---

## 10. O que NÃO mudar nesta rodada

- Lógica de server actions e queries (estável).
- Schema do banco (idem).
- Service Worker / PWA wiring (manifest só pega theme_color novo).
- Parser Excel.
- Setup-account flow + middleware logic.

---

Quando aprovar, executo na ordem do item 8 com type-check entre etapas. Sugiro começar pelos passos 1-3 (foundation + shell + cards) — entrega ~80% do impacto visual com o menor risco de breakage.
