import * as THREE from 'three';

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

/**
 * Generates intricate Moroccan Fes zellige star mosaic color + roughness/bump maps.
 */
export function createZelligeTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const [cColor, ctx] = createCanvas(size);
  const [cRough, rCtx] = createCanvas(size);
  const [cBump, bCtx] = createCanvas(size);

  // Base mortar
  ctx.fillStyle = '#1b273c';
  ctx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#b0b0b0'; // Grout is matte
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#303030'; // Grout recessed
  bCtx.fillRect(0, 0, size, size);

  const cells = 4;
  const step = size / cells;

  for (let gx = 0; gx < cells; gx++) {
    for (let gy = 0; gy < cells; gy++) {
      const cx = (gx + 0.5) * step;
      const cy = (gy + 0.5) * step;
      const rOuter = step * 0.44;
      const rInner = step * 0.22;

      // Background ivory-slate diamond tile
      ctx.fillStyle = (gx + gy) % 2 === 0 ? '#cfc7b8' : '#b8b2a6';
      ctx.beginPath();
      ctx.moveTo(cx, cy - step * 0.48);
      ctx.lineTo(cx + step * 0.48, cy);
      ctx.lineTo(cx, cy + step * 0.48);
      ctx.lineTo(cx - step * 0.48, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1d2738';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Roughness: glazed ceramic has glossy wet sheen (low value = shiny)
      rCtx.fillStyle = (gx + gy) % 2 === 0 ? '#3a3a3a' : '#4a4a4a';
      rCtx.beginPath();
      rCtx.moveTo(cx, cy - step * 0.47);
      rCtx.lineTo(cx + step * 0.47, cy);
      rCtx.lineTo(cx, cy + step * 0.47);
      rCtx.lineTo(cx - step * 0.47, cy);
      rCtx.closePath();
      rCtx.fill();

      bCtx.fillStyle = '#c8c8c8';
      bCtx.beginPath();
      bCtx.moveTo(cx, cy - step * 0.46);
      bCtx.lineTo(cx + step * 0.46, cy);
      bCtx.lineTo(cx, cy + step * 0.46);
      bCtx.lineTo(cx - step * 0.46, cy);
      bCtx.closePath();
      bCtx.fill();

      // 8-pointed Moroccan star (Khatam)
      const drawStar = (
        targetCtx: CanvasRenderingContext2D,
        radiusO: number,
        radiusI: number,
        fill: string,
        stroke?: string
      ) => {
        targetCtx.beginPath();
        for (let i = 0; i < 16; i++) {
          const angle = (i * Math.PI) / 8;
          const r = i % 2 === 0 ? radiusO : radiusI;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) targetCtx.moveTo(x, y);
          else targetCtx.lineTo(x, y);
        }
        targetCtx.closePath();
        targetCtx.fillStyle = fill;
        targetCtx.fill();
        if (stroke) {
          targetCtx.strokeStyle = stroke;
          targetCtx.lineWidth = 2;
          targetCtx.stroke();
        }
      };

      drawStar(ctx, rOuter, rInner, '#1e3a5f', '#e5dbc7');
      drawStar(ctx, rInner * 0.92, rInner * 0.48, (gx + gy) % 2 === 0 ? '#1f6454' : '#b4823c');
      drawStar(rCtx, rOuter, rInner, '#222222');
      drawStar(bCtx, rOuter, rInner, '#ececec');

      // Corner emerald/cobalt accents
      const corners = [
        [gx * step, gy * step],
        [(gx + 1) * step, gy * step],
        [gx * step, (gy + 1) * step],
        [(gx + 1) * step, (gy + 1) * step],
      ];
      for (const [px, py] of corners) {
        ctx.fillStyle = '#244b6d';
        ctx.beginPath();
        ctx.arc(px, py, step * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d9cfbc';
        ctx.lineWidth = 2;
        ctx.stroke();

        rCtx.fillStyle = '#262626';
        rCtx.beginPath();
        rCtx.arc(px, py, step * 0.13, 0, Math.PI * 2);
        rCtx.fill();
      }
    }
  }

  // Subtle wet reflection patches across the zellige floor
  for (let i = 0; i < 14; i++) {
    const wx = ((i * 173) % size);
    const wy = ((i * 251) % size);
    const rad = 45 + (i % 4) * 24;
    const grad = rCtx.createRadialGradient(wx, wy, 4, wx, wy, rad);
    grad.addColorStop(0, 'rgba(18, 18, 18, 0.72)');
    grad.addColorStop(1, 'rgba(60, 60, 60, 0)');
    rCtx.fillStyle = grad;
    rCtx.beginPath();
    rCtx.arc(wx, wy, rad, 0, Math.PI * 2);
    rCtx.fill();
  }

  const map = new THREE.CanvasTexture(cColor);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(9, 10);
  map.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(cRough);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(9, 10);
  roughnessMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(9, 10);
  bumpMap.anisotropy = maxAnisotropy;

  return { map, roughnessMap, bumpMap };
}

/**
 * Generates carved white Moroccan stucco (gebs) with intricate sebka filigree.
 */
export function createCarvedStuccoTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const [cColor, ctx] = createCanvas(size);
  const [cBump, bCtx] = createCanvas(size);

  ctx.fillStyle = '#ddd6c8';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#909090';
  bCtx.fillRect(0, 0, size, size);

  // Intricate sebka diamond lattice carving
  const step = 32;
  ctx.strokeStyle = '#b9b09f';
  ctx.lineWidth = 2.5;
  bCtx.strokeStyle = '#ffffff';
  bCtx.lineWidth = 3;

  for (let y = -step; y <= size + step; y += step) {
    for (let x = -step; x <= size + step; x += step) {
      const ox = (Math.floor(y / step) % 2) * (step / 2);
      ctx.beginPath();
      ctx.moveTo(x + ox, y);
      ctx.quadraticCurveTo(x + ox + step * 0.25, y + step * 0.5, x + ox + step * 0.5, y + step);
      ctx.quadraticCurveTo(x + ox + step * 0.75, y + step * 0.5, x + ox + step, y);
      ctx.stroke();

      bCtx.beginPath();
      bCtx.moveTo(x + ox, y);
      bCtx.quadraticCurveTo(x + ox + step * 0.25, y + step * 0.5, x + ox + step * 0.5, y + step);
      bCtx.quadraticCurveTo(x + ox + step * 0.75, y + step * 0.5, x + ox + step, y);
      bCtx.stroke();
    }
  }

  // Horizontal calligraphic frieze band at bottom
  ctx.fillStyle = '#c8beac';
  ctx.fillRect(0, size - 24, size, 24);
  bCtx.fillStyle = '#d4d4d4';
  bCtx.fillRect(0, size - 22, size, 18);

  const map = new THREE.CanvasTexture(cColor);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

/**
 * Generates carved warm honey-sandstone minaret texture with sebka relief.
 */
export function createMinaretStoneTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const [cColor, ctx] = createCanvas(size);
  const [cBump, bCtx] = createCanvas(size);

  // Warm carved ochre/honey sandstone gradient
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#c7a477');
  grad.addColorStop(0.5, '#b68e5e');
  grad.addColorStop(1, '#9a7549');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Masonry stone courses
  ctx.strokeStyle = 'rgba(72, 48, 25, 0.28)';
  ctx.lineWidth = 2;
  bCtx.strokeStyle = '#3c3c3c';
  bCtx.lineWidth = 2;
  for (let y = 0; y < size; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(0, y);
    bCtx.lineTo(size, y);
    bCtx.stroke();
  }

  // Central carved sebka recessed panel
  const padX = 64;
  const padY = 48;
  ctx.strokeStyle = '#6f4d27';
  ctx.lineWidth = 5;
  ctx.strokeRect(padX, padY, size - padX * 2, size - padY * 2);

  bCtx.strokeStyle = '#ffffff';
  bCtx.lineWidth = 5;
  bCtx.strokeRect(padX, padY, size - padX * 2, size - padY * 2);

  const cell = 36;
  ctx.strokeStyle = '#7b552c';
  ctx.lineWidth = 2.5;
  bCtx.strokeStyle = '#dcdcdc';
  bCtx.lineWidth = 3;

  for (let y = padY + 8; y < size - padY - 12; y += cell) {
    for (let x = padX + 8; x < size - padX - 12; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x + cell / 2, y);
      ctx.lineTo(x + cell, y + cell / 2);
      ctx.lineTo(x + cell / 2, y + cell);
      ctx.lineTo(x, y + cell / 2);
      ctx.closePath();
      ctx.stroke();

      bCtx.beginPath();
      bCtx.moveTo(x + cell / 2, y);
      bCtx.lineTo(x + cell, y + cell / 2);
      bCtx.lineTo(x + cell / 2, y + cell);
      bCtx.lineTo(x, y + cell / 2);
      bCtx.closePath();
      bCtx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(cColor);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

/**
 * Generates glossy emerald-green Moroccan glazed barrel roof tiles (Qarmoud).
 */
export function createEmeraldTileTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const [cColor, ctx] = createCanvas(size);
  const [cBump, bCtx] = createCanvas(size);

  const cols = 8;
  const rows = 8;
  const cw = size / cols;
  const ch = size / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw;
      const y = r * ch;
      const grad = ctx.createLinearGradient(x, y, x + cw, y);
      grad.addColorStop(0, '#0a3326');
      grad.addColorStop(0.45, '#196b4d');
      grad.addColorStop(0.7, '#228761');
      grad.addColorStop(1, '#08261c');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, cw, ch);

      // Horizontal lip shadow
      ctx.fillStyle = 'rgba(4, 16, 12, 0.55)';
      ctx.fillRect(x, y + ch - 4, cw, 4);

      const bGrad = bCtx.createLinearGradient(x, y, x + cw, y);
      bGrad.addColorStop(0, '#303030');
      bGrad.addColorStop(0.5, '#f0f0f0');
      bGrad.addColorStop(1, '#303030');
      bCtx.fillStyle = bGrad;
      bCtx.fillRect(x, y, cw, ch);
      bCtx.fillStyle = '#181818';
      bCtx.fillRect(x, y + ch - 3, cw, 3);
    }
  }

  const map = new THREE.CanvasTexture(cColor);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 2);
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 2);
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

/**
 * Soft radial contact shadow texture for grounded architectural props & lanterns.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const [canvas, ctx] = createCanvas(size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(4, 7, 14, 0.65)');
  grad.addColorStop(0.55, 'rgba(4, 7, 14, 0.28)');
  grad.addColorStop(1, 'rgba(4, 7, 14, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Generates a luminous crescent moon decal texture for the Fes night sky.
 */
export function createCrescentMoonTexture(): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = createCanvas(size);
  ctx.clearRect(0, 0, size, size);

  // Soft outer moonlight halo
  const halo = ctx.createRadialGradient(128, 128, 22, 128, 128, 122);
  halo.addColorStop(0, 'rgba(225, 238, 255, 0.45)');
  halo.addColorStop(0.45, 'rgba(150, 185, 235, 0.14)');
  halo.addColorStop(1, 'rgba(100, 140, 210, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  // Crisp waxing crescent moon
  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 128, 44, 0, Math.PI * 2);
  ctx.fillStyle = '#f8fbff';
  ctx.fill();

  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(110, 118, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
