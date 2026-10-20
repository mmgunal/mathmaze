import * as THREE from 'three';
import type { Theme } from './themes';

/** Screen areas covered by HUD (px), kept free when framing the maze. */
export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Camera elevation: steep top-down view, just enough tilt to read the props' height. */
const PITCH = THREE.MathUtils.degToRad(60);

/**
 * Renderer, a top-down orthographic camera rig, lights and the frame loop.
 * Instead of following blindly, the rig is told what must be visible
 * (`frame`) and zooms/pans so all of it fits inside the HUD-free area.
 */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  private sun = new THREE.DirectionalLight('#ffffff', 2.2);
  private hemi = new THREE.HemisphereLight('#ffffff', '#88aa77', 1.4);
  private updaters = new Set<(dt: number) => void>();
  private last = performance.now();

  insets: Insets = { top: 90, bottom: 190, left: 0, right: 0 };
  /** Largest zoom-out allowed (ortho half-height in world units). */
  maxHalf = 16;

  private target = { cx: 0, cz: 0, half: 8 };
  private current = { cx: 0, cz: 0, half: 8 };

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target, this.hemi);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.frameLoop());
  }

  get aspect() {
    return window.innerWidth / Math.max(1, window.innerHeight);
  }

  setTheme(theme: Theme) {
    this.scene.background = new THREE.Color(theme.background);
    this.scene.fog = null;
    this.hemi.color.set(theme.night ? '#b9b2ff' : '#ffffff');
    this.hemi.groundColor.set(theme.patch);
    this.hemi.intensity = theme.night ? 1.25 : 1.5;
    this.sun.intensity = theme.night ? 1.2 : 2.2;
    this.sun.color.set(theme.night ? '#d9d2ff' : '#fff4e0');
  }

  onUpdate(fn: (dt: number) => void): () => void {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  /**
   * Make the given ground points (world x/z) visible, with `margin` world units around them.
   * `snap` jumps there instead of gliding.
   */
  frame(points: { x: number; z: number }[], margin = 1.2, snap = false) {
    if (points.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    }
    const w = window.innerWidth, h = window.innerHeight;
    const freeW = Math.max(120, w - this.insets.left - this.insets.right);
    const freeH = Math.max(120, h - this.insets.top - this.insets.bottom);
    // Ground depth is foreshortened by the pitch; labels stand ~1 unit tall.
    const needW = maxX - minX + margin * 2;
    const needH = (maxZ - minZ + margin * 2) * Math.sin(PITCH) + Math.cos(PITCH) * 1.2;
    // Never zoom in so far that a big screen shows only a sliver of the page (~110 px per world unit at most).
    const minHalf = THREE.MathUtils.clamp(h / 120, 3.6, 9);
    const half = THREE.MathUtils.clamp(Math.max((needH / 2) * (h / freeH), (needW / 2) * (h / freeW) / this.aspect), minHalf, this.maxHalf);
    // Put the box centre in the middle of the free area, not of the screen.
    const unit = (2 * half) / h; // world units per pixel (screen-vertical)
    const shiftX = ((this.insets.right - this.insets.left) / 2) * unit;
    const shiftUp = ((this.insets.bottom - this.insets.top) / 2) * unit;
    this.target = { cx: (minX + maxX) / 2 + shiftX, cz: (minZ + maxZ) / 2 + shiftUp / Math.sin(PITCH), half };
    if (snap) this.current = { ...this.target };
  }

  private resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.applyCamera();
  }

  private applyCamera() {
    const { cx, cz, half } = this.current;
    const a = this.aspect;
    const cam = this.camera;
    cam.left = -half * a;
    cam.right = half * a;
    cam.top = half;
    cam.bottom = -half;
    cam.updateProjectionMatrix();
    const look = new THREE.Vector3(cx, 0, cz);
    cam.position.set(cx, Math.sin(PITCH) * 80, cz + Math.cos(PITCH) * 80);
    cam.lookAt(look);

    // The shadow box follows the view.
    this.sun.position.set(cx + 6, 20, cz + 8);
    this.sun.target.position.copy(look);
    const sc = this.sun.shadow.camera;
    const r = half * Math.max(1, a) * 1.5 + 2;
    if (Math.abs(sc.right - r) > 0.5) {
      sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 60;
      sc.updateProjectionMatrix();
    }
  }

  private frameLoop() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.updaters.forEach((fn) => fn(dt));
    const k = 1 - Math.exp(-dt * 3.2);
    this.current.cx += (this.target.cx - this.current.cx) * k;
    this.current.cz += (this.target.cz - this.current.cz) * k;
    this.current.half += (this.target.half - this.current.half) * k;
    this.applyCamera();
    this.renderer.render(this.scene, this.camera);
  }
}
