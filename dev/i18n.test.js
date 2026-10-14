import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { scan, tableKeys } from './i18n-scan.mjs';

const placeholders = (t) => [...String(t).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('every text used in the code has an English and a Spanish version (interface and main process)', () => {
  const { missingRenderer, missingMain } = scan();
  assert.deepEqual(missingRenderer, [], 'texts in renderer/app.js without translation: add them to renderer/i18n-text.js');
  assert.deepEqual(missingMain, [], 'texts in main.js / src without translation: add them to src/i18n.js');
});

test('translations keep the same {placeholders} as the Italian text and are not empty', () => {
  for (const [file, name] of [['renderer/i18n-text.js', 'UI_TEXT'], ['src/i18n.js', 'TEXT']]) {
    for (const [it, [en, es]] of Object.entries(tableKeys(file, name))) {
      assert.ok(en && es, `${name}: missing translation for ${it}`);
      assert.equal(placeholders(en), placeholders(it), `${name} EN placeholders: ${it}`);
      assert.equal(placeholders(es), placeholders(it), `${name} ES placeholders: ${it}`);
    }
  }
});

test('interface strings and the guide have the same keys and sections in it / en / es', () => {
  const src = fs.readFileSync(new URL('../renderer/i18n.js', import.meta.url), 'utf8');
  const ctx = {};
  vm.runInNewContext(src + ';this.UI_STRINGS = UI_STRINGS; this.GUIDE_CONTENT = GUIDE_CONTENT;', ctx);
  for (const [key, v] of Object.entries(ctx.UI_STRINGS)) for (const l of ['it', 'en', 'es']) assert.ok(v[l], `${key}.${l}`);
  const g = ctx.GUIDE_CONTENT;
  assert.equal(g.it.sections.length, g.en.sections.length);
  assert.equal(g.it.sections.length, g.es.sections.length);
  for (const l of ['it', 'en', 'es']) for (const s of g[l].sections) assert.ok(s.h && s.p);
});
