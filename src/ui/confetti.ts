/** Full-screen 2D confetti shower for the level-complete moment. */
export function confetti(host: HTMLElement, duration = 2600) {
  const c = document.createElement('canvas');
  c.id = 'confetti';
  host.appendChild(c);
  const dpr = Math.min(2, window.devicePixelRatio);
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  const colors = ['#ff5c6c', '#ffd447', '#3fcf8e', '#4dabf7', '#7c5cff', '#ff9f43'];
  const bits = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80,
    y: innerHeight * 0.42,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 15 - 5,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    w: 6 + Math.random() * 8,
    h: 4 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  const tick = (now: number) => {
    const t = now - t0;
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.vy += 0.38;
      b.vx *= 0.985;
      b.x += b.vx;
      b.y += b.vy;
      b.r += b.vr;
      g.save();
      g.globalAlpha = Math.max(0, 1 - t / duration);
      g.translate(b.x, b.y);
      g.rotate(b.r);
      g.fillStyle = b.c;
      g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r * 2)));
      g.restore();
    }
    if (t < duration) requestAnimationFrame(tick);
    else c.remove();
  };
  requestAnimationFrame(tick);
}
