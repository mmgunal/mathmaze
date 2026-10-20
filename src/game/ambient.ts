import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { CritterKind } from './themes';

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface Item {
  obj: THREE.Object3D;
  kind: CritterKind;
  /** Home point (world x/z) and wander radius. */
  hx: number;
  hz: number;
  r: number;
  h: number;
  phase: number;
  speed: number;
  wings?: THREE.Object3D[];
}

const FLYERS: CritterKind[] = ['butterfly', 'bee', 'bird', 'bat', 'fish', 'firefly'];
const COUNTS: Record<CritterKind, number> = {
  butterfly: 10, bee: 12, bird: 7, fish: 14, bubble: 40, snow: 90, leaf: 40, bat: 10, firefly: 30, cloud: 6, star: 60, rain: 120, spark: 40,
};

/** Little moving life for each theme: flyers wander, particles fall, rise or twinkle. */
export class Ambient {
  readonly root = new THREE.Group();
  private items: Item[] = [];
  private time = 0;
  private disposables: { dispose(): void }[] = [];

  constructor(kinds: CritterKind[], private bounds: Bounds, seed: number) {
    const rng = new Rng(seed);
    for (const kind of kinds) for (let i = 0; i < COUNTS[kind]; i++) this.spawn(kind, rng);
  }

  private mat(color: string, opts: THREE.MeshBasicMaterialParameters = {}) {
    const m = new THREE.MeshBasicMaterial({ color, ...opts });
    this.disposables.push(m);
    return m;
  }

  private geo<T extends THREE.BufferGeometry>(g: T): T {
    this.disposables.push(g);
    return g;
  }

  private spawn(kind: CritterKind, rng: Rng) {
    const b = this.bounds;
    const hx = rng.range(b.minX - 2, b.maxX + 2);
    const hz = -rng.range(b.minY - 2, b.maxY + 2);
    const item: Item = { obj: new THREE.Group(), kind, hx, hz, r: rng.range(0.8, 2.5), h: 1, phase: rng.range(0, 100), speed: rng.range(0.6, 1.3) };
    const g = item.obj as THREE.Group;

    const wingPair = (color: string, w: number, d: number) => {
      const wings = [-1, 1].map((side) => {
        const pivot = new THREE.Group();
        const wing = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(w, d)), this.mat(color, { side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
        wing.rotation.x = -Math.PI / 2;
        wing.position.x = (side * w) / 2;
        pivot.add(wing);
        pivot.userData.side = side;
        g.add(pivot);
        return pivot;
      });
      item.wings = wings;
    };

    switch (kind) {
      case 'butterfly':
        wingPair(rng.pick(['#ff8fb1', '#ffd447', '#9b7bff', '#5fc3e8', '#ff9f43']), 0.22, 0.2);
        g.add(new THREE.Mesh(this.geo(new THREE.CapsuleGeometry(0.02, 0.12, 2, 4)), this.mat('#2a2140')));
        item.h = rng.range(0.6, 1.6);
        break;
      case 'bee': {
        const body = new THREE.Mesh(this.geo(new THREE.SphereGeometry(0.07, 8, 6)), this.mat('#ffd447'));
        body.scale.set(1, 0.8, 1.3);
        g.add(body);
        wingPair('#ffffff', 0.09, 0.07);
        item.h = rng.range(0.5, 1.2);
        item.r = rng.range(0.4, 1.2);
        item.speed *= 2;
        break;
      }
      case 'bird':
      case 'bat':
        wingPair(kind === 'bat' ? '#2a2140' : rng.pick(['#ffffff', '#3b82f6', '#e85d75']), 0.3, 0.14);
        g.add(new THREE.Mesh(this.geo(new THREE.SphereGeometry(0.06, 8, 6)), this.mat(kind === 'bat' ? '#3a2f55' : '#ffffff')));
        item.h = rng.range(2.2, 3.4);
        item.r = rng.range(2, 4.5);
        break;
      case 'fish': {
        const c = rng.pick(['#ffb347', '#ff6fa8', '#ffe36e', '#7ef0ff', '#9b7bff']);
        const body = new THREE.Mesh(this.geo(new THREE.SphereGeometry(0.12, 10, 8)), this.mat(c));
        body.scale.set(0.6, 0.7, 1.3);
        const tail = new THREE.Mesh(this.geo(new THREE.ConeGeometry(0.09, 0.14, 4)), this.mat(c));
        tail.rotation.x = -Math.PI / 2;
        tail.position.z = 0.18;
        g.add(body, tail);
        item.wings = [tail];
        item.h = rng.range(0.7, 1.8);
        item.r = rng.range(1.5, 3.5);
        break;
      }
      case 'firefly':
      case 'spark':
      case 'star':
        g.add(new THREE.Mesh(this.geo(new THREE.SphereGeometry(kind === 'star' ? 0.05 : 0.04, 6, 4)), this.mat(kind === 'firefly' ? '#e9ff7a' : '#fff6c2', { transparent: true })));
        item.h = kind === 'star' ? rng.range(0.05, 0.3) : rng.range(0.3, 1.8);
        break;
      case 'bubble':
        g.add(new THREE.Mesh(this.geo(new THREE.SphereGeometry(rng.range(0.04, 0.09), 8, 6)), this.mat('#e6fbff', { transparent: true, opacity: 0.55 })));
        item.h = rng.range(0, 3);
        break;
      case 'snow':
        g.add(new THREE.Mesh(this.geo(new THREE.SphereGeometry(0.04, 5, 4)), this.mat('#ffffff')));
        item.h = rng.range(0, 5);
        break;
      case 'rain': {
        const drop = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 3)), this.mat('#cfe8ff', { transparent: true, opacity: 0.7 }));
        g.add(drop);
        item.h = rng.range(0, 5);
        item.speed = rng.range(7, 10);
        break;
      }
      case 'leaf': {
        const leaf = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(0.12, 0.08)), this.mat(rng.pick(['#e8892c', '#d4622b', '#f2b33d', '#c94f3d']), { side: THREE.DoubleSide }));
        g.add(leaf);
        item.h = rng.range(0, 4.5);
        break;
      }
      case 'cloud': {
        const m = this.mat('#ffffff', { transparent: true, opacity: 0.5, depthWrite: false });
        for (let i = 0; i < 4; i++) {
          const puff = new THREE.Mesh(this.geo(new THREE.SphereGeometry(rng.range(0.4, 0.7), 10, 8)), m);
          puff.position.set(i * 0.55 - 0.8, rng.range(-0.1, 0.1), rng.range(-0.2, 0.2));
          puff.scale.y = 0.6;
          g.add(puff);
        }
        item.h = 3.5;
        item.speed = rng.range(0.25, 0.5);
        break;
      }
    }
    g.position.set(hx, item.h, hz);
    this.root.add(g);
    this.items.push(item);
  }

  update(dt: number) {
    this.time += dt;
    const t = this.time;
    const b = this.bounds;
    const span = b.maxX - b.minX + 6;
    for (const it of this.items) {
      const o = it.obj;
      const p = it.phase + t * it.speed;
      if (FLYERS.includes(it.kind)) {
        const x = it.hx + Math.cos(p * 0.7) * it.r;
        const z = it.hz + Math.sin(p * 1.1) * it.r * 0.7;
        const dx = x - o.position.x, dz = z - o.position.z;
        o.position.set(x, it.h + Math.sin(p * 3) * 0.12, z);
        if (Math.abs(dx) + Math.abs(dz) > 1e-4) o.rotation.y = Math.atan2(dx, dz);
        const flap = Math.sin(t * (it.kind === 'bee' ? 60 : it.kind === 'butterfly' ? 18 : 10) + it.phase) * 0.8;
        if (it.kind === 'fish') it.wings?.forEach((w) => (w.rotation.y = flap * 0.5));
        else it.wings?.forEach((w) => (w.rotation.z = flap * w.userData.side));
        if (it.kind === 'firefly') ((o.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.4 + 0.6 * Math.abs(Math.sin(p * 2));
        continue;
      }
      switch (it.kind) {
        case 'snow':
        case 'leaf':
        case 'rain':
          o.position.y -= dt * (it.kind === 'rain' ? it.speed : it.kind === 'snow' ? 0.6 : 0.5);
          o.position.x += Math.sin(p) * dt * 0.3;
          if (it.kind === 'leaf') o.rotation.set(p * 2, p, p * 1.5);
          if (o.position.y < 0) o.position.y = it.kind === 'rain' ? 5 : 4.5;
          break;
        case 'bubble':
          o.position.y += dt * 0.5;
          o.position.x = it.hx + Math.sin(p * 2) * 0.1;
          if (o.position.y > 3) o.position.y = 0;
          break;
        case 'cloud':
          o.position.x = b.minX - 3 + ((it.phase * 3 + t * it.speed) % span);
          break;
        case 'spark':
        case 'star':
          o.scale.setScalar(0.3 + Math.abs(Math.sin(p * 1.7)) * 1.2);
          break;
        default:
          break;
      }
    }
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}
