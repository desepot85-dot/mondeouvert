import * as THREE from 'three';
import {
  createCarvedStuccoTextures,
  createContactShadowTexture,
  createCrescentMoonTexture,
  createEmeraldTileTextures,
  createMinaretStoneTextures,
  createZelligeTextures,
} from './textures';

export interface CourtyardAnimatedRefs {
  root: THREE.Group;
  waterMesh: THREE.Mesh;
  fountainWater: THREE.Mesh;
  waterDrops: THREE.InstancedMesh;
  dropPhases: Float32Array;
  lanternLights: THREE.PointLight[];
  lanternBaseIntensities: number[];
  filDorMesh: THREE.InstancedMesh;
  filDorVisible: boolean;
  objectiveBeacon: THREE.Group;
  starField: THREE.Points;
  palmCrowns: THREE.Object3D[];
  dispose: () => void;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

/**
 * Builds a composite multi-part Moroccan brass lantern (6 distinct parts: base, legs,
 * pierced brass frame, glowing glass core, finial dome, ring).
 */
function createMoroccanLantern(
  brassMat: THREE.MeshStandardMaterial,
  glowMat: THREE.MeshStandardMaterial,
  scale = 1
): THREE.Group {
  const g = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 6), brassMat);
  base.position.y = 0.04;
  g.add(base);

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.34, 6), glowMat);
  core.position.y = 0.25;
  g.add(core);

  // 6 vertical brass ribs framing the glass
  const ribGeo = new THREE.BoxGeometry(0.025, 0.36, 0.025);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rib = new THREE.Mesh(ribGeo, brassMat);
    rib.position.set(Math.cos(a) * 0.145, 0.25, Math.sin(a) * 0.145);
    g.add(rib);
  }

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 6), brassMat);
  cap.position.y = 0.51;
  g.add(cap);

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), brassMat);
  finial.position.y = 0.62;
  g.add(finial);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), brassMat);
  ring.position.y = 0.69;
  g.add(ring);

  g.scale.setScalar(scale);
  return g;
}

/**
 * Builds a composite Moorish horseshoe arch bay (columns, zellige plinths, carved capitals,
 * extruded horseshoe arch spandrel, hanging brass chandelier).
 */
function createHorseshoeArchBay(
  width: number,
  height: number,
  stuccoMat: THREE.MeshStandardMaterial,
  marbleMat: THREE.MeshStandardMaterial,
  plinthMat: THREE.MeshStandardMaterial,
  brassMat: THREE.MeshStandardMaterial,
  glowMat: THREE.MeshStandardMaterial
): THREE.Group {
  const group = new THREE.Group();

  // Extruded wall spandrel with authentic Moroccan horseshoe arch cutout
  const shape = new THREE.Shape();
  const hw = width / 2;
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, height);
  shape.lineTo(-hw, height);
  shape.closePath();

  const archRadius = width * 0.37;
  const springY = height * 0.53;
  const hole = new THREE.Path();
  hole.moveTo(-archRadius * 0.86, 0);
  hole.lineTo(-archRadius * 0.86, springY - archRadius * 0.36);
  // Horseshoe curve (> 180 deg)
  hole.absarc(0, springY, archRadius, Math.PI + 0.35, -0.35, true);
  hole.lineTo(archRadius * 0.86, 0);
  hole.closePath();
  shape.holes.push(hole);

  const archGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 20,
  });
  archGeo.translate(0, 0, -0.21);
  const archWall = new THREE.Mesh(archGeo, stuccoMat);
  archWall.castShadow = true;
  archWall.receiveShadow = true;
  group.add(archWall);

  // Left & right carved columns with zellige bases + muqarnas capitals
  const colPositions = [-hw + 0.16, hw - 0.16];
  for (const cx of colPositions) {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.72, 0.48), plinthMat);
    plinth.position.set(cx, 0.36, 0);
    group.add(plinth);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, springY - 1.15, 14), marbleMat);
    shaft.position.set(cx, 0.72 + (springY - 1.15) / 2, 0);
    group.add(shaft);

    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.14, 0.42, 8), stuccoMat);
    capital.position.set(cx, springY - 0.22, 0);
    group.add(capital);
  }

  // Hanging brass chandelier inside the arch
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.35, 6), brassMat);
  chain.position.set(0, height - 1.1, -0.8);
  group.add(chain);

  const chandelier = createMoroccanLantern(brassMat, glowMat, 1.15);
  chandelier.position.set(0, height - 2.35, -0.8);
  group.add(chandelier);

  return group;
}

/**
 * Builds a composite Date Palm (curved multi-segment ringed trunk + crown of arched fronds).
 */
function createDatePalm(
  trunkMat: THREE.MeshStandardMaterial,
  frondMat: THREE.MeshStandardMaterial,
  height: number,
  seed: number
): { tree: THREE.Group; crown: THREE.Group } {
  const tree = new THREE.Group();
  const segments = 7;
  let curY = 0;
  let curX = 0;
  let curZ = 0;
  const leanX = Math.sin(seed * 3.1) * 0.22;
  const leanZ = Math.cos(seed * 2.7) * 0.18;

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const segH = height / segments;
    const rBot = 0.26 * (1 - t * 0.45);
    const rTop = 0.24 * (1 - (t + 0.12) * 0.45);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, segH + 0.08, 9), trunkMat);
    seg.position.set(curX, curY + segH / 2, curZ);
    seg.rotation.z = -leanX * 0.25;
    seg.rotation.x = leanZ * 0.25;
    tree.add(seg);
    curY += segH;
    curX += leanX * 0.2;
    curZ += leanZ * 0.16;
  }

  const crown = new THREE.Group();
  crown.position.set(curX, curY, curZ);

  const frondCount = 13;
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2 + seed;
    const tier = i % 2 === 0 ? 0.35 : 0.72;
    const frondPivot = new THREE.Group();
    frondPivot.rotation.y = angle;
    frondPivot.rotation.z = -tier;

    // 3-segment gracefully drooping palm frond
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.85, 4), frondMat);
    f1.scale.set(1, 1, 0.22);
    f1.rotation.z = -Math.PI / 2;
    f1.position.set(0.9, 0.08, 0);
    frondPivot.add(f1);

    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.55, 4), frondMat);
    f2.scale.set(1, 1, 0.2);
    f2.rotation.z = -Math.PI / 2 - 0.45;
    f2.position.set(2.15, -0.32, 0);
    frondPivot.add(f2);

    crown.add(frondPivot);
  }

  tree.add(crown);
  return { tree, crown };
}

/**
 * Builds a composite Moroccan Orange Tree (gnarled trunk, lush multi-lobe foliage, glowing oranges).
 */
function createOrangeTree(
  trunkMat: THREE.MeshStandardMaterial,
  foliageMat: THREE.MeshStandardMaterial,
  orangeMat: THREE.MeshStandardMaterial,
  seed: number
): THREE.Group {
  const g = new THREE.Group();

  const planter = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.28, 1.35),
    new THREE.MeshStandardMaterial({ color: 0x3b4454, roughness: 0.72 })
  );
  planter.position.y = 0.14;
  g.add(planter);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.85, 8), trunkMat);
  trunk.position.y = 1.05;
  g.add(trunk);

  const lobes: Array<[number, number, number, number]> = [
    [0, 2.5, 0, 1.05],
    [0.62, 2.25, 0.35, 0.72],
    [-0.58, 2.3, -0.32, 0.76],
    [0.2, 2.95, -0.4, 0.68],
    [-0.25, 2.2, 0.55, 0.65],
  ];

  for (const [lx, ly, lz, rad] of lobes) {
    const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), foliageMat);
    leaf.position.set(lx, ly, lz);
    g.add(leaf);
  }

  // Ripe Moroccan oranges nestled in foliage
  const orangeGeo = new THREE.SphereGeometry(0.09, 8, 6);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + seed;
    const r = 0.85 + (i % 3) * 0.15;
    const o = new THREE.Mesh(orangeGeo, orangeMat);
    o.position.set(Math.cos(a) * r, 2.0 + (i % 4) * 0.28, Math.sin(a) * r);
    g.add(o);
  }

  return g;
}

/**
 * Constructs the full Al-Qarawiyyin Mosque Courtyard at night in Fes, matching
 * the exact architectural composition of the user's prompt & reference images.
 */
export function buildAlQarawiyyinCourtyard(
  scene: THREE.Scene,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): CourtyardAnimatedRefs {
  const root = new THREE.Group();
  root.name = 'AlQarawiyyinCourtyard';

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // --- Textures & Materials ---
  const zellige = createZelligeTextures(maxAnisotropy);
  track(zellige.map);
  track(zellige.roughnessMap);
  track(zellige.bumpMap);

  const stuccoTex = createCarvedStuccoTextures(maxAnisotropy);
  track(stuccoTex.map);
  track(stuccoTex.bumpMap);

  const minaretTex = createMinaretStoneTextures(maxAnisotropy);
  track(minaretTex.map);
  track(minaretTex.bumpMap);

  const emeraldTex = createEmeraldTileTextures(maxAnisotropy);
  track(emeraldTex.map);
  track(emeraldTex.bumpMap);

  const shadowTex = track(createContactShadowTexture());
  const moonTex = track(createCrescentMoonTexture());

  const zelligeMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: zellige.map,
      roughnessMap: zellige.roughnessMap,
      bumpMap: zellige.bumpMap,
      bumpScale: 0.025,
      roughness: 0.36,
      metalness: 0.12,
      clearcoat: isSoftwareGl ? 0 : 0.42,
      clearcoatRoughness: 0.25,
    })
  );

  const stuccoMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: stuccoTex.map,
      bumpMap: stuccoTex.bumpMap,
      bumpScale: 0.035,
      roughness: 0.82,
      metalness: 0.04,
    })
  );

  const marbleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe9e2d4,
      roughness: 0.28,
      metalness: 0.08,
    })
  );

  const plinthMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x26415c,
      roughness: 0.42,
      metalness: 0.12,
    })
  );

  const emeraldRoofMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: emeraldTex.map,
      bumpMap: emeraldTex.bumpMap,
      bumpScale: 0.04,
      roughness: 0.22,
      metalness: 0.16,
      clearcoat: isSoftwareGl ? 0 : 0.55,
      clearcoatRoughness: 0.18,
    })
  );

  const cedarMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b2314,
      roughness: 0.78,
      metalness: 0.05,
    })
  );

  const minaretMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: minaretTex.map,
      bumpMap: minaretTex.bumpMap,
      bumpScale: 0.06,
      roughness: 0.76,
      metalness: 0.06,
      emissive: new THREE.Color(0x523112),
      emissiveIntensity: 0.42,
    })
  );

  const brassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xc99c4a,
      roughness: 0.28,
      metalness: 0.86,
    })
  );

  const lanternGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffe4a0,
      emissive: new THREE.Color(0xffb444),
      emissiveIntensity: 3.1,
      roughness: 0.2,
    })
  );

  const trunkMat = track(
    new THREE.MeshStandardMaterial({ color: 0x4b382a, roughness: 0.92, metalness: 0.02 })
  );
  const palmFrondMat = track(
    new THREE.MeshStandardMaterial({ color: 0x1e4028, roughness: 0.68, metalness: 0.04 })
  );
  const orangeLeafMat = track(
    new THREE.MeshStandardMaterial({ color: 0x183823, roughness: 0.58, metalness: 0.04 })
  );
  const orangeFruitMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe2721a,
      emissive: new THREE.Color(0x522104),
      emissiveIntensity: 0.4,
      roughness: 0.45,
    })
  );

  // --- 1. Courtyard Zellige Floor & Outer Medina Ground ---
  const outerGround = new THREE.Mesh(
    track(new THREE.PlaneGeometry(240, 240)),
    track(new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.94, metalness: 0.02 }))
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.06;
  root.add(outerGround);

  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(34, 40)), zelligeMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(-1.0, 0, -1.0);
  floor.receiveShadow = true;
  root.add(floor);

  // --- 2. Large Dark Reflecting Pool (Left Side) ---
  const poolX = -7.9;
  const poolZ = 0.0;
  const poolW = 8.8;
  const poolL = 19.0;

  // Stone coping rim (4 distinct sides)
  const rimH = 0.22;
  const rimT = 0.36;
  const northRim = new THREE.Mesh(track(new THREE.BoxGeometry(poolW + rimT * 2, rimH, rimT)), marbleMat);
  northRim.position.set(poolX, rimH / 2, poolZ - poolL / 2);
  root.add(northRim);

  const southRim = new THREE.Mesh(track(new THREE.BoxGeometry(poolW + rimT * 2, rimH, rimT)), marbleMat);
  southRim.position.set(poolX, rimH / 2, poolZ + poolL / 2);
  root.add(southRim);

  const westRim = new THREE.Mesh(track(new THREE.BoxGeometry(rimT, rimH, poolL)), marbleMat);
  westRim.position.set(poolX - poolW / 2 - rimT / 2, rimH / 2, poolZ);
  root.add(westRim);

  const eastRim = new THREE.Mesh(track(new THREE.BoxGeometry(rimT, rimH, poolL)), marbleMat);
  eastRim.position.set(poolX + poolW / 2 + rimT / 2, rimH / 2, poolZ);
  root.add(eastRim);

  // Dark mirror-like water surface
  const poolWaterMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x0a182d,
      roughness: 0.07,
      metalness: 0.72,
      clearcoat: isSoftwareGl ? 0 : 1.0,
      clearcoatRoughness: 0.05,
      emissive: new THREE.Color(0x0c1b33),
      emissiveIntensity: 0.35,
    })
  );
  const waterMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(poolW, poolL, 16, 24)), poolWaterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(poolX, 0.09, poolZ);
  root.add(waterMesh);

  // --- 3. Central-Right Octagonal Marble Fountain ---
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(3.5, 0, 0.0);

  const fountainStep = new THREE.Mesh(track(new THREE.CylinderGeometry(2.35, 2.48, 0.14, 8)), marbleMat);
  fountainStep.position.y = 0.07;
  fountainStep.receiveShadow = true;
  fountainGroup.add(fountainStep);

  // Octagonal hollow curb walls (8 segments)
  const curbRadius = 1.98;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const seg = new THREE.Mesh(track(new THREE.BoxGeometry(1.62, 0.56, 0.24)), marbleMat);
    seg.position.set(Math.cos(a) * curbRadius, 0.38, Math.sin(a) * curbRadius);
    seg.rotation.y = -a + Math.PI / 2;
    seg.castShadow = true;
    seg.receiveShadow = true;
    fountainGroup.add(seg);
  }

  // Glowing inner fountain water
  const fountainWaterMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x456072,
      emissive: new THREE.Color(0xffb85c),
      emissiveIntensity: 0.62,
      roughness: 0.12,
      metalness: 0.3,
    })
  );
  const fountainWater = new THREE.Mesh(track(new THREE.CylinderGeometry(1.85, 1.85, 0.06, 8)), fountainWaterMat);
  fountainWater.position.y = 0.54;
  fountainGroup.add(fountainWater);

  // Sculpted LatheGeometry marble chalice pedestal + upper bowl
  const lathePoints = [
    new THREE.Vector2(0.0, 0.1),
    new THREE.Vector2(0.42, 0.14),
    new THREE.Vector2(0.24, 0.55),
    new THREE.Vector2(0.18, 0.92),
    new THREE.Vector2(0.32, 1.05),
    new THREE.Vector2(0.76, 1.24),
    new THREE.Vector2(0.82, 1.36),
    new THREE.Vector2(0.68, 1.36),
    new THREE.Vector2(0.16, 1.2),
    new THREE.Vector2(0.1, 1.56),
    new THREE.Vector2(0.0, 1.62),
  ];
  const chaliceGeo = track(new THREE.LatheGeometry(lathePoints, 20));
  const chalice = new THREE.Mesh(chaliceGeo, marbleMat);
  chalice.castShadow = true;
  fountainGroup.add(chalice);

  // Animated sparkling fountain water droplets (InstancedMesh)
  const dropCount = 36;
  const dropGeo = track(new THREE.SphereGeometry(0.032, 6, 6));
  const dropMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfff0cc,
      emissive: new THREE.Color(0xffcf77),
      emissiveIntensity: 1.2,
      roughness: 0.1,
    })
  );
  const waterDrops = new THREE.InstancedMesh(dropGeo, dropMat, dropCount);
  waterDrops.frustumCulled = false;
  const dropPhases = new Float32Array(dropCount);
  for (let i = 0; i < dropCount; i++) {
    dropPhases[i] = i / dropCount;
  }
  fountainGroup.add(waterDrops);
  root.add(fountainGroup);

  // --- 4. Ornate White Moorish Horseshoe-Arch Colonnade (Right Side — East Wing) ---
  const eastArcadeGroup = new THREE.Group();
  const bayWidth = 4.2;
  const bayHeight = 6.2;
  const eastBayCount = 7;

  for (let i = 0; i < eastBayCount; i++) {
    const bay = createHorseshoeArchBay(
      bayWidth,
      bayHeight,
      stuccoMat,
      marbleMat,
      plinthMat,
      brassMat,
      lanternGlowMat
    );
    bay.rotation.y = -Math.PI / 2;
    bay.position.set(11.8, 0, -12.6 + i * bayWidth);
    eastArcadeGroup.add(bay);
  }

  // Deep interior prayer hall gallery behind the arches
  const galleryBackWall = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.6, 6.4, eastBayCount * bayWidth + 1.0)),
    track(new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 0.85 }))
  );
  galleryBackWall.position.set(15.6, 3.2, 0);
  eastArcadeGroup.add(galleryBackWall);

  // Ornate cedar prayer-hall doorway framed inside central arch
  const prayerDoor = new THREE.Mesh(track(new THREE.BoxGeometry(0.3, 4.1, 2.8)), cedarMat);
  prayerDoor.position.set(15.2, 2.05, -3.2);
  eastArcadeGroup.add(prayerDoor);

  const galleryFloor = new THREE.Mesh(
    track(new THREE.PlaneGeometry(4.2, eastBayCount * bayWidth + 0.5)),
    track(new THREE.MeshStandardMaterial({ color: 0x5c3620, roughness: 0.88 }))
  );
  galleryFloor.rotation.x = -Math.PI / 2;
  galleryFloor.position.set(13.8, 0.04, 0);
  eastArcadeGroup.add(galleryFloor);

  // Overhanging carved cedar eaves + Emerald Green Glazed Pitched Roof
  const eave = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.1, 0.45, eastBayCount * bayWidth + 0.8)),
    cedarMat
  );
  eave.position.set(11.65, bayHeight + 0.2, 0);
  eastArcadeGroup.add(eave);

  const pitchedRoof = new THREE.Mesh(
    track(new THREE.BoxGeometry(5.2, 0.38, eastBayCount * bayWidth + 1.0)),
    emeraldRoofMat
  );
  pitchedRoof.position.set(13.6, bayHeight + 1.35, 0);
  pitchedRoof.rotation.z = 0.38;
  eastArcadeGroup.add(pitchedRoof);

  // Central green-tiled pyramid pavilion rising above the Prayer Hall entrance (Image 4!)
  const pavilionBase = new THREE.Mesh(track(new THREE.BoxGeometry(5.6, 1.8, 5.6)), stuccoMat);
  pavilionBase.position.set(13.5, bayHeight + 1.1, -3.2);
  eastArcadeGroup.add(pavilionBase);

  const pavilionRoof = new THREE.Mesh(track(new THREE.ConeGeometry(4.3, 3.1, 4)), emeraldRoofMat);
  pavilionRoof.rotation.y = Math.PI / 4;
  pavilionRoof.position.set(13.5, bayHeight + 3.55, -3.2);
  eastArcadeGroup.add(pavilionRoof);

  const pavilionFinial = new THREE.Mesh(track(new THREE.SphereGeometry(0.22, 10, 8)), brassMat);
  pavilionFinial.position.set(13.5, bayHeight + 5.2, -3.2);
  eastArcadeGroup.add(pavilionFinial);

  root.add(eastArcadeGroup);

  // --- 5. North & West Perimeter Colonnades + Ablutions Pavilion ---
  // North arcade wall behind the courtyard
  for (let i = 0; i < 6; i++) {
    const bay = createHorseshoeArchBay(
      4.4,
      5.4,
      stuccoMat,
      marbleMat,
      plinthMat,
      brassMat,
      lanternGlowMat
    );
    bay.position.set(-12.6 + i * 4.4, 0, -18.5);
    root.add(bay);
  }
  const northRoof = new THREE.Mesh(track(new THREE.BoxGeometry(27.5, 0.35, 3.8)), emeraldRoofMat);
  northRoof.position.set(-1.6, 6.2, -19.8);
  northRoof.rotation.x = 0.34;
  root.add(northRoof);

  // Ornate Ablutions Pavilion right next to the Minaret (matching Image 4!)
  const pavGroup = new THREE.Group();
  pavGroup.position.set(4.5, 0, -15.4);
  const pavRoof = new THREE.Mesh(track(new THREE.ConeGeometry(3.4, 2.3, 4)), emeraldRoofMat);
  pavRoof.rotation.y = Math.PI / 4;
  pavRoof.position.y = 5.6;
  pavGroup.add(pavRoof);
  const pavBeam = new THREE.Mesh(track(new THREE.BoxGeometry(4.4, 0.75, 4.4)), cedarMat);
  pavBeam.position.y = 4.2;
  pavGroup.add(pavBeam);
  for (const sx of [-1.8, 1.8]) {
    for (const sz of [-1.8, 1.8]) {
      const pCol = new THREE.Mesh(track(new THREE.CylinderGeometry(0.16, 0.18, 4.0, 12)), marbleMat);
      pCol.position.set(sx, 2.0, sz);
      pavGroup.add(pCol);
    }
  }
  root.add(pavGroup);

  // Low West Wall behind palms and orange trees
  const westWall = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 4.8, 38)), stuccoMat);
  westWall.position.set(-16.2, 2.4, -1.0);
  root.add(westWall);

  const westRoof = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 0.3, 38.5)), emeraldRoofMat);
  westRoof.position.set(-16.5, 5.1, -1.0);
  westRoof.rotation.z = -0.3;
  root.add(westRoof);

  // --- 6. Towering Carved Stone Minaret of Al-Qarawiyyin (Dead Center North) ---
  const minaret = new THREE.Group();
  minaret.position.set(-0.4, 0, -21.8);

  // Main square sandstone shaft
  const shaft = new THREE.Mesh(track(new THREE.BoxGeometry(4.8, 17.2, 4.8)), minaretMat);
  shaft.position.y = 8.6;
  shaft.castShadow = true;
  minaret.add(shaft);

  // Recessed arched portal & upper glowing windows on the front (+Z) face
  const lowerGlowArch = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1.7, 2.8)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xffd58a,
        emissive: new THREE.Color(0xff9f38),
        emissiveIntensity: 1.9,
        roughness: 0.4,
      })
    )
  );
  lowerGlowArch.position.set(0, 9.5, 2.43);
  minaret.add(lowerGlowArch);

  const upperWindow = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.65, 1.35)),
    lanternGlowMat
  );
  upperWindow.position.set(0, 13.6, 2.43);
  minaret.add(upperWindow);

  // Emerald zellige frieze band near top of main shaft
  const zelligeBand = new THREE.Mesh(
    track(new THREE.BoxGeometry(4.96, 1.1, 4.96)),
    emeraldRoofMat
  );
  zelligeBand.position.y = 16.5;
  minaret.add(zelligeBand);

  // Stepped crenellations (merlons) around parapet
  const merlonGeo = track(new THREE.BoxGeometry(0.55, 0.72, 0.36));
  for (let side = 0; side < 4; side++) {
    for (let k = -2; k <= 2; k++) {
      const m = new THREE.Mesh(merlonGeo, minaretMat);
      if (side === 0) m.position.set(k * 0.96, 17.55, 2.28);
      else if (side === 1) m.position.set(k * 0.96, 17.55, -2.28);
      else if (side === 2) {
        m.position.set(2.28, 17.55, k * 0.96);
        m.rotation.y = Math.PI / 2;
      } else {
        m.position.set(-2.28, 17.55, k * 0.96);
        m.rotation.y = Math.PI / 2;
      }
      minaret.add(m);
    }
  }

  // Illuminated Upper Lantern Pavilion (Qubba)
  const upperTower = new THREE.Mesh(
    track(new THREE.BoxGeometry(2.6, 3.6, 2.6)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xf4c57b,
        emissive: new THREE.Color(0xffaa3d),
        emissiveIntensity: 1.55,
        roughness: 0.45,
      })
    )
  );
  upperTower.position.y = 19.0;
  minaret.add(upperTower);

  // Domed cupola + Moroccan 3-orb brass Jamour finial
  const cupola = new THREE.Mesh(track(new THREE.SphereGeometry(1.15, 16, 12)), emeraldRoofMat);
  cupola.scale.set(1, 0.9, 1);
  cupola.position.y = 21.05;
  minaret.add(cupola);

  const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.06, 1.9, 8)), brassMat);
  pole.position.y = 22.45;
  minaret.add(pole);

  [22.25, 22.72, 23.12].forEach((py, idx) => {
    const orb = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.24 - idx * 0.05, 10, 8)),
      brassMat
    );
    orb.position.y = py;
    minaret.add(orb);
  });

  root.add(minaret);

  // --- 7. Date Palms & Orange Trees Bordering the Left Reflecting Pool ---
  const palmCrowns: THREE.Object3D[] = [];
  const palmPositions: Array<[number, number, number]> = [
    [-13.8, -5.2, 8.2],
    [-14.2, -10.5, 9.4],
    [-13.6, 4.6, 7.6],
    [-14.8, 10.2, 8.5],
  ];
  palmPositions.forEach(([px, pz, h], idx) => {
    const { tree, crown } = createDatePalm(trunkMat, palmFrondMat, h, idx + 1.3);
    tree.position.set(px, 0, pz);
    root.add(tree);
    palmCrowns.push(crown);
  });

  const orangePositions: Array<[number, number]> = [
    [-13.8, 0.5],
    [-13.7, -8.0],
    [-13.9, 7.8],
  ];
  orangePositions.forEach(([ox, oz], idx) => {
    const ot = createOrangeTree(trunkMat, orangeLeafMat, orangeFruitMat, idx * 2.1);
    ot.position.set(ox, 0, oz);
    root.add(ot);
  });

  // --- 8. Ground Brass Lanterns & Woven Iftar Basket ---
  const shadowGeo = track(new THREE.CircleGeometry(0.55, 16));
  const shadowMat = track(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    })
  );

  const groundLanternCoords: Array<[number, number]> = [
    [-3.1, 9.5],
    [-3.1, 2.8],
    [-3.1, -4.4],
    [-3.1, -9.5],
    [-12.6, 6.2],
    [-12.6, -5.8],
    [5.2, 1.9],
    [1.8, -1.9],
    [10.2, 3.8],
    [10.2, -5.8],
  ];

  groundLanternCoords.forEach(([lx, lz]) => {
    const lantern = createMoroccanLantern(brassMat, lanternGlowMat, 1.05);
    lantern.position.set(lx, 0, lz);
    root.add(lantern);

    const cs = new THREE.Mesh(shadowGeo, shadowMat);
    cs.rotation.x = -Math.PI / 2;
    cs.position.set(lx, 0.015, lz);
    root.add(cs);
  });

  // Woven Iftar dates basket near the Prayer Hall threshold (visual nod to Image 2!)
  const basketGroup = new THREE.Group();
  basketGroup.position.set(9.8, 0, 1.6);
  const basketBody = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.42, 0.3, 0.44, 14)),
    track(new THREE.MeshStandardMaterial({ color: 0x7b522c, roughness: 0.9 }))
  );
  basketBody.position.y = 0.22;
  basketGroup.add(basketBody);
  const datesMound = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.36, 12, 8)),
    track(new THREE.MeshStandardMaterial({ color: 0x4c2414, roughness: 0.65 }))
  );
  datesMound.scale.set(1, 0.55, 1);
  datesMound.position.y = 0.42;
  basketGroup.add(datesMound);
  root.add(basketGroup);

  // --- 9. Distant Misty Atlas Mountains Silhouette & Medina Rooftops ---
  const mountainMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x16243d,
      roughness: 0.96,
      metalness: 0.02,
    })
  );
  const ridgeCount = 16;
  for (let i = 0; i < ridgeCount; i++) {
    const angle = (i / ridgeCount) * Math.PI * 2;
    const dist = 78 + (i % 3) * 14;
    const peakH = 18 + ((i * 19) % 16);
    const peakW = 28 + ((i * 11) % 14);
    const peak = new THREE.Mesh(track(new THREE.ConeGeometry(peakW, peakH, 5)), mountainMat);
    peak.position.set(Math.cos(angle) * dist, peakH * 0.38, Math.sin(angle) * dist);
    peak.rotation.y = angle;
    root.add(peak);
  }

  // Distant Fes Medina silhouettes around the mosque
  const medinaMat = track(
    new THREE.MeshStandardMaterial({ color: 0x182131, roughness: 0.92, metalness: 0.04 })
  );
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const dist = 34 + (i % 4) * 5;
    const bh = 4.5 + (i % 5) * 1.4;
    const house = new THREE.Mesh(
      track(new THREE.BoxGeometry(5.5 + (i % 3) * 2, bh, 5.2)),
      medinaMat
    );
    house.position.set(Math.cos(angle) * dist, bh / 2, Math.sin(angle) * dist);
    house.rotation.y = angle * 0.5;
    root.add(house);
  }

  // --- 10. Starry Indigo Night Sky & Crescent Moon (left of Minaret, matching Image 4) ---
  const moonSprite = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: moonTex,
        transparent: true,
        depthWrite: false,
        fog: false,
      })
    )
  );
  moonSprite.position.set(-14.5, 25.0, -52.0);
  moonSprite.scale.set(9.5, 9.5, 1);
  root.add(moonSprite);

  // Starfield (Points)
  const starCount = 420;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * (Math.PI * 0.44); // Upper hemisphere
    const r = 95;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi) + 6;
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = track(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starField = new THREE.Points(
    starGeo,
    track(
      new THREE.PointsMaterial({
        color: 0xdbe9ff,
        size: 0.45,
        transparent: true,
        opacity: 0.85,
        fog: false,
      })
    )
  );
  root.add(starField);

  // --- 11. Lighting Rig (Warm Golden Lanterns vs Cool Indigo Moonlight) ---
  const hemiLight = new THREE.HemisphereLight(0x4b6fa8, 0x261d17, 1.15);
  root.add(hemiLight);

  const moonDirLight = new THREE.DirectionalLight(0x8cb3ef, 1.25);
  moonDirLight.position.set(-18, 32, -26);
  if (!isSoftwareGl) {
    moonDirLight.castShadow = true;
    moonDirLight.shadow.mapSize.set(1024, 1024);
    moonDirLight.shadow.camera.left = -22;
    moonDirLight.shadow.camera.right = 22;
    moonDirLight.shadow.camera.top = 24;
    moonDirLight.shadow.camera.bottom = -22;
    moonDirLight.shadow.camera.near = 2;
    moonDirLight.shadow.camera.far = 75;
    moonDirLight.shadow.bias = -0.0005;
    moonDirLight.shadow.normalBias = 0.02;
  }
  root.add(moonDirLight);

  // 5 strategic warm golden point lights (within 4-6 point light performance budget!)
  const pointConfigs: Array<[number, number, number, number, number, number]> = [
    [3.5, 2.2, 0.0, 0xffbe63, 12.0, 18], // Central octagonal marble fountain glow
    [10.2, 3.8, -3.2, 0xffae4a, 16.0, 22], // East Moorish colonnade warm arcade glow
    [10.2, 3.8, 5.5, 0xffae4a, 12.0, 18], // South-east arches glow
    [-0.4, 18.8, -18.5, 0xffb347, 26.0, 36], // Minaret crown warm lantern light
    [-3.1, 1.6, 2.5, 0xffb858, 9.0, 16], // Reflecting pool stone-edge lantern light
  ];
  const lanternLights: THREE.PointLight[] = [];
  const lanternBaseIntensities: number[] = [];
  for (const [lx, ly, lz, hex, intensity, distance] of pointConfigs) {
    const pl = new THREE.PointLight(hex, intensity, distance, 1.6);
    pl.position.set(lx, ly, lz);
    root.add(pl);
    lanternLights.push(pl);
    lanternBaseIntensities.push(intensity);
  }

  // --- 12. Golden "Fil d'Or" Guidance Sparkle Trail & Objective Beacon ---
  const filDorCount = 44;
  const filDorMesh = new THREE.InstancedMesh(
    track(new THREE.OctahedronGeometry(0.065, 0)),
    track(
      new THREE.MeshBasicMaterial({
        color: 0xffd97d,
        transparent: true,
        opacity: 0.9,
      })
    ),
    filDorCount
  );
  filDorMesh.frustumCulled = false;
  filDorMesh.visible = false;
  root.add(filDorMesh);

  // Subtle floating golden octagonal objective beacon
  const objectiveBeacon = new THREE.Group();
  const beaconRing = new THREE.Mesh(
    track(new THREE.RingGeometry(0.45, 0.62, 8)),
    track(
      new THREE.MeshBasicMaterial({
        color: 0xf4c86a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
      })
    )
  );
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.y = 0.06;
  objectiveBeacon.add(beaconRing);

  const beaconCrystal = new THREE.Mesh(
    track(new THREE.OctahedronGeometry(0.18, 0)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xffdf8c,
        emissive: new THREE.Color(0xffb840),
        emissiveIntensity: 2.2,
        roughness: 0.2,
      })
    )
  );
  beaconCrystal.position.y = 1.15;
  objectiveBeacon.add(beaconCrystal);
  root.add(objectiveBeacon);

  scene.add(root);

  return {
    root,
    waterMesh,
    fountainWater,
    waterDrops,
    dropPhases,
    lanternLights,
    lanternBaseIntensities,
    filDorMesh,
    filDorVisible: false,
    objectiveBeacon,
    starField,
    palmCrowns,
    dispose: () => {
      scene.remove(root);
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
}

/**
 * Per-frame zero-GC animation of water arcs, lantern warmth flicker, palm sway,
 * and the golden Fil d'Or guidance ribbon.
 */
export function updateCourtyardAnimations(
  refs: CourtyardAnimatedRefs,
  elapsed: number,
  playerPos: THREE.Vector3,
  targetPos: { x: number; y: number; z: number } | null,
  showFilDor: boolean
) {
  // 1. Subtle breathing lantern flicker
  for (let i = 0; i < refs.lanternLights.length; i++) {
    const base = refs.lanternBaseIntensities[i];
    refs.lanternLights[i].intensity =
      base * (0.94 + 0.06 * Math.sin(elapsed * (3.1 + i * 0.7) + i * 1.9));
  }

  // 2. Fountain water arcs (36 pooled droplets arcing out of the marble chalice)
  const dropCount = refs.dropPhases.length;
  for (let i = 0; i < dropCount; i++) {
    const t = (elapsed * 0.65 + refs.dropPhases[i]) % 1;
    const angle = (i / dropCount) * Math.PI * 2 + Math.floor(elapsed * 0.2) * 0.01;
    const r = 0.14 + t * 1.15;
    const y = 1.56 + 0.42 * t - 1.44 * t * t;
    const s = 0.55 + Math.sin(t * Math.PI) * 0.65;
    _dummy.position.set(Math.cos(angle) * r, Math.max(0.55, y), Math.sin(angle) * r);
    _dummy.scale.setScalar(s);
    _dummy.rotation.set(0, 0, 0);
    _dummy.updateMatrix();
    refs.waterDrops.setMatrixAt(i, _dummy.matrix);
  }
  refs.waterDrops.instanceMatrix.needsUpdate = true;

  // 3. Gentle night breeze in palm crowns
  for (let i = 0; i < refs.palmCrowns.length; i++) {
    refs.palmCrowns[i].rotation.z = Math.sin(elapsed * 0.9 + i * 1.4) * 0.035;
    refs.palmCrowns[i].rotation.x = Math.cos(elapsed * 0.75 + i * 1.1) * 0.025;
  }

  // 4. Objective beacon pulse & spin
  if (targetPos) {
    refs.objectiveBeacon.visible = true;
    refs.objectiveBeacon.position.set(targetPos.x, 0, targetPos.z);
    const crystal = refs.objectiveBeacon.children[1];
    if (crystal) {
      crystal.position.y = 1.1 + Math.sin(elapsed * 2.4) * 0.16;
      crystal.rotation.y = elapsed * 1.4;
    }
  } else {
    refs.objectiveBeacon.visible = false;
  }

  // 5. Fil d'Or golden sparkling guide trail from player toward active objective
  refs.filDorMesh.visible = Boolean(showFilDor && targetPos);
  if (refs.filDorMesh.visible && targetPos) {
    const count = refs.filDorMesh.count;
    for (let i = 0; i < count; i++) {
      const frac = ((i / count) + elapsed * 0.22) % 1;
      const px = THREE.MathUtils.lerp(playerPos.x, targetPos.x, frac);
      const pz = THREE.MathUtils.lerp(playerPos.z, targetPos.z, frac);
      const arcY =
        0.95 +
        Math.sin(frac * Math.PI) * 0.85 +
        Math.sin(elapsed * 3.5 + i * 0.7) * 0.12;
      const swirl = Math.sin(frac * Math.PI * 3 + elapsed * 2.2) * 0.25 * Math.sin(frac * Math.PI);
      _dummy.position.set(px + swirl, arcY, pz + swirl * 0.6);
      const scale = Math.sin(frac * Math.PI) * (0.6 + 0.4 * Math.sin(elapsed * 6 + i));
      _dummy.scale.setScalar(Math.max(0.05, scale));
      _dummy.rotation.set(elapsed + i, elapsed * 1.3, 0);
      _dummy.updateMatrix();
      refs.filDorMesh.setMatrixAt(i, _dummy.matrix);

      _color.setHSL(0.11 + frac * 0.03, 0.92, 0.62 + 0.2 * Math.sin(elapsed * 4 + i));
      refs.filDorMesh.setColorAt(i, _color);
    }
    refs.filDorMesh.instanceMatrix.needsUpdate = true;
    if (refs.filDorMesh.instanceColor) {
      refs.filDorMesh.instanceColor.needsUpdate = true;
    }
  }
}
