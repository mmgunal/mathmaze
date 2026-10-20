import type { BookEdge, BookNode, BookPage } from './book';
import type { LevelSpec } from './curriculum';

/** Layout plane: x to the right, y "forward" (away from the camera). */
export interface Vec2 {
  x: number;
  y: number;
}

export interface MazeLabel {
  /** Display text, e.g. "9" or "3 + 7". */
  text: string;
  pos: Vec2;
}

export interface MazeNode {
  id: string;
  pos: Vec2;
  book: BookNode;
  /** Display text of the question box at this node. */
  prompt?: string;
}

export interface MazeEdge {
  book: BookEdge;
  a: string;
  b: string;
  /** Corridor from a to b. */
  path: Vec2[];
  /** Choice label read when leaving a / leaving b. */
  labelA?: MazeLabel;
  labelB?: MazeLabel;
}

/** A book page laid out in world space, ready to render and play. */
export interface Maze {
  spec: LevelSpec;
  page: BookPage;
  nodes: Map<string, MazeNode>;
  edges: MazeEdge[];
  start: MazeNode;
  finish: MazeNode;
  /** Extent of the page in world space. */
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}
