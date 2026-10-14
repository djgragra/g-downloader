import test from 'node:test';
import assert from 'node:assert/strict';
import { listCategories, renameCategory, deleteCategory, autoColor, categoryColor, categoryOf, CATEGORY_PALETTE } from '../src/categories.js';

const tasks = [
  { id: 1, category: 'News' },
  { id: 2, category: ' news ' },
  { id: 3, category: 'Sport' },
  { id: 4, category: '' },
  { id: 5 }
];

test('categories are listed once per name, ignoring capitals and spaces; no category is left out', () => {
  assert.deepEqual(listCategories(tasks), [{ name: 'News', count: 2 }, { name: 'Sport', count: 1 }]);
  assert.equal(categoryOf({ category: '  X ' }), 'X');
});

test('the colour is stable, from the common palette, and can be overridden (only #rrggbb counts)', () => {
  assert.ok(CATEGORY_PALETTE.includes(autoColor('News')));
  assert.equal(autoColor('News'), autoColor(' News '));
  assert.equal(categoryColor('News', { News: '#112233' }), '#112233');
  assert.equal(categoryColor('News', { News: 'red' }), autoColor('News'));
  assert.equal(categoryColor('', {}), '#9aa1ae');
  assert.equal(CATEGORY_PALETTE.join(' '), '#5b8cff #a478f0 #38c6d9 #35c98f #e6b450 #ef6bab #ff8a4c #7bd88f #c084fc #4dd0e1 #f2727f #8fb339');
});

test('rename changes every task and moves the colour', () => {
  const r = renameCategory(tasks, { News: '#112233', Sport: '#445566' }, 'news', 'Notizie');
  assert.deepEqual(r.changed.map((t) => [t.id, t.category]), [[1, 'Notizie'], [2, 'Notizie']]);
  assert.deepEqual(r.colors, { Sport: '#445566', Notizie: '#112233' });
  assert.equal(r.merged, false);
});

test('rename onto an existing name merges and keeps the colour of the existing one', () => {
  const r = renameCategory(tasks, { News: '#112233', Sport: '#445566' }, 'News', 'sport');
  assert.deepEqual(r.changed.map((t) => [t.id, t.category]), [[1, 'Sport'], [2, 'Sport']]);
  assert.deepEqual(r.colors, { Sport: '#445566' });
  assert.equal(r.merged, true);
  assert.equal(renameCategory(tasks, {}, 'News', '  ').ok, false);
});

test('delete moves the tasks to another category or to none, and never deletes tasks', () => {
  const toNone = deleteCategory(tasks, { Sport: '#445566' }, 'Sport', '');
  assert.deepEqual(toNone.changed.map((t) => [t.id, t.category]), [[3, '']]);
  assert.deepEqual(toNone.colors, {});
  const toOther = deleteCategory(tasks, {}, 'Sport', 'news');
  assert.deepEqual(toOther.changed.map((t) => t.category), ['News']);
  assert.equal(deleteCategory(tasks, {}, 'Sport', 'sport').ok, false);
  assert.equal(tasks.length, 5); // untouched
});
