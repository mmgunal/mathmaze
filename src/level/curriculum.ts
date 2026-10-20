/**
 * The 43 levels follow the reference book page by page: level n is the book's
 * n-th maze (data in ./book/LNN.json). Here only the per-level teaching info lives.
 */

export type HintKey =
  | 'pairs'
  | 'add'
  | 'doubles'
  | 'missingAdd'
  | 'sub'
  | 'subFrom'
  | 'missingSub'
  | 'mixed'
  | 'plusOne'
  | 'carry'
  | 'tens'
  | 'borrow'
  | 'three';

export interface LevelSpec {
  id: number;
  world: number;
  topic: HintKey;
}

const TOPICS: HintKey[] = [
  // World 1 · within 10
  'pairs', 'add', 'doubles', 'pairs', 'missingAdd', 'sub', 'subFrom',
  // World 2 · within 10, mixed, then 20
  'missingSub', 'mixed', 'mixed', 'pairs', 'add', 'add', 'missingAdd',
  // World 3 · within 20
  'subFrom', 'sub', 'missingSub', 'mixed', 'mixed', 'plusOne', 'add',
  // World 4 · two-digit addition
  'carry', 'tens', 'tens', 'pairs', 'tens', 'add', 'carry',
  // World 5 · two-digit subtraction
  'missingAdd', 'sub', 'borrow', 'tens', 'tens', 'subFrom', 'tens',
  // World 6 · two-digit mastery and three addends
  'sub', 'borrow', 'missingSub', 'mixed', 'mixed', 'three', 'three', 'tens',
];

export const WORLD_SIZES = [7, 7, 7, 7, 7, 8];

function worldOf(index: number): number {
  let acc = 0;
  for (let w = 0; w < WORLD_SIZES.length; w++) {
    acc += WORLD_SIZES[w];
    if (index < acc) return w;
  }
  return WORLD_SIZES.length - 1;
}

export const LEVELS: LevelSpec[] = TOPICS.map((topic, i) => ({ id: i + 1, world: worldOf(i), topic }));
