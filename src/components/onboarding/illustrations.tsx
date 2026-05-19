/**
 * Ilustrações SVG inline pro tour. CSS-only, sem deps. Cada uma é uma cena
 * de ~280×180px otimizada pra modal mobile-first. Estética: paleta cobalt/
 * saffron/moss do app, traços finos (1.5px) — combina com a UI editorial.
 */

const COBALT = "#2563EB";
const COBALT_SOFT = "#5B8DEF";
const MOSS = "#5C8A5A";
const SAFFRON = "#D97706";
const VIOLET = "#7C3AED";
const INK = "#1A1A1A";
const ASH = "#9CA3AF";
const PAPER = "#FAF8F4";

export function IllusWelcome() {
  return (
    <svg viewBox="0 0 280 180" className="w-full h-full" fill="none">
      <defs>
        <radialGradient id="welcome-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={COBALT} stopOpacity="0.18" />
          <stop offset="100%" stopColor={COBALT} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="180" fill="url(#welcome-glow)" />
      {/* Pulso de fundo */}
      <circle cx="140" cy="90" r="60" stroke={COBALT_SOFT} strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
      <circle cx="140" cy="90" r="40" stroke={COBALT_SOFT} strokeWidth="1" opacity="0.5" />
      {/* Coração estilizado / cabeça */}
      <g transform="translate(140 90)">
        <circle cx="0" cy="-4" r="22" fill={PAPER} stroke={INK} strokeWidth="1.5" />
        <path d="M -10 -6 Q -6 -12 0 -10 Q 6 -12 10 -6" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <circle cx="-6" cy="-3" r="1.2" fill={INK} />
        <circle cx="6" cy="-3" r="1.2" fill={INK} />
        <path d="M -4 4 Q 0 7 4 4" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Sinal vital */}
        <path d="M -32 22 L -20 22 L -16 14 L -10 30 L -4 18 L 0 22 L 32 22" stroke={COBALT} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Confetti pontinhos */}
      <circle cx="60" cy="40" r="2" fill={SAFFRON} />
      <circle cx="220" cy="50" r="1.5" fill={MOSS} />
      <circle cx="50" cy="130" r="1.5" fill={VIOLET} />
      <circle cx="230" cy="130" r="2" fill={COBALT} />
    </svg>
  );
}

export function IllusPlantao() {
  return (
    <svg viewBox="0 0 280 180" className="w-full h-full" fill="none">
      {/* Linha do tempo de plantões — 4 cards encadeados */}
      <line x1="30" y1="90" x2="250" y2="90" stroke={ASH} strokeWidth="1" strokeDasharray="3 3" />
      {[40, 100, 160, 220].map((cx, i) => (
        <g key={i} transform={`translate(${cx} 90)`}>
          <rect x="-20" y="-26" width="40" height="52" rx="6" fill={PAPER} stroke={i === 1 ? COBALT : INK} strokeWidth={i === 1 ? 2 : 1.2} />
          {/* Header escuro */}
          <rect x="-20" y="-26" width="40" height="10" rx="6" fill={i === 1 ? COBALT : INK} />
          <rect x="-20" y="-22" width="40" height="6" fill={i === 1 ? COBALT : INK} />
          {/* Linhas internas (pacientes) */}
          <line x1="-14" y1="-10" x2="14" y2="-10" stroke={ASH} strokeWidth="1" />
          <line x1="-14" y1="-4" x2="10" y2="-4" stroke={ASH} strokeWidth="1" />
          <line x1="-14" y1="2" x2="14" y2="2" stroke={ASH} strokeWidth="1" />
          <line x1="-14" y1="8" x2="6" y2="8" stroke={ASH} strokeWidth="1" />
          <line x1="-14" y1="14" x2="12" y2="14" stroke={ASH} strokeWidth="1" />
          {/* Label data */}
          <text x="0" y="40" textAnchor="middle" fontSize="8" fill={ASH} fontFamily="ui-sans-serif">
            {["17 mai", "18 mai", "20 mai", "23 mai"][i]}
          </text>
        </g>
      ))}
      {/* Seta de clone */}
      <g transform="translate(70 75)">
        <path d="M 0 0 Q 15 -15 30 0" stroke={COBALT} strokeWidth="1.5" fill="none" markerEnd="url(#arr)" />
      </g>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COBALT} />
        </marker>
      </defs>
      <text x="85" y="60" fontSize="8" fill={COBALT} fontFamily="ui-sans-serif">clone</text>
    </svg>
  );
}

export function IllusPaciente() {
  return (
    <svg viewBox="0 0 280 180" className="w-full h-full" fill="none">
      {/* Card paciente com 3 abas */}
      <rect x="40" y="30" width="200" height="130" rx="12" fill={PAPER} stroke={INK} strokeWidth="1.5" />
      {/* Header com nome */}
      <text x="56" y="50" fontSize="10" fill={INK} fontFamily="ui-sans-serif" fontWeight="600">João S.</text>
      <text x="56" y="62" fontSize="7" fill={ASH} fontFamily="ui-sans-serif">UI 1 · Leito 03</text>
      <rect x="200" y="44" width="32" height="14" rx="7" fill={COBALT} opacity="0.15" stroke={COBALT} strokeWidth="0.8" />
      <text x="216" y="54" fontSize="7" textAnchor="middle" fill={COBALT} fontFamily="ui-sans-serif" fontWeight="600">ADM</text>
      {/* Tabs */}
      <line x1="40" y1="76" x2="240" y2="76" stroke={ASH} strokeWidth="0.5" />
      <g>
        <rect x="50" y="84" width="58" height="22" rx="4" fill={COBALT} opacity="0.12" stroke={COBALT} strokeWidth="1" />
        <text x="79" y="98" textAnchor="middle" fontSize="8" fill={COBALT} fontFamily="ui-sans-serif" fontWeight="600">Resumo</text>
        <rect x="114" y="84" width="58" height="22" rx="4" stroke={ASH} strokeWidth="1" />
        <text x="143" y="98" textAnchor="middle" fontSize="8" fill={INK} fontFamily="ui-sans-serif">REDCap</text>
        <rect x="178" y="84" width="50" height="22" rx="4" stroke={ASH} strokeWidth="1" />
        <text x="203" y="98" textAnchor="middle" fontSize="8" fill={INK} fontFamily="ui-sans-serif">Anexos</text>
      </g>
      {/* Conteúdo da aba ativa — campos */}
      <line x1="56" y1="120" x2="224" y2="120" stroke={ASH} strokeWidth="0.6" />
      <line x1="56" y1="132" x2="200" y2="132" stroke={ASH} strokeWidth="0.6" />
      <line x1="56" y1="144" x2="180" y2="144" stroke={ASH} strokeWidth="0.6" />
    </svg>
  );
}

export function IllusAnexos() {
  return (
    <svg viewBox="0 0 280 180" className="w-full h-full" fill="none">
      {/* Celular com câmera */}
      <g transform="translate(60 30)">
        <rect x="0" y="0" width="60" height="110" rx="8" fill={PAPER} stroke={INK} strokeWidth="1.5" />
        <rect x="6" y="14" width="48" height="80" rx="2" fill={INK} opacity="0.05" stroke={ASH} strokeWidth="0.6" />
        {/* Câmera no display */}
        <circle cx="30" cy="54" r="14" stroke={COBALT} strokeWidth="1.5" fill="none" />
        <circle cx="30" cy="54" r="8" stroke={COBALT} strokeWidth="1.5" fill="none" />
        {/* Speaker top */}
        <line x1="22" y1="8" x2="38" y2="8" stroke={ASH} strokeWidth="1.5" strokeLinecap="round" />
        {/* Botão capturar */}
        <circle cx="30" cy="102" r="4" stroke={INK} strokeWidth="1" fill="none" />
      </g>
      {/* Seta */}
      <g transform="translate(140 80)">
        <path d="M 0 0 L 30 0" stroke={COBALT} strokeWidth="1.5" markerEnd="url(#arr2)" />
      </g>
      <defs>
        <marker id="arr2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COBALT} />
        </marker>
      </defs>
      {/* Galeria de anexos */}
      <g transform="translate(180 35)">
        <rect x="0" y="0" width="34" height="34" rx="3" fill={SAFFRON} opacity="0.12" stroke={SAFFRON} strokeWidth="1" />
        <text x="17" y="20" textAnchor="middle" fontSize="7" fill={SAFFRON} fontFamily="ui-sans-serif" fontWeight="600">HGT</text>
        <rect x="40" y="0" width="34" height="34" rx="3" fill={COBALT} opacity="0.12" stroke={COBALT} strokeWidth="1" />
        <text x="57" y="20" textAnchor="middle" fontSize="7" fill={COBALT} fontFamily="ui-sans-serif" fontWeight="600">TC</text>
        <rect x="0" y="40" width="34" height="34" rx="3" fill={MOSS} opacity="0.12" stroke={MOSS} strokeWidth="1" />
        <text x="17" y="60" textAnchor="middle" fontSize="6" fill={MOSS} fontFamily="ui-sans-serif" fontWeight="600">TCLE</text>
        <rect x="40" y="40" width="34" height="34" rx="3" fill={VIOLET} opacity="0.12" stroke={VIOLET} strokeWidth="1" />
        <text x="57" y="60" textAnchor="middle" fontSize="6" fill={VIOLET} fontFamily="ui-sans-serif" fontWeight="600">EVO</text>
        <rect x="0" y="80" width="74" height="34" rx="3" stroke={ASH} strokeWidth="1" strokeDasharray="3 2" fill="none" />
        <text x="37" y="100" textAnchor="middle" fontSize="7" fill={ASH} fontFamily="ui-sans-serif">+ mais</text>
      </g>
    </svg>
  );
}

export function IllusGose() {
  return (
    <svg viewBox="0 0 280 180" className="w-full h-full" fill="none">
      {/* Calendário grande */}
      <g transform="translate(40 30)">
        <rect x="0" y="0" width="80" height="80" rx="6" fill={PAPER} stroke={INK} strokeWidth="1.5" />
        <rect x="0" y="0" width="80" height="14" rx="6" fill={COBALT} />
        <rect x="0" y="8" width="80" height="6" fill={COBALT} />
        <circle cx="14" cy="7" r="2" fill={PAPER} />
        <circle cx="66" cy="7" r="2" fill={PAPER} />
        <text x="40" y="44" textAnchor="middle" fontSize="18" fill={INK} fontFamily="ui-sans-serif" fontWeight="700">30</text>
        <text x="40" y="62" textAnchor="middle" fontSize="9" fill={ASH} fontFamily="ui-sans-serif">dias</text>
      </g>
      {/* + */}
      <text x="135" y="76" fontSize="22" fill={ASH} fontFamily="ui-sans-serif" fontWeight="300">+</text>
      {/* Calendário 90 */}
      <g transform="translate(150 35)">
        <rect x="0" y="0" width="50" height="50" rx="4" fill={PAPER} stroke={ASH} strokeWidth="1" />
        <rect x="0" y="0" width="50" height="8" rx="4" fill={COBALT_SOFT} />
        <text x="25" y="32" textAnchor="middle" fontSize="12" fill={INK} fontFamily="ui-sans-serif" fontWeight="700">90</text>
      </g>
      <g transform="translate(210 35)">
        <rect x="0" y="0" width="50" height="50" rx="4" fill={PAPER} stroke={ASH} strokeWidth="1" />
        <rect x="0" y="0" width="50" height="8" rx="4" fill={COBALT_SOFT} />
        <text x="25" y="32" textAnchor="middle" fontSize="11" fill={INK} fontFamily="ui-sans-serif" fontWeight="700">180</text>
      </g>
      {/* Telefone com badge */}
      <g transform="translate(150 110)">
        <rect x="0" y="0" width="110" height="46" rx="8" fill={SAFFRON} opacity="0.1" stroke={SAFFRON} strokeWidth="1.2" />
        <circle cx="18" cy="23" r="9" fill={SAFFRON} opacity="0.25" />
        <path d="M 13 19 L 16 16 L 20 20 L 18 22 L 21 25 L 23 23 L 27 27 L 24 30 Q 16 30 13 19" fill={SAFFRON} />
        <text x="36" y="20" fontSize="8" fill={INK} fontFamily="ui-sans-serif" fontWeight="600">Ligar p/ paciente</text>
        <text x="36" y="32" fontSize="7" fill={ASH} fontFamily="ui-sans-serif">aplicar escala GOS-E</text>
      </g>
    </svg>
  );
}

export function IllusOffline() {
  return (
    <svg viewBox="0 0 280 180" className="w-full h-full" fill="none">
      {/* Nuvem com ícone de sync */}
      <g transform="translate(140 90)">
        <circle cx="0" cy="0" r="50" stroke={COBALT_SOFT} strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
        <g>
          {/* Nuvem */}
          <path d="M -30 5 Q -34 -8 -22 -10 Q -22 -22 -6 -22 Q 4 -28 16 -20 Q 30 -22 30 -8 Q 36 -2 30 6 L -30 6 Z"
            fill={PAPER} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          {/* Setas circulando */}
          <path d="M -10 18 A 14 14 0 1 1 12 22" stroke={COBALT} strokeWidth="1.8" fill="none" />
          <path d="M 8 16 L 12 22 L 18 18" stroke={COBALT} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
      {/* Status badges em volta */}
      <g transform="translate(36 50)">
        <rect x="0" y="0" width="60" height="20" rx="10" fill={MOSS} opacity="0.15" stroke={MOSS} strokeWidth="0.8" />
        <circle cx="10" cy="10" r="3" fill={MOSS} />
        <text x="18" y="14" fontSize="8" fill={INK} fontFamily="ui-sans-serif" fontWeight="500">online</text>
      </g>
      <g transform="translate(190 50)">
        <rect x="0" y="0" width="70" height="20" rx="10" fill={SAFFRON} opacity="0.15" stroke={SAFFRON} strokeWidth="0.8" />
        <circle cx="10" cy="10" r="3" fill={SAFFRON} />
        <text x="18" y="14" fontSize="8" fill={INK} fontFamily="ui-sans-serif" fontWeight="500">3 pendentes</text>
      </g>
      <g transform="translate(46 140)">
        <rect x="0" y="0" width="50" height="20" rx="10" fill={ASH} opacity="0.15" stroke={ASH} strokeWidth="0.8" />
        <circle cx="10" cy="10" r="3" fill={ASH} />
        <text x="18" y="14" fontSize="8" fill={INK} fontFamily="ui-sans-serif" fontWeight="500">offline</text>
      </g>
      <g transform="translate(190 140)">
        <rect x="0" y="0" width="60" height="20" rx="10" fill={MOSS} opacity="0.15" stroke={MOSS} strokeWidth="0.8" />
        <path d="M 8 10 L 11 13 L 16 8" stroke={MOSS} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="22" y="14" fontSize="8" fill={INK} fontFamily="ui-sans-serif" fontWeight="500">sincronizado</text>
      </g>
    </svg>
  );
}

export function IllusReady() {
  return (
    <svg viewBox="0 0 280 180" className="w-full h-full" fill="none">
      <defs>
        <radialGradient id="ready-glow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={MOSS} stopOpacity="0.18" />
          <stop offset="100%" stopColor={MOSS} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="180" fill="url(#ready-glow)" />
      {/* Check grande */}
      <g transform="translate(140 90)">
        <circle cx="0" cy="0" r="44" fill={PAPER} stroke={MOSS} strokeWidth="2.5" />
        <path d="M -16 0 L -4 14 L 18 -10" stroke={MOSS} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Faíscas */}
      <g stroke={SAFFRON} strokeWidth="1.5" strokeLinecap="round">
        <line x1="60" y1="40" x2="68" y2="48" />
        <line x1="68" y1="40" x2="60" y2="48" />
        <line x1="64" y1="34" x2="64" y2="54" />
      </g>
      <g stroke={COBALT} strokeWidth="1.5" strokeLinecap="round">
        <line x1="220" y1="130" x2="228" y2="138" />
        <line x1="228" y1="130" x2="220" y2="138" />
      </g>
      <circle cx="40" cy="120" r="2" fill={VIOLET} />
      <circle cx="240" cy="50" r="2" fill={COBALT} />
      <circle cx="210" cy="160" r="1.5" fill={SAFFRON} />
    </svg>
  );
}
