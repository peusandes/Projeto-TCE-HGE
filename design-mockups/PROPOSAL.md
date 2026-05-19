# Proposta de refinamento UI/UX — LANC Coleta TCE

> Mockups visíveis em `01-plantoes.html`, `02-mapa-plantao.html`, `03-paciente-detalhe.html`. Abra no Chrome/Safari para ver o resultado real (fontes via CDN). Esta proposta documenta o que mudar nos arquivos atuais para chegar lá.

---

## 1. Direção estética: "Atlas Clínico"

Pensa num prontuário bem desenhado — não num app de consumer. Tipografia de revista médica séria, paleta cor-de-papel + tinta-cobalto, números grandes (leitos, datas) como **âncoras visuais**, regras editoriais como num atlas anatômico. Calmo, denso na medida, com gravitas.

**Não** é: brutalismo, gradient roxo, glassmorphism, bouncy SaaS.
**É**: editorial, sóbrio, com identidade forte sem ser frívolo.

Referências para o ânimo: Apple Health, Monocle, atlas de Netter, wayfinding Lufthansa.

---

## 2. Sistema de design

### Tipografia (Google Fonts)
| Uso | Família | Justificativa |
|---|---|---|
| Display (datas, leitos, títulos) | **Fraunces** (variable: opsz/wght/SOFT) | Caráter editorial, números bonitos em tabular-nums, escalável de 9 a 144 |
| Body / UI | **IBM Plex Sans** | Herança IBM (clínica/scientific), distintiva (≠ Inter), excelente legibilidade |
| Mono (IDs, contagens, REDCap ID) | **IBM Plex Mono** | Pareia com Plex Sans, tabular |

### Paleta (HSL e HEX)
| Token | HEX | HSL Tailwind | Uso |
|---|---|---|---|
| `paper` | `#F5F2EC` | `42 28% 94%` | Background principal (cor-de-papel quente) |
| `paper-deep` | `#EBE7DD` | `42 25% 89%` | Sub-cards, inputs |
| `hairline` | `#D9D2C4` | `38 24% 81%` | Filetes, bordas |
| `ink` | `#0A1628` | `218 62% 10%` | Texto principal |
| `graphite` | `#374151` | `220 14% 27%` | Texto secundário forte |
| `ash` | `#6B7280` | `217 12% 46%` | Texto muted |
| `cobalt` | `#1E3A8A` | `224 64% 33%` | Primário (ação, marcadores ativos) |
| `cobalt-soft` | `#3B5BB8` | `224 49% 47%` | Variante hover/secundária |
| `vermillion` | `#B91C1C` | `0 73% 41%` | Crítico (raro) |
| `saffron` | `#B45309` | `26 91% 37%` | TCLE Pendente |
| `moss` | `#3F6B4C` | `138 26% 33%` | TCLE Assinado, SEG |
| `slate` | `#475569` | `215 19% 34%` | EXCLUSAO |
| `plum` | `#5B21B6` | `265 69% 42%` | ALTA |

### Filetes editoriais
- Regras finas (1px `hairline`) como separadores **em vez de cards inflados**.
- Setores: `[mono numeral] ─── nome ─── [contagem mono]`.

### Microinterações
- Foco de input: borda passa de `hairline` para `cobalt` com `transition: border-color .15s`.
- Cards de paciente: filete colorido lateral (2px) sinaliza situação periféricamente.
- Tap states: `active:bg-paper-deep`.
- Auto-save: o "salvo · 23h49" no header com bolinha pulsante (`animate-pulse` durante save).

### Tap targets
Mantém ≥44px em todos os controles, mas substitui o look "button-y" por touch-areas embutidas em layouts editoriais.

---

## 3. Mudanças concretas por arquivo

### A. `tailwind.config.ts`
Adicionar fontes e cores:
```ts
extend: {
  fontFamily: {
    display: ['var(--font-fraunces)', 'serif'],
    sans: ['var(--font-plex-sans)', 'system-ui', 'sans-serif'],
    mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
  },
  colors: {
    paper: '#F5F2EC',
    'paper-deep': '#EBE7DD',
    hairline: '#D9D2C4',
    ink: '#0A1628',
    graphite: '#374151',
    ash: '#6B7280',
    cobalt: { DEFAULT: '#1E3A8A', soft: '#3B5BB8' },
    vermillion: '#B91C1C',
    saffron: '#B45309',
    moss: '#3F6B4C',
    plum: '#5B21B6',
    // ... mantém os tokens shadcn (border, background, etc.) apontando para os novos
  },
}
```

### B. `src/app/layout.tsx` — trocar fontes
```tsx
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz","SOFT"] });
const plexSans  = IBM_Plex_Sans({ subsets: ["latin"], weight: ["300","400","500","600","700"], variable: "--font-plex-sans" });
const plexMono  = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-plex-mono" });

// body className: `${fraunces.variable} ${plexSans.variable} ${plexMono.variable} font-sans antialiased bg-paper text-ink`
```
Remover `localFont` do GeistVF.woff.

### C. `src/app/globals.css` — re-tematizar
```css
:root {
  --background: 42 28% 94%;        /* paper */
  --foreground: 218 62% 10%;        /* ink */
  --card: 42 28% 94%;
  --card-foreground: 218 62% 10%;
  --primary: 224 64% 33%;           /* cobalt */
  --primary-foreground: 42 28% 94%;
  --secondary: 42 25% 89%;          /* paper-deep */
  --secondary-foreground: 218 62% 10%;
  --muted: 42 25% 89%;
  --muted-foreground: 217 12% 46%;  /* ash */
  --accent: 224 49% 47%;            /* cobalt-soft */
  --accent-foreground: 42 28% 94%;
  --border: 38 24% 81%;             /* hairline */
  --input: 38 24% 81%;
  --ring: 224 64% 33%;
  --destructive: 0 73% 41%;         /* vermillion */
  --radius: 0.875rem;               /* 14px — mais editorial que 8px */
}
```
Adicionar utilitário de grain (opcional, sutil):
```css
.bg-paper-grain {
  background-color: hsl(var(--background));
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
```

### D. `src/components/shell/AppHeader.tsx`
Substituir por wordmark "LANC." com período em cobalto + sub-rótulo em uppercase espaçado. Remove o logo PNG do header (logo fica só na splash/login).
```tsx
<div className="flex items-baseline gap-3">
  <span className="font-display text-[22px] leading-none font-bold tracking-tight">
    LANC<span className="text-cobalt">.</span>
  </span>
  <span className="text-[10px] uppercase tracking-[0.25em] text-ash">Coleta TCE</span>
</div>
```
Remove glass blur (`backdrop-blur`) — não combina com a estética paper. Borda inferior fina em `border-hairline`.

### E. `src/components/shell/BottomNav.tsx`
- Trocar para `bg-paper border-hairline`.
- Texto em uppercase `tracking-[0.2em] text-[10px]`.
- Indicador ativo: barra 2px abaixo do label em `bg-cobalt` (não muda cor de fundo).

### F. `src/components/plantao/PlantaoCard.tsx` — refazer
```tsx
<article className={cn(
  "relative rounded-[18px] border border-hairline overflow-hidden",
  plantao.finalizado ? "bg-paper-deep/60" : "bg-paper",
)}>
  {!plantao.finalizado && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-cobalt" />}
  <div className="p-5">
    <div className="flex items-center justify-between">
      <span className={cn(
        "text-[10px] uppercase tracking-[0.3em] font-medium",
        plantao.finalizado ? "text-ash" : "text-cobalt"
      )}>
        {plantao.finalizado ? "○ Finalizado" : "● Em andamento"}
      </span>
      <span className="font-mono text-[10px] text-ash">#{plantao.id.slice(0,4)}</span>
    </div>
    <div className="mt-4 flex items-end gap-5">
      <div className="font-display text-[64px] leading-[0.85] font-light tabular-nums">
        {format(date, "dd")}
      </div>
      <div className="pb-1.5">
        <div className="font-display italic text-[16px] text-graphite font-light capitalize">
          {format(date, "EEEE", { locale: ptBR })}
        </div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-ash mt-1">
          {format(date, "MMMM · yyyy", { locale: ptBR })}
        </div>
      </div>
    </div>
    <p className="mt-5 text-[13px] text-graphite">{plantao.pesquisadores.join(" · ")}</p>
    <div className="h-px bg-hairline my-4" />
    {/* grid de stats 3 colunas — só no card ativo */}
  </div>
</article>
```

### G. `src/components/plantao/PacienteCard.tsx` — refazer
- Leito vira numeral display Fraunces ~26px na esquerda (âncora).
- Filete lateral 2px com cor da situação (cobalt/moss/slate/plum/vermillion).
- Nome em `text-[14.5px] font-medium`.
- Metadata em `text-[11px] text-ash` (descrição), `text-[11px] text-slate italic` (comentários).
- Pills (badges) compactos com `pill::before` (bolinha 5x5) — ver CSS dos mockups.
- EXCLUSAO ganha line-through fino + texto em `slate` (não destrói a leitura, mas sinaliza).

### H. `src/components/plantao/PacienteBadges.tsx` — refazer
Substituir Badge shadcn por componente `Pill`:
```tsx
const PILL_BASE = "inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[10px] uppercase tracking-[0.08em] font-medium leading-none";
function Dot({ className }: { className: string }) {
  return <span className={cn("size-1.5 rounded-full", className)} />;
}
const SIT_PILL = {
  ADM: { dot: "bg-cobalt", text: "text-cobalt", bg: "bg-cobalt/10" },
  SEG: { dot: "bg-moss", text: "text-moss", bg: "bg-moss/10" },
  EXCLUSAO: { dot: "bg-slate-500", text: "text-slate-600", bg: "bg-slate-500/10" },
  ALTA: { dot: "bg-plum", text: "text-plum", bg: "bg-plum/10" },
};
```
Mesma estrutura para TCLE.

### I. `src/components/plantao/MapaPlantao.tsx`
- Substituir Accordion shadcn pelo padrão "regra dupla":
```tsx
<div className="flex items-baseline gap-3 mb-3">
  <span className="font-mono text-[11px] text-cobalt">{String(i+1).padStart(2,'0')}</span>
  <div className="flex-1 h-px bg-hairline" />
  <span className="font-display italic text-[13px] font-medium">{SETOR_LABEL[setor]}</span>
  <div className="flex-1 h-px bg-hairline" />
  <span className="font-mono text-[11px] text-ash tabular-nums">{count}</span>
</div>
```
- O accordion ainda existe (clique no setor abre/fecha), mas o trigger é a regra inteira.
- Setores vazios: contagem some, só mostra rótulo discreto em ash.
- Botão "Adicionar em SETOR": link inline com `+` circular, em cobalto uppercase tracking — ver mockup.

### J. `src/app/(app)/plantoes/[id]/page.tsx` — header da página
Trocar o título atual por: numeral display + dia da semana italic + barra de stats 4 colunas (mapa / TCLE / ADM / altas). Reaproveita o padrão do card mas em escala maior.

### K. `src/app/(app)/pacientes/[id]/page.tsx`
- Título do paciente em Fraunces medium 28px com quebra natural em 2 linhas (ver mockup).
- Subtítulo: "Leito 03 · UTI 2" em mono uppercase tracking + cobalto.
- Tabs: trocar o `bg-muted` por sublinhado inferior estilo magazine (ver `.tab` no mockup CSS).
- Estado "salvo · 23h49" no header em vez de dentro do form.

### L. `src/components/paciente/PacienteResumoForm.tsx`
- Inputs com fundo `bg-paper-deep/60`, borda `hairline`, foco `border-cobalt`. Remove o look shadcn padrão.
- Labels em `text-[10px] uppercase tracking-[0.2em] text-ash`.
- Layout em grade 2-col onde fizer sentido (Situação/TCLE lado a lado).

### M. `src/components/paciente/TimelineEvolucao.tsx`
- Trocar lista por timeline vertical com filete `hairline` e nós (círculos) — ver mockup 03.
- Evento mais recente: nó preenchido em cobalto, borda paper, sombra discreta.
- Eventos passados: nó vazio com borda hairline.

### N. `src/app/(auth)/login/page.tsx`
- Logo LANC permanece — único lugar onde ele aparece grande.
- Adicionar uma "marca d'água" tipográfica abaixo: "LANC. — Coleta TCE · HGE" em Fraunces italic 14px.

---

## 4. O que NÃO mudar agora (escopo dessa rodada)

- Lógica de server actions e queries (estão estáveis).
- Schema do banco.
- Service worker / PWA (cuidamos depois).
- Anexos uploader / galeria — refinamento visual cabe num passo seguinte (mesmo padrão de filetes editoriais).

---

## 5. Ordem sugerida de aplicação

1. **Foundation** — `tailwind.config.ts`, `globals.css`, `layout.tsx` (fontes).
2. **Shell** — `AppHeader`, `BottomNav`.
3. **Cards** — `PlantaoCard`, `PacienteCard`, `PacienteBadges`.
4. **Layout do mapa** — `MapaPlantao` (regras editoriais).
5. **Detalhe do paciente** — `page.tsx` header + tabs + form.
6. **Timeline** — `TimelineEvolucao`.
7. Smoke visual: rodar `pnpm dev`, abrir Chrome DevTools mobile (iPhone 14 Pro), comparar com mockups.

---

## 6. Riscos & ressalvas

- **Fraunces (variable + opsz)** pesa ~80kb extra — aceitável para PWA mas observar Lighthouse.
- **Paper warm bg** vs. fotos de exames com fundo branco: contraste preservado, mas validar com a galeria de anexos em mãos.
- **Pills sem fundo cinza forte** podem ser sutis demais sob luz solar — opção de aumentar `bg/15` se feedback do plantão pedir.
- **Sublinhado nas tabs** depende do `border-b` no container; cuidar do espaçamento em mobile estreito.

---

Quando você aprovar, eu aplico item por item, rodando type-check entre etapas. Sugiro começar pelos 4 primeiros (foundation + shell + cards) — é o impacto visual mais forte com o menor risco.
