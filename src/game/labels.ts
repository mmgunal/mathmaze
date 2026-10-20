import * as THREE from 'three';
export const BLANK = '□';

export const FONT = '"Baloo 2", "Arial Rounded MT Bold", system-ui, sans-serif';

export async function loadFont() {
  try {
    await Promise.race([document.fonts.load(`800 64px "Baloo 2"`), new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    /* fallback fonts are fine */
  }
}

export interface PlaqueStyle {
  bg: string;
  border: string;
  text: string;
  /** World height of the sprite. */
  height: number;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Text with the blank "□" drawn as a dashed rounded box so it reads clearly in every font. */
function drawText(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, color: string) {
  const parts = text.split(BLANK);
  const box = size * 0.78;
  const widths = parts.map((p) => g.measureText(p).width);
  const total = widths.reduce((a, b) => a + b, 0) + (parts.length - 1) * (box + size * 0.12);
  let x = cx - total / 2;
  g.fillStyle = color;
  parts.forEach((p, i) => {
    g.fillText(p, x, cy);
    x += widths[i];
    if (i < parts.length - 1) {
      g.save();
      g.strokeStyle = color;
      g.lineWidth = size * 0.08;
      g.setLineDash([size * 0.14, size * 0.1]);
      roundRect(g, x + size * 0.06, cy - box / 2 - size * 0.04, box, box, size * 0.14);
      g.stroke();
      g.restore();
      x += box + size * 0.12;
    }
  });
}

export function plaqueTexture(text: string, style: PlaqueStyle): { texture: THREE.CanvasTexture; aspect: number } {
  const size = 96;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  g.font = `800 ${size}px ${FONT}`;
  const textW = g.measureText(text.replace(BLANK, 'MM')).width;
  const padX = size * 0.45;
  const w = Math.max(size * 1.5, textW + padX * 2);
  const h = size * 1.45;
  const pad = 10;
  c.width = Math.ceil(w + pad * 2);
  c.height = Math.ceil(h + pad * 2 + 8);

  g.font = `800 ${size}px ${FONT}`;
  g.textBaseline = 'middle';
  // soft drop shadow
  g.fillStyle = 'rgba(0,0,0,0.18)';
  roundRect(g, pad, pad + 8, w, h, h / 2.4);
  g.fill();
  g.fillStyle = style.border;
  roundRect(g, pad, pad, w, h, h / 2.4);
  g.fill();
  g.fillStyle = style.bg;
  roundRect(g, pad + 7, pad + 7, w - 14, h - 14, h / 2.4 - 6);
  g.fill();
  drawText(g, text, c.width / 2, pad + h / 2 + size * 0.06, size, style.text);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: c.width / c.height };
}

export function makePlaque(text: string, style: PlaqueStyle): THREE.Sprite {
  const { texture, aspect } = plaqueTexture(text, style);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(style.height * aspect, style.height, 1);
  // Always drawn on top: a number must never hide behind a tree or a cloud.
  sprite.renderOrder = 10;
  return sprite;
}
