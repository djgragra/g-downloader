// Lists the texts used in the code that have no English/Spanish version yet.
// usage: node dev/i18n-scan.mjs   (prints JSON { renderer: [...], main: [...] })
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function literals(src, fn) {
  const re = new RegExp(`(?<![\\w.])${fn}\\(\\s*(["'\`])((?:\\\\.|(?!\\1)[^\\\\])*)\\1`, 'g');
  const out = [];
  for (const m of src.matchAll(re)) {
    if (m[1] === '`' && m[2].includes('${')) continue;
    try {
      out.push(vm.runInNewContext(m[1] + m[2] + m[1]));
    } catch {
      /* not a plain literal */
    }
  }
  return out;
}

export function tableKeys(file, name) {
  const src = read(file);
  const start = src.indexOf(`const ${name} = {`);
  const end = src.indexOf('\n};', start);
  const obj = vm.runInNewContext('(' + src.slice(start + `const ${name} = `.length, end + 2) + ')');
  return obj;
}

export function scan() {
  const ui = tableKeys('renderer/i18n-text.js', 'UI_TEXT');
  const mainTable = tableKeys('src/i18n.js', 'TEXT');
  const rendererSrc = read('renderer/app.js');
  const missingRenderer = [...new Set(literals(rendererSrc, 'L'))].filter((t) => !ui[t]);
  const mainSrc = ['main.js', ...fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.js')).map((f) => 'src/' + f)].map(read).join('\n');
  const used = new Set([...literals(mainSrc, 'M'), ...literals(mainSrc, 't')]);
  const missingMain = [...used].filter((t) => !mainTable[t] && /[a-zàèéìòù]{3}/i.test(t));
  return { missingRenderer, missingMain, ui, mainTable };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const { missingRenderer, missingMain } = scan();
  console.log(JSON.stringify({ renderer: missingRenderer, main: missingMain }, null, 1));
}
