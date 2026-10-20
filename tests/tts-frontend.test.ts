import { describe, expect, it } from 'vitest';
import { alphabet, frontend, normalize, numberWords } from '../mobile/tts/frontend';
import meta from '../mobile/assets/tts/meta.json';

const vocab = new Set(meta.vocab.filter((v) => v.length === 1));

describe('Turkish number reader', () => {
  it.each([
    [0, 'sıfır'], [7, 'yedi'], [10, 'on'], [21, 'yirmi bir'], [100, 'yüz'], [101, 'yüz bir'],
    [250, 'iki yüz elli'], [1000, 'bin'], [1999, 'bin dokuz yüz doksan dokuz'], [2024, 'iki bin yirmi dört'],
    [1_000_000, 'bir milyon'],
  ])('%i → %s', (n, words) => expect(numberWords(n)).toBe(words));

  it('joins suffixes after an apostrophe', () => {
    expect(normalize("10'a Tamamlama")).toBe('ona Tamamlama');
    expect(normalize("100'den Çıkarma")).toBe('yüzden Çıkarma');
    expect(normalize("10'un Katları")).toBe('onun Katları');
    expect(normalize('20’ye Kadar')).toBe('yirmiye Kadar');
  });

  it('reads arithmetic and blanks', () => {
    expect(normalize('7 + 5 = ?')).toBe('yedi artı beş eşittir kaç?');
    expect(normalize('12-4=8')).toBe('on iki eksi dört eşittir sekiz');
    expect(normalize('3 + _ = 9')).toBe('üç artı kaç eşittir dokuz');
  });
});

describe('model alphabet', () => {
  it('lowercases with Turkish rules and drops unknown symbols', () => {
    expect(alphabet('IŞIK İzmir', vocab)).toBe('ışık izmir');
    expect(alphabet('Usta Kâşif 🚀', vocab)).toBe('usta kaşif');
  });

  it('every game sentence maps to known letters only', () => {
    const pieces = frontend("Toplamı 10 olan işlemlerin yazdığı yolları takip ederek bitişe ulaş! Pıtır Ay üssünde.", vocab, 1);
    for (const [piece] of pieces) for (const ch of piece) expect(vocab.has(ch)).toBe(true);
    expect(pieces.map(([p]) => p).join(' ')).toContain('toplamı on olan');
  });
});
