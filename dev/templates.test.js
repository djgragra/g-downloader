import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTemplate } from '../src/templates.js';

const winter = new Date('2026-01-15T12:30:00Z');
const summer = new Date('2026-07-15T12:30:00Z');
const r = (t, now) => resolveTemplate(t, { now });

test('{tz:ZONE} gives GMT in winter and BST in summer for London', () => {
  assert.equal(r('{tz:Europe/London}', winter), 'GMT');
  assert.equal(r('{tz:Europe/London}', summer), 'BST');
  assert.equal(r('mix_{tz:Europe/London:lower}.mp3', summer), 'mix_bst.mp3');
  assert.equal(r('{tz:Europe/London:upper}', winter), 'GMT');
  assert.equal(r('{tz@Europe/London:lower}', summer), 'bst');
});

test('{tz:ZONE} for Rome and a zone without an abbreviation', () => {
  assert.equal(r('{tz:Europe/Rome}', winter), 'CET');
  assert.equal(r('{tz:Europe/Rome}', summer), 'CEST');
  assert.equal(r('{tz:UTC}', summer), 'UTC');
});

test('{tz} follows the offset: the clocks change in the night of 25 October 2026', () => {
  assert.equal(r('{tz:Europe/London}', new Date('2026-10-25T00:30:00Z')), 'BST');
  assert.equal(r('{tz+30m:Europe/London}', new Date('2026-10-25T00:15:00Z')), 'BST');
  assert.equal(r('{tz+1h:Europe/London}', new Date('2026-10-25T00:30:00Z')), 'GMT');
  assert.equal(r('{tz+1d:Europe/London}', new Date('2026-10-24T12:00:00Z')), 'GMT');
});

test('{dst:on|off} picks the text from the daylight saving time of the zone', () => {
  assert.equal(r('file_{dst@Europe/London:bst|gmt}', summer), 'file_bst');
  assert.equal(r('file_{dst@Europe/London:bst|gmt}', winter), 'file_gmt');
  assert.equal(r('{dst@Europe/London:summer|}', winter), '');
  assert.equal(r('{dst@Asia/Tokyo:on|off}', summer), 'off'); // no daylight saving at all
  assert.equal(r('{dst@Australia/Sydney:on|off}', summer), 'off'); // southern winter
  assert.equal(r('{dst@Australia/Sydney:on|off}', winter), 'on'); // southern summer
});

test('{date@ZONE:FORMAT} and {time@ZONE:FORMAT} show the wall clock of that zone', () => {
  assert.equal(r('{time@Europe/London:HH}', summer), '13');
  assert.equal(r('{time@Europe/London:HH}', winter), '12');
  assert.equal(r('{date@Asia/Tokyo:yyyyMMdd}', new Date('2026-07-15T20:00:00Z')), '20260716');
  assert.equal(r('{date@Europe/London:yyyyMMdd}', new Date('2026-07-15T23:30:00Z')), '20260716');
});

test('an unknown zone leaves the placeholder as typed; the other placeholders are unchanged', () => {
  assert.equal(r('{tz:Mars/Base}', summer), '{tz:Mars/Base}');
  assert.equal(r('{dst@Mars/Base:a|b}', summer), '{dst@Mars/Base:a|b}');
  assert.equal(r('{date@Mars/Base:yyyy}', summer), '{date@Mars/Base:yyyy}');
  assert.equal(r('{date:yyyyMMdd}_{time:HH:mm}', new Date(2026, 6, 15, 8, 5)), '20260715_08:05');
  assert.equal(r('{date+1h:H}', new Date(2026, 6, 15, 6, 57)), '7');
});

test('{tz} and {dst} without a zone follow the zone of this computer', () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = 'Europe/London';
    assert.equal(r('{tz}', summer), 'BST');
    assert.equal(r('{dst:bst|gmt}', summer), 'bst');
    assert.equal(r('{dst:bst|gmt}', winter), 'gmt');
    assert.equal(r('{tz:lower}', winter), 'gmt');
  } finally {
    if (before === undefined) delete process.env.TZ; else process.env.TZ = before;
  }
});
