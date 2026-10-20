import { describe, expect, it } from 'vitest';
import { answerOf, checkPage, evalExpr, solve, type BookPage } from '../src/level/book';

const files = import.meta.glob<BookPage>('../src/level/book/L*.json', { eager: true, import: 'default' });
const pages: [string, BookPage][] = Object.entries(files).map(([path, page]) => [path.split('/').pop()!, page]);

describe('rules', () => {
  it('reads boxes', () => {
    expect(evalExpr('7+2')).toBe(9);
    expect(evalExpr('10 − 3')).toBe(7);
    expect(evalExpr('3+4+5')).toBe(12);
    expect(answerOf('□+5=10')).toBe(5);
    expect(answerOf('8+□=9')).toBe(1);
    expect(answerOf('□−3=5')).toBe(8);
    expect(answerOf('9−□=4')).toBe(5);
  });
});

describe('book pages', () => {
  it.each(pages)('%s is playable', (_, page) => {
    const { errors } = checkPage(page);
    expect(errors).toEqual([]);
    expect(solve(page)).not.toBeNull();
  });

  it('level number matches file name', () => {
    for (const [f, page] of pages) expect(f).toBe(`L${String(page.level).padStart(2, '0')}.json`);
  });
});
