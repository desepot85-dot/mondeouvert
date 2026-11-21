import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CAMPAIGN_MISSIONS, INITIAL_PLAYER_PROGRESS } from './game/missions';
import {
  MIN_EYE_HEIGHT,
  completeMissionObjective,
  getActiveObjective,
} from './game/engineLogic';
import { moroccanAudio } from './game/audio';
import type {
  GameScreen,
  GameSettings,
  HudTelemetry,
  PlayMode,
  PlayerProgress,
  RenderSourceMode,
} from './game/types';
import { SparkCourtyardEngine } from './scene/SparkCourtyardEngine';
import { TitleScreen } from './components/TitleScreen';
import { MissionsScreen } from './components/MissionsScreen';
import { GameHud } from './components/GameHud';
import {
  CreditsModal,
  PauseModal,
  SettingsModal,
  VictoryModal,
  WorldMapModal,
} from './components/GameModals';

const INITIAL_TELEMETRY: HudTelemetry = {
  fps: 60,
  playerX: 0,
  playerY: MIN_EYE_HEIGHT,
  playerZ: 0,
  playerYaw: 0,
  distanceToObjectiveMeters: null,
  nearbyInteractable: null,
  pointerLocked: false,
  splatStatus: 'checking',
  splatInfo: 'Initialisation SparkJS...',
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SparkCourtyardEngine | null>(null);

  const autostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [screen, setScreen] = useState<GameScreen>(autostart ? 'playing' : 'title');
  const [playMode, setPlayMode] = useState<PlayMode>('campaign');
  const [selectedMissionIdx, setSelectedMissionIdx] = useState(0);
  const [progress, setProgress] = useState<PlayerProgress>(INITIAL_PLAYER_PROGRESS);
  const [telemetry, setTelemetry] = useState<HudTelemetry>(INITIAL_TELEMETRY);
  const [renderSourceMode, setRenderSourceMode] = useState<RenderSourceMode>('courtyard-3d');

  const [showFilDor, setShowFilDor] = useState(false);
  const [cinematicMode, setCinematicMode] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [missionStartTime, setMissionStartTime] = useState<number>(() => performance.now());
  const [clearTimeSec, setClearTimeSec] = useState<number>(0);

  const [settings, setSettings] = useState<GameSettings>({
    mouseSensitivity: 1.0,
    audioEnabled: true,
    showFps: true,
    showHud: true,
  });

  const activeMission = CAMPAIGN_MISSIONS[selectedMissionIdx] || CAMPAIGN_MISSIONS[0];
  const activeObjective = useMemo(() => {
    if (playMode !== 'campaign') return null;
    return getActiveObjective(activeMission, progress.completedObjectiveIds);
  }, [playMode, activeMission, progress.completedObjectiveIds]);

  // Keep latest interact callback in ref so Three.js engine never re-mounts on React state updates
  const interactRef = useRef<() => void>(() => {});
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 3200);
  }, []);

  const handleInteract = useCallback(() => {
    if (screen !== 'playing' || playMode !== 'campaign' || !activeObjective) return;
    if (!telemetry.nearbyInteractable || telemetry.nearbyInteractable.id !== activeObjective.id) {
      return;
    }

    const result = completeMissionObjective(
      progress,
      activeMission,
      selectedMissionIdx,
      activeObjective.id
    );

    setProgress(result.nextProgress);

    if (result.missionCompleted) {
      moroccanAudio.playMissionFanfare();
      setClearTimeSec(Math.max(1, (performance.now() - missionStartTime) / 1000));
      setScreen('gameover');
    } else {
      moroccanAudio.playObjectiveChime();
      showToast(`Objectif accompli · +${result.xpGained} XP · +${result.dinarsGained} Dinars`);
    }
  }, [
    screen,
    playMode,
    activeObjective,
    telemetry.nearbyInteractable,
    progress,
    activeMission,
    selectedMissionIdx,
    missionStartTime,
    showToast,
  ]);

  useEffect(() => {
    interactRef.current = handleInteract;
  }, [handleInteract]);

  // Mirror game state to document.body.dataset.state for accessibility & testing
  useEffect(() => {
    document.body.dataset.state = screen;
  }, [screen]);

  // Mount Three.js + SparkJS engine ONCE in isolated ref container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new SparkCourtyardEngine(mount, {
      onTelemetry: (next) => {
        setTelemetry(next);
        if (next.splatStatus === 'loaded') {
          setRenderSourceMode(engine.getRenderSourceMode());
        }
      },
      onInteractRequest: () => {
        interactRef.current();
      },
      onPointerLockChange: (locked) => {
        setTelemetry((prev) => ({ ...prev, pointerLocked: locked }));
      },
    });

    engineRef.current = engine;
    engine.setScreen(autostart ? 'playing' : 'title');

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [autostart]);

  // Sync engine state without remounting renderer
  useEffect(() => {
    engineRef.current?.setScreen(screen);
  }, [screen]);

  useEffect(() => {
    engineRef.current?.setActiveObjective(activeObjective);
  }, [activeObjective]);

  useEffect(() => {
    engineRef.current?.setShowFilDor(showFilDor);
  }, [showFilDor]);

  useEffect(() => {
    engineRef.current?.setCinematicMode(cinematicMode);
  }, [cinematicMode]);

  useEffect(() => {
    engineRef.current?.setMouseSensitivity(settings.mouseSensitivity);
    moroccanAudio.setEnabled(settings.audioEnabled);
  }, [settings.mouseSensitivity, settings.audioEnabled]);

  const startMission = useCallback(
    (missionIdx: number, mode: PlayMode = 'campaign') => {
      moroccanAudio.playUiTick();
      moroccanAudio.startAmbience();
      const targetMission = CAMPAIGN_MISSIONS[missionIdx] || CAMPAIGN_MISSIONS[0];
      setSelectedMissionIdx(missionIdx);
      setPlayMode(mode);
      setCinematicMode(false);
      setMapOpen(false);
      setSettingsOpen(false);
      setCreditsOpen(false);
      setMissionStartTime(performance.now());
      // Set body state immediately on handshake
      document.body.dataset.state = 'playing';
      setScreen('playing');
      engineRef.current?.spawnAt(targetMission.spawnPos, targetMission.spawnYaw);
    },
    []
  );

  const handleRestartMission = useCallback(() => {
    const missionObjIds = new Set(activeMission.objectives.map((o) => o.id));
    setProgress((prev) => ({
      ...prev,
      completedObjectiveIds: prev.completedObjectiveIds.filter((id) => !missionObjIds.has(id)),
    }));
    startMission(selectedMissionIdx, playMode);
  }, [activeMission, selectedMissionIdx, playMode, startMission]);

  const handleToggleRenderSource = useCallback(() => {
    moroccanAudio.playUiTick();
    if (telemetry.splatStatus !== 'loaded') {
      showToast('Cour 3D Al-Qarawiyyin active (lancez scripts/generate-world.mjs pour .spz)');
      return;
    }
    const next: RenderSourceMode =
      renderSourceMode === 'atlas-splat' ? 'courtyard-3d' : 'atlas-splat';
    engineRef.current?.setRenderSourceMode(next);
    setRenderSourceMode(next);
    showToast(
      next === 'atlas-splat'
        ? 'Rendu World Labs Atlas Gaussian Splat (.spz) activé'
        : 'Rendu Cour 3D Al-Qarawiyyin Hybride activé'
    );
  }, [telemetry.splatStatus, renderSourceMode, showToast]);

  const handleChangeRenderSource = useCallback(
    (mode: RenderSourceMode) => {
      engineRef.current?.setRenderSourceMode(mode);
      setRenderSourceMode(mode);
    },
    []
  );

  // Global keyboard shortcuts for Playing HUD (M = Map, H = Fil d'Or, 3 = Cinematic, P/Escape = Pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const lower = e.key.toLowerCase();

      if (screen === 'playing') {
        if (lower === 'm') {
          e.preventDefault();
          moroccanAudio.playUiTick();
          setMapOpen((prev) => !prev);
          engineRef.current?.unlockPointer();
        } else if (lower === 'h') {
          e.preventDefault();
          moroccanAudio.playUiTick();
          setShowFilDor((prev) => !prev);
        } else if (e.key === '3') {
          e.preventDefault();
          moroccanAudio.playUiTick();
          setCinematicMode((prev) => !prev);
        } else if (lower === 'p' || (e.key === 'Escape' && !telemetry.pointerLocked)) {
          e.preventDefault();
          if (mapOpen) {
            setMapOpen(false);
          } else if (settingsOpen) {
            setSettingsOpen(false);
          } else {
            setScreen('paused');
          }
        }
      } else if (screen === 'paused') {
        if (e.key === 'Escape' || lower === 'p') {
          e.preventDefault();
          if (settingsOpen) setSettingsOpen(false);
          else setScreen('playing');
        }
      } else if (screen === 'title' || screen === 'missions') {
        if (lower === 'm') {
          e.preventDefault();
          setMapOpen((prev) => !prev);
        } else if (e.key === 'Escape') {
          if (mapOpen) setMapOpen(false);
          else if (settingsOpen) setSettingsOpen(false);
          else if (creditsOpen) setCreditsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, telemetry.pointerLocked, mapOpen, settingsOpen, creditsOpen]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#070d19]">
      {/* Isolated WebGL / SparkJS 3D Viewport (never re-rendered by React HUD updates) */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* TITLE SCREEN (Image 1 fidelity) */}
      {screen === 'title' && (
        <TitleScreen
          progress={progress}
          splatStatus={telemetry.splatStatus}
          onPlay={() => startMission(selectedMissionIdx, 'campaign')}
          onOpenMissions={() => {
            moroccanAudio.playUiTick();
            setScreen('missions');
          }}
          onFreeExplore={() => startMission(0, 'free-explore')}
          onOpenSettings={() => {
            moroccanAudio.playUiTick();
            setSettingsOpen(true);
          }}
          onOpenCredits={() => {
            moroccanAudio.playUiTick();
            setCreditsOpen(true);
          }}
        />
      )}

      {/* MISSIONS CAMPAIGN SCREEN (Image 3 fidelity) */}
      {screen === 'missions' && (
        <MissionsScreen
          progress={progress}
          selectedIndex={selectedMissionIdx}
          onSelectIndex={(idx) => {
            moroccanAudio.playUiTick();
            setSelectedMissionIdx(idx);
          }}
          onLaunchMission={(idx) => startMission(idx, 'campaign')}
          onBack={() => {
            moroccanAudio.playUiTick();
            setScreen('title');
          }}
          onOpenMap={() => {
            moroccanAudio.playUiTick();
            setMapOpen(true);
          }}
        />
      )}

      {/* IN-GAME HUD (Image 4 fidelity + FPS + Camera Control) */}
      {screen === 'playing' && (
        <GameHud
          playMode={playMode}
          mission={activeMission}
          activeObjective={activeObjective}
          progress={progress}
          telemetry={telemetry}
          settings={settings}
          showFilDor={showFilDor}
          cinematicMode={cinematicMode}
          renderSourceMode={renderSourceMode}
          toastMessage={toastMessage}
          onTogglePointerLock={() => {
            moroccanAudio.playUiTick();
            engineRef.current?.togglePointerLock();
          }}
          onToggleRenderSource={handleToggleRenderSource}
          onToggleFilDor={() => {
            moroccanAudio.playUiTick();
            setShowFilDor((prev) => !prev);
          }}
          onToggleCinematic={() => {
            moroccanAudio.playUiTick();
            setCinematicMode((prev) => !prev);
          }}
          onOpenMap={() => {
            moroccanAudio.playUiTick();
            engineRef.current?.unlockPointer();
            setMapOpen(true);
          }}
          onToggleAudio={() =>
            setSettings((prev) => ({ ...prev, audioEnabled: !prev.audioEnabled }))
          }
          onPause={() => {
            moroccanAudio.playUiTick();
            setScreen('paused');
          }}
          onInteract={handleInteract}
        />
      )}

      {/* PAUSE MODAL */}
      {screen === 'paused' && !settingsOpen && (
        <PauseModal
          mission={activeMission}
          onResume={() => {
            moroccanAudio.playUiTick();
            setScreen('playing');
          }}
          onRestart={handleRestartMission}
          onOpenMissions={() => {
            moroccanAudio.playUiTick();
            setScreen('missions');
          }}
          onOpenSettings={() => {
            moroccanAudio.playUiTick();
            setSettingsOpen(true);
          }}
          onReturnTitle={() => {
            moroccanAudio.playUiTick();
            setScreen('title');
          }}
        />
      )}

      {/* VICTORY MODAL */}
      {screen === 'gameover' && (
        <VictoryModal
          mission={activeMission}
          clearTimeSec={clearTimeSec}
          hasNextMission={selectedMissionIdx + 1 < CAMPAIGN_MISSIONS.length}
          onNextMission={() => startMission(selectedMissionIdx + 1, 'campaign')}
          onReplay={handleRestartMission}
          onReturnTitle={() => {
            moroccanAudio.playUiTick();
            setScreen('title');
          }}
        />
      )}

      {/* WORLD MAP OVERLAY */}
      {mapOpen && (
        <WorldMapModal
          telemetry={telemetry}
          activeObjective={activeObjective}
          onClose={() => setMapOpen(false)}
        />
      )}

      {/* SETTINGS OVERLAY */}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          renderSourceMode={renderSourceMode}
          splatAvailable={telemetry.splatStatus === 'loaded'}
          splatInfo={telemetry.splatInfo}
          onChangeSettings={setSettings}
          onChangeRenderSource={handleChangeRenderSource}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* CREDITS OVERLAY */}
      {creditsOpen && <CreditsModal onClose={() => setCreditsOpen(false)} />}
    </main>
  );
}
