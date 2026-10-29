import test from 'node:test';
import assert from 'node:assert/strict';
import { wildcardSource, pickMatch, sameAsBefore, ftpUrlWithName } from '../src/wildcard.js';

test('wildcardSource: only the file name counts, per kind of source', () => {
  assert.equal(wildcardSource('ftp://host/dir/file.mp3', false), null);
  assert.equal(wildcardSource('/data/in/file.mp3', true), null);
  assert.deepEqual(wildcardSource('/data/in/BULLETIN_*.mp2', true), { kind: 'local', dir: '/data/in/', pattern: 'BULLETIN_*.mp2' });
  assert.deepEqual(wildcardSource('C:\\in\\news_??.mp3', true), { kind: 'local', dir: 'C:\\in\\', pattern: 'news_??.mp3' });
  assert.equal(wildcardSource('*.mp3', true).dir, '.');
  const f = wildcardSource('ftp://host:2121/news/BULLETIN_*.mp2', false);
  assert.equal(f.kind, 'ftp');
  assert.equal(f.dir, '/news/');
  assert.equal(f.pattern, 'BULLETIN_*.mp2');
  assert.equal(wildcardSource('https://host/BULLETIN_*.mp2', false).kind, 'http');
  assert.equal(wildcardSource('https://host/a.mp3?x=*', false), null); // a * in the query is not a file name
  assert.equal(wildcardSource('ftp://host/dir*/file.mp3', false), null); // never the folder
});

test('pickMatch: the newest wins, by time and then by name; no match gives null', () => {
  const files = [
    { name: 'BULLETIN_20261029_23.mp2', size: 5, mtimeMs: 100 },
    { name: 'BULLETIN_20261030_00.mp2', size: 5, mtimeMs: 200 },
    { name: 'other.mp3', size: 5, mtimeMs: 900 }
  ];
  const m = pickMatch(files, 'BULLETIN_*.mp2');
  assert.equal(m.chosen.name, 'BULLETIN_20261030_00.mp2');
  assert.deepEqual(m.others.map((o) => o.name), ['BULLETIN_20261029_23.mp2']);
  assert.equal(pickMatch(files, 'nothing_*.mp2'), null);
  // no times from the server: the name decides (dates in the name sort the right way)
  const noTimes = [{ name: 'a_0100.mp3', size: 1 }, { name: 'a_0900.mp3', size: 1 }, { name: 'a_0200.mp3', size: 1 }];
  assert.equal(pickMatch(noTimes, 'a_*.mp3').chosen.name, 'a_0900.mp3');
  assert.equal(pickMatch([{ name: 'REPORT_1.MP3', size: 1 }], 'report_?.mp3').chosen.name, 'REPORT_1.MP3'); // not case sensitive
  assert.equal(pickMatch([{ name: 'a.b', size: 1 }, { name: 'axb', size: 1 }], 'a.b').chosen.name, 'a.b'); // a dot is only a dot
});

test('sameAsBefore: the same name, size and time is nothing new', () => {
  const c = { name: 'x.mp3', size: 10, mtimeMs: 5 };
  assert.equal(sameAsBefore(null, c), false);
  assert.equal(sameAsBefore({ ...c }, c), true);
  assert.equal(sameAsBefore({ ...c, size: 11 }, c), false);
  assert.equal(sameAsBefore({ ...c, mtimeMs: 6 }, c), false);
});

test('ftpUrlWithName: the real name goes into the address, encoded', () => {
  const w = wildcardSource('ftp://host:2121/news/BULLETIN_*.mp2', false);
  assert.equal(ftpUrlWithName(w.url, w.dir, 'BULLETIN 1.mp2'), 'ftp://host:2121/news/BULLETIN%201.mp2');
});
