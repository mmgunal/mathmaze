/** Synthesised sounds (no audio files): soft, child-friendly tones. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (muted) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return { ctx, out: master! };
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 1, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const t0 = a.ctx.currentTime + start;
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g).connect(a.out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  tap: () => tone(660, 0, 0.08, 'triangle', 0.5),
  correct: () => {
    tone(784, 0, 0.18, 'triangle', 0.8);
    tone(1175, 0.09, 0.28, 'triangle', 0.7);
  },
  // "Uh-oh": two falling, buzzy notes, clearly different from every happy sound.
  wrong: () => {
    tone(330, 0, 0.2, 'square', 0.32, 300);
    tone(220, 0.2, 0.42, 'square', 0.32, 160);
    tone(110, 0, 0.6, 'sine', 0.5);
  },
  step: () => tone(520 + Math.random() * 80, 0, 0.06, 'sine', 0.25),
  hint: () => {
    tone(988, 0, 0.12, 'sine', 0.5);
    tone(1319, 0.1, 0.2, 'sine', 0.4);
  },
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, i === 5 ? 0.6 : 0.2, 'triangle', 0.7)),
  star: (i: number) => tone(880 + i * 220, 0, 0.25, 'triangle', 0.6),
  setMuted(v: boolean) {
    muted = v;
  },
  get muted() {
    return muted;
  },
};
