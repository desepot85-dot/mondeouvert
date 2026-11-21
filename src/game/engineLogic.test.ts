import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_EYE_HEIGHT,
  clampPlayerHeight,
  computeMovementDelta,
  resolveCourtyardPosition,
  formatDistanceFrench,
  computeRankFromXp,
  completeMissionObjective,
  mapKeyToMovementAction,
} from './engineLogic';
import type { CampaignMission, PlayerProgress } from './types';

test('clampPlayerHeight strictly enforces camera.position.y >= 1.65', () => {
  assert.equal(clampPlayerHeight(0), MIN_EYE_HEIGHT);
  assert.equal(clampPlayerHeight(-5.2), MIN_EYE_HEIGHT);
  assert.equal(clampPlayerHeight(1.649), MIN_EYE_HEIGHT);
  assert.equal(clampPlayerHeight(1.65), 1.65);
  assert.equal(clampPlayerHeight(2.4), 2.4);
  assert.equal(clampPlayerHeight(Number.NaN), MIN_EYE_HEIGHT);
});

test('computeMovementDelta moves along -Z when facing yaw=0 and pressing forward', () => {
  const res = computeMovementDelta(
    { forward: true, backward: false, left: false, right: false, sprint: false },
    0,
    0.05,
    4.0
  );
  assert.equal(res.moving, true);
  assert.ok(Math.abs(res.dx) < 1e-6);
  assert.ok(Math.abs(res.dz - -0.2) < 1e-6);
});

test('computeMovementDelta normalizes diagonal movement and clamps dt <= 0.05', () => {
  const res = computeMovementDelta(
    { forward: true, backward: false, left: false, right: true, sprint: false },
    0,
    0.5, // huge lag spike must be clamped to 0.05s
    4.0
  );
  const dist = Math.hypot(res.dx, res.dz);
  assert.ok(Math.abs(dist - 0.2) < 1e-6);
});

test('resolveCourtyardPosition pushes player out of reflecting pool and enforces outer walls', () => {
  const inPool = resolveCourtyardPosition(-4.0, 0);
  assert.ok(inPool.x >= -3.2, `Expected x pushed outside pool edge (-3.2), got ${inPool.x}`);

  const outside = resolveCourtyardPosition(50, -50);
  assert.equal(outside.x, 11.2);
  assert.equal(outside.z, -17.5);
});

test('mapKeyToMovementAction supports AZERTY ZQSD, QWERTY WASD, and Arrow keys', () => {
  assert.equal(mapKeyToMovementAction('KeyW', 'z'), 'forward');
  assert.equal(mapKeyToMovementAction('KeyZ', 'z'), 'forward');
  assert.equal(mapKeyToMovementAction('KeyA', 'q'), 'left');
  assert.equal(mapKeyToMovementAction('KeyQ', 'q'), 'left');
  assert.equal(mapKeyToMovementAction('ArrowRight', 'ArrowRight'), 'right');
  assert.equal(mapKeyToMovementAction('KeyS', 's'), 'backward');
  assert.equal(mapKeyToMovementAction('ShiftLeft', 'Shift'), 'sprint');
});

test('computeRankFromXp and formatDistanceFrench match UI expectations', () => {
  const r1 = computeRankFromXp(420);
  assert.equal(r1.level, 1);
  assert.equal(r1.title, 'Apprenti');
  assert.ok(r1.progressRatio > 0.5 && r1.progressRatio < 0.7);

  const r3 = computeRankFromXp(1420);
  assert.equal(r3.level, 3);
  assert.equal(r3.title, 'Gardien');

  assert.equal(formatDistanceFrench(50), '0,05 km');
});

test('completeMissionObjective awards rewards and unlocks next mission when all objectives done', () => {
  const mission: CampaignMission = {
    id: 'm1',
    number: '01',
    title: "L'Appel de l'Aube",
    subtitle: 'Cour Al-Qarawiyyin',
    location: 'Fès',
    previewImage: '',
    rewardXp: 250,
    rewardDinars: 120,
    rewardItem: 'Lanterne de Fès',
    spawnPos: { x: 0, y: 1.65, z: 10 },
    spawnYaw: 0,
    objectives: [
      {
        id: 'obj-1',
        label: 'Ablutions',
        hint: 'Fontaine',
        promptLabel: 'Ablutions',
        targetPos: { x: 3, y: 1.65, z: 0 },
        interactionRadius: 3.5,
        rewardXp: 50,
        rewardDinars: 20,
      },
      {
        id: 'obj-2',
        label: 'Salle de Prière',
        hint: 'Arches',
        promptLabel: 'Entrer',
        targetPos: { x: 9, y: 1.65, z: -2 },
        interactionRadius: 3.5,
        rewardXp: 75,
        rewardDinars: 30,
      },
    ],
  };

  const initial: PlayerProgress = {
    xp: 420,
    dinars: 120,
    unlockedMissionIndex: 0,
    completedMissionIds: [],
    completedObjectiveIds: [],
  };

  const step1 = completeMissionObjective(initial, mission, 0, 'obj-1');
  assert.equal(step1.missionCompleted, false);
  assert.equal(step1.nextProgress.xp, 470);
  assert.equal(step1.nextProgress.dinars, 140);

  const step2 = completeMissionObjective(step1.nextProgress, mission, 0, 'obj-2');
  assert.equal(step2.missionCompleted, true);
  assert.equal(step2.nextProgress.xp, 470 + 75 + 250);
  assert.equal(step2.nextProgress.dinars, 140 + 30 + 120);
  assert.equal(step2.nextProgress.unlockedMissionIndex, 1);
  assert.deepEqual(step2.nextProgress.completedMissionIds, ['m1']);
});
