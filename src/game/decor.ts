import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Rng } from '../core/rng';
import type { DecoKind, Theme } from './themes';

/**
 * Procedural low-poly props. Every prop is baked into one vertex-coloured
 * geometry so a whole level's scenery is a single draw call.
 */
export class PieceBatch {
  private parts: THREE.BufferGeometry[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();

  add(geo: THREE.BufferGeometry, color: string | THREE.Color, x: number, y: number, z: number, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    this.q.setFromEuler(this.e.set(rx, ry, rz));
    this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(this.m);
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.parts.push(g);
    geo.dispose();
  }

  build(material: THREE.Material): THREE.Mesh | null {
    if (this.parts.length === 0) return null;
    const merged = mergeGeometries(this.parts, false);
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
    merged.computeVertexNormals();
    return new THREE.Mesh(merged, material);
  }
}

const ico = (r: number, d = 0) => new THREE.IcosahedronGeometry(r, d);
const cyl = (rt: number, rb: number, h: number, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r: number, h: number, s = 7) => new THREE.ConeGeometry(r, h, s);

type Builder = (b: PieceBatch, x: number, z: number, s: number, rng: Rng, theme: Theme) => void;

const pal = (rng: Rng, theme: Theme, from: number, to = theme.palette.length) => theme.palette[rng.int(from, Math.min(to, theme.palette.length) - 1)];

const builders: Record<DecoKind, Builder> = {
  tree(b, x, z, s, rng, th) {
    b.add(cyl(0.09, 0.13, 0.7), th.palette[6] ?? '#8a5a3c', x, 0.35 * s, z, s);
    const leaf = pal(rng, th, 0, 3);
    b.add(ico(0.55, 1), leaf, x, 0.95 * s, z, s);
    b.add(ico(0.4, 1), leaf, x + 0.25 * s, 1.25 * s, z + 0.1 * s, s);
    b.add(ico(0.35, 1), leaf, x - 0.25 * s, 1.2 * s, z - 0.1 * s, s);
  },
  bush(b, x, z, s, rng, th) {
    const c = pal(rng, th, 0, 3);
    b.add(ico(0.32, 1), c, x, 0.22 * s, z, s, s * 0.8, s);
    b.add(ico(0.25, 1), c, x + 0.28 * s, 0.17 * s, z + 0.05 * s, s, s * 0.8, s);
    b.add(ico(0.22, 1), c, x - 0.26 * s, 0.15 * s, z - 0.04 * s, s, s * 0.8, s);
    if (rng.chance(0.5)) b.add(ico(0.06, 0), pal(rng, th, 3, 6), x + 0.1 * s, 0.45 * s, z + 0.15 * s, s);
  },
  flower(b, x, z, s, rng, th) {
    const petal = pal(rng, th, 3, 6);
    b.add(cyl(0.015, 0.015, 0.3, 4), th.palette[0], x, 0.15 * s, z, s);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.add(ico(0.06, 0), petal, x + Math.cos(a) * 0.07 * s, 0.32 * s, z + Math.sin(a) * 0.07 * s, s);
    }
    b.add(ico(0.05, 0), '#ffd447', x, 0.34 * s, z, s);
  },
  rock(b, x, z, s, rng, th) {
    const c = th.night ? '#5e58a8' : th.stoneSide;
    b.add(new THREE.DodecahedronGeometry(0.3, 0), c, x, 0.12 * s, z, s * rng.range(0.9, 1.4), s * 0.6, s, 0, rng.range(0, 3));
  },
  pine(b, x, z, s, rng, th) {
    const c = pal(rng, th, 0, 2);
    b.add(cyl(0.07, 0.09, 0.35), th.palette[4] ?? '#8b6a55', x, 0.17 * s, z, s);
    b.add(cone(0.55, 0.7), c, x, 0.65 * s, z, s);
    b.add(cone(0.42, 0.6), c, x, 1.0 * s, z, s);
    b.add(cone(0.28, 0.5), c, x, 1.32 * s, z, s);
    b.add(cone(0.16, 0.22), '#ffffff', x, 1.5 * s, z, s);
  },
  snowball(b, x, z, s, _rng, th) {
    b.add(ico(0.32, 1), '#ffffff', x, 0.28 * s, z, s);
    b.add(ico(0.22, 1), '#ffffff', x, 0.72 * s, z, s);
    b.add(cone(0.05, 0.2, 5), th.accent, x, 0.72 * s, z + 0.27 * s, s, s, s, Math.PI / 2);
  },
  coral(b, x, z, s, rng, th) {
    const c = pal(rng, th, 0, 4);
    const arms = rng.int(3, 5);
    for (let i = 0; i < arms; i++) {
      const a = rng.range(-0.6, 0.6), h = rng.range(0.5, 0.9);
      b.add(cyl(0.05, 0.08, h, 5), c, x + Math.sin(a) * h * 0.4 * s, h * 0.45 * s, z + rng.range(-0.1, 0.1), s, s, s, 0, 0, -a);
      b.add(ico(0.08, 0), c, x + Math.sin(a) * h * 0.85 * s, h * 0.9 * s, z, s);
    }
  },
  kelp(b, x, z, s, rng, th) {
    const c = th.palette[4];
    for (let i = 0; i < 4; i++) b.add(ico(0.12, 0), c, x + Math.sin(i * 1.3) * 0.08 * s, (0.15 + i * 0.22) * s, z, s, s * 1.8, s * 0.6, 0, rng.range(0, 3));
  },
  shell(b, x, z, s, rng, th) {
    b.add(new THREE.SphereGeometry(0.16, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), pal(rng, th, 1, 4), x, 0.01, z, s, s * 0.6, s);
  },
  cactus(b, x, z, s, rng, th) {
    const c = pal(rng, th, 0, 2);
    b.add(new THREE.CapsuleGeometry(0.14, 0.7, 3, 7), c, x, 0.5 * s, z, s);
    b.add(new THREE.CapsuleGeometry(0.08, 0.25, 3, 6), c, x + 0.2 * s, 0.62 * s, z, s);
    b.add(new THREE.CapsuleGeometry(0.08, 0.2, 3, 6), c, x - 0.2 * s, 0.5 * s, z, s);
    if (rng.chance(0.5)) b.add(ico(0.06, 0), th.palette[5], x, 0.98 * s, z, s);
  },
  mesa(b, x, z, s, rng, th) {
    b.add(cyl(0.7, 0.85, 0.5, 7), th.palette[2], x, 0.25 * s, z, s, s, s, 0, rng.range(0, 3));
    b.add(cyl(0.55, 0.7, 0.45, 7), th.palette[3], x, 0.72 * s, z, s, s, s, 0, rng.range(0, 3));
  },
  lollipop(b, x, z, s, rng, th) {
    b.add(cyl(0.03, 0.03, 0.9, 5), '#ffffff', x, 0.45 * s, z, s);
    b.add(cyl(0.32, 0.32, 0.1, 12), pal(rng, th, 0, 6), x, 1.0 * s, z, s, s, s, Math.PI / 2, rng.range(-0.5, 0.5));
    b.add(cyl(0.2, 0.2, 0.11, 12), '#ffffff', x, 1.0 * s, z, s, s, s, Math.PI / 2, rng.range(-0.5, 0.5));
  },
  gumdrop(b, x, z, s, rng, th) {
    b.add(new THREE.SphereGeometry(0.28, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), pal(rng, th, 0, 6), x, 0, z, s, s * 1.2, s);
  },
  mushroom(b, x, z, s, rng, th) {
    b.add(cyl(0.07, 0.09, 0.35, 6), th.night ? '#e8e0ff' : '#fff4e6', x, 0.17 * s, z, s);
    b.add(new THREE.SphereGeometry(0.28, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), pal(rng, th, 0, 5), x, 0.32 * s, z, s, s * 0.8, s);
  },
  crystal(b, x, z, s, rng, th) {
    const c = pal(rng, th, 0, 3);
    for (let i = 0; i < 3; i++) b.add(new THREE.OctahedronGeometry(0.18, 0), c, x + (i - 1) * 0.15 * s, 0.3 * s, z + rng.range(-0.08, 0.08), s * 0.7, s * rng.range(1.5, 2.6), s * 0.7, 0, 0, (i - 1) * 0.3);
  },
  corn(b, x, z, s, rng, th) {
    for (let i = 0; i < 3; i++) {
      const ox = rng.range(-0.18, 0.18) * s, oz = rng.range(-0.18, 0.18) * s, h = rng.range(0.8, 1.15);
      b.add(cyl(0.025, 0.035, h, 5), th.palette[0], x + ox, (h / 2) * s, z + oz, s);
      b.add(new THREE.CapsuleGeometry(0.06, 0.18, 2, 6), th.palette[2], x + ox + 0.05 * s, h * 0.7 * s, z + oz, s, s, s, 0, 0, -0.3);
      b.add(cone(0.12, 0.35, 4), th.palette[1], x + ox, h * 0.45 * s, z + oz, s, s * 0.6, s * 0.3, 0, rng.range(0, 3), 1.1);
    }
  },
  hay(b, x, z, s, rng, th) {
    b.add(cyl(0.38, 0.4, 0.42, 12), th.palette[2] ?? '#f2c94c', x, 0.21 * s, z, s, s, s, Math.PI / 2, rng.range(0, 3));
  },
  pumpkin(b, x, z, s, _rng, th) {
    const c = th.palette.includes('#e8892c') ? '#e8892c' : '#f08a24';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.add(ico(0.14, 1), c, x + Math.cos(a) * 0.09 * s, 0.15 * s, z + Math.sin(a) * 0.09 * s, s, s * 0.9, s);
    }
    b.add(cyl(0.025, 0.03, 0.1, 5), '#4f7a33', x, 0.32 * s, z, s);
  },
  fence(b, x, z, s, rng) {
    const ry = rng.pick([0, Math.PI / 2]);
    const dx = Math.cos(ry), dz = -Math.sin(ry);
    for (const k of [-0.45, 0, 0.45]) b.add(new THREE.BoxGeometry(0.07, 0.4, 0.07), '#fff4e6', x + dx * k * s, 0.2 * s, z + dz * k * s, s);
    for (const h of [0.14, 0.3]) b.add(new THREE.BoxGeometry(1.0, 0.05, 0.04), '#fff4e6', x, h * s, z, s, s, s, 0, ry);
  },
  house(b, x, z, s, rng, th) {
    const wall = rng.pick(['#fff1d6', '#ffd6a5', '#f7c6c7', '#d6ecff']);
    b.add(new THREE.BoxGeometry(0.8, 0.55, 0.7), wall, x, 0.28 * s, z, s);
    b.add(cone(0.68, 0.45, 4), th.accent, x, 0.78 * s, z, s, s, s, 0, Math.PI / 4);
    b.add(new THREE.BoxGeometry(0.18, 0.3, 0.02), '#8a5a3c', x, 0.15 * s, z + 0.36 * s, s);
    b.add(new THREE.BoxGeometry(0.16, 0.14, 0.02), '#9fd3ff', x + 0.24 * s, 0.33 * s, z + 0.36 * s, s);
  },
  tent(b, x, z, s, rng, th) {
    const c = rng.pick([th.accent, th.palette[3] ?? '#e63946']);
    b.add(cone(0.55, 0.75, 4), c, x, 0.37 * s, z, s, s, s, 0, Math.PI / 4);
    b.add(cone(0.56, 0.2, 4), '#ffffff', x, 0.66 * s, z, s * 0.4, s, s * 0.4, 0, Math.PI / 4);
    b.add(cyl(0.015, 0.015, 0.35, 4), '#ffffff', x, 0.9 * s, z, s);
    b.add(new THREE.BoxGeometry(0.16, 0.1, 0.01), th.palette[4] ?? '#ffd447', x + 0.08 * s, 1.02 * s, z, s);
  },
  cone(b, x, z, s) {
    b.add(cone(0.13, 0.36, 10), '#ff7a2e', x, 0.2 * s, z, s);
    b.add(cyl(0.1, 0.115, 0.06, 10), '#ffffff', x, 0.2 * s, z, s);
    b.add(new THREE.BoxGeometry(0.32, 0.03, 0.32), '#ff7a2e', x, 0.015 * s, z, s);
  },
  barrel(b, x, z, s) {
    b.add(cyl(0.2, 0.2, 0.46, 12), '#a8693a', x, 0.23 * s, z, s);
    for (const h of [0.08, 0.38]) b.add(cyl(0.21, 0.21, 0.04, 12), '#5a4636', x, h * s, z, s);
  },
  crate(b, x, z, s, rng) {
    const ry = rng.range(0, 1);
    b.add(new THREE.BoxGeometry(0.45, 0.45, 0.45), '#c98a4a', x, 0.23 * s, z, s, s, s, 0, ry);
    b.add(new THREE.BoxGeometry(0.47, 0.06, 0.47), '#8a5a3c', x, 0.43 * s, z, s, s, s, 0, ry);
  },
  lamp(b, x, z, s, _rng, th) {
    b.add(cyl(0.035, 0.05, 1.1, 6), '#4a4f5c', x, 0.55 * s, z, s);
    b.add(ico(0.12, 1), th.night ? '#fff3a0' : '#fffbe6', x, 1.15 * s, z, s);
  },
  building(b, x, z, s, rng, th) {
    const h = rng.range(0.9, 1.9);
    const c = rng.pick([th.palette[2] ?? '#ffb3a7', th.palette[3] ?? '#9fd3ff', th.palette[5] ?? '#c58cff', '#fff1d6']);
    b.add(new THREE.BoxGeometry(0.8, h, 0.8), c, x, (h / 2) * s, z, s);
    for (let y = 0.3; y < h - 0.1; y += 0.35)
      for (const ox of [-0.2, 0.2]) b.add(new THREE.BoxGeometry(0.14, 0.14, 0.02), '#e8f6ff', x + ox * s, y * s, z + 0.41 * s, s);
    b.add(new THREE.BoxGeometry(0.84, 0.06, 0.84), '#5f6776', x, h * s, z, s);
  },
  cloud(b, x, z, s, rng) {
    const y = rng.range(0.15, 0.4);
    b.add(ico(0.32, 1), '#ffffff', x, (y + 0.1) * s, z, s, s * 0.8, s);
    b.add(ico(0.24, 1), '#ffffff', x + 0.3 * s, y * s, z, s, s * 0.8, s);
    b.add(ico(0.22, 1), '#ffffff', x - 0.28 * s, y * s, z + 0.05 * s, s, s * 0.8, s);
  },
  planet(b, x, z, s, rng, th) {
    b.add(ico(0.35, 2), pal(rng, th, 0, 5), x, 0.6 * s, z, s);
    b.add(new THREE.TorusGeometry(0.52, 0.04, 6, 32), th.palette[4] ?? '#ffd447', x, 0.6 * s, z, s, s, s, 1.2, 0, 0.3);
  },
  palm(b, x, z, s, rng, th) {
    const lean = rng.range(-0.3, 0.3);
    for (let i = 0; i < 4; i++) b.add(cyl(0.06, 0.07, 0.3, 6), '#b07a48', x + lean * i * 0.1 * s, (0.15 + i * 0.28) * s, z, s, s, s, 0, 0, -lean * 0.4);
    const top = { x: x + lean * 0.4 * s, y: 1.18 * s };
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.add(new THREE.CapsuleGeometry(0.06, 0.5, 2, 5), th.palette[i % 2], top.x + Math.cos(a) * 0.28 * s, top.y - 0.05 * s, z + Math.sin(a) * 0.28 * s, s, s, s * 1.4, Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
    }
  },
  umbrella(b, x, z, s, rng, th) {
    b.add(cyl(0.02, 0.02, 0.9, 5), '#ffffff', x, 0.45 * s, z, s);
    b.add(cone(0.55, 0.28, 8), rng.pick([th.accent, th.palette[3] ?? '#3b82f6']), x, 0.98 * s, z, s);
  },
  carrot(b, x, z, s) {
    b.add(cone(0.08, 0.3, 6), '#f08a24', x, 0.1 * s, z, s, s, s, Math.PI);
    for (const a of [-0.4, 0, 0.4]) b.add(cone(0.04, 0.22, 4), '#4fae4a', x + a * 0.08 * s, 0.33 * s, z, s, s, s, 0, 0, a);
  },
  pyramid(b, x, z, s) {
    b.add(cone(1.0, 1.1, 4), '#e8c27a', x, 0.55 * s, z, s, s, s, 0, Math.PI / 4);
    b.add(cone(0.2, 0.22, 4), '#ffd447', x, 1.0 * s, z, s, s, s, 0, Math.PI / 4);
  },
  column(b, x, z, s, rng) {
    const h = rng.range(0.8, 1.3);
    b.add(cyl(0.16, 0.18, h, 10), '#efe6d6', x, (h / 2) * s, z, s);
    b.add(new THREE.BoxGeometry(0.44, 0.1, 0.44), '#d2c6b0', x, h * s, z, s);
    b.add(new THREE.BoxGeometry(0.44, 0.08, 0.44), '#d2c6b0', x, 0.04 * s, z, s);
  },
  flag(b, x, z, s, rng, th) {
    b.add(cyl(0.02, 0.02, 1.0, 5), '#ffffff', x, 0.5 * s, z, s);
    b.add(new THREE.BoxGeometry(0.34, 0.22, 0.02), rng.pick([th.accent, th.palette[3] ?? '#3b82f6', th.palette[4] ?? '#ffd447']), x + 0.17 * s, 0.88 * s, z, s);
  },
  balloon(b, x, z, s, rng, th) {
    const y = rng.range(0.9, 1.4);
    b.add(cyl(0.006, 0.006, y, 3), '#ffffff', x, (y / 2) * s, z, s);
    b.add(ico(0.18, 1), pal(rng, th, 0, 6), x, (y + 0.15) * s, z, s, s * 1.2, s);
  },
  bone(b, x, z, s, rng) {
    const ry = rng.range(0, 3);
    b.add(new THREE.CapsuleGeometry(0.05, 0.4, 2, 6), '#fff8ec', x, 0.06 * s, z, s, s, s, Math.PI / 2, ry);
    for (const k of [-0.25, 0.25]) b.add(ico(0.08, 0), '#fff8ec', x + Math.cos(ry) * k * s, 0.07 * s, z - Math.sin(ry) * k * s, s);
  },
  gear(b, x, z, s, rng, th) {
    const c = pal(rng, th, 0, 4);
    b.add(cyl(0.3, 0.3, 0.12, 10), c, x, 0.3 * s, z, s, s, s, Math.PI / 2, rng.range(0, 3));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.add(new THREE.BoxGeometry(0.1, 0.1, 0.12), c, x + Math.cos(a) * 0.34 * s, (0.3 + Math.sin(a) * 0.34) * s, z, s);
    }
    b.add(cyl(0.06, 0.06, 0.6, 6), '#5a6a7a', x, 0.15 * s, z, s);
  },
  books(b, x, z, s, rng, th) {
    let y = 0;
    for (let i = 0; i < rng.int(2, 4); i++) {
      const h = rng.range(0.07, 0.12);
      b.add(new THREE.BoxGeometry(0.45, h, 0.32), pal(rng, th, 0, 5), x, (y + h / 2) * s, z, s, s, s, 0, rng.range(-0.3, 0.3));
      y += h;
    }
  },
};

export function addDeco(batch: PieceBatch, kind: DecoKind, x: number, z: number, scale: number, rng: Rng, theme: Theme) {
  builders[kind](batch, x, z, scale, rng, theme);
}

export function pickDeco(theme: Theme, rng: Rng): DecoKind {
  const total = theme.decos.reduce((s, [, w]) => s + w, 0);
  let r = rng.range(0, total);
  for (const [kind, w] of theme.decos) {
    if ((r -= w) <= 0) return kind;
  }
  return theme.decos[0][0];
}
