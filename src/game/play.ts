import * as THREE from 'three';
import { sfx } from '../audio/sfx';
import { exitsOf, judge, preferredPassage, solve, type BookEdge, type Exit } from '../level/book';
import type { Maze, MazeEdge, Vec2 } from '../level/types';
import { Character } from './character';
import type { Stage } from './stage';
import type { Theme } from './themes';
import { buildLevelView, curveOf, toWorld, type LevelView, type StoneView } from './world';

export interface PlayEvents {
  /** The child must choose here; `prompt` is the question box text, or the target on "follow the sum" pages. */
  ask(prompt: string, kind: 'question' | 'target'): void;
  /** A wrong pick; `at` is where the tapped stone is on screen (px). */
  mistake(count: number, at: { x: number; y: number }): void;
  correct(): void;
  complete(stars: number, mistakes: number): void;
}

type Anim = { t: number; dur: number; step: (k: number) => void; done?: () => void };

export function starsForMistakes(m: number): number {
  return m === 0 ? 3 : m <= 2 ? 2 : 1;
}

// Dev builds accept ?speed=N to fast-forward automated play-throughs.
const WALK_SPEED = 3.0 * (import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('speed')) || 1 : 1);

/**
 * Plays one book maze. The child moves node to node: at a question box (or, on
 * "follow the sum" pages, at a junction with labelled corridors) they tap the
 * label of the corridor to take; corridors without a choice are walked automatically.
 */
export class Play {
  readonly view: LevelView;
  private character = new Character();
  private anims: Anim[] = [];
  state: 'walk' | 'choose' | 'done' = 'walk';
  /** False while the level intro is up: the camera shows the whole page. */
  private started = false;
  private node: string;
  private via: BookEdge | undefined;
  private choices: { exit: Exit; stone: StoneView }[] = [];
  private mistakes = 0;
  private walk: { curve: THREE.CatmullRomCurve3; len: number; t: number; end: number; then: () => void; stepT: number } | null = null;
  private raycaster = new THREE.Raycaster();
  private stopUpdate: () => void;
  private onPointer = (e: PointerEvent) => this.pointer(e);
  private time = 0;
  private edgeOf = new Map<BookEdge, MazeEdge>();
  /** Corridors already walked; routes never double back over them. */
  private walked = new Set<BookEdge>();

  constructor(
    private stage: Stage,
    readonly maze: Maze,
    theme: Theme,
    private events: PlayEvents,
  ) {
    stage.setTheme(theme);
    this.view = buildLevelView(maze, theme);
    for (const e of maze.edges) this.edgeOf.set(e.book, e);
    stage.scene.add(this.view.root);
    this.character.root.scale.setScalar(1.15);
    this.view.root.add(this.character.root);
    this.character.root.position.copy(toWorld(maze.start.pos));
    // Open on the whole page, like looking at the book, then glide to the start.
    stage.frame(this.overview(), 1.5, true);

    this.stopUpdate = stage.onUpdate((dt) => this.update(dt));
    stage.renderer.domElement.addEventListener('pointerdown', this.onPointer);
    this.node = maze.start.id;
  }

  /** Leave the overview: glide to the start and set off. */
  begin() {
    if (this.started) return;
    this.started = true;
    setTimeout(() => this.arrive(), 650);
  }

  private overview() {
    return [...this.maze.nodes.values()].map((n) => toWorld(n.pos));
  }

  /** What the camera must show right now. */
  private frameTargets(): { points: { x: number; z: number }[]; margin: number } {
    const c = this.character.root.position;
    if (!this.started) return { points: this.overview(), margin: 1.5 };
    if (this.state === 'choose') {
      // The character and every choice, plus a peek down each corridor.
      const pts = [{ x: c.x, z: c.z }];
      for (const { stone, exit } of this.choices) {
        pts.push({ x: stone.group.position.x, z: stone.group.position.z });
        const edge = this.edgeOf.get(exit.edge)!;
        const path = edge.a === this.node ? edge.path : [...edge.path].reverse();
        const peek = path[Math.min(path.length - 1, 1)];
        const sx = stone.group.position.x, sz = stone.group.position.z;
        const px = peek.x, pz = -peek.y;
        const d = Math.hypot(px - sx, pz - sz) || 1;
        pts.push({ x: sx + ((px - sx) / d) * Math.min(1, d), z: sz + ((pz - sz) / d) * Math.min(1, d) });
      }
      return { points: pts, margin: 1.4 };
    }
    const r = 3.2;
    const pts = [{ x: c.x - r, z: c.z - r }, { x: c.x + r, z: c.z + r }];
    if (this.walk) {
      const end = this.walk.curve.getPointAt(this.walk.end);
      pts.push({ x: end.x, z: end.z });
    }
    return { points: pts, margin: 0.8 };
  }

  get mistakeCount() {
    return this.mistakes;
  }

  /** Stones the child can pick right now (for hints and the tutorial hand). */
  get correctStones(): StoneView[] {
    return this.choices.filter((c) => this.isRight(c.exit)).map((c) => c.stone);
  }

  dispose() {
    this.stopUpdate();
    this.stage.renderer.domElement.removeEventListener('pointerdown', this.onPointer);
    this.stage.scene.remove(this.view.root);
    this.view.dispose();
  }

  /** Briefly highlights the right stone; returns false if there is nothing to choose. */
  hint(): boolean {
    const stone = this.correctStones[0];
    if (this.state !== 'choose' || !stone) return false;
    const glow = this.view.glow;
    glow.position.copy(stone.group.position).setY(0.05);
    glow.visible = true;
    const mat = glow.material as THREE.MeshBasicMaterial;
    sfx.hint();
    this.animate(2.6, (k) => {
      mat.opacity = Math.sin(k * Math.PI) * (0.55 + 0.45 * Math.sin(k * Math.PI * 8));
      glow.scale.setScalar(1 + 0.12 * Math.sin(k * Math.PI * 8));
    }, () => (glow.visible = false));
    return true;
  }

  private animate(dur: number, step: (k: number) => void, done?: () => void) {
    this.anims.push({ t: 0, dur, step, done });
  }

  private bookNode(id: string) {
    return this.maze.nodes.get(id)!.book;
  }

  /** Correct by the page's rule and still leading to the finish. */
  private isRight(exit: Exit): boolean {
    return (
      !this.walked.has(exit.edge) &&
      judge(this.maze.page, this.bookNode(this.node), exit) === 'correct' &&
      solve(this.maze.page, exit.to, exit.edge, this.walked) !== null
    );
  }

  private stoneFor(exit: Exit): StoneView | undefined {
    const edge = this.edgeOf.get(exit.edge)!;
    const side = edge.a === this.node && exit.to === edge.b ? 'a' : 'b';
    // "Follow the sum" corridors carry one stone that counts from both ends.
    return this.view.stones.find((s) => s.edge === edge && s.side === side) ?? (this.maze.page.mechanic === 'a' ? this.view.stones.find((s) => s.edge === edge) : undefined);
  }

  private arrive() {
    this.character.setWalking(false);
    const node = this.bookNode(this.node);
    if (node.type === 'finish') return this.finish();

    const exits = exitsOf(this.maze.page, this.node, this.via);
    const labelled = exits.filter((x) => x.label);
    // A choice only when one of the labelled corridors is the way on; otherwise the path just continues.
    if (labelled.some((x) => this.isRight(x)) || (node.label && labelled.length > 0)) {
      this.choices = labelled.flatMap((exit) => {
        const stone = this.stoneFor(exit);
        return stone ? [{ exit, stone }] : [];
      });
      this.state = 'choose';
      this.stepAside();
      if (node.label) this.events.ask(this.maze.nodes.get(this.node)!.prompt!, 'question');
      else this.events.ask(String(this.maze.page.target ?? ''), 'target');
      return;
    }
    // Plain passage: walk on along the route that still reaches the finish.
    const next = preferredPassage(this.maze.page, this.node, this.via, this.walked) ?? exits[0];
    if (next) this.go(next);
  }

  private go(exit: Exit) {
    const edge = this.edgeOf.get(exit.edge)!;
    const path: Vec2[] = edge.a === this.node ? [...edge.path] : [...edge.path].reverse();
    // Start from where the character actually stands (it may have stopped short).
    const p = this.character.root.position;
    path[0] = { x: p.x, y: -p.z };
    this.state = 'walk';
    this.choices = [];
    this.via = exit.edge;
    this.walked.add(exit.edge);
    this.node = exit.to;
    const curve = curveOf(path);
    const len = Math.max(0.01, curve.getLength());
    // Where the child has to choose, stop short so the character never covers the box or a stone.
    const choosing = !!this.bookNode(exit.to).label || exitsOf(this.maze.page, exit.to, exit.edge).some((x) => x.label && judge(this.maze.page, this.bookNode(exit.to), x) === 'correct');
    const end = choosing ? this.clearStop(curve, len) : 1;
    this.walk = { curve, len, t: 0, end, then: () => this.arrive(), stepT: 0 };
    this.character.setWalking(true);
  }

  /** Would the character standing here hide a question box or a stone? */
  private covers(p: { x: number; z: number }) {
    for (const b of this.view.boxes.values()) if (Math.abs(p.x - b.x) < b.hw + 0.4 && Math.abs(p.z - b.z) < b.hd + 0.4) return true;
    for (const st of this.view.stones) if (Math.hypot(p.x - st.group.position.x, p.z - st.group.position.z) < 0.75) return true;
    return false;
  }

  /** Latest point on the curve where the character covers no question box and no stone. */
  private clearStop(curve: THREE.CatmullRomCurve3, len: number): number {
    const step = 0.12 / len;
    for (let t = 1; t > 0; t -= step) if (!this.covers(curve.getPointAt(t))) return t;
    return 0;
  }

  /** If the character still stands on a label (very short corridor), hop aside to the nearest free spot. */
  private stepAside() {
    const c = this.character.root.position;
    if (!this.covers(c)) return;
    for (let r = 0.9; r <= 2.2; r += 0.3)
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const p = { x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r };
        if (this.covers(p)) continue;
        const from = c.clone();
        this.character.faceTowards(p.x - from.x, p.z - from.z);
        this.animate(0.35, (q) => {
          c.set(from.x + (p.x - from.x) * q, Math.sin(q * Math.PI) * 0.35, from.z + (p.z - from.z) * q);
        });
        return;
      }
  }

  private finish() {
    this.state = 'done';
    this.character.faceTowards(0, 1);
    this.character.cheer();
    sfx.win();
    const star = this.view.finish.getObjectByName('star')!;
    this.animate(1.6, (k) => {
      star.rotation.y = k * Math.PI * 4;
      star.position.y = 2.05 + Math.sin(k * Math.PI) * 0.5;
    });
    const stars = starsForMistakes(this.mistakes);
    setTimeout(() => this.events.complete(stars, this.mistakes), 1100);
  }

  private pointer(e: PointerEvent) {
    if (this.state !== 'choose') return;
    const rect = this.stage.renderer.domElement.getBoundingClientRect();
    const open = this.choices.filter((c) => !c.stone.closed);
    // Pick the stone whose label is nearest the finger on screen; stones can sit close together.
    const v = new THREE.Vector3();
    let best: (typeof open)[number] | null = null, bestD = Infinity;
    for (const c of open) {
      c.stone.label.getWorldPosition(v).project(this.stage.camera);
      const d = Math.hypot(rect.left + ((v.x + 1) / 2) * rect.width - e.clientX, rect.top + ((1 - v.y) / 2) * rect.height - e.clientY);
      if (d < bestD) [best, bestD] = [c, d];
    }
    const reach = Math.max(44, Math.min(rect.width, rect.height) * 0.09);
    if (best && bestD <= reach) return this.choose(best);
    // Fallback: a ray through the stone bodies.
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.stage.camera);
    const hits = this.raycaster.intersectObjects(open.map((c) => c.stone.hit), false);
    const hit = hits.length ? open.find((c) => c.stone.hit === hits[0].object) : undefined;
    if (hit) this.choose(hit);
  }

  private choose({ exit, stone }: { exit: Exit; stone: StoneView }) {
    sfx.tap();
    if (!this.isRight(exit)) return this.wrong(stone, exit);

    sfx.correct();
    this.events.correct();
    this.view.glow.visible = false;
    (stone.top.material as THREE.MeshStandardMaterial).color.set('#b9f6a5');
    this.animate(0.45, (k) => stone.group.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.25));
    this.burst(stone.group.position);
    this.go(exit);
  }

  private wrong(stone: StoneView, exit: Exit) {
    sfx.wrong();
    this.mistakes++;
    stone.closed = true;
    this.character.shake();
    const base = stone.group.position.x;
    const top = stone.top.material as THREE.MeshStandardMaterial;
    const edge = this.edgeOf.get(exit.edge)!;
    const path = edge.a === this.node ? edge.path : [...edge.path].reverse();
    this.animate(0.5, (k) => {
      stone.group.position.x = base + Math.sin(k * Math.PI * 7) * 0.12 * (1 - k);
    }, () => {
      stone.group.position.x = base;
      top.color.set('#b8b2c4');
      stone.label.material.opacity = 0.45;
      // Fence across the corridor, just past the stone.
      const here = new THREE.Vector3(stone.group.position.x, 0, stone.group.position.z);
      const curve = curveOf(path);
      let best = 0, bestD = Infinity;
      for (let i = 0; i <= 40; i++) {
        const d = curve.getPointAt(i / 40).distanceTo(here);
        if (d < bestD) [best, bestD] = [i / 40, d];
      }
      const t = Math.min(1, best + 0.45 / Math.max(0.5, curve.getLength()));
      const tan = curve.getTangentAt(t);
      const fence = this.barrier();
      fence.position.copy(curve.getPointAt(t)).sub(stone.group.position).setY(0);
      fence.rotation.y = Math.atan2(tan.x, tan.z);
      stone.group.add(fence);
    });
    const v = stone.label.getWorldPosition(new THREE.Vector3()).project(this.stage.camera);
    const rect = this.stage.renderer.domElement.getBoundingClientRect();
    this.events.mistake(this.mistakes, { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height });
  }

  /** A small striped fence that closes a wrong corridor. */
  private barrier(): THREE.Group {
    const g = new THREE.Group();
    const post = new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8);
    const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
    const red = new THREE.MeshStandardMaterial({ color: '#ff5c6c', roughness: 0.6 });
    for (const x of [-0.4, 0.4]) {
      const p = new THREE.Mesh(post, white);
      p.position.set(x, 0.28, 0);
      g.add(p);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.13, 0.06), red);
    bar.position.set(0, 0.45, 0);
    g.add(bar);
    g.scale.setScalar(0.01);
    this.animate(0.35, (k) => g.scale.setScalar(Math.max(0.01, 1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * 0.15)));
    return g;
  }

  /** Little confetti pop at a correct stone. */
  private burst(at: THREE.Vector3) {
    const colors = ['#ffd43b', '#ff6b9a', '#69db7c', '#4dabf7', '#ffa94d'];
    const geo = new THREE.IcosahedronGeometry(0.07, 0);
    const bits = Array.from({ length: 16 }, (_, i) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colors[i % colors.length] }));
      m.position.copy(at).setY(0.6);
      const a = (i / 16) * Math.PI * 2;
      this.view.root.add(m);
      return { m, v: new THREE.Vector3(Math.cos(a) * 2.2, 3 + Math.random() * 1.5, Math.sin(a) * 2.2) };
    });
    let last = 0;
    this.animate(0.8, (k) => {
      const dt = (k - last) * 0.8;
      last = k;
      bits.forEach(({ m, v }) => {
        v.y -= 9 * dt;
        m.position.addScaledVector(v, dt);
        m.scale.setScalar(1 - k);
      });
    }, () => {
      bits.forEach(({ m }) => {
        this.view.root.remove(m);
        (m.material as THREE.Material).dispose();
      });
      geo.dispose();
    });
  }

  private update(dt: number) {
    this.time += dt;
    for (const a of [...this.anims]) {
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      a.step(k);
      if (k >= 1) {
        this.anims.splice(this.anims.indexOf(a), 1);
        a.done?.();
      }
    }

    if (this.walk) {
      const w = this.walk;
      w.t = Math.min(w.end, w.t + (WALK_SPEED * dt) / w.len);
      const p = w.curve.getPointAt(w.t);
      const tan = w.curve.getTangentAt(w.t);
      this.character.root.position.copy(p);
      this.character.faceTowards(tan.x, tan.z);
      w.stepT += dt;
      if (w.stepT > 0.22) {
        w.stepT = 0;
        sfx.step();
      }
      if (w.t >= w.end) {
        this.walk = null;
        w.then();
      }
    }

    // Gentle bob on the stones the child can choose now.
    if (this.state === 'choose') {
      this.choices.forEach(({ stone }, i) => {
        if (!stone.closed) stone.label.position.y = 0.74 + Math.sin(this.time * 3 + i) * 0.06;
      });
    }
    this.character.update(dt);
    this.view.update(dt);
    const { points, margin } = this.frameTargets();
    this.stage.frame(points, margin);
  }
}
