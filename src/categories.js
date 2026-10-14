// garage-common: categories 1
// Categories of the items the user creates (here: tasks). The category is the free text of a field on the item
// (empty = no category); there is no separate table. Pure functions: they return the items that change and the new
// colours map and touch nothing; the main process saves the result (apps/COMMON-FEATURES.md, section 2).
export const CATEGORY_PALETTE = ['#5b8cff', '#a478f0', '#38c6d9', '#35c98f', '#e6b450', '#ef6bab', '#ff8a4c', '#7bd88f', '#c084fc', '#4dd0e1', '#f2727f', '#8fb339'];
export const NO_CATEGORY_COLOR = '#9aa1ae';
const HEX_RE = /^#[0-9a-f]{6}$/i;

export const tidyName = (name) => String(name ?? '').trim();
const same = (a, b) => tidyName(a).toLowerCase() === tidyName(b).toLowerCase();
export const categoryOf = (item) => tidyName(item?.category);

// Automatic and stable colour: hash of the name over the palette.
export function autoColor(name) {
  let h = 0;
  for (const ch of tidyName(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
}
export function categoryColor(name, colors = {}) {
  const key = tidyName(name);
  if (!key) return NO_CATEGORY_COLOR;
  const custom = colors?.[key];
  return HEX_RE.test(custom || '') ? custom : autoColor(key);
}

// [{ name, count }] sorted by name; names that differ only in capitalisation count as one (first spelling wins).
export function listCategories(items) {
  const map = new Map();
  for (const it of items || []) {
    const c = categoryOf(it);
    if (!c) continue;
    const k = c.toLowerCase();
    if (!map.has(k)) map.set(k, { name: c, count: 0 });
    map.get(k).count++;
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const findExisting = (items, name, exceptKey) => {
  for (const it of items) {
    const c = categoryOf(it);
    if (c && same(c, name) && c.toLowerCase() !== exceptKey) return c;
  }
  return null;
};

// Rename `from` to `to`. If `to` already exists (any capitalisation) the two merge and the items take the name and the
// colour of the existing one. Otherwise the colour moves to the new name.
// -> { ok, changed: [item with the new category], colors, merged } or { ok:false, error }.
export function renameCategory(items, colors, from, to) {
  const src = tidyName(from);
  const dst = tidyName(to);
  if (!src || !dst) return { ok: false, error: 'empty' };
  const srcKey = src.toLowerCase();
  const target = findExisting(items, dst, srcKey);
  const final = target || dst;
  const next = { ...(colors || {}) };
  const mine = [...Object.keys(next)].find((k) => k.toLowerCase() === srcKey);
  const color = mine ? next[mine] : undefined;
  for (const k of Object.keys(next)) if (k.toLowerCase() === srcKey) delete next[k];
  if (!target && color) next[final] = color;
  const changed = items.filter((it) => categoryOf(it).toLowerCase() === srcKey).map((it) => ({ ...it, category: final }));
  return { ok: true, changed, colors: next, merged: !!target };
}

// Delete `name`: its items go to `moveTo` (another category, or '' = no category). Never deletes items.
export function deleteCategory(items, colors, name, moveTo = '') {
  const src = tidyName(name);
  if (!src) return { ok: false, error: 'empty' };
  const srcKey = src.toLowerCase();
  const dest = tidyName(moveTo);
  if (dest && dest.toLowerCase() === srcKey) return { ok: false, error: 'same' };
  const final = dest ? findExisting(items, dest, srcKey) || dest : '';
  const next = { ...(colors || {}) };
  for (const k of Object.keys(next)) if (k.toLowerCase() === srcKey) delete next[k];
  const changed = items.filter((it) => categoryOf(it).toLowerCase() === srcKey).map((it) => ({ ...it, category: final }));
  return { ok: true, changed, colors: next };
}
