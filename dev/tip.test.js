import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { TIP_URLS, tipUrl, isTipUrl } from '../src/tip.js';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('the tip card opens the site page in the language of the app, English when unknown', () => {
  assert.equal(tipUrl('en'), 'https://onairgarage.com/support/');
  assert.equal(tipUrl('it'), 'https://onairgarage.com/it/support/');
  assert.equal(tipUrl('es'), 'https://onairgarage.com/es/support/');
  assert.equal(tipUrl('fr'), 'https://onairgarage.com/support/');
});

test('only the three support pages are allowed, nothing else on the site and no payment link', () => {
  for (const url of Object.values(TIP_URLS)) assert.ok(isTipUrl(url));
  for (const bad of ['https://onairgarage.com/support', 'https://onairgarage.com/support/x', 'https://onairgarage.com/it/support/?a=1',
    'http://onairgarage.com/support/', 'https://evil.example/support/', 'https://buy.stripe.com/abc', '', null, undefined, 42]) assert.ok(!isTipUrl(bad), String(bad));
  assert.match(read('main.js'), /isTipUrl\(url\)/);
});

test('the interface uses the same three addresses and has the texts in English, Italian and Spanish', () => {
  const app = read('renderer/app.js');
  for (const url of Object.values(TIP_URLS)) assert.ok(app.includes(`'${url}'`), url);
  const ctx = {};
  vm.runInNewContext(`${read('renderer/i18n-text.js')};this.UI_TEXT = UI_TEXT;`, ctx);
  const line = ctx.UI_TEXT['Ti è utile? Un caffè per i meccanici è sempre ben accetto.'];
  const pill = ctx.UI_TEXT['Salvadanaio'];
  assert.deepEqual([...line], ['Useful to you? A coffee for the mechanics is always welcome.', '¿Te resulta útil? Un café para los mecánicos siempre es bienvenido.']);
  assert.deepEqual([...pill], ['Tip jar', 'Hucha']);
  assert.match(app, /data-about-link="\$\{TIP_URLS\[lang\]/);
  assert.ok(fs.existsSync(new URL('../renderer/img/tip-jar.png', import.meta.url)));
});
