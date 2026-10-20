/**
 * EMA Lightning (Turkish TTS, Apache-2.0, canberkkkkkk) on ONNX Runtime: text -> 48 kHz mono audio.
 * Port of ema-lightning-web's tts.js (text, sound and decoder graphs). The runtime is passed in, so
 * the same code runs on onnxruntime-react-native in the app and onnxruntime-node in checks.
 */
import { frontend } from './frontend';

type Tensor = { getData?(): Promise<unknown>; data: unknown };
type Session = { run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>; release?(): Promise<void> };
export type Ort = {
  InferenceSession: { create(path: string, options?: object): Promise<Session> };
  Tensor: new (type: string, data: Float32Array | BigInt64Array, dims: number[]) => Tensor;
};
export type Meta = { vocab: string[]; times: number[]; latent_dim: number; hop: number; sample_rate: number };

export const RATE = 48000;
const WINDOW = 100; // frames decoded at a time (four seconds)
const CONTEXT = 8; // frames decoded on each side of a window, then dropped
const MAX_WORD_FRAMES = 250;
const MAX_FRAMES = 3000;

/** Seeded Gaussian noise (mulberry32 + Box-Muller), same stream as the web port. */
function gaussian(seed: number) {
  let a = seed >>> 0;
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return (n: number) => {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 2) {
      const r = Math.sqrt(-2 * Math.log(1 - uniform())), th = 2 * Math.PI * uniform();
      out[i] = r * Math.cos(th);
      if (i + 1 < n) out[i + 1] = r * Math.sin(th);
    }
    return out;
  };
}

/** Word index of each letter and the first letter of that word (spaces belong to the next word). */
function words(text: string) {
  const starts: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] !== ' ' && (i === 0 || text[i - 1] === ' ')) starts.push(i);
  if (!starts.length) starts.push(0);
  const bounds = [0, ...starts.slice(1), text.length];
  const cw: number[] = [], wstart: number[] = [];
  for (let w = 0; w + 1 < bounds.length; w++)
    for (let i = bounds[w]; i < bounds[w + 1]; i++) { cw.push(w); wstart.push(bounds[w]); }
  return { cw, wstart };
}

/** Frame timeline: frames per word from the predicted letter durations, plus the aligner positions. */
function plan(cw: number[], wstart: number[], dur: Float32Array, speed: number) {
  const L = cw.length, nWords = cw[L - 1] + 1;
  const d = Float32Array.from(dur, (x) => x / speed);
  const sums = new Float64Array(nWords);
  for (let i = 0; i < L; i++) sums[cw[i]] += d[i];
  const counts = Array.from(sums, (s) => Math.min(MAX_WORD_FRAMES, Math.max(1, Math.round(s))));
  const T = Math.min(counts.reduce((a, b) => a + b, 0), MAX_FRAMES);
  const fw = new Array<number>(T).fill(0), fp = new Float32Array(T);
  for (let w = 0, f = 0; w < nWords; w++)
    for (let j = 0; j < counts[w] && f < T; j++, f++) { fw[f] = w; fp[f] = j / counts[w]; }
  const c = Float32Array.from(d, (x) => Math.max(x, 1e-4));
  const done = new Float32Array(L), total = new Float32Array(nWords);
  for (let i = 0, acc = 0; i < L; i++) { acc += c[i]; done[i] = acc; total[cw[i]] += c[i]; }
  const before = (i: number) => done[i] - c[i];
  const wlen = new Float32Array(nWords);
  for (const w of cw) wlen[w] += 1;
  const woff = new Float32Array(nWords);
  for (let w = 1; w < nWords; w++) woff[w] = woff[w - 1] + Math.max(wlen[w - 1], 1);
  const cg = new Float32Array(L), fg = new Float32Array(T);
  for (let i = 0; i < L; i++) {
    const cp = Math.min(1, Math.max(0, (done[i] - before(wstart[i]) - 0.5 * c[i]) / Math.max(total[cw[i]], 1e-8)));
    cg[i] = woff[cw[i]] + cp * Math.max(wlen[cw[i]], 1);
  }
  for (let f = 0; f < T; f++) fg[f] = woff[fw[f]] + fp[f] * Math.max(wlen[fw[f]], 1);
  return { T, fw, cg, fg };
}

const data = async (t: Tensor) => (t.getData ? await t.getData() : t.data) as Float32Array;

export class EMA {
  private stoi: Map<string, number>;
  private alpha: Set<string>;

  private constructor(private ort: Ort, private meta: Meta, private text: Session, private sound: Session, private decoder: Session) {
    this.stoi = new Map(meta.vocab.map((ch, i) => [ch, i]));
    this.alpha = new Set(meta.vocab.filter((v) => v.length === 1));
  }

  /** `models` maps each graph to a path (or file:// URI) ONNX Runtime can open. */
  static async load(ort: Ort, meta: Meta, models: { text: string; sound: string; decoder: string }) {
    const opts = { executionProviders: ['cpu'], graphOptimizationLevel: 'all' };
    const [text, sound, decoder] = await Promise.all(
      [models.text, models.sound, models.decoder].map((p) => ort.InferenceSession.create(p, opts)),
    );
    return new EMA(ort, meta, text, sound, decoder);
  }

  private i64 = (arr: ArrayLike<number>) => new this.ort.Tensor('int64', BigInt64Array.from(arr as number[], (x) => BigInt(x)), [1, arr.length]);
  private f32 = (arr: Float32Array, dims: number[]) => new this.ort.Tensor('float32', arr, dims);

  /** The whole utterance as 48 kHz samples in [-1, 1], with short pauses between pieces. */
  async synthesize(input: string, { speed = 1, seed = 0 } = {}): Promise<Float32Array> {
    const { times, latent_dim: D, hop } = this.meta;
    const parts: Float32Array[] = [];
    const pieces = frontend(input, this.alpha, speed);
    for (let k = 0; k < pieces.length; k++) {
      const [piece, pause] = pieces[k];
      const ids = [...piece].map((ch) => this.stoi.get(ch) ?? 1);
      const { cw, wstart } = words(piece);
      const { h, dur } = await this.text.run({ ids: this.i64(ids) });
      const { T, fw, cg, fg } = plan(cw, wstart, await data(dur), speed);
      const noise = gaussian(seed * 1000003 + k)(times.length * T * D);
      const { latents } = await this.sound.run({
        h, cg: this.f32(cg, [1, cg.length]), fg: this.f32(fg, [1, T]), cw: this.i64(cw), fw: this.i64(fw),
        noise: this.f32(noise, [1, times.length, T, D]),
      });
      const lat = await data(latents); // [T, D]
      for (let s = 0; s < T; s += WINDOW) {
        const e = Math.min(T, s + WINDOW);
        const a = Math.max(0, s - CONTEXT), b = Math.min(T, e + CONTEXT), n = b - a;
        const z = new Float32Array(D * n); // [1, D, n]
        for (let f = 0; f < n; f++) for (let j = 0; j < D; j++) z[j * n + f] = lat[(a + f) * D + j];
        const { audio } = await this.decoder.run({ z: this.f32(z, [1, D, n]) });
        parts.push((await data(audio)).slice((s - a) * hop, (e - a) * hop));
      }
      if (pause) parts.push(new Float32Array(Math.round(pause * RATE)));
    }
    const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    parts.reduce((o, p) => (out.set(p, o), o + p.length), 0);
    return out;
  }
}

/** 16-bit PCM WAV bytes. */
export function wav(samples: Float32Array, rate = RATE): Uint8Array {
  const buf = new ArrayBuffer(44 + 2 * samples.length), v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + 2 * samples.length, true); str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, 2 * samples.length, true);
  for (let i = 0, o = 44; i < samples.length; i++, o += 2) v.setInt16(o, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  return new Uint8Array(buf);
}
