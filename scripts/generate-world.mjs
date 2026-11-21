#!/usr/bin/env node
/**
 * Nour Al-Maghrib — World Labs Atlas v2 Gaussian Splat (.spz) Generator
 *
 * Official Atlas v2 workflow (https://docs.atlas.worldlabs.ai):
 *   1. POST /api/v2/tasks:atlasTextToImage    -> Generate hero courtyard image
 *   2. POST /api/v2/tasks:images2PosedRGBD    -> Estimate camera pose + linear EXR depth (1280x720)
 *   3. POST /api/v2/tasks:atlasGenerate       -> Synthesize overlapping posed RGBD views (returnDepth: true)
 *   4. POST /api/v2/tasks:posedImages2Splats  -> Reconstruct Gaussian Splat (.spz)
 *   5. Download the resulting .spz asset to public/splats/alqaraouiyine.spz
 *
 * Usage:
 *   node scripts/generate-world.mjs
 *   node scripts/generate-world.mjs --refined            # Full refined splat (~15-21 min)
 *   node scripts/generate-world.mjs --reuse-image <id>   # Reuse an existing Atlas imageAsset ID
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const API_BASE = process.env.WLT_API_BASE_URL || 'https://api.atlas.worldlabs.ai/api/v2';
const API_KEY = process.env.WORLDLABS_API_KEY || process.env.WLT_API_KEY;
const OUTPUT_PATH = path.join(ROOT_DIR, 'public', 'splats', 'alqaraouiyine.spz');
const METADATA_PATH = path.join(ROOT_DIR, 'public', 'splats', 'alqaraouiyine.meta.json');

const EXACT_PROMPT =
  'Photorealistic historic Moroccan Al-Qarawiyyin mosque courtyard in Fes at night, wide eye-level view. Intricate geometric zellige tiled floor with subtle wet reflections, an octagonal marble fountain glowing softly in the center, a large dark reflecting pool on the left bordered by date palms and orange trees, ornate white Moorish arches with green glazed tile roofs on the right, and a towering carved stone minaret illuminated with warm golden lantern light against a deep starry indigo sky with a single crescent moon and distant misty Atlas mountains. Empty courtyard, no people, no text, cinematic realistic lighting, ultra-detailed architecture.';

const args = process.argv.slice(2);
const useRefined = args.includes('--refined');
const reuseImageIndex = args.indexOf('--reuse-image');
const reuseImageAssetId = reuseImageIndex >= 0 ? args[reuseImageIndex + 1] : null;

if (!API_KEY) {
  console.error('[Atlas] Erreur: WORLDLABS_API_KEY est introuvable dans .env');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function idempotencyKey(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

async function atlasRequest(endpoint, { method = 'GET', body = null, idempPrefix = null } = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'WLT-Api-Key': API_KEY,
    Accept: 'application/json',
  };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
  }
  if (idempPrefix) {
    headers['Idempotency-Key'] = idempotencyKey(idempPrefix);
  }

  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (res.ok) {
      return json;
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < maxAttempts) {
      const waitMs = 3000 * Math.pow(2, attempt - 1);
      console.warn(
        `[Atlas] HTTP ${res.status} sur ${endpoint} (tentative ${attempt}/${maxAttempts}), nouvel essai dans ${Math.round(waitMs / 1000)}s...`
      );
      await sleep(waitMs);
      continue;
    }

    const err = new Error(
      `Atlas API HTTP ${res.status} on ${endpoint}: ${JSON.stringify(json)}`
    );
    err.status = res.status;
    err.body = json;
    throw err;
  }
}

async function pollOperation(operationId, label, { pollIntervalMs = 4000, timeoutMs = 25 * 60_000 } = {}) {
  const start = Date.now();
  let lastState = '';
  let ticks = 0;

  while (Date.now() - start < timeoutMs) {
    ticks++;
    let op;
    try {
      op = await atlasRequest(`/operations/${operationId}`);
    } catch (err) {
      if (err.status === 404 && ticks <= 6) {
        console.log(`[Atlas] ${label} (${operationId}): opération en cours d'enregistrement...`);
        await sleep(pollIntervalMs);
        continue;
      }
      throw err;
    }

    const state = op?.metadata?.state || op?.metadata?.status || (op?.done ? 'DONE' : 'RUNNING');
    const elapsedSec = Math.round((Date.now() - start) / 1000);

    if (state !== lastState || ticks % 3 === 0) {
      const desc = op?.metadata?.description ? ` — ${op.metadata.description}` : '';
      console.log(`[Atlas] ${label} [${elapsedSec}s] état: ${state}${desc}`);
      lastState = state;
    }

    if (op?.done) {
      if (op.error) {
        const reason = op.error?.details?.[0]?.reason || 'UNKNOWN';
        const err = new Error(
          `Opération ${label} (${operationId}) échouée [${reason}]: ${op.error.message || JSON.stringify(op.error)}`
        );
        err.reason = reason;
        err.operation = op;
        throw err;
      }
      return op;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`Timeout en attendant l'opération ${label} (${operationId})`);
}

async function submitAndPollWithThrottleRetry(endpoint, body, label, { maxRetries = 3 } = {}) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[Atlas] Soumission de ${label} (tentative ${attempt}/${maxRetries})...`);
    const submission = await atlasRequest(endpoint, {
      method: 'POST',
      body,
      idempPrefix: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    });

    if (!submission?.id) {
      throw new Error(`Réponse inattendue de ${endpoint}: pas d'ID d'opération`);
    }
    console.log(`[Atlas] ${label} soumis -> operationId=${submission.id}`);

    if (submission.done && !submission.error && submission.response) {
      return submission;
    }

    try {
      return await pollOperation(submission.id, label);
    } catch (err) {
      if (err.reason === 'THROTTLED' && attempt < maxRetries) {
        const backoff = 8000 * attempt;
        console.warn(
          `[Atlas] Service surchargé (THROTTLED) sur ${label}. Nouvelle tentative dans ${backoff / 1000}s...`
        );
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Build quaternion [x, y, z, w] for yaw (rotation around +Y in RUB coordinates).
 */
function yawQuaternion(radians) {
  const half = radians / 2;
  return [0, Math.sin(half), 0, Math.cos(half)];
}

/**
 * Multiply two quaternions [x, y, z, w].
 */
function multiplyQuat(a, b) {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/**
 * Generate well-distributed overlapping eye-level target cameras around the base camera.
 * Keeps camera translation non-zero so Atlas recovers metric scale cleanly.
 */
function buildTargetCameras(baseCamera) {
  const [bx, by, bz] = baseCamera.extrinsics.position;
  const baseQuat = baseCamera.extrinsics.quaternion || [0, 0, 0, 1];
  const coordSys = baseCamera.extrinsics.coordinateSystem || 'rub';
  const intrinsics = {
    width: baseCamera.intrinsics.width || 1280,
    height: baseCamera.intrinsics.height || 720,
    fx: baseCamera.intrinsics.fx || 900,
    fy: baseCamera.intrinsics.fy || 900,
    cx: baseCamera.intrinsics.cx || 640,
    cy: baseCamera.intrinsics.cy || 360,
  };

  const offsets = [
    { dx: -1.4, dy: 0.0, dz: 0.25, yawDeg: -10 },
    { dx: 1.4, dy: 0.0, dz: 0.25, yawDeg: 10 },
    { dx: -0.7, dy: 0.05, dz: -1.35, yawDeg: -5 },
    { dx: 0.7, dy: 0.05, dz: -1.35, yawDeg: 5 },
    { dx: -2.2, dy: 0.1, dz: -0.6, yawDeg: -18 },
    { dx: 2.2, dy: 0.1, dz: -0.6, yawDeg: 18 },
  ];

  return offsets.map(({ dx, dy, dz, yawDeg }) => ({
    extrinsics: {
      position: [bx + dx, by + dy, bz + dz],
      quaternion: multiplyQuat(baseQuat, yawQuaternion((yawDeg * Math.PI) / 180)),
      coordinateSystem: coordSys,
    },
    intrinsics,
  }));
}

async function resolveAssetDownloadUrl(assetObj) {
  if (assetObj?.url) return assetObj.url;
  if (!assetObj?.assetId) {
    throw new Error('Asset SPZ invalide (ni url ni assetId)');
  }
  const res = await atlasRequest(`/assets/${assetObj.assetId}:createReadUrl`, {
    method: 'POST',
  });
  if (!res?.readUrl) {
    throw new Error(`Impossible de créer une readUrl pour ${assetObj.assetId}`);
  }
  return res.readUrl;
}

async function downloadFile(url, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Téléchargement SPZ échoué (HTTP ${res.status})`);
  }
  const arrayBuf = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuf));
  return arrayBuf.byteLength;
}

async function main() {
  console.log('================================================================');
  console.log('  Nour Al-Maghrib — Génération 3D World Labs Atlas v2 (.spz)');
  console.log('================================================================');

  // 0. Health check
  const health = await fetch(`${API_BASE}/health`);
  if (!health.ok) {
    throw new Error(`Atlas API inaccessible (HTTP ${health.status})`);
  }
  const healthJson = await health.json();
  console.log(`[Atlas] API opérationnelle: ${healthJson.service} (${healthJson.status})`);

  // 1. Text -> Image (or reuse provided assetId)
  let heroImageAsset;
  let textToImageOpId = null;

  if (reuseImageAssetId) {
    console.log(`[Atlas] Étape 1/4: Réutilisation de l'image assetId=${reuseImageAssetId}`);
    heroImageAsset = { assetId: reuseImageAssetId };
  } else {
    console.log('[Atlas] Étape 1/4: Génération de la vue clé (atlasTextToImage)...');
    const t2iOp = await submitAndPollWithThrottleRetry(
      '/tasks:atlasTextToImage',
      {
        prompt: EXACT_PROMPT,
        aspectRatio: '16:9',
        enhancePrompt: false,
        seed: 1446,
      },
      'atlasTextToImage'
    );
    textToImageOpId = t2iOp.id;
    heroImageAsset = t2iOp.response?.frames?.[0]?.imageAsset;
    if (!heroImageAsset?.assetId) {
      throw new Error(`atlasTextToImage n'a pas renvoyé d'imageAsset: ${JSON.stringify(t2iOp.response)}`);
    }
    console.log(`[Atlas] Image générée -> assetId=${heroImageAsset.assetId}`);
  }

  // 2. Image -> Posed RGBD (1280x720 grid required by posedImages2Splats)
  console.log('[Atlas] Étape 2/4: Estimation caméra & profondeur (images2PosedRGBD 1280x720)...');
  const poseOp = await submitAndPollWithThrottleRetry(
    '/tasks:images2PosedRGBD',
    {
      frames: [{ imageAsset: { assetId: heroImageAsset.assetId } }],
      targetResolution: [1280, 720],
    },
    'images2PosedRGBD'
  );

  const baseFrame = poseOp.response?.frames?.[0];
  if (!baseFrame?.camera || !baseFrame?.depth?.depthAsset?.assetId) {
    throw new Error(`images2PosedRGBD n'a pas renvoyé caméra + profondeur: ${JSON.stringify(poseOp.response)}`);
  }
  console.log(`[Atlas] Pose estimée -> depthAsset=${baseFrame.depth.depthAsset.assetId}`);

  const contextFrame = {
    imageAsset: { assetId: baseFrame.imageAsset.assetId },
    camera: baseFrame.camera,
    depth: { depthAsset: { assetId: baseFrame.depth.depthAsset.assetId } },
  };

  // 3. Multi-view RGBD synthesis (atlasGenerate with returnDepth: true)
  console.log('[Atlas] Étape 3/4: Synthèse de 6 vues cohérentes 3D (atlasGenerate)...');
  const targetCameras = buildTargetCameras(baseFrame.camera);
  const genOp = await submitAndPollWithThrottleRetry(
    '/tasks:atlasGenerate',
    {
      contextFrames: [contextFrame],
      targetCameras,
      prompt: EXACT_PROMPT,
      enhancePrompt: false,
      returnDepth: true,
    },
    'atlasGenerate'
  );

  const generatedFrames = (genOp.response?.frames || [])
    .filter((f) => f?.imageAsset?.assetId && f?.camera && f?.depth?.depthAsset?.assetId)
    .map((f) => ({
      imageAsset: { assetId: f.imageAsset.assetId },
      camera: f.camera,
      depth: { depthAsset: { assetId: f.depth.depthAsset.assetId } },
    }));

  const posedFrames = [contextFrame, ...generatedFrames];
  if (posedFrames.length < 2) {
    throw new Error(`Nombre de vues posées insuffisant (${posedFrames.length})`);
  }
  console.log(`[Atlas] ${posedFrames.length} vues RGBD posées prêtes pour la reconstruction Gaussian Splat.`);

  // 4. Reconstruct Gaussian Splats (.spz)
  console.log(
    `[Atlas] Étape 4/4: Reconstruction Gaussian Splat (.spz) en mode ${useRefined ? 'REFINED' : 'DRAFT'}...`
  );
  const splatOp = await submitAndPollWithThrottleRetry(
    '/tasks:posedImages2Splats',
    {
      posedFrames,
      prompt: EXACT_PROMPT,
      enhancePrompt: false,
      refine: useRefined,
    },
    'posedImages2Splats'
  );

  const response = splatOp.response || {};
  let spzAsset = null;
  let splatVariant = 'draft';

  if (useRefined && response.refinedSplats && Object.keys(response.refinedSplats).length > 0) {
    // Pick the highest splat count published
    const keys = Object.keys(response.refinedSplats).sort((a, b) => Number(b) - Number(a));
    splatVariant = `refined_${keys[0]}`;
    spzAsset = response.refinedSplats[keys[0]];
  } else if (response.draftSplat) {
    spzAsset = response.draftSplat;
  } else if (response.refinedSplats && Object.keys(response.refinedSplats).length > 0) {
    const keys = Object.keys(response.refinedSplats).sort((a, b) => Number(b) - Number(a));
    splatVariant = `refined_${keys[0]}`;
    spzAsset = response.refinedSplats[keys[0]];
  }

  if (!spzAsset) {
    throw new Error(`Aucun asset .spz trouvé dans la réponse: ${JSON.stringify(response)}`);
  }

  // 5. Download .spz file to public/splats/alqaraouiyine.spz
  console.log(`[Atlas] Téléchargement du fichier Gaussian Splat (${splatVariant})...`);
  const downloadUrl = await resolveAssetDownloadUrl(spzAsset);
  const byteLength = await downloadFile(downloadUrl, OUTPUT_PATH);

  const metadata = {
    generatedAt: new Date().toISOString(),
    prompt: EXACT_PROMPT,
    variant: splatVariant,
    bytes: byteLength,
    operations: {
      atlasTextToImage: textToImageOpId,
      images2PosedRGBD: poseOp.id,
      atlasGenerate: genOp.id,
      posedImages2Splats: splatOp.id,
    },
    splatAssetId: spzAsset.assetId || null,
  };
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2));

  console.log('================================================================');
  console.log(`[Atlas] SUCCÈS ! Fichier téléchargé: ${OUTPUT_PATH}`);
  console.log(`[Atlas] Taille: ${(byteLength / (1024 * 1024)).toFixed(2)} Mo (${splatVariant})`);
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\n[Atlas] ÉCHEC DE LA GÉNÉRATION:', err.message);
  process.exit(1);
});
