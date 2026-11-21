import { useEffect, useState } from 'react';
import type { PlayerProgress } from '../game/types';
import { MoroccanHeaderCrest, XpOctagonBadge } from './MoroccanOrnament';

interface TitleScreenProps {
  progress: PlayerProgress;
  splatStatus: 'checking' | 'loaded' | 'fallback';
  onPlay: () => void;
  onOpenMissions: () => void;
  onFreeExplore: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
}

export function TitleScreen({
  progress,
  splatStatus,
  onPlay,
  onOpenMissions,
  onFreeExplore,
  onOpenSettings,
  onOpenCredits,
}: TitleScreenProps) {
  const [focusedIdx, setFocusedIdx] = useState(0);

  const items = [
    { id: 'play', label: 'JOUER', action: onPlay, isPrimaryStart: true },
    { id: 'missions', label: 'MISSIONS', action: onOpenMissions, isPrimaryStart: false },
    { id: 'explore', label: 'EXPLORATION LIBRE', action: onFreeExplore, isPrimaryStart: false },
    { id: 'settings', label: 'PARAMÈTRES', action: onOpenSettings, isPrimaryStart: false },
    { id: 'credits', label: 'CRÉDITS', action: onOpenCredits, isPrimaryStart: false },
  ];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx((prev) => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx((prev) => (prev - 1 + items.length) % items.length);
      } else if (e.key === 'Enter' || e.code === 'Space') {
        // Primary Start handshake on Enter/Space
        if (focusedIdx === 0 || e.code === 'Space') {
          e.preventDefault();
          onPlay();
        } else {
          e.preventDefault();
          items[focusedIdx].action();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedIdx, onPlay]);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 pointer-events-none">
      {/* Subtle top-and-bottom atmospheric vignette for crisp typography legibility */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 62% 52%, rgba(7,13,25,0.06) 0%, rgba(7,13,25,0.52) 100%)',
        }}
      />

      {/* TOP BAR: Centered Moroccan Crest + Top-Right Progressive Evaluation */}
      <div className="relative z-10 flex items-start justify-between w-full">
        <div className="hidden lg:block w-52" />

        <div className="mx-auto pt-1">
          <MoroccanHeaderCrest title="NOUR AL-MAGHRIB" showCrescent />
        </div>

        {/* Top-Right XP & Dinars Readout (matching Image 1) */}
        <div className="hidden sm:flex items-center gap-3.5 text-right hud-text-shadow">
          <div>
            <div className="font-display text-[11px] tracking-[0.16em] text-[#ecd8af]">
              ÉVALUATION PROGRESSIVE
            </div>
            <div className="text-sm text-[#f7ebd2] tabular-nums">
              XP : <span className="font-semibold text-[#f3cf80]">{progress.xp}</span>
            </div>
            <div className="text-sm text-[#e6d5b2] tabular-nums">
              Dinars : <span className="font-semibold text-[#f3cf80]">{progress.dinars}</span>
            </div>
          </div>
          <XpOctagonBadge label="XP" />
        </div>
      </div>

      {/* MID-LEFT MENU STACK (matching Image 1 left-third emerald-gold buttons) */}
      <nav
        aria-label="Menu principal"
        className="relative z-10 my-auto w-full max-w-[330px] flex flex-col gap-2.5 pointer-events-auto"
      >
        {items.map((item, idx) => {
          const isActive = focusedIdx === idx;
          return (
            <button
              key={item.id}
              type="button"
              data-start={item.isPrimaryStart ? 'true' : undefined}
              onMouseEnter={() => setFocusedIdx(idx)}
              onClick={(e) => {
                e.currentTarget.blur();
                item.action();
              }}
              className={`w-full text-left px-5 py-3.5 rounded-[4px] font-display text-base sm:text-[17px] tracking-[0.12em] transition-colors cursor-pointer ${
                isActive
                  ? 'moroccan-btn-active text-[#fbf0d4]'
                  : 'moroccan-btn-idle text-[#e5d4b1]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* BOTTOM BAR: Flat Key Hints (left) & Phase Subtitle (right) */}
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 text-xs sm:text-[13px] text-[#e8dcc2]/90 hud-text-shadow">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="keycap-badge px-1.5 py-0.5 rounded-[3px] text-[11px] font-semibold text-[#f5dba1]">
              ZQSD
            </kbd>
            <span>Déplacer</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="keycap-badge px-1.5 py-0.5 rounded-[3px] text-[11px] font-semibold text-[#f5dba1]">
              M
            </kbd>
            <span>: Carte du Monde</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="keycap-badge px-1.5 py-0.5 rounded-[3px] text-[11px] font-semibold text-[#f5dba1]">
              E
            </kbd>
            <span>: Interagir</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="keycap-badge px-1.5 py-0.5 rounded-[3px] text-[11px] font-semibold text-[#f5dba1]">
              H
            </kbd>
            <span>: Fil d&apos;Or</span>
          </span>
        </div>

        <div className="text-right font-display tracking-[0.12em] text-[11px] sm:text-xs text-[#dfd1b4]/90">
          <div>PHASE 1 — MONDE OUVERT DU MAROC (FÈS • AL-QARAWIYYIN)</div>
          <div className="text-[#c8b282]">
            {splatStatus === 'loaded'
              ? 'WORLD LABS ATLAS GAUSSIAN SPLAT (.SPZ) • SPARKJS'
              : 'THREE.JS + SPARKJS • WORLD LABS ATLAS 3D'}
          </div>
        </div>
      </div>
    </div>
  );
}
