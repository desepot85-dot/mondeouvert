import { X, Compass, Award, RotateCcw, Play, MapPin } from 'lucide-react';
import type {
  CampaignMission,
  GameSettings,
  HudTelemetry,
  MissionObjective,
  RenderSourceMode,
} from '../game/types';
import { DiamondDivider } from './MoroccanOrnament';

export function PauseModal({
  mission,
  onResume,
  onRestart,
  onOpenMissions,
  onOpenSettings,
  onReturnTitle,
}: {
  mission: CampaignMission;
  onResume: () => void;
  onRestart: () => void;
  onOpenMissions: () => void;
  onOpenSettings: () => void;
  onReturnTitle: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#060b14]/78">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu Pause"
        className="w-full max-w-md moroccan-card rounded-[6px] p-6 text-center"
      >
        <p className="font-display text-xs tracking-[0.22em] text-[#cbb27d]">PAUSE</p>
        <h2 className="mt-1 font-display text-2xl tracking-[0.1em] text-[#f3d796]">
          NOUR AL-MAGHRIB
        </h2>
        <p className="mt-1 text-xs text-[#d6c6a4]">
          Mission {mission.number} — {mission.title}
        </p>

        <DiamondDivider />

        <div className="flex flex-col gap-2.5 mt-4">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-[4px] moroccan-btn-active font-display text-sm tracking-[0.14em] text-[#fdf2d4] cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            <span>REPRENDRE</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 rounded-[4px] moroccan-btn-idle font-display text-sm tracking-[0.12em] text-[#e7d7b5] cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RECOMMENCER</span>
          </button>

          <button
            type="button"
            onClick={onOpenMissions}
            className="w-full py-2.5 rounded-[4px] moroccan-btn-idle font-display text-sm tracking-[0.12em] text-[#e7d7b5] cursor-pointer"
          >
            MISSIONS — CAMPAGNE
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2.5 rounded-[4px] moroccan-btn-idle font-display text-sm tracking-[0.12em] text-[#e7d7b5] cursor-pointer"
          >
            PARAMÈTRES
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 rounded-[4px] moroccan-btn-idle font-display text-sm tracking-[0.12em] text-[#cbb995] cursor-pointer"
          >
            MENU PRINCIPAL
          </button>
        </div>
      </div>
    </div>
  );
}

export function VictoryModal({
  mission,
  clearTimeSec,
  hasNextMission,
  onNextMission,
  onReplay,
  onReturnTitle,
}: {
  mission: CampaignMission;
  clearTimeSec: number;
  hasNextMission: boolean;
  onNextMission: () => void;
  onReplay: () => void;
  onReturnTitle: () => void;
}) {
  const mins = Math.floor(clearTimeSec / 60);
  const secs = Math.floor(clearTimeSec % 60);
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#060b14]/82">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mission Accomplie"
        className="w-full max-w-lg moroccan-card rounded-[6px] p-6 text-center"
      >
        <div className="mx-auto w-12 h-12 rounded-full bg-[#174d3d] border border-[#e3be70] flex items-center justify-center mb-3">
          <Award className="w-6 h-6 text-[#f5db9c]" />
        </div>
        <p className="font-display text-xs tracking-[0.22em] text-[#7ce2be]">MISSION ACCOMPLIE</p>
        <h2 className="mt-1 font-display text-2xl tracking-[0.08em] text-[#f3d796]">
          {mission.title.toUpperCase()}
        </h2>
        <p className="mt-1 text-xs text-[#d6c6a4]">{mission.location}</p>

        <DiamondDivider />

        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-3 rounded-[4px] bg-[#0e192a] border border-[#c9a864]/35">
            <div className="text-[10px] font-display tracking-widest text-[#bca982]">TEMPS</div>
            <div className="mt-1 text-lg font-semibold text-[#f6e4bc] tabular-nums">
              {formattedTime}
            </div>
          </div>
          <div className="p-3 rounded-[4px] bg-[#0e192a] border border-[#c9a864]/35">
            <div className="text-[10px] font-display tracking-widest text-[#bca982]">XP GAGNÉS</div>
            <div className="mt-1 text-lg font-semibold text-[#f3cf80] tabular-nums">
              +{mission.rewardXp}
            </div>
          </div>
          <div className="p-3 rounded-[4px] bg-[#0e192a] border border-[#c9a864]/35">
            <div className="text-[10px] font-display tracking-widest text-[#bca982]">DINARS</div>
            <div className="mt-1 text-lg font-semibold text-[#f3cf80] tabular-nums">
              +{mission.rewardDinars}
            </div>
          </div>
        </div>

        <p className="text-xs text-[#d8caa8] mb-5">
          Relique débloquée : <span className="text-[#f5db9c] font-semibold">{mission.rewardItem}</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          {hasNextMission && (
            <button
              type="button"
              data-start="true"
              onClick={onNextMission}
              className="flex-1 py-3 rounded-[4px] moroccan-btn-active font-display text-sm tracking-[0.12em] text-[#fdf2d4] cursor-pointer"
            >
              MISSION SUIVANTE
            </button>
          )}
          <button
            type="button"
            data-start={!hasNextMission ? 'true' : undefined}
            onClick={onReplay}
            className="flex-1 py-3 rounded-[4px] moroccan-btn-idle font-display text-sm tracking-[0.12em] text-[#e7d7b5] cursor-pointer"
          >
            REJOUER
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="px-4 py-3 rounded-[4px] moroccan-btn-idle font-display text-sm tracking-[0.12em] text-[#cbb995] cursor-pointer"
          >
            TITRE
          </button>
        </div>
      </div>
    </div>
  );
}

export function WorldMapModal({
  telemetry,
  activeObjective,
  onClose,
}: {
  telemetry: HudTelemetry;
  activeObjective: MissionObjective | null;
  onClose: () => void;
}) {
  // Convert world coordinates (x in [-16, 15], z in [-22, 16]) to SVG map [0..400, 0..320]
  const toMapX = (wx: number) => ((wx + 16) / 31) * 340 + 30;
  const toMapY = (wz: number) => ((wz + 22) / 38) * 260 + 30;

  const px = Math.min(370, Math.max(30, toMapX(telemetry.playerX)));
  const py = Math.min(290, Math.max(30, toMapY(telemetry.playerZ)));

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#060b14]/80">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Carte du Monde — Al-Qarawiyyin"
        className="w-full max-w-xl moroccan-card rounded-[6px] p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-[#e6c273]" />
            <div>
              <h2 className="font-display text-lg tracking-[0.12em] text-[#f3d796]">
                CARTE DE LA COUR — AL-QARAWIYYIN
              </h2>
              <p className="text-xs text-[#c9b997]">Fès El-Bali • Maroc</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fermer la carte"
            onClick={onClose}
            className="p-1.5 rounded-[4px] moroccan-btn-idle text-[#e9d7b1] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <DiamondDivider />

        <div className="rounded-[4px] bg-[#0a1322] border border-[#c9a864]/45 p-3">
          <svg viewBox="0 0 400 320" className="w-full h-auto">
            {/* Courtyard zellige boundary */}
            <rect
              x="36"
              y="34"
              width="328"
              height="252"
              rx="4"
              fill="#111f36"
              stroke="#c9a864"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
            {/* Minaret north */}
            <rect x="172" y="20" width="44" height="32" fill="#9a723d" stroke="#f0d18c" strokeWidth="1.4" />
            <text x="194" y="40" textAnchor="middle" fill="#fff1cc" fontSize="9" fontFamily="Cinzel">
              MINARET
            </text>

            {/* Left Reflecting Pool */}
            <rect
              x="74"
              y="108"
              width="98"
              height="130"
              fill="#0a203e"
              stroke="#7ca6d8"
              strokeWidth="1.2"
            />
            <text x="123" y="176" textAnchor="middle" fill="#a8c9ef" fontSize="9">
              BASSIN
            </text>

            {/* Central Octagonal Marble Fountain */}
            <circle cx="240" cy="180" r="22" fill="#264059" stroke="#f0d18c" strokeWidth="1.4" />
            <text x="240" y="183" textAnchor="middle" fill="#f7e3b3" fontSize="8">
              FONTAINE
            </text>

            {/* Right Moorish Arches & Prayer Hall */}
            <rect
              x="312"
              y="66"
              width="48"
              height="200"
              fill="#184a3b"
              stroke="#7ce2be"
              strokeWidth="1.2"
              strokeOpacity="0.7"
            />
            <text
              x="336"
              y="166"
              textAnchor="middle"
              fill="#d5f7ea"
              fontSize="9"
              transform="rotate(-90 336 166)"
            >
              SALLE DE PRIÈRE
            </text>

            {/* Active Objective Marker */}
            {activeObjective && (
              <g>
                <circle
                  cx={toMapX(activeObjective.targetPos.x)}
                  cy={toMapY(activeObjective.targetPos.z)}
                  r="9"
                  fill="rgba(243,207,128,0.22)"
                  stroke="#f3cf80"
                  strokeWidth="1.5"
                />
                <polygon
                  points={`${toMapX(activeObjective.targetPos.x)},${toMapY(activeObjective.targetPos.z) - 5} ${toMapX(activeObjective.targetPos.x) + 5},${toMapY(activeObjective.targetPos.z)} ${toMapX(activeObjective.targetPos.x)},${toMapY(activeObjective.targetPos.z) + 5} ${toMapX(activeObjective.targetPos.x) - 5},${toMapY(activeObjective.targetPos.z)}`}
                  fill="#fde39b"
                />
              </g>
            )}

            {/* Player Position */}
            <g transform={`translate(${px}, ${py})`}>
              <circle r="6" fill="#34d399" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          </svg>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#d6c6a4]">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34d399] inline-block" />
              Votre position
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#f3cf80]" />
              Objectif actif
            </span>
          </div>
          <span className="tabular-nums text-[#bca982]">
            X: {telemetry.playerX.toFixed(1)} · Y: {telemetry.playerY.toFixed(2)}m · Z:{' '}
            {telemetry.playerZ.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SettingsModal({
  settings,
  renderSourceMode,
  splatAvailable,
  splatInfo,
  onChangeSettings,
  onChangeRenderSource,
  onClose,
}: {
  settings: GameSettings;
  renderSourceMode: RenderSourceMode;
  splatAvailable: boolean;
  splatInfo: string;
  onChangeSettings: (next: GameSettings) => void;
  onChangeRenderSource: (mode: RenderSourceMode) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#060b14]/80">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paramètres"
        className="w-full max-w-md moroccan-card rounded-[6px] p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl tracking-[0.12em] text-[#f3d796]">PARAMÈTRES</h2>
          <button
            type="button"
            aria-label="Fermer les paramètres"
            onClick={onClose}
            className="p-1.5 rounded-[4px] moroccan-btn-idle text-[#e9d7b1] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <DiamondDivider />

        <div className="space-y-4 text-sm text-[#e8dcc2]">
          <div>
            <div className="flex justify-between mb-1.5">
              <label htmlFor="sens-slider">Sensibilité Caméra</label>
              <span className="tabular-nums text-[#f3cf80]">
                {settings.mouseSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              id="sens-slider"
              type="range"
              min="0.4"
              max="2.2"
              step="0.1"
              value={settings.mouseSensitivity}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  mouseSensitivity: Number(e.target.value),
                })
              }
              className="w-full accent-[#d6b572]"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <span>Ambiance sonore (Fontaine &amp; Oud)</span>
            <button
              type="button"
              onClick={() =>
                onChangeSettings({ ...settings, audioEnabled: !settings.audioEnabled })
              }
              className={`px-3 py-1 rounded-[4px] text-xs font-display tracking-wider cursor-pointer ${
                settings.audioEnabled ? 'moroccan-btn-active text-[#fdf2d4]' : 'moroccan-btn-idle text-[#b4a992]'
              }`}
            >
              {settings.audioEnabled ? 'ACTIVÉ' : 'MUET'}
            </button>
          </div>

          <div className="flex items-center justify-between py-1">
            <span>Compteur FPS en jeu</span>
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, showFps: !settings.showFps })}
              className={`px-3 py-1 rounded-[4px] text-xs font-display tracking-wider cursor-pointer ${
                settings.showFps ? 'moroccan-btn-active text-[#fdf2d4]' : 'moroccan-btn-idle text-[#b4a992]'
              }`}
            >
              {settings.showFps ? 'VISIBLE' : 'MASQUÉ'}
            </button>
          </div>

          <div className="pt-2 border-t border-[#c9a864]/25">
            <div className="text-xs font-display tracking-wider text-[#e5c782] mb-2">
              MOTEUR DE RENDU 3D
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!splatAvailable}
                onClick={() => onChangeRenderSource('atlas-splat')}
                className={`py-2 px-2.5 rounded-[4px] text-xs font-display tracking-wider ${
                  renderSourceMode === 'atlas-splat'
                    ? 'moroccan-btn-active text-[#fdf2d4] cursor-pointer'
                    : splatAvailable
                      ? 'moroccan-btn-idle text-[#e5d4b1] cursor-pointer'
                      : 'bg-[#141c28] text-[#7c7567] border border-[#4a4439]/30 cursor-not-allowed'
                }`}
              >
                ATLAS SPZ (SPARK)
              </button>
              <button
                type="button"
                onClick={() => onChangeRenderSource('courtyard-3d')}
                className={`py-2 px-2.5 rounded-[4px] text-xs font-display tracking-wider cursor-pointer ${
                  renderSourceMode === 'courtyard-3d'
                    ? 'moroccan-btn-active text-[#fdf2d4]'
                    : 'moroccan-btn-idle text-[#e5d4b1]'
                }`}
              >
                COUR 3D HYBRIDE
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[#b9aa8c]">{splatInfo}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-[4px] moroccan-btn-active font-display text-sm tracking-[0.14em] text-[#fdf2d4] cursor-pointer"
        >
          VALIDER
        </button>
      </div>
    </div>
  );
}

export function CreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#060b14]/80">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crédits"
        className="w-full max-w-md moroccan-card rounded-[6px] p-6 text-center"
      >
        <p className="font-display text-xs tracking-[0.22em] text-[#cbb27d]">CRÉDITS</p>
        <h2 className="mt-1 font-display text-2xl tracking-[0.1em] text-[#f3d796]">
          NOUR AL-MAGHRIB
        </h2>
        <p className="text-xs text-[#d6c6a4] mt-1">
          Prototype 3D — Grande Mosquée Al-Qarawiyyin, Fès (Maroc)
        </p>

        <DiamondDivider />

        <div className="space-y-3 text-sm text-[#e8dcc2] my-4">
          <div>
            <div className="font-display text-xs tracking-widest text-[#e6c273]">
              MONDE GAUSSIAN SPLAT (.SPZ)
            </div>
            <p className="text-xs text-[#d2c3a4] mt-0.5">
              World Labs Atlas Developer API v2 (atlasTextToImage → images2PosedRGBD → atlasGenerate → posedImages2Splats)
            </p>
          </div>
          <div>
            <div className="font-display text-xs tracking-widest text-[#e6c273]">
              MOTEUR 3D TEMPS RÉEL
            </div>
            <p className="text-xs text-[#d2c3a4] mt-0.5">
              Three.js + @sparkjsdev/spark (SparkRenderer &amp; SplatMesh) · 60 FPS · Contrainte sol y ≥ 1.65m
            </p>
          </div>
          <div>
            <div className="font-display text-xs tracking-widest text-[#e6c273]">
              ARCHITECTURE &amp; INSPIRATION
            </div>
            <p className="text-xs text-[#d2c3a4] mt-0.5">
              Patrimoine historique de Fès El-Bali — Zellige, stuc sculpté, tuiles vertes vernissées et minaret Al-Qarawiyyin
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-[4px] moroccan-btn-active font-display text-sm tracking-[0.14em] text-[#fdf2d4] cursor-pointer"
        >
          FERMER
        </button>
      </div>
    </div>
  );
}
