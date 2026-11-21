import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SparkRenderer, SplatFileType, SplatMesh } from '@sparkjsdev/spark';
import {
  MIN_EYE_HEIGHT,
  clampPlayerHeight,
  computeMovementDelta,
  horizontalDistance,
  mapKeyToMovementAction,
  resolveCourtyardPosition,
} from '../game/engineLogic';
import { moroccanAudio } from '../game/audio';
import type {
  GameScreen,
  HudTelemetry,
  MissionObjective,
  MovementInputState,
  RenderSourceMode,
  Vec3Tuple,
} from '../game/types';
import {
  buildAlQarawiyyinCourtyard,
  updateCourtyardAnimations,
  type CourtyardAnimatedRefs,
} from './alQarawiyyinCourtyard';

const SPLAT_URL = '/splats/alqaraouiyine.spz';

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export interface SparkEngineCallbacks {
  onTelemetry: (telemetry: HudTelemetry) => void;
  onInteractRequest: () => void;
  onPointerLockChange: (locked: boolean) => void;
}

export class SparkCourtyardEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: PointerLockControls;
  private isSoftwareGl: boolean;

  private sparkRenderer: SparkRenderer | null = null;
  private atlasSplatMesh: SplatMesh | null = null;
  private courtyardRefs: CourtyardAnimatedRefs;

  private splatStatus: 'checking' | 'loaded' | 'fallback' = 'checking';
  private splatInfo = 'Vérification de /splats/alqaraouiyine.spz...';
  private renderSourceMode: RenderSourceMode = 'courtyard-3d';

  private screen: GameScreen = 'title';
  private cinematicMode = false;
  private showFilDor = false;
  private activeObjective: MissionObjective | null = null;
  private mouseSensitivity = 1.0;

  private keys: MovementInputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  };

  // Drag-look fallback when pointer lock is unavailable (e.g. iframe / touch / non-locked exploration)
  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private yaw = 0.04;
  private pitch = 0.05;
  private targetYaw = 0.04;
  private targetPitch = 0.05;

  private playerPos = new THREE.Vector3(0.4, MIN_EYE_HEIGHT, 11.2);
  private velocityX = 0;
  private velocityZ = 0;
  private walkBobPhase = 0;
  private stepDistAccum = 0;

  private callbacks: SparkEngineCallbacks;
  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private elapsed = 0;

  // FPS measurement (EMA smoothed so active rendering never shows 0 FPS)
  private smoothedFps = 60;
  private currentFps = 60;
  private lastTelemetryEmit = 0;

  // Pre-allocated scratch helpers (zero GC in render loop)
  private readonly _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly _lookTarget = new THREE.Vector3();

  constructor(container: HTMLElement, callbacks: SparkEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();

    // 1. Renderer (pixelRatio capped at 2 max for smooth 60 FPS; antialias: false recommended by SparkRenderer)
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'courtyard-canvas');
    container.appendChild(this.renderer.domElement);

    // 2. Scene, Sky & Horizon-matched Nocturnal Indigo Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x091326);
    this.scene.fog = new THREE.FogExp2(0x0c172b, 0.0145);

    // Procedural Studio Environment Map for metallic brass & wet zellige reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmrem.dispose();

    // 3. First-Person Perspective Camera
    const aspect =
      (container.clientWidth || window.innerWidth) /
      Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.1, 160);
    this.camera.position.copy(this.playerPos);

    // 4. PointerLockControls (official Three.js first-person 360° look)
    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.controls.addEventListener('lock', () => {
      this.syncYawPitchFromCamera();
      this.callbacks.onPointerLockChange(true);
    });
    this.controls.addEventListener('unlock', () => {
      this.syncYawPitchFromCamera();
      this.callbacks.onPointerLockChange(false);
    });

    // 5. Build Al-Qarawiyyin Architectural Courtyard (always available + instant first frame)
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.courtyardRefs = buildAlQarawiyyinCourtyard(this.scene, maxAniso, this.isSoftwareGl);

    // 6. Initialize SparkRenderer & probe /splats/alqaraouiyine.spz asynchronously
    this.initSparkAndLoadSplat();

    // Pre-warm shaders on hardware GPUs
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  private async initSparkAndLoadSplat() {
    try {
      const response = await fetch(SPLAT_URL, { method: 'GET' });
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const buffer = response.ok ? await response.arrayBuffer() : null;

      // Guard against Vite SPA index.html fallback when file doesn't exist
      const looksLikeHtml = contentType.includes('text/html');
      if (!buffer || buffer.byteLength < 256 || looksLikeHtml) {
        this.splatStatus = 'fallback';
        this.splatInfo = 'Cour 3D Temps Réel (exécutez generate-world.mjs pour .spz Atlas)';
        this.emitTelemetryNow();
        return;
      }

      // Valid World Labs Atlas .spz Gaussian Splat detected!
      this.sparkRenderer = new SparkRenderer({ renderer: this.renderer });
      this.scene.add(this.sparkRenderer);

      const splatMesh = new SplatMesh({
        fileBytes: new Uint8Array(buffer),
        fileType: SplatFileType.SPZ,
      });
      // Atlas v2 uses RUB (Right-Up-Back), identical to Three.js!
      // Base camera in Atlas pose is y=1.43m, so shifting splat by +0.22m aligns eye-level cleanly with y >= 1.65m.
      splatMesh.position.set(0, 0.22, 0);
      splatMesh.rotation.set(0, 0, 0);
      this.scene.add(splatMesh);

      // Wait until SparkJS worker finishes unpacking the .spz splats before hiding the fallback courtyard
      await splatMesh.initialized;
      if (this.disposed) {
        this.scene.remove(splatMesh);
        splatMesh.dispose();
        return;
      }

      this.atlasSplatMesh = splatMesh;
      this.splatStatus = 'loaded';
      this.renderSourceMode = 'atlas-splat';
      this.setCourtyardArchitectureVisible(false);
      // Center player cleanly inside the photorealistic Atlas SPZ sweet spot
      this.playerPos.set(0, MIN_EYE_HEIGHT, 0.2);
      this.yaw = 0;
      this.targetYaw = 0;
      this.pitch = 0.02;
      this.targetPitch = 0.02;
      this.splatInfo = `Atlas Gaussian Splat (.spz — ${(buffer.byteLength / (1024 * 1024)).toFixed(2)} Mo)`;
      this.emitTelemetryNow();
    } catch {
      this.splatStatus = 'fallback';
      this.splatInfo = 'Cour 3D Al-Qarawiyyin (Mode Temps Réel)';
      this.emitTelemetryNow();
    }
  }

  private setCourtyardArchitectureVisible(visible: boolean) {
    // Keep Fil d'Or and Objective Beacon visible even when viewing the Atlas Gaussian Splat!
    for (const child of this.courtyardRefs.root.children) {
      if (child === this.courtyardRefs.filDorMesh || child === this.courtyardRefs.objectiveBeacon) {
        continue;
      }
      child.visible = visible;
    }
  }

  public setRenderSourceMode(mode: RenderSourceMode) {
    if (mode === 'atlas-splat' && this.atlasSplatMesh && this.sparkRenderer) {
      this.renderSourceMode = 'atlas-splat';
      if (!this.atlasSplatMesh.parent) this.scene.add(this.atlasSplatMesh);
      if (!this.sparkRenderer.parent) this.scene.add(this.sparkRenderer);
      this.atlasSplatMesh.visible = true;
      this.sparkRenderer.visible = true;
      this.setCourtyardArchitectureVisible(false);
      this.playerPos.set(0, MIN_EYE_HEIGHT, 0.2);
      this.yaw = 0;
      this.targetYaw = 0;
      this.pitch = 0.02;
      this.targetPitch = 0.02;
    } else {
      this.renderSourceMode = 'courtyard-3d';
      if (this.atlasSplatMesh) {
        this.atlasSplatMesh.visible = false;
        this.scene.remove(this.atlasSplatMesh);
      }
      if (this.sparkRenderer) {
        this.sparkRenderer.visible = false;
        this.scene.remove(this.sparkRenderer);
      }
      this.setCourtyardArchitectureVisible(true);
      this.playerPos.set(0.4, MIN_EYE_HEIGHT, 11.2);
      this.yaw = 0.04;
      this.targetYaw = 0.04;
      this.pitch = 0.04;
      this.targetPitch = 0.04;
    }
    this.camera.position.copy(this.playerPos);
    this.applyYawPitchToCamera();
    this.emitTelemetryNow();
  }

  public getRenderSourceMode(): RenderSourceMode {
    return this.renderSourceMode;
  }

  public setScreen(screen: GameScreen) {
    this.screen = screen;
    if (screen !== 'playing') {
      this.clearHeldKeys();
      this.unlockPointer();
    } else {
      // Snap cleanly to eye level when entering gameplay
      if (this.renderSourceMode === 'atlas-splat') {
        this.playerPos.set(0, MIN_EYE_HEIGHT, 0.2);
        this.yaw = 0;
        this.targetYaw = 0;
        this.pitch = 0.02;
        this.targetPitch = 0.02;
      }
      this.playerPos.y = clampPlayerHeight(this.playerPos.y);
      this.camera.position.copy(this.playerPos);
      this.applyYawPitchToCamera();
    }
  }

  public spawnAt(pos: Vec3Tuple, yawRad: number) {
    if (this.renderSourceMode === 'atlas-splat') {
      this.playerPos.set(0, MIN_EYE_HEIGHT, 0.2);
      this.yaw = 0;
      this.targetYaw = 0;
      this.pitch = 0.02;
      this.targetPitch = 0.02;
    } else {
      this.playerPos.set(pos.x, clampPlayerHeight(pos.y), pos.z);
      this.yaw = yawRad;
      this.targetYaw = yawRad;
      this.pitch = 0.04;
      this.targetPitch = 0.04;
    }
    this.velocityX = 0;
    this.velocityZ = 0;
    this.camera.position.copy(this.playerPos);
    this.applyYawPitchToCamera();
  }

  public setActiveObjective(objective: MissionObjective | null) {
    this.activeObjective = objective;
  }

  public setShowFilDor(show: boolean) {
    this.showFilDor = show;
  }

  public setCinematicMode(enabled: boolean) {
    this.cinematicMode = enabled;
    if (enabled) {
      this.unlockPointer();
    }
  }

  public setMouseSensitivity(sens: number) {
    this.mouseSensitivity = Math.min(2.5, Math.max(0.3, sens));
  }

  public togglePointerLock() {
    if (this.controls.isLocked) {
      this.unlockPointer();
    } else {
      this.lockPointer();
    }
  }

  public lockPointer() {
    if (this.screen !== 'playing') return;
    try {
      this.cinematicMode = false;
      this.controls.lock();
    } catch {
      // Pointer lock may be blocked in headless/iframe environments; drag-look remains active
    }
  }

  public unlockPointer() {
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    } catch {
      // ignore
    }
  }

  public clearHeldKeys() {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.sprint = false;
    this.isDraggingLook = false;
  }

  private syncYawPitchFromCamera() {
    this._euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = this._euler.y;
    this.pitch = THREE.MathUtils.clamp(this._euler.x, -Math.PI * 0.44, Math.PI * 0.44);
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
  }

  private applyYawPitchToCamera() {
    this._euler.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(this._euler);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.screen !== 'playing') return;
    const action = mapKeyToMovementAction(e.code, e.key);
    if (action) {
      this.keys[action] = true;
    }
    if ((e.code === 'KeyE' || e.key.toLowerCase() === 'e') && !e.repeat) {
      this.callbacks.onInteractRequest();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const action = mapKeyToMovementAction(e.code, e.key);
    if (action) {
      this.keys[action] = false;
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.screen !== 'playing' || this.controls.isLocked) return;
    if (e.button !== 0) return;
    this.isDraggingLook = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.screen !== 'playing' || !this.isDraggingLook || this.controls.isLocked) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    const sens = 0.0032 * this.mouseSensitivity;
    this.targetYaw -= dx * sens;
    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch - dy * sens,
      -Math.PI * 0.42,
      Math.PI * 0.42
    );
  };

  private onPointerUp = () => {
    this.isDraggingLook = false;
  };

  private onWindowBlur = () => {
    this.clearHeldKeys();
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.clearHeldKeys();
    }
  };

  private onResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
  };

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('resize', this.onResize);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  private unbindEvents() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('resize', this.onResize);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;

      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      this.elapsed += dt;

      // Instantaneous + EMA FPS counter (always >= 1 when actively rendering)
      if (rawDt > 0.0005) {
        const instFps = Math.min(240, 1 / rawDt);
        this.smoothedFps = this.smoothedFps * 0.82 + instFps * 0.18;
        this.currentFps = Math.max(1, Math.round(this.smoothedFps));
      }

      this.updateCamera(dt);

      // Strict global floor height invariant: NEVER allow camera below y = 1.65m!
      this.camera.position.y = clampPlayerHeight(this.camera.position.y, MIN_EYE_HEIGHT);

      const activeTarget = this.getActiveObjectiveTargetPos();
      updateCourtyardAnimations(
        this.courtyardRefs,
        this.elapsed,
        this.playerPos,
        this.screen === 'playing' ? activeTarget : null,
        this.screen === 'playing' && this.showFilDor
      );

      this.renderer.render(this.scene, this.camera);

      // Throttled HUD telemetry (~8 Hz so React never re-renders at 60Hz)
      if (now - this.lastTelemetryEmit >= 125) {
        this.lastTelemetryEmit = now;
        this.emitTelemetryNow();
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  private updateCamera(dt: number) {
    if (this.screen === 'title' || this.screen === 'missions') {
      if (this.renderSourceMode === 'atlas-splat') {
        const sway = Math.sin(this.elapsed * 0.22);
        const lift = Math.cos(this.elapsed * 0.18);
        this.camera.position.set(
          sway * 0.55,
          clampPlayerHeight(1.74 + lift * 0.07),
          0.25 + Math.sin(this.elapsed * 0.14) * 0.3
        );
        this._lookTarget.set(sway * 0.2, 1.85, -8.5);
        this.camera.lookAt(this._lookTarget);
        return;
      }

      // Sweeping atmospheric night-courtyard vista showcasing Minaret, Pool, Fountain & Arches (Image 1 & 4)
      const sway = Math.sin(this.elapsed * 0.14);
      const lift = Math.cos(this.elapsed * 0.11);
      this.camera.position.set(
        -0.8 + sway * 2.8,
        clampPlayerHeight(4.6 + lift * 0.55),
        14.2 + Math.sin(this.elapsed * 0.09) * 1.6
      );
      this._lookTarget.set(0.8, 3.6, -12.5);
      this.camera.lookAt(this._lookTarget);
      return;
    }

    if (this.screen === 'playing' && this.cinematicMode) {
      if (this.renderSourceMode === 'atlas-splat') {
        const t = this.elapsed * 0.28;
        this.camera.position.set(
          Math.sin(t) * 1.45,
          clampPlayerHeight(1.85 + Math.cos(t * 0.8) * 0.18),
          -0.4 + Math.cos(t * 0.7) * 1.15
        );
        this._lookTarget.set(0, 1.9, -9.0);
        this.camera.lookAt(this._lookTarget);
        return;
      }
      const orbitAngle = this.elapsed * 0.22;
      this.camera.position.set(
        Math.sin(orbitAngle) * 11.5,
        clampPlayerHeight(5.8 + Math.sin(this.elapsed * 0.35) * 1.2),
        Math.cos(orbitAngle) * 11.5 - 2.0
      );
      this._lookTarget.set(0.5, 4.2, -6.5);
      this.camera.lookAt(this._lookTarget);
      return;
    }

    if (this.screen !== 'playing') return;

    // First-person 360° look
    if (this.controls.isLocked) {
      this.syncYawPitchFromCamera();
    } else {
      const damp = 1 - Math.exp(-14 * dt);
      this.yaw = THREE.MathUtils.lerp(this.yaw, this.targetYaw, damp);
      this.pitch = THREE.MathUtils.lerp(this.pitch, this.targetPitch, damp);
      this.applyYawPitchToCamera();
    }

    // ZQSD / WASD / Arrow movement with exponential smoothing
    const move = computeMovementDelta(this.keys, this.yaw, dt);
    const accelDamp = 1 - Math.exp(-10 * dt);
    const targetVx = move.moving ? move.dx / dt : 0;
    const targetVz = move.moving ? move.dz / dt : 0;

    this.velocityX = THREE.MathUtils.lerp(this.velocityX, targetVx, accelDamp);
    this.velocityZ = THREE.MathUtils.lerp(this.velocityZ, targetVz, accelDamp);

    const nextX = this.playerPos.x + this.velocityX * dt;
    const nextZ = this.playerPos.z + this.velocityZ * dt;

    if (this.renderSourceMode === 'courtyard-3d') {
      const resolved = resolveCourtyardPosition(nextX, nextZ);
      this.playerPos.x = resolved.x;
      this.playerPos.z = resolved.z;
    } else {
      // Gentle generous bounds inside Atlas Gaussian Splat space
      this.playerPos.x = THREE.MathUtils.clamp(nextX, -18, 18);
      this.playerPos.z = THREE.MathUtils.clamp(nextZ, -18, 18);
    }

    const horizSpeed = Math.hypot(this.velocityX, this.velocityZ);
    let headBob = 0;
    if (horizSpeed > 0.35) {
      this.walkBobPhase += horizSpeed * dt * 2.1;
      headBob = Math.abs(Math.sin(this.walkBobPhase)) * 0.045;
      this.stepDistAccum += horizSpeed * dt;
      if (this.stepDistAccum >= 1.85) {
        this.stepDistAccum = 0;
        moroccanAudio.playFootstep();
      }
    }

    // Strict height floor >= 1.65m (bobbing only adds UPWARD above 1.65m!)
    this.playerPos.y = clampPlayerHeight(MIN_EYE_HEIGHT + headBob, MIN_EYE_HEIGHT);
    this.camera.position.copy(this.playerPos);
  }

  private getActiveObjectiveTargetPos(): Vec3Tuple | null {
    if (!this.activeObjective) return null;
    if (this.renderSourceMode === 'atlas-splat' && this.activeObjective.splatTargetPos) {
      return this.activeObjective.splatTargetPos;
    }
    return this.activeObjective.targetPos;
  }

  private emitTelemetryNow() {
    let distMeters: number | null = null;
    let nearby: HudTelemetry['nearbyInteractable'] = null;
    const targetPos = this.getActiveObjectiveTargetPos();

    if (this.activeObjective && targetPos) {
      const d = horizontalDistance(
        { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
        targetPos
      );
      distMeters = d;
      if (d <= this.activeObjective.interactionRadius) {
        nearby = {
          id: this.activeObjective.id,
          promptLabel: this.activeObjective.promptLabel,
          distance: d,
        };
      }
    }

    this.callbacks.onTelemetry({
      fps: this.currentFps,
      playerX: this.playerPos.x,
      playerY: clampPlayerHeight(this.camera.position.y, MIN_EYE_HEIGHT),
      playerZ: this.playerPos.z,
      playerYaw: this.yaw,
      distanceToObjectiveMeters: distMeters,
      nearbyInteractable: nearby,
      pointerLocked: this.controls.isLocked,
      splatStatus: this.splatStatus,
      splatInfo: this.splatInfo,
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    this.unlockPointer();
    this.controls.dispose();
    this.courtyardRefs.dispose();
    if (this.atlasSplatMesh) {
      this.scene.remove(this.atlasSplatMesh);
      this.atlasSplatMesh.dispose();
    }
    if (this.sparkRenderer) {
      this.scene.remove(this.sparkRenderer);
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
