/** Local progress: best stars per level. Everything stays on the device. */
const KEY = 'ml.progress.v1';

type Progress = Record<number, number>;

function load(): Progress {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Progress;
  } catch {
    return {};
  }
}

let progress = load();

export function starsFor(id: number): number {
  return progress[id] ?? 0;
}

export function isUnlocked(id: number): boolean {
  return id === 1 || starsFor(id - 1) > 0;
}

export function saveStars(id: number, stars: number) {
  if (stars <= starsFor(id)) return;
  progress = { ...progress, [id]: stars };
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable: progress lasts for this session only */
  }
}
