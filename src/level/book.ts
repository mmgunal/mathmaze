/**
 * Book-page mazes. Each level is a hand-transcribed graph of one book spread:
 * question boxes and junctions are nodes, corridors are edges, and the numbers
 * (or operations) printed on corridors are edge labels.
 *
 * Kept free of imports so `node tools/check-book.ts` can run it directly.
 *
 * Coordinates are fractions of the (EXIF-rotated) photo, 0..1 on both axes;
 * `frame` says where the printed spread sits inside the photo.
 */

export type Pt = [number, number];

export interface BookNode {
  id: string;
  x: number;
  y: number;
  type?: 'start' | 'finish' | 'deadend';
  /** Question box sitting at this junction: "7+2", "10−3", "3+4+5", "□+5=10". */
  label?: string;
}

export interface BookEdge {
  from: string;
  to: string;
  /** Number/operation on this corridor, read as a choice when leaving `from`. */
  label?: string;
  /** Where that label is printed. */
  at?: Pt;
  /** Label read as a choice when leaving `to` (corridor between two question boxes). */
  labelBack?: string;
  atBack?: Pt;
  /** Bends of the corridor, ordered from `from` to `to`. */
  via?: Pt[];
}

export interface BookPage {
  level: number;
  file: string;
  pages: string;
  title: string;
  /** a: follow operations that make `target`; b: pick the result of the box; c: pick the missing number. */
  mechanic: 'a' | 'b' | 'c';
  target?: number;
  nodes: BookNode[];
  edges: BookEdge[];
  /** Bounding box of the printed spread inside the photo: [x0, y0, x1, y1]. */
  frame?: [number, number, number, number];
  notes?: string;
}

const MINUS = /[−–—-]/g;
const BLANKS = /[□?_]/;

/** "7+2", "10 − 3", "3+4+5" → value; anything else → null. */
export function evalExpr(s: string): number | null {
  const t = s.replace(MINUS, '-').replace(/\s+/g, '');
  if (!/^\d+([+-]\d+)+$/.test(t) && !/^\d+$/.test(t)) return null;
  const parts = t.match(/[+-]?\d+/g)!;
  return parts.reduce((acc, p) => acc + Number(p), 0);
}

/** Answer of a question box: an expression's value or the missing number of an equation. */
export function answerOf(label: string): number | null {
  const t = label.replace(MINUS, '-').replace(/\s+/g, '');
  if (!t.includes('=')) return evalExpr(t);
  const [lhs, rhs] = t.split('=');
  const m = lhs.match(/^(\d+|[□?_])([+-])(\d+|[□?_])$/);
  if (!m || !/^\d+$/.test(rhs)) return null;
  const [, a, op, b] = m;
  const r = Number(rhs);
  if (BLANKS.test(a)) return op === '+' ? r - Number(b) : r + Number(b);
  if (BLANKS.test(b)) return op === '+' ? r - Number(a) : Number(a) - r;
  return null;
}

export interface Exit {
  edge: BookEdge;
  /** Node reached by taking this exit. */
  to: string;
  label?: string;
  at?: Pt;
}

export function exitsOf(page: BookPage, nodeId: string, except?: BookEdge): Exit[] {
  const out: Exit[] = [];
  // On "follow the sum" pages an operation on a corridor counts whichever way you walk it.
  const both = page.mechanic === 'a';
  for (const e of page.edges) {
    if (e === except) continue;
    if (e.from === nodeId) out.push({ edge: e, to: e.to, label: e.label ?? (both ? e.labelBack : undefined), at: e.at ?? (both ? e.atBack : undefined) });
    else if (e.to === nodeId) out.push({ edge: e, to: e.from, label: e.labelBack ?? (both ? e.label : undefined), at: e.atBack ?? (both ? e.at : undefined) });
  }
  return out;
}

export type Verdict = 'correct' | 'wrong' | 'free';

/** Is taking `exit` at `node` allowed by the rules of the page? */
export function judge(page: BookPage, node: BookNode, exit: Exit): Verdict {
  if (node.label) {
    if (!exit.label) return 'wrong';
    return Number(exit.label) === answerOf(node.label) ? 'correct' : 'wrong';
  }
  if (!exit.label) return 'free';
  if (page.mechanic === 'a') return evalExpr(exit.label) === page.target ? 'correct' : 'wrong';
  return 'wrong';
}

export interface Step {
  node: string;
  exit: Exit;
}

/**
 * Breadth-first search over rule-following moves to the finish (no edge used twice),
 * from the start or from a node reached via a given corridor.
 */
export function solve(page: BookPage, from?: string, via?: BookEdge, walked?: Set<BookEdge>): Step[] | null {
  const byId = new Map(page.nodes.map((n) => [n.id, n]));
  const start = from ?? page.nodes.find((n) => n.type === 'start')?.id;
  if (!start) return null;
  type State = { node: string; via?: BookEdge; steps: Step[]; used: Set<BookEdge> };
  const queue: State[] = [{ node: start, via, steps: [], used: new Set([...(walked ?? []), ...(via ? [via] : [])]) }];
  const seen = new Set<string>();
  while (queue.length) {
    const s = queue.shift()!;
    const node = byId.get(s.node)!;
    if (node.type === 'finish') return s.steps;
    const key = `${s.node}|${s.via ? page.edges.indexOf(s.via) : -1}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const exit of exitsOf(page, s.node, s.via)) {
      if (s.used.has(exit.edge) || judge(page, node, exit) === 'wrong') continue;
      queue.push({ node: exit.to, via: exit.edge, steps: [...s.steps, { node: s.node, exit }], used: new Set([...s.used, exit.edge]) });
    }
  }
  return null;
}

/**
 * Which way to walk through a junction without choices. Among the passages that
 * still reach the finish, avoid routes that enter boxes from behind, then take
 * the one visiting the most decisions: the book's intended route rather than a
 * shortcut that skips boxes.
 */
export function preferredPassage(page: BookPage, node: string, via?: BookEdge, walked = new Set<BookEdge>()): Exit | null {
  const byId = new Map(page.nodes.map((n) => [n.id, n]));
  const decisions = (steps: Step[]) => steps.filter((s) => s.exit.label).length;
  /** Entering a box through one of its own numbered corridors, i.e. from behind. */
  const backdoor = (x: Exit) => !!byId.get(x.to)?.label && exitsOf(page, x.to).some((back) => back.edge === x.edge && back.label);
  const backdoors = (first: Exit, steps: Step[]) => [first, ...steps.map((s) => s.exit)].filter(backdoor).length;
  let best: Exit | null = null, bestBack = Infinity, bestScore = -1;
  for (const exit of exitsOf(page, node, via)) {
    if (walked.has(exit.edge) || judge(page, byId.get(node)!, exit) === 'wrong') continue;
    if (byId.get(exit.to)?.type === 'finish') return exit;
    const rest = solve(page, exit.to, exit.edge, walked);
    if (!rest) continue;
    const back = backdoors(exit, rest), score = decisions(rest);
    if (back < bestBack || (back === bestBack && score > bestScore)) [best, bestBack, bestScore] = [exit, back, score];
  }
  return best;
}

/** The route a child following the rules is walked along (first correct choice, preferred passages). */
export function playRoute(page: BookPage): Step[] | null {
  const byId = new Map(page.nodes.map((n) => [n.id, n]));
  let node = page.nodes.find((n) => n.type === 'start')?.id;
  let via: BookEdge | undefined;
  const steps: Step[] = [];
  const walked = new Set<BookEdge>();
  for (let guard = 0; node && guard < 500; guard++) {
    if (byId.get(node)!.type === 'finish') return steps;
    const exits = exitsOf(page, node, via);
    const here = byId.get(node)!;
    // A labelled corridor that is right is a choice for the child; otherwise walk on through a passage.
    const exit =
      exits.find((x) => x.label && !walked.has(x.edge) && judge(page, here, x) === 'correct' && solve(page, x.to, x.edge, walked)) ??
      preferredPassage(page, node, via, walked);
    if (!exit) return null;
    steps.push({ node, exit });
    walked.add(exit.edge);
    via = exit.edge;
    node = exit.to;
  }
  return null;
}

/** Problems that would make the page unplayable or ambiguous. */
export function checkPage(page: BookPage): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  for (const n of page.nodes) {
    if (ids.has(n.id)) errors.push(`duplicate node id ${n.id}`);
    ids.add(n.id);
    if (!(n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1)) errors.push(`node ${n.id} outside 0..1`);
    if (n.label && answerOf(n.label) === null) errors.push(`node ${n.id}: cannot read question "${n.label}"`);
  }
  if (page.nodes.filter((n) => n.type === 'start').length !== 1) errors.push('need exactly one start');
  if (page.nodes.filter((n) => n.type === 'finish').length !== 1) errors.push('need exactly one finish');
  if (page.mechanic === 'a' && typeof page.target !== 'number') errors.push('mechanic a needs target');
  for (const e of page.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) errors.push(`edge ${e.from}->${e.to} references unknown node`);
    for (const l of [e.label, e.labelBack]) {
      if (l === undefined) continue;
      if (page.mechanic === 'a' ? evalExpr(l) === null : !/^\d+$/.test(l)) errors.push(`edge ${e.from}->${e.to}: odd label "${l}"`);
    }
  }
  if (errors.length) return { errors, warnings };

  const path = solve(page);
  if (!path) errors.push('no rule-following route from start to finish');
  else if (!playRoute(page)) errors.push('playing by the rules can get stuck');

  // Along the solution, each decision should have exactly one correct way on.
  const byId = new Map(page.nodes.map((n) => [n.id, n]));
  let via: BookEdge | undefined;
  for (const step of path ?? []) {
    const node = byId.get(step.node)!;
    const exits = exitsOf(page, step.node, via);
    const ok = exits.filter((x) => judge(page, node, x) !== 'wrong');
    if (ok.length > 1 && exits.some((x) => x.label)) warnings.push(`at ${step.node}: ${ok.length} allowed exits`);
    via = step.exit.edge;
  }
  return { errors, warnings };
}

/** Human-readable route, e.g. "start → [7+2] 9 → [5+2] 7 → finish". */
export function describe(page: BookPage, steps: Step[]): string {
  const byId = new Map(page.nodes.map((n) => [n.id, n]));
  return steps
    .map((s) => {
      const n = byId.get(s.node)!;
      return `${n.label ? `[${n.label}]` : n.id}${s.exit.label ? ` ${s.exit.label}` : ''}`;
    })
    .concat('finish')
    .join(' → ');
}

/** "7+2" → "7 + 2", "□+5=10" → "□ + 5 = 10", minus shown as a proper minus sign. */
export function pretty(label: string): string {
  return label
    .replace(MINUS, '−')
    .replace(/\s+/g, '')
    .replace(/([+−=])/g, ' $1 ')
    .trim();
}
