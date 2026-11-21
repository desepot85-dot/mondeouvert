export function MoroccanHeaderCrest({
  title,
  subtitle,
  showCrescent = true,
}: {
  title: string;
  subtitle?: string;
  showCrescent?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center select-none pointer-events-none">
      {/* Geometric Arabesque Zellige Ornament behind title */}
      <svg
        viewBox="0 0 360 110"
        className="w-[260px] sm:w-[320px] h-auto -mb-14 opacity-50"
        aria-hidden="true"
      >
        <g stroke="#d5b36d" strokeWidth="1" fill="none">
          <path d="M180 4 L218 42 L180 80 L142 42 Z" opacity="0.7" />
          <path d="M180 14 L208 42 L180 70 L152 42 Z" opacity="0.9" />
          <circle cx="180" cy="42" r="24" opacity="0.55" />
          <circle cx="180" cy="42" r="14" opacity="0.8" />
          <path d="M90 6 L128 42 L90 78 L52 42 Z" opacity="0.35" />
          <path d="M270 6 L308 42 L270 78 L232 42 Z" opacity="0.35" />
          <line x1="20" y1="42" x2="132" y2="42" opacity="0.3" />
          <line x1="228" y1="42" x2="340" y2="42" opacity="0.3" />
          {/* 8-pointed Moroccan star center */}
          <polygon
            points="180,22 186,36 200,42 186,48 180,62 174,48 160,42 174,36"
            fill="rgba(213,179,109,0.18)"
            stroke="#e8c882"
          />
        </g>
      </svg>

      {/* Title Row with Crescent Moon on Left */}
      <div className="relative flex items-center gap-4">
        {showCrescent && (
          <svg
            viewBox="0 0 40 40"
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 drop-shadow-[0_0_12px_rgba(225,238,255,0.75)]"
            aria-hidden="true"
          >
            <path
              d="M25 6 A14 14 0 1 0 33 28 A11 11 0 1 1 25 6 Z"
              fill="#eef5ff"
            />
          </svg>
        )}

        <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-[0.11em] text-[#ecd299] title-gold-shadow text-center">
          {title}
        </h1>
      </div>

      {subtitle && (
        <p className="mt-1 font-display text-sm sm:text-base tracking-[0.22em] text-[#e7cf9c]/90 hud-text-shadow tabular-nums">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function XpOctagonBadge({ label = 'XP' }: { label?: string }) {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center shrink-0" aria-hidden="true">
      <svg viewBox="0 0 56 56" className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
        <polygon
          points="28,2 44,9 54,28 44,47 28,54 12,47 2,28 12,9"
          fill="#2f2414"
          stroke="#d9b466"
          strokeWidth="2.2"
        />
        <polygon
          points="28,7 41,13 49,28 41,43 28,49 15,43 7,28 15,13"
          fill="#4a371c"
          stroke="#f0d394"
          strokeWidth="1"
          opacity="0.85"
        />
      </svg>
      <span className="absolute font-display text-xs font-bold tracking-wider text-[#f7e2b2]">
        {label}
      </span>
    </div>
  );
}

export function DinarCoinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <ellipse cx="12" cy="7" rx="7" ry="3.2" fill="#e5be6d" stroke="#5c4116" strokeWidth="1.2" />
      <path
        d="M5 7v5c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2V7"
        fill="#c49543"
        stroke="#5c4116"
        strokeWidth="1.2"
      />
      <path
        d="M5 12v5c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2v-5"
        fill="#a87c32"
        stroke="#5c4116"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function FilDorSparkleDivider({ active = false }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 260 20"
      className={`w-56 sm:w-64 h-4 transition-opacity duration-300 ${
        active ? 'opacity-100' : 'opacity-75'
      }`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fildor-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fde6a4" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#e5b35c" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#e5b35c" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M4 11 Q 75 4, 150 12 T 255 9"
        stroke="url(#fildor-line)"
        strokeWidth={active ? '2.2' : '1.4'}
        fill="none"
      />
      <circle cx="14" cy="10" r="2.1" fill="#fff2c2" />
      <circle cx="48" cy="7" r="1.4" fill="#ffd97d" />
      <circle cx="86" cy="9" r="1.8" fill="#fff0b8" />
      <circle cx="128" cy="12" r="1.2" fill="#f3be61" />
      <circle cx="174" cy="11" r="1.5" fill="#ffd97d" opacity="0.7" />
      <circle cx="212" cy="8" r="1.1" fill="#f3be61" opacity="0.5" />
    </svg>
  );
}

export function DiamondDivider() {
  return (
    <div className="flex items-center gap-2 my-3" aria-hidden="true">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c7a055]/60 to-[#c7a055]/60" />
      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-[#e4be70]">
        <polygon points="6,1 11,6 6,11 1,6" fill="currentColor" />
      </svg>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#c7a055]/60 to-[#c7a055]/60" />
    </div>
  );
}
