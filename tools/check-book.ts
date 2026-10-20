// Checks transcribed book pages. Usage: node tools/check-book.ts [src/level/book/L02.json ...]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkPage, describe, playRoute, type BookPage } from '../src/level/book.ts';

const dir = 'src/level/book';
const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f));
let bad = 0;
for (const file of files) {
  let page: BookPage;
  try {
    page = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.log(`✗ ${file}: invalid JSON (${(e as Error).message})`);
    bad++;
    continue;
  }
  const { errors, warnings } = checkPage(page);
  const route = playRoute(page);
  console.log(`${errors.length ? '✗' : '✓'} ${file}  L${page.level} "${page.title}"  nodes=${page.nodes.length} edges=${page.edges.length}`);
  for (const e of errors) console.log(`    ERROR ${e}`);
  for (const w of warnings) console.log(`    warn  ${w}`);
  if (route) console.log(`    route ${describe(page, route)}`);
  if (errors.length) bad++;
}
process.exit(bad ? 1 : 0);
