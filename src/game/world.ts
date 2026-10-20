import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { Maze, MazeEdge, Vec2 } from '../level/types';
import { Ambient } from './ambient';
import { addDeco, PieceBatch, pickDeco } from './decor';
import { makePlaque, plaqueTexture } from './labels';
import type { Theme } from './themes';

/** Layout (x, y) → world (x, 0, -y): the maze runs away from the camera. */
export const toWorld = (p: Vec2, h = 0) => new THREE.Vector3(p.x, h, -p.y);

const PATH_WIDTH = 0.7;

export function curveOf(points: Vec2[]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(points.map((p) => toWorld(p)), false, 'centripetal', 0.5);
}

function ribbon(curve: THREE.Curve<THREE.Vector3>, width: number, y: number, segments: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    side.crossVectors(tan, up).normalize().multiplyScalar(width / 2);
    pos.push(p.x - side.x, y, p.z - side.z, p.x + side.x, y, p.z + side.z);
    if (i < segments) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export interface StoneView {
  edge: MazeEdge;
  /** Which end's label this is: the choice when leaving edge.a ('a') or edge.b ('b'). */
  side: 'a' | 'b';
  group: THREE.Group;
  top: THREE.Mesh;
  label: THREE.Sprite;
  hit: THREE.Mesh;
  closed: boolean;
}

export interface LevelView {
  root: THREE.Group;
  stones: StoneView[];
  finish: THREE.Group;
  glow: THREE.Mesh;
  /** Footprint of each question box (world x/z centre and half sizes), keyed by node id. */
  boxes: Map<string, { x: number; z: number; hw: number; hd: number }>;
  /** Animates the theme's critters. */
  update(dt: number): void;
  dispose(): void;
}

function sampleAll(maze: Maze): Vec2[] {
  const pts: Vec2[] = [];
  for (const e of maze.edges) {
    const c = curveOf(e.path);
    const n = Math.max(2, Math.ceil(c.getLength() / 0.3));
    for (let i = 0; i <= n; i++) {
      const p = c.getPointAt(i / n);
      pts.push({ x: p.x, y: -p.z });
    }
  }
  return pts;
}

export function buildLevelView(maze: Maze, theme: Theme): LevelView {
  const root = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);
  const rng = new Rng(maze.spec.id * 7919);

  const flat = (color: string) => track(new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));

  // Ground with soft colour patches.
  const B = maze.bounds;
  const bw = B.maxX - B.minX, bh = B.maxY - B.minY;
  const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(bw + 90, bh + 90)), flat(theme.ground));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((B.minX + B.maxX) / 2, 0, -(B.minY + B.maxY) / 2);
  ground.receiveShadow = true;
  root.add(ground);

  const patchMat = flat(theme.patch);
  const patchGeo = track(new THREE.CircleGeometry(1, 20));
  for (let i = 0; i < (bw * bh) / 14; i++) {
    const m = new THREE.Mesh(patchGeo, patchMat);
    m.rotation.x = -Math.PI / 2;
    const s = rng.range(0.8, 2.6);
    m.scale.set(s, s * rng.range(0.5, 0.9), 1);
    m.position.set(rng.range(B.minX - 4, B.maxX + 4), 0.002, -rng.range(B.minY - 4, B.maxY + 4));
    m.receiveShadow = true;
    root.add(m);
  }

  // Corridors: an edge ribbon under a lighter top ribbon, round caps where they meet.
  const pathMat = flat(theme.path);
  const edgeMat = flat(theme.pathEdge);
  const capGeo = track(new THREE.CircleGeometry(PATH_WIDTH / 2, 20));
  const capEdgeGeo = track(new THREE.CircleGeometry(PATH_WIDTH / 2 + 0.09, 20));
  const addCap = (p: Vec2) => {
    const e = new THREE.Mesh(capEdgeGeo, edgeMat);
    e.rotation.x = -Math.PI / 2;
    e.position.copy(toWorld(p, 0.011));
    const c = new THREE.Mesh(capGeo, pathMat);
    c.rotation.x = -Math.PI / 2;
    c.position.copy(toWorld(p, 0.021));
    c.receiveShadow = e.receiveShadow = true;
    root.add(e, c);
  };
  for (const e of maze.edges) {
    const curve = curveOf(e.path);
    const seg = Math.max(4, Math.ceil(curve.getLength() * 6));
    const edge = new THREE.Mesh(track(ribbon(curve, PATH_WIDTH + 0.18, 0.01, seg)), edgeMat);
    const top = new THREE.Mesh(track(ribbon(curve, PATH_WIDTH, 0.02, seg)), pathMat);
    edge.receiveShadow = top.receiveShadow = true;
    root.add(edge, top);
  }
  for (const n of maze.nodes.values()) addCap(n.pos);

  // Number (or operation) stones on corridors.
  const stoneTopGeo = track(new THREE.CylinderGeometry(0.4, 0.46, 0.14, 28));
  const stoneBaseGeo = track(new THREE.CylinderGeometry(0.48, 0.52, 0.1, 28));
  const hitGeo = track(new THREE.CylinderGeometry(0.7, 0.7, 1.6, 12));
  const hitMat = track(new THREE.MeshBasicMaterial({ visible: false }));
  const baseMat = flat(theme.stoneSide);
  const stones: StoneView[] = [];
  const addStone = (edge: MazeEdge, side: 'a' | 'b', text: string, at: Vec2) => {
    const group = new THREE.Group();
    group.position.copy(toWorld(at));
    const base = new THREE.Mesh(stoneBaseGeo, baseMat);
    base.position.y = 0.05;
    const top = new THREE.Mesh(stoneTopGeo, track(new THREE.MeshStandardMaterial({ color: theme.stone, roughness: 0.5 })));
    top.position.y = 0.16;
    top.castShadow = base.receiveShadow = true;
    const label = makePlaque(text, { bg: '#ffffff', border: theme.accent, text: '#2a2140', height: text.includes(' ') ? 0.6 : 0.76 });
    track(label.material.map!);
    track(label.material);
    label.position.y = 0.74;
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.y = 0.6;
    group.add(base, top, label, hit);
    root.add(group);
    stones.push({ edge, side, group, top, label, hit, closed: false });
  };
  for (const e of maze.edges) {
    if (e.labelA) addStone(e, 'a', e.labelA.text, e.labelA.pos);
    const same = e.labelA && e.labelB && e.labelA.text === e.labelB.text && Math.hypot(e.labelA.pos.x - e.labelB.pos.x, e.labelA.pos.y - e.labelB.pos.y) < 0.6;
    if (e.labelB && !same) addStone(e, 'b', e.labelB.text, e.labelB.pos);
  }

  // Question boxes: a raised tile at the junction with the operation on top.
  const tileGeo = track(new THREE.BoxGeometry(1, 0.12, 1));
  const boxes: LevelView['boxes'] = new Map();
  for (const n of maze.nodes.values()) {
    if (!n.prompt) continue;
    const { texture, aspect } = plaqueTexture(n.prompt, { bg: theme.accent, border: '#ffffff', text: '#ffffff', height: 0 });
    const h = 0.72;
    const tile = new THREE.Mesh(tileGeo, flat(theme.pathEdge));
    tile.scale.set(h * aspect * 0.96, 1, h * 0.9);
    tile.position.copy(toWorld(n.pos, 0.06));
    tile.receiveShadow = true;
    const face = new THREE.Mesh(
      track(new THREE.PlaneGeometry(h * aspect, h)),
      // Drawn over everything except the stone labels: the question must never be hidden.
      track(new THREE.MeshStandardMaterial({ map: track(texture), transparent: true, roughness: 0.8, depthWrite: false, depthTest: false })),
    );
    face.renderOrder = 5;
    face.rotation.x = -Math.PI / 2;
    face.position.copy(toWorld(n.pos, 0.125));
    root.add(tile, face);
    boxes.set(n.id, { x: n.pos.x, z: -n.pos.y, hw: (h * aspect) / 2, hd: h / 2 });
  }

  const finish = buildFinish(theme, track);
  finish.position.copy(toWorld(maze.finish.pos));
  root.add(finish);

  // Start: a little pad.
  const startPad = new THREE.Mesh(track(new THREE.CylinderGeometry(0.4, 0.45, 0.08, 28)), flat('#ffffff'));
  startPad.position.copy(toWorld(maze.start.pos, 0.04));
  startPad.receiveShadow = true;
  root.add(startPad);

  // Scenery, kept clear of every corridor.
  const occupied = sampleAll(maze);
  const free = (x: number, y: number, r: number) => occupied.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 > r * r);
  const batch = new PieceBatch();
  const PAD = 7;
  const target = Math.floor((bw + PAD * 2) * (bh + PAD * 2) * 0.9);
  const BIG = new Set(['tree', 'pine', 'mesa', 'lollipop', 'palm', 'building', 'house', 'pyramid', 'tent', 'column', 'lamp', 'umbrella']);
  const SMALL = new Set(['flower', 'shell', 'rock', 'gumdrop', 'snowball', 'crystal', 'carrot', 'cone', 'bone', 'books']);
  for (let i = 0, placed = 0; i < target * 8 && placed < target; i++) {
    const x = rng.range(B.minX - PAD, B.maxX + PAD);
    const y = rng.range(B.minY - PAD, B.maxY + PAD);
    const kind = pickDeco(theme, rng);
    const big = BIG.has(kind);
    const small = SMALL.has(kind);
    const outside = x < B.minX || x > B.maxX || y < B.minY || y > B.maxY;
    const s = rng.range(0.7, 1.15) * (big && outside ? 1.4 : 1);
    if (!free(x, y, big ? 1.2 * s : small ? 0.6 * s : 0.8 * s)) continue;
    if (Math.hypot(x - maze.finish.pos.x, y - maze.finish.pos.y) < 2.0) continue;
    addDeco(batch, kind, x, -y, s, rng, theme);
    placed++;
  }
  const decoMesh = batch.build(track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true })));
  if (decoMesh) {
    decoMesh.castShadow = true;
    decoMesh.receiveShadow = true;
    track(decoMesh.geometry);
    root.add(decoMesh);
  }

  const glow = new THREE.Mesh(
    track(new THREE.RingGeometry(0.55, 0.8, 36)),
    track(new THREE.MeshBasicMaterial({ color: '#fff36b', transparent: true, opacity: 0, depthWrite: false })),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.visible = false;
  root.add(glow);

  const ambient = new Ambient(theme.critters, B, maze.spec.id * 131);
  root.add(ambient.root);
  disposables.push(ambient);

  return {
    root,
    stones,
    finish,
    glow,
    boxes,
    update: (dt) => ambient.update(dt),
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/** Rainbow arch with a star: the goal of every level. */
function buildFinish(theme: Theme, track: <T extends { dispose(): void }>(x: T) => T): THREE.Group {
  const g = new THREE.Group();
  const colors = ['#ff5c6c', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
  colors.forEach((c, i) => {
    const r = 1.55 - i * 0.13;
    const arc = new THREE.Mesh(track(new THREE.TorusGeometry(r, 0.07, 8, 40, Math.PI)), track(new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })));
    arc.castShadow = true;
    g.add(arc);
  });
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 0.42 : 0.19;
    if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const star = new THREE.Mesh(
    track(new THREE.ExtrudeGeometry(starShape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 })),
    track(new THREE.MeshStandardMaterial({ color: '#ffd43b', emissive: '#ffb703', emissiveIntensity: 0.35, roughness: 0.35 })),
  );
  star.position.y = 2.05;
  star.name = 'star';
  star.castShadow = true;
  g.add(star);
  const pad = new THREE.Mesh(track(new THREE.CylinderGeometry(0.9, 1.0, 0.1, 32)), track(new THREE.MeshStandardMaterial({ color: theme.accent, roughness: 0.6 })));
  pad.position.y = 0.05;
  pad.receiveShadow = true;
  g.add(pad);
  return g;
}
