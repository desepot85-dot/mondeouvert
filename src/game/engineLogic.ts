import type {
  CampaignMission,
  MovementInputState,
  PlayerProgress,
  RankInfo,
  Vec3Tuple,
} from './types';

export const MIN_EYE_HEIGHT = 1.65;
export const WALK_SPEED = 4.2;
export const SPRINT_MULTIPLIER = 1.65;

export interface CourtyardBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  obstacles: Array<{
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }>;
}

export const AL_QARAWIYYIN_BOUNDS: CourtyardBounds = {
  minX: -14.5,
  maxX: 11.2,
  minZ: -17.5,
  maxZ: 15.5,
  obstacles: [
    // Reflecting pool on the left (keep feet dry on the stone promenade!)
    { minX: -12.6, maxX: -3.2, minZ: -9.8, maxZ: 9.8 },
    // Central-right octagonal marble fountain basin
    { minX: 1.5, maxX: 5.5, minZ: -2.0, maxZ: 2.0 },
  ],
};

/**
 * Enforces strict minimum eye height (>= 1.65m) so the first-person camera
 * can never clip beneath the zellige floor.
 */
export function clampPlayerHeight(y: number, minHeight: number = MIN_EYE_HEIGHT): number {
  if (!Number.isFinite(y)) return minHeight;
  return Math.max(minHeight, y);
}

/**
 * Computes frame-rate independent horizontal displacement (dx, dz) from
 * ZQSD / WASD / Arrow movement intent in the camera's yaw frame.
 * In Three.js right-handed coordinates (yaw = 0 faces -Z):
 *   forward vector = (-sin(yaw), -cos(yaw))
 *   right vector   = ( cos(yaw), -sin(yaw))
 */
export function computeMovementDelta(
  input: MovementInputState,
  yawRad: number,
  dt: number,
  baseSpeed: number = WALK_SPEED
): { dx: number; dz: number; moving: boolean } {
  const safeDt = Math.min(Math.max(dt, 0), 0.05);
  const moveZ = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  if (moveZ === 0 && moveX === 0) {
    return { dx: 0, dz: 0, moving: false };
  }

  const len = Math.hypot(moveX, moveZ);
  const normX = moveX / len;
  const normZ = moveZ / len;

  const speed = baseSpeed * (input.sprint ? SPRINT_MULTIPLIER : 1);
  const sinY = Math.sin(yawRad);
  const cosY = Math.cos(yawRad);

  const worldDirX = -sinY * normZ + cosY * normX;
  const worldDirZ = -cosY * normZ - sinY * normX;

  return {
    dx: worldDirX * speed * safeDt,
    dz: worldDirZ * speed * safeDt,
    moving: true,
  };
}

/**
 * Resolves courtyard perimeter bounds and keeps the player outside solid basins
 * (reflecting pool and central marble fountain) by pushing out along the shallowest axis.
 */
export function resolveCourtyardPosition(
  x: number,
  z: number,
  bounds: CourtyardBounds = AL_QARAWIYYIN_BOUNDS
): { x: number; z: number } {
  let rx = Math.min(Math.max(x, bounds.minX), bounds.maxX);
  let rz = Math.min(Math.max(z, bounds.minZ), bounds.maxZ);

  for (const box of bounds.obstacles) {
    if (rx > box.minX && rx < box.maxX && rz > box.minZ && rz < box.maxZ) {
      const distLeft = rx - box.minX;
      const distRight = box.maxX - rx;
      const distTop = rz - box.minZ;
      const distBottom = box.maxZ - rz;
      const minPen = Math.min(distLeft, distRight, distTop, distBottom);

      if (minPen === distLeft) rx = box.minX;
      else if (minPen === distRight) rx = box.maxX;
      else if (minPen === distTop) rz = box.minZ;
      else rz = box.maxZ;
    }
  }

  return { x: rx, z: rz };
}

export function horizontalDistance(a: Vec3Tuple, b: Vec3Tuple): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function formatDistanceFrench(meters: number): string {
  const clamped = Math.max(0, meters);
  if (clamped >= 100) {
    const km = (clamped / 1000).toFixed(2).replace('.', ',');
    return `${km} km`;
  }
  const kmShort = Math.max(0.01, clamped / 1000).toFixed(2).replace('.', ',');
  return `${kmShort} km`;
}

const RANKS: Array<{ level: number; title: string; minXp: number; nextXp: number }> = [
  { level: 1, title: 'Apprenti', minXp: 0, nextXp: 700 },
  { level: 2, title: 'Voyageur', minXp: 700, nextXp: 1300 },
  { level: 3, title: 'Gardien', minXp: 1300, nextXp: 2200 },
  { level: 4, title: 'Érudit de Fès', minXp: 2200, nextXp: 3500 },
  { level: 5, title: 'Maître de Lumière', minXp: 3500, nextXp: 5000 },
];

export function computeRankFromXp(xp: number): RankInfo {
  const safeXp = Math.max(0, Math.round(xp));
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (safeXp >= r.minXp) rank = r;
  }
  const span = Math.max(1, rank.nextXp - rank.minXp);
  const ratio = Math.min(1, Math.max(0, (safeXp - rank.minXp) / span));
  return {
    level: rank.level,
    title: rank.title,
    currentXp: safeXp,
    nextRankXp: rank.nextXp,
    progressRatio: ratio,
  };
}

export function getActiveObjective(
  mission: CampaignMission,
  completedObjectiveIds: string[]
) {
  return mission.objectives.find((o) => !completedObjectiveIds.includes(o.id)) || null;
}

export function completeMissionObjective(
  progress: PlayerProgress,
  mission: CampaignMission,
  missionIndex: number,
  objectiveId: string
): { nextProgress: PlayerProgress; missionCompleted: boolean; xpGained: number; dinarsGained: number } {
  const objective = mission.objectives.find((o) => o.id === objectiveId);
  if (!objective || progress.completedObjectiveIds.includes(objectiveId)) {
    return {
      nextProgress: progress,
      missionCompleted: false,
      xpGained: 0,
      dinarsGained: 0,
    };
  }

  const nextCompletedObjectives = [...progress.completedObjectiveIds, objectiveId];
  const allDone = mission.objectives.every((o) => nextCompletedObjectives.includes(o.id));

  let xpGained = objective.rewardXp;
  let dinarsGained = objective.rewardDinars;

  const alreadyCompletedMission = progress.completedMissionIds.includes(mission.id);
  const nextCompletedMissions =
    allDone && !alreadyCompletedMission
      ? [...progress.completedMissionIds, mission.id]
      : progress.completedMissionIds;

  if (allDone && !alreadyCompletedMission) {
    xpGained += mission.rewardXp;
    dinarsGained += mission.rewardDinars;
  }

  const nextUnlocked = allDone
    ? Math.max(progress.unlockedMissionIndex, missionIndex + 1)
    : progress.unlockedMissionIndex;

  return {
    nextProgress: {
      xp: progress.xp + xpGained,
      dinars: progress.dinars + dinarsGained,
      unlockedMissionIndex: nextUnlocked,
      completedMissionIds: nextCompletedMissions,
      completedObjectiveIds: nextCompletedObjectives,
    },
    missionCompleted: allDone,
    xpGained,
    dinarsGained,
  };
}

/**
 * Maps physical keyboard event.code AND key (supports both AZERTY ZQSD and QWERTY WASD + Arrows).
 */
export function mapKeyToMovementAction(
  code: string,
  key: string
): keyof MovementInputState | null {
  const lower = key.toLowerCase();
  if (code === 'KeyW' || code === 'ArrowUp' || lower === 'z' || lower === 'w') return 'forward';
  if (code === 'KeyS' || code === 'ArrowDown' || lower === 's') return 'backward';
  if (code === 'KeyA' || code === 'ArrowLeft' || lower === 'q' || lower === 'a') return 'left';
  if (code === 'KeyD' || code === 'ArrowRight' || lower === 'd') return 'right';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'sprint';
  return null;
}
