import { pretty, type BookPage, type Pt } from './book';
import { LEVELS } from './curriculum';
import type { Maze, MazeEdge, MazeLabel, MazeNode, Vec2 } from './types';

const pages = import.meta.glob<BookPage>('./book/L*.json', { eager: true, import: 'default' });

export function bookPage(id: number): BookPage | undefined {
  return pages[`./book/L${String(id).padStart(2, '0')}.json`];
}

export function availableLevels(): number[] {
  return LEVELS.map((l) => l.id).filter((id) => bookPage(id));
}

/** World length of the page's long side. */
const LONG_SIDE = 24;
const PHOTO_ASPECT = 4 / 3;

export type Layout = 'landscape' | 'portrait';

function frameOf(page: BookPage): [number, number, number, number] {
  if (page.frame) return page.frame;
  const xs = page.nodes.map((n) => n.x), ys = page.nodes.map((n) => n.y);
  return [Math.min(...xs) - 0.03, Math.min(...ys) - 0.03, Math.max(...xs) + 0.03, Math.max(...ys) + 0.03];
}

function nearestOnPath(path: Vec2[], p: Vec2): Vec2 {
  let best = path[0], bestD = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bestD) [best, bestD] = [q, d];
  }
  return best;
}

/**
 * Lays a book page out in world space (x right, y up the screen). On landscape
 * screens the page keeps its book orientation; on portrait screens a wide spread
 * is turned a quarter turn (left edge at the bottom) so it fills a tall phone.
 */
export function loadMaze(id: number, layout: Layout = 'landscape'): Maze {
  const page = bookPage(id);
  const spec = LEVELS[id - 1];
  if (!page || !spec) throw new Error(`level ${id} has no book data`);

  const [fx0, fy0, fx1, fy1] = frameOf(page);
  const aspect = ((fx1 - fx0) * PHOTO_ASPECT) / (fy1 - fy0);
  // Long side gets LONG_SIDE units; a single page (aspect < 1) is scaled by its height instead.
  const w = aspect >= 1 ? LONG_SIDE : LONG_SIDE * aspect;
  const h = w / aspect;
  const turn = layout === 'portrait' && aspect > 1;
  const map = ([x, y]: Pt): Vec2 => {
    const u = (x - fx0) / (fx1 - fx0);
    const v = (y - fy0) / (fy1 - fy0);
    return turn ? { x: (v - 0.5) * h, y: u * w } : { x: (u - 0.5) * w, y: (1 - v) * h };
  };
  const bounds = turn ? { minX: -h / 2, maxX: h / 2, minY: 0, maxY: w } : { minX: -w / 2, maxX: w / 2, minY: 0, maxY: h };

  const nodes = new Map<string, MazeNode>();
  for (const n of page.nodes) nodes.set(n.id, { id: n.id, pos: map([n.x, n.y]), book: n, prompt: n.label ? pretty(n.label) : undefined });

  const edges: MazeEdge[] = page.edges.map((e) => {
    const path = [nodes.get(e.from)!.pos, ...(e.via ?? []).map(map), nodes.get(e.to)!.pos];
    // Without a recorded position, a label sits a little way out from its own end of the corridor.
    const near = (end: Vec2, next: Vec2): Vec2 => {
      const d = Math.hypot(next.x - end.x, next.y - end.y) || 1;
      const k = Math.min(0.45, 1.1 / d);
      return { x: end.x + (next.x - end.x) * k, y: end.y + (next.y - end.y) * k };
    };
    const label = (text: string | undefined, at: Pt | undefined, fallback: Vec2): MazeLabel | undefined =>
      text ? { text: pretty(text), pos: at ? nearestOnPath(path, map(at)) : fallback } : undefined;
    return {
      book: e,
      a: e.from,
      b: e.to,
      path,
      labelA: label(e.label, e.at, near(path[0], path[1])),
      labelB: label(e.labelBack, e.atBack, near(path[path.length - 1], path[path.length - 2])),
    };
  });

  const start = [...nodes.values()].find((n) => n.book.type === 'start')!;
  const finish = [...nodes.values()].find((n) => n.book.type === 'finish')!;
  return { spec, page, nodes, edges, start, finish, bounds };
}
