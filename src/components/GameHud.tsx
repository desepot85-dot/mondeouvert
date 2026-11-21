import {
  Crosshair,
  Eye,
  Layers,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { computeRankFromXp, formatDistanceFrench } from '../game/engineLogic';
import type {
  CampaignMission,
  GameSettings,
  HudTelemetry,
  MissionObjective,
  PlayMode,
  PlayerProgress,
  RenderSourceMode,
} from '../game/types';
import { DinarCoinIcon, FilDorSparkleDivider } from './MoroccanOrnament';

interface GameHudProps {
  playMode: PlayMode;
  mission: CampaignMission;
  activeObjective: MissionObjective | null;
  progress: PlayerProgress;
  telemetry: HudTelemetry;
  settings: GameSettings;
  showFilDor: boolean;
  cinematicMode: boolean;
  renderSourceMode: RenderSourceMode;
  toastMessage: string | null;
  onTogglePointerLock: () => void;
  onToggleRenderSource: () => void;
  onToggleFilDor: () => void;
  onToggleCinematic: () => void;
  onOpenMap: () => void;
  onToggleAudio: () => void;
  onPause: () => void;
  onInteract: () => void;
}

export function GameHud({
  playMode,
  mission,
  activeObjective,
  progress,
  telemetry,
  settings,
  showFilDor,
  cinematicMode,
  renderSourceMode,
  toastMessage,
  onTogglePointerLock,
  onToggleRenderSource,
  onToggleFilDor,
  onToggleCinematic,
  onOpenMap,
  onToggleAudio,
  onPause,
  onInteract,
}: GameHudProps) {
  const rank = computeRankFromXp(progress.xp);
  const completedCount = mission.objectives.filter((o) =>
    progress.completedObjectiveIds.includes(o.id)
  ).length;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6">
      {/* TOP PERIMETER CLUSTER: Left Mission/Title + Right Rank/FPS/Camera Controls */}
      <div className="flex items-start justify-between gap-4 w-full">
        {/* TOP-LEFT: App Title + Active Mission & Objective (Image 4 layout) */}
        <div className="max-w-md space-y-1.5 hud-text-shadow">
          <div className="font-display text-[11px] sm:text-xs tracking-[0.18em] text-[#d9bc7d]/90 uppercase">
            Nour Al-Maghrib — Al-Qarawiyyin
          </div>

          {settings.showHud && playMode === 'campaign' ? (
            <div className="space-y-1">
              <div className="font-display text-sm sm:text-base font-semibold tracking-[0.06em] text-[#f5de9f]">
                MISSION {mission.number} : {mission.title}
              </div>

              {activeObjective ? (
                <div className="flex items-start gap-2 text-xs sm:text-sm text-[#f7ebd2]">
                  <span className="text-[#e8c374] mt-0.5">◇</span>
                  <span>
                    {activeObjective.label}{' '}
                    {telemetry.distanceToObjectiveMeters !== null && (
                      <span className="text-[#d6c297] tabular-nums">
                        ({formatDistanceFrench(telemetry.distanceToObjectiveMeters)})
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-[#7ce2be]">
                  ◇ Tous les objectifs sont accomplis
                </div>
              )}

              <FilDorSparkleDivider active={showFilDor} />

              <div className="flex items-center gap-2 pt-0.5 pointer-events-auto">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleFilDor();
                  }}
                  className="inline-flex items-center gap-2 text-xs text-[#e9dcc0] hover:text-[#f8df9f] cursor-pointer"
                >
                  <kbd className="keycap-badge px-1.5 py-0.5 rounded-[3px] text-[10px] font-semibold text-[#f5dba1]">
                    H
                  </kbd>
                  <span>{showFilDor ? "Masquer le Fil d'Or" : 'Obtenir un indice'}</span>
                </button>
              </div>

              {showFilDor && activeObjective && (
                <p className="mt-1.5 max-w-sm px-3 py-2 rounded-[4px] bg-[#0c1626]/90 border border-[#d6b572]/45 text-xs text-[#f0e2c3] leading-relaxed">
                  {activeObjective.hint}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="font-display text-sm sm:text-base font-semibold tracking-[0.06em] text-[#f5de9f]">
                EXPLORATION LIBRE — FÈS DE NUIT
              </div>
              <p className="text-xs text-[#dfd1b4]">
                ZQSD / WASD / Flèches pour marcher · Souris pour regarder à 360°
              </p>
            </div>
          )}
        </div>

        {/* TOP-RIGHT: Rank, XP, Dinars, FPS, Engine Switcher & Camera Lock Button */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {settings.showHud && (
            <div className="flex flex-col items-end hud-text-shadow">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-[#f4e5c3] tabular-nums">
                <span>
                  RANG {rank.level} : {rank.title} |{' '}
                  <span className="text-[#f3cf80] font-semibold">{progress.xp} XP</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#f3cf80] font-medium">
                  <DinarCoinIcon className="w-3.5 h-3.5" />
                  <span>{progress.dinars} Dinars</span>
                </span>
              </div>
              {/* Slim gold progress bar matching Image 2 & 4 */}
              <div className="mt-1 w-48 sm:w-56 h-[3px] rounded-full bg-[#243044] overflow-hidden">
                <div
                  className="h-full bg-[#e6c273] transition-all duration-300"
                  style={{ width: `${Math.round(rank.progressRatio * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Compact non-overlapping HUD action bar: FPS + Engine Source + PointerLock + Audio + Pause */}
          <div className="flex flex-wrap items-center justify-end gap-2 pointer-events-auto">
            {settings.showFps && (
              <div
                data-testid="fps-counter"
                className="px-2.5 py-1.5 rounded-[4px] bg-[#0b1525]/90 border border-[#c9a864]/45 text-xs font-mono text-[#f5dba1] tabular-nums"
              >
                {telemetry.fps} FPS
              </div>
            )}

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleRenderSource();
              }}
              title={telemetry.splatInfo}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[#0b1525]/90 border border-[#c9a864]/45 hover:border-[#ebd093] text-[11px] font-display tracking-wider text-[#e9d7b1] cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#e6c273]" />
              <span>
                {renderSourceMode === 'atlas-splat'
                  ? 'ATLAS SPZ'
                  : `MARBLE 3D (${completedCount}/${mission.objectives.length})`}
              </span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="camera-lock-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onTogglePointerLock();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium tracking-wide cursor-pointer transition-colors ${
                telemetry.pointerLocked
                  ? 'moroccan-btn-active text-[#fcf2d6]'
                  : 'bg-[#0b1525]/90 border border-[#c9a864]/55 text-[#f2e2bf] hover:border-[#f0d18c]'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 text-[#e9c473]" />
              <span>{telemetry.pointerLocked ? 'Quitter Caméra' : 'Activer Caméra'}</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={settings.audioEnabled ? 'Couper le son' : 'Activer le son'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleAudio();
              }}
              className="p-1.5 rounded-[4px] bg-[#0b1525]/90 border border-[#c9a864]/45 text-[#e9d7b1] hover:border-[#f0d18c] cursor-pointer"
            >
              {settings.audioEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#9e9483]" />
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className="p-1.5 rounded-[4px] bg-[#0b1525]/90 border border-[#c9a864]/45 text-[#e9d7b1] hover:border-[#f0d18c] cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CENTER RETICLE (when PointerLock is active) & CONTEXTUAL INTERACT PROMPT */}
      {telemetry.pointerLocked && (
        <div
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#f8e1a6]/85 shadow-[0_0_6px_rgba(0,0,0,0.9)]" />
        </div>
      )}

      {/* Subtle objective feedback toast */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-[4px] moroccan-btn-active text-xs sm:text-sm font-display tracking-wider text-[#fdf3d7]">
          {toastMessage}
        </div>
      )}

      {/* BOTTOM ROW: Contextual [E] Prompt (center) & Flat Controls Hint (bottom-right, Image 4) */}
      <div className="flex flex-col items-center gap-3 w-full">
        {telemetry.nearbyInteractable && playMode === 'campaign' && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onInteract();
            }}
            className="pointer-events-auto inline-flex items-center gap-2.5 px-4 py-2 rounded-[4px] bg-[#0b1422]/92 border border-[#d6b572]/65 text-sm text-[#f8ecd2] shadow-[0_8px_24px_rgba(0,0,0,0.6)] hover:border-[#f5da98] cursor-pointer"
          >
            <kbd className="keycap-badge px-1.5 py-0.5 rounded-[3px] text-xs font-bold text-[#f7dca1]">
              E
            </kbd>
            <span>{telemetry.nearbyInteractable.promptLabel}</span>
          </button>
        )}

        <div className="w-full flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-[#dfd3b8]/90 hud-text-shadow">
          <div className="inline-flex items-center gap-2 text-[#cbb992] tabular-nums">
            <Eye className="w-3.5 h-3.5 text-[#d9b66c]" />
            <span>
              Hauteur : {telemetry.playerY.toFixed(2)} m
              {cinematicMode ? ' · Mode Cinématique' : ''}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              onClick={onInteract}
              className="hover:text-[#f7dc9e] cursor-pointer"
            >
              [E] Interagir
            </button>
            <span className="text-[#9f8d68]">|</span>
            <button
              type="button"
              tabIndex={-1}
              onClick={onOpenMap}
              className="hover:text-[#f7dc9e] cursor-pointer"
            >
              [M] Carte
            </button>
            <span className="text-[#9f8d68]">|</span>
            <button
              type="button"
              tabIndex={-1}
              onClick={onToggleFilDor}
              className="hover:text-[#f7dc9e] cursor-pointer"
            >
              [H] Fil d&apos;Or
            </button>
            <span className="text-[#9f8d68]">|</span>
            <button
              type="button"
              tabIndex={-1}
              onClick={onToggleCinematic}
              className={`hover:text-[#f7dc9e] cursor-pointer ${
                cinematicMode ? 'text-[#7ce2be] font-semibold' : ''
              }`}
            >
              [3] Cinématique
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
