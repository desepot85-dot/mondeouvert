import { useEffect } from 'react';
import { Lock, CheckCircle2 } from 'lucide-react';
import { CAMPAIGN_MISSIONS } from '../game/missions';
import { computeRankFromXp } from '../game/engineLogic';
import type { PlayerProgress } from '../game/types';
import {
  DiamondDivider,
  MoroccanHeaderCrest,
  XpOctagonBadge,
} from './MoroccanOrnament';

interface MissionsScreenProps {
  progress: PlayerProgress;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  onLaunchMission: (idx: number) => void;
  onBack: () => void;
  onOpenMap: () => void;
}

export function MissionsScreen({
  progress,
  selectedIndex,
  onSelectIndex,
  onLaunchMission,
  onBack,
  onOpenMap,
}: MissionsScreenProps) {
  const rank = computeRankFromXp(progress.xp);
  const selectedMission = CAMPAIGN_MISSIONS[selectedIndex] || CAMPAIGN_MISSIONS[0];
  const isLocked = selectedIndex > progress.unlockedMissionIndex;
  const isCompleted = progress.completedMissionIds.includes(selectedMission.id);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      } else if (e.key === 'Enter' && !isLocked) {
        e.preventDefault();
        onLaunchMission(selectedIndex);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onSelectIndex(Math.min(CAMPAIGN_MISSIONS.length - 1, selectedIndex + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onSelectIndex(Math.max(0, selectedIndex - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedIndex, isLocked, onBack, onLaunchMission, onSelectIndex]);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 pointer-events-none">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'rgba(7, 13, 25, 0.56)' }}
      />

      {/* TOP BAR */}
      <div className="relative z-10 flex items-start justify-between w-full">
        <div className="hidden lg:block w-56" />
        <div className="mx-auto">
          <MoroccanHeaderCrest
            title="MISSIONS — CAMPAGNE"
            subtitle={`${selectedMission.number} / 20`}
            showCrescent
          />
        </div>
        <div className="hidden sm:flex items-center gap-3 text-right hud-text-shadow">
          <div>
            <div className="text-sm text-[#f4e5c3] tabular-nums">
              RANG {rank.level} : {rank.title} |{' '}
              <span className="text-[#f3cf80] font-semibold">{progress.xp} XP</span>
            </div>
            <div className="text-sm text-[#dfd0ae] tabular-nums">{progress.dinars} Dinars</div>
          </div>
          <XpOctagonBadge label="XP" />
        </div>
      </div>

      {/* MAIN SPLIT: Left Mission List + Right Detailed Mission Card (matching Image 3) */}
      <div className="relative z-10 my-auto flex flex-col lg:flex-row items-center lg:items-stretch justify-between gap-6 max-w-6xl w-full mx-auto">
        {/* Left Mission List */}
        <div className="w-full lg:w-[390px] flex flex-col gap-2.5 justify-center pointer-events-auto">
          {CAMPAIGN_MISSIONS.map((mission, idx) => {
            const locked = idx > progress.unlockedMissionIndex;
            const active = idx === selectedIndex;
            const done = progress.completedMissionIds.includes(mission.id);

            return (
              <button
                key={mission.id}
                type="button"
                onClick={() => onSelectIndex(idx)}
                className={`w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-[4px] text-left transition-colors cursor-pointer ${
                  active
                    ? 'moroccan-btn-active text-[#fbf0d4]'
                    : locked
                      ? 'moroccan-btn-idle text-[#b4a992]/75'
                      : 'moroccan-btn-idle text-[#e6d6b5]'
                }`}
              >
                <span className="font-serif-morocco text-lg sm:text-[19px] font-medium tracking-wide">
                  {mission.number} — {mission.title}
                </span>

                {active && !locked ? (
                  <span className="px-2.5 py-0.5 rounded-[3px] bg-[#edd69f] text-[#17231e] font-display text-[11px] font-bold tracking-wider">
                    ACTIVE
                  </span>
                ) : done ? (
                  <CheckCircle2 className="w-4 h-4 text-[#5eead4] shrink-0" aria-label="Terminée" />
                ) : locked ? (
                  <Lock className="w-4 h-4 text-[#c8b282]/70 shrink-0" aria-label="Verrouillée" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Right Briefing Card */}
        <aside className="w-full lg:w-[420px] moroccan-card rounded-[6px] p-5 pointer-events-auto flex flex-col">
          <div className="relative w-full aspect-[16/9] rounded-[4px] overflow-hidden border border-[#d6b572]/45 mb-4 bg-[#0d1729]">
            <img
              src={selectedMission.previewImage}
              alt={selectedMission.title}
              className="w-full h-full object-cover"
            />
            {isCompleted && (
              <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-[3px] bg-[#134e3e]/95 border border-[#7ce2be]/60 text-[11px] font-display tracking-wider text-[#d9fff1]">
                ACCOMPLIE
              </div>
            )}
          </div>

          <h2 className="font-display text-lg sm:text-xl tracking-[0.08em] text-[#f2d694]">
            MISSION {selectedMission.number} : {selectedMission.title.toUpperCase()}
          </h2>
          <p className="text-xs sm:text-sm text-[#d4c4a2] mt-0.5">{selectedMission.location}</p>

          <DiamondDivider />

          <div className="space-y-2">
            <h3 className="font-display text-xs tracking-[0.16em] text-[#e8cf97]">OBJECTIFS</h3>
            <ul className="space-y-1.5">
              {selectedMission.objectives.map((obj) => {
                const objDone = progress.completedObjectiveIds.includes(obj.id);
                return (
                  <li
                    key={obj.id}
                    className={`flex items-start gap-2.5 text-sm ${
                      objDone ? 'text-[#8ce0c5] line-through opacity-80' : 'text-[#f0e4ca]'
                    }`}
                  >
                    <span className="text-[#e3bc6b] mt-0.5 text-xs">❖</span>
                    <span>{obj.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <DiamondDivider />

          <div className="space-y-1.5 mb-5">
            <h3 className="font-display text-xs tracking-[0.16em] text-[#e8cf97]">RÉCOMPENSES</h3>
            <p className="text-sm text-[#f2e4c7] tabular-nums">
              <span className="text-[#f1c86b] font-semibold">XP {selectedMission.rewardXp} XP</span>{' '}
              <span className="text-[#d6b572] mx-1">❖</span>
              <span>{selectedMission.rewardDinars} Dinars</span>
              <span className="mx-1.5 text-[#a99469]">•</span>
              <span className="text-[#e6d5b2]">{selectedMission.rewardItem}</span>
            </p>
          </div>

          <button
            type="button"
            disabled={isLocked}
            onClick={(e) => {
              e.currentTarget.blur();
              onLaunchMission(selectedIndex);
            }}
            className={`mt-auto w-full py-3 rounded-[4px] font-display text-sm tracking-[0.14em] transition-colors ${
              isLocked
                ? 'bg-[#1a2230] border border-[#6e6451]/40 text-[#9c917d] cursor-not-allowed'
                : 'moroccan-btn-active text-[#fcf2d6] cursor-pointer hover:brightness-110'
            }`}
          >
            {isLocked ? 'MISSION VERROUILLÉE' : 'LANCER LA MISSION'}
          </button>
        </aside>
      </div>

      {/* BOTTOM BAR */}
      <div className="relative z-10 flex flex-wrap items-center gap-5 text-xs sm:text-[13px] text-[#e7dac0]/90 hud-text-shadow pointer-events-auto">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 hover:text-[#f6da9b] cursor-pointer"
        >
          <kbd className="keycap-badge px-1.5 py-0.5 rounded-[3px] text-[11px] font-semibold text-[#f5dba1]">
            Échap
          </kbd>
          <span>Retour</span>
        </button>

        {!isLocked && (
          <button
            type="button"
            onClick={() => onLaunchMission(selectedIndex)}
            className="inline-flex items-center gap-1.5 hover:text-[#f6da9b] cursor-pointer"
          >
            <kbd className="keycap-badge px-1.5 py-0.5 rounded-[3px] text-[11px] font-semibold text-[#f5dba1]">
              Entrée
            </kbd>
            <span>Lancer</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenMap}
          className="inline-flex items-center gap-1.5 hover:text-[#f6da9b] cursor-pointer"
        >
          <kbd className="keycap-badge px-1.5 py-0.5 rounded-[3px] text-[11px] font-semibold text-[#f5dba1]">
            M
          </kbd>
          <span>: Carte du Monde</span>
        </button>
      </div>
    </div>
  );
}
