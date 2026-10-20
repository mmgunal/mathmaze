/**
 * EMA Lightning text frontend: turns game text into the model's spoken-form alphabet and splits it
 * into pieces. Mirrors ema_lightning's frontend.py / chunker.py as ported in ema-lightning-web
 * (Apache-2.0). Instead of the normalizer-tr WebAssembly (Hermes has no WebAssembly) a small reader
 * covers what the game says: whole numbers, Turkish suffixes after them and arithmetic signs.
 */

const ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

function belowThousand(n: number): string[] {
  const h = Math.floor(n / 100);
  const words = h ? [...(h > 1 ? [ONES[h]] : []), 'yüz'] : [];
  return [...words, TENS[Math.floor(n / 10) % 10], ONES[n % 10]].filter(Boolean);
}

/** 0 → "sıfır", 21 → "yirmi bir", 1250 → "bin iki yüz elli". */
export function numberWords(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) return String(n);
  if (n === 0) return 'sıfır';
  const words: string[] = [];
  const scales: [number, string][] = [[1e9, 'milyar'], [1e6, 'milyon'], [1e3, 'bin']];
  for (const [size, name] of scales) {
    const k = Math.floor(n / size);
    if (k) words.push(...(k === 1 && size === 1e3 ? [] : belowThousand(k)), name);
    n %= size;
  }
  return [...words, ...belowThousand(n)].join(' ');
}

const SIGNS: Record<string, string> = { '+': 'artı', '-': 'eksi', '−': 'eksi', '–': 'eksi', '×': 'çarpı', 'x': 'çarpı', '÷': 'bölü', '=': 'eşittir' };

/** Reads numbers and the signs between them aloud: "10'a" → "ona", "7 + 5 = ?" → "yedi artı beş eşittir kaç?". */
export function normalize(text: string): string {
  return text
    .replace(/([\d?_□])\s*([+\-−–×x÷=])\s*(?=[\d?_□])/g, (_, d: string, s: string) => `${d} ${SIGNS[s]} `)
    .replace(/(eşittir )[?_□]+/g, '$1kaç?')
    .replace(/[_□]+/g, 'kaç')
    .replace(/(\d+)(?:['’]([a-zçğıöşüâîû]+))?/gi, (_, n: string, suffix?: string) => numberWords(Number(n)) + (suffix ?? ''));
}

// Accents the model has no letter for (written without NFKD and \p{…}, which Hermes may lack).
const PLAIN: Record<string, string> = {
  'â': 'a', 'á': 'a', 'à': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'î': 'i', 'í': 'i', 'ì': 'i', 'ï': 'i', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'û': 'u', 'ú': 'u',
  'ù': 'u', 'ñ': 'n', 'ý': 'y', 'ÿ': 'y',
};
const TYPOGRAPHY: Record<string, string> = {
  '’': "'", '‘': "'", 'ʼ': "'", '´': "'", '`': "'", '“': '"', '”': '"', '„': '"',
  '«': '"', '»': '"', '–': '-', '—': '-', '−': '-', '…': '...',
};
const UNSAFE = /[\x00-\x08\x0b-\x1f\x7f-\x9f؜‎‏‪-‮⁦-⁩]/g;

/** Lowercases with Turkish rules and keeps only letters the model knows; everything else becomes a space. */
export function alphabet(text: string, vocab: Set<string>): string {
  text = [...text.replace(UNSAFE, ' ')].map((ch) => TYPOGRAPHY[ch] ?? ch).join('');
  text = text.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr');
  let out = '';
  for (const ch of text) {
    const plain = PLAIN[ch] ?? ch;
    out += vocab.has(plain) ? plain : ' ';
  }
  return out.replace(/\s+/g, ' ').trim();
}

const LETTERS_PER_SECOND = 18, MAX_SECONDS = 10, MAX_LETTERS = 250;
const SENTENCE_PAUSE = 0.25, CLAUSE_PAUSE = 0.12;
const CUTS: [RegExp, number][] = [[/[.!?]+["')]*(?= )/g, SENTENCE_PAUSE], [/[,;:](?= )/g, CLAUSE_PAUSE], [/\S(?= )/g, CLAUSE_PAUSE]];

function finish(piece: string) {
  if (/[.!?]$/.test(piece.replace(/["')]+$/, ''))) return piece;
  return piece.replace(/[,;:\- ]+$/, '') + '.';
}

/** Splits text into pieces of at most ~10 s, each with the pause (seconds) that follows it. */
export function chunk(text: string, speed: number): [piece: string, pause: number][] {
  const limit = Math.floor(Math.min(MAX_LETTERS, LETTERS_PER_SECOND * MAX_SECONDS * speed));
  const pieces: [string, number][] = [];
  let rest = text.trim();
  while (rest) {
    let cut = rest.length, pause = 0;
    if (rest.length > limit) {
      cut = limit;
      const head = rest.slice(0, limit + 1);
      for (const [pattern, gap] of CUTS) {
        const ends = [...head.matchAll(pattern)].map((m) => m.index! + m[0].length);
        if (ends.length) { cut = ends[ends.length - 1]; pause = gap; break; }
      }
    }
    const piece = rest.slice(0, cut).trim();
    rest = rest.slice(cut).trim();
    if (/[a-zçğıöşü]/.test(piece)) pieces.push([finish(piece), pause]);
  }
  if (pieces.length) pieces[pieces.length - 1][1] = 0;
  return pieces;
}

export function frontend(text: string, vocab: Set<string>, speed: number) {
  return chunk(alphabet(normalize(text), vocab), speed);
}
