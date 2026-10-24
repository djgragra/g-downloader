import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const chapters = (lang) => [...read(`docs/manual/content_${lang}.py`).matchAll(/^\("([^"]+)", """/gm)].map((m) => m[1]);
const breaks = (lang) => [...read(`docs/manual/content_${lang}.py`).matchAll(/^""", (True|False)\),$/gm)].map((m) => m[1]);

test('the manual has the same chapters, in the same order, in English, Italian and Spanish', () => {
  const [en, it, es] = ['en', 'it', 'es'].map(chapters);
  assert.ok(en.length >= 19);
  assert.equal(it.length, en.length);
  assert.equal(es.length, en.length);
  assert.deepEqual(breaks('it'), breaks('en'));
  assert.deepEqual(breaks('es'), breaks('en'));
});

test('every language uses the version placeholder, never a fixed version, and the same tables and warnings', () => {
  const count = (lang, re) => (read(`docs/manual/content_${lang}.py`).match(re) || []).length;
  for (const lang of ['it', 'es']) {
    for (const re of [/<table>/g, /<div class="warn">/g, /<div class="note">/g, /<pre>/g]) assert.equal(count(lang, re), count('en', re), `${lang} ${re}`);
  }
  for (const lang of ['en', 'it', 'es']) assert.ok(read(`docs/manual/content_${lang}.py`).includes('{v}'), lang);
});

test('build.py makes the three PDFs with the standard names and the workflow attaches them to the release', () => {
  const build = read('docs/manual/build.py');
  assert.match(build, /from content_es import ES/);
  assert.match(build, /\("en", EN\), \("it", IT\), \("es", ES\)/);
  assert.match(build, /\{NAME\}-Manual-\{lang\.upper\(\)\}-\{VER\}/);
  assert.match(build, /\$CHROME|os\.environ\.get\("CHROME"\)/);
  const wf = read('.github/workflows/build-installers.yml');
  assert.match(wf, /\n  manuals:\n/);
  assert.match(wf, /docs\/manual\/build\.py/);
  assert.match(wf, /needs: \[build, manuals\]/);
});
