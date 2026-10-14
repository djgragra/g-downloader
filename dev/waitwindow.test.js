import test from 'node:test';
import assert from 'node:assert/strict';
import { waitWindowOf, checkArrived, retryWithin, WaitExpired, waitStable, isFatalError } from '../src/waitwindow.js';

// a fake clock: sleeping moves it forward
function clock() {
  let t = 0;
  return { now: () => t, sleep: async (ms) => { t += ms; }, at: () => t };
}

test('the window of a task, in milliseconds, with sane limits', () => {
  const w = waitWindowOf({ waitWindow: { enabled: true, everyMinutes: 2, maxMinutes: 20, minSizeKB: 50 } }, 1);
  assert.deepEqual([w.enabled, w.everyMs, w.maxMs, w.minBytes], [true, 120_000, 1_200_000, 51_200]);
  assert.equal(waitWindowOf({}, 0).enabled, false);
  assert.equal(waitWindowOf({ waitWindow: { enabled: true, minSizeKB: 0 } }, 3).minBytes, 3072); // the Settings threshold when the task has none
  const crazy = waitWindowOf({ waitWindow: { enabled: true, everyMinutes: -5, maxMinutes: 'x' } });
  assert.ok(crazy.everyMs >= 6000 && crazy.maxMs === 20 * 60_000);
});

test('a file that is too small or a web page is "not arrived yet"; a good file passes', () => {
  assert.equal(checkArrived({ bytes: 0, minBytes: 0 }), 'too-small');
  assert.equal(checkArrived({ bytes: 500, minBytes: 1024 }), 'too-small');
  assert.equal(checkArrived({ bytes: 5000, contentType: 'text/html; charset=utf-8', fileName: 'edizione1053.mp3', rejectWebPage: true }), 'web-page');
  assert.equal(checkArrived({ bytes: 5000, contentType: 'text/html', fileName: 'page.html', rejectWebPage: true }), null); // an html file was expected
  assert.equal(checkArrived({ bytes: 5000, contentType: 'text/html', fileName: 'x.mp3', rejectWebPage: false }), null);
  assert.equal(checkArrived({ bytes: 2_000_000, contentType: 'audio/mpeg', fileName: 'x.mp3', minBytes: 1024, rejectWebPage: true }), null);
});

test('it keeps trying until the file arrives, one pause between attempts', async () => {
  const c = clock();
  let calls = 0;
  const waits = [];
  const r = await retryWithin({ everyMs: 60_000, maxMs: 20 * 60_000, now: c.now, sleep: c.sleep, onWait: (n, err, every, left) => waits.push([n, err.message, left]), attempt: async () => {
    calls++;
    if (calls < 4) throw new Error('HTTP 404 Not Found');
    return { bytes: 9 };
  } });
  assert.equal(r.bytes, 9);
  assert.equal(calls, 4);
  assert.equal(c.at(), 3 * 60_000);
  assert.deepEqual(waits[0], [1, 'HTTP 404 Not Found', 20 * 60_000]);
});

test('when the window is over it stops with the last error and the number of attempts', async () => {
  const c = clock();
  let calls = 0;
  await assert.rejects(
    retryWithin({ everyMs: 5 * 60_000, maxMs: 20 * 60_000, now: c.now, sleep: c.sleep, attempt: async () => { calls++; throw new Error('HTTP 404'); } }),
    (e) => e instanceof WaitExpired && e.attempts === 5 && e.message === 'HTTP 404' && e.elapsedMs === 20 * 60_000
  );
  assert.equal(calls, 5); // at 0, 5, 10, 15 and 20 minutes
  assert.ok(c.at() <= 20 * 60_000);
});

test('a wrong password is not waited for', async () => {
  const c = clock();
  let calls = 0;
  await assert.rejects(retryWithin({ everyMs: 60_000, maxMs: 600_000, now: c.now, sleep: c.sleep, attempt: async () => { calls++; throw new Error('HTTP 401 Unauthorized'); } }), /401/);
  assert.equal(calls, 1);
  assert.equal(isFatalError(Object.assign(new Error('Login'), { code: 530 })), true);
  assert.equal(isFatalError(new Error('HTTP 404')), false);
  assert.equal(isFatalError(new Error('HTTP 403')), false);
});

test('a file still being written is waited for until its size stops changing', async () => {
  const c = clock();
  const sizes = [100, 200, 300, 300];
  const r = await waitStable({ sizeOf: async () => sizes.shift(), stableMs: 5000, sleep: c.sleep });
  assert.equal(r.size, 300);
  assert.equal(c.at(), 15_000);
  await assert.rejects(waitStable({ sizeOf: async () => Math.random(), stableMs: 1, sleep: async () => {}, maxChecks: 3 }), /still-growing/);
  assert.deepEqual(await waitStable({ sizeOf: async () => 7, stableMs: 0 }), { size: 7 });
});
