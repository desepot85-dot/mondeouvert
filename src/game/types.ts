export type GameScreen = 'title' | 'missions' | 'playing' | 'paused' | 'gameover';

export type PlayMode = 'campaign' | 'free-explore';

export type RenderSourceMode = 'atlas-splat' | 'courtyard-3d';

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface MissionObjective {
  id: string;
  label: string;
  hint: string;
  promptLabel: string;
  targetPos: Vec3Tuple;
  splatTargetPos?: Vec3Tuple;
  interactionRadius: number;
  rewardXp: number;
  rewardDinars: number;
}

export interface CampaignMission {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  location: string;
  previewImage: string;
  rewardXp: number;
  rewardDinars: number;
  rewardItem: string;
  spawnPos: Vec3Tuple;
  spawnYaw: number;
  objectives: MissionObjective[];
}

export interface PlayerProgress {
  xp: number;
  dinars: number;
  unlockedMissionIndex: number;
  completedMissionIds: string[];
  completedObjectiveIds: string[];
}

export interface RankInfo {
  level: number;
  title: string;
  currentXp: number;
  nextRankXp: number;
  progressRatio: number;
}

export interface HudTelemetry {
  fps: number;
  playerX: number;
  playerY: number;
  playerZ: number;
  playerYaw: number;
  distanceToObjectiveMeters: number | null;
  nearbyInteractable: {
    id: string;
    promptLabel: string;
    distance: number;
  } | null;
  pointerLocked: boolean;
  splatStatus: 'checking' | 'loaded' | 'fallback';
  splatInfo: string;
}

export interface MovementInputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

export interface GameSettings {
  mouseSensitivity: number;
  audioEnabled: boolean;
  showFps: boolean;
  showHud: boolean;
}
