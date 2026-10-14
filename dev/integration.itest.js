// Integration tests: the real store, scheduler and downloader on a fake Electron (dev/electron-stub.mjs) and a local web server.
// Run with: npm run test:integration
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

await import('./electron-stub.mjs');
const store = await import('../src/store.js');
const { runTaskNow, waitHooks } = await import('../src/downloader.js');

// the waiting window runs on a fake clock: a pause moves it forward and returns at once
let virtual = 0;
waitHooks.now = () => virtual;
waitHooks.sleep = async (ms) => { virtual += ms; };
const { appendFileLog } = await import('../src/filelog.js');
const { buildExport, prepareImport } = await import('../src/backup.js');
const { renameCategory } = await import('../src/categories.js');

const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-dest-'));
let hits = 0;
let mode = 'ok';
const server = http.createServer((req, res) => {
  hits++;
  if (mode === 'late' && hits < 4) { res.writeHead(404); return res.end('not yet'); }
  if (mode === 'html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<html>error page that is long enough to pass a size check</html>'); }
  if (mode === 'auth') { res.writeHead(401); return res.end('no'); }
  if (mode === 'empty') { res.writeHead(200, { 'content-type': 'audio/mpeg' }); return res.end(''); }
  res.writeHead(200, { 'content-type': 'audio/mpeg' });
  res.end(Buffer.alloc(4096, 1));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

function newTask(over = {}) {
  const t = store.newTaskTemplate();
  Object.assign(t, { name: 'Test', url: `${base}/file.mp3`, destinationFolder: dest, filenameMode: 'fixed', fixedFilename: 'file.mp3', existingFile: 'overwrite', notifyOnFailure: false }, over);
  t.http = { ...t.http, retries: 0, retryDelayMs: 1, ...(over.http || {}) };
  return t;
}

test('secrets are sealed on disk and plain in the app; an address with credentials is sealed too', () => {
  const t = newTask({ url: 'ftp://user:pw123@host.example/f.mp3', http: { auth: { enabled: true, username: 'u', password: 'WebPass1' }, headers: { Authorization: 'Bearer abc' } } });
  store.saveTask(t);
  const raw = JSON.parse(fs.readFileSync(store.settingsFile(), 'utf8')).tasks.find((x) => x.id === t.id);
  assert.ok(raw.url.startsWith('enc:v1:'));
  assert.ok(raw.http.auth.password.startsWith('enc:v1:'));
  assert.ok(raw.http.headers.Authorization.startsWith('enc:v1:'));
  assert.ok(!JSON.stringify(raw).includes('pw123'));
  const back = store.getTask(t.id);
  assert.equal(back.url, 'ftp://user:pw123@host.example/f.mp3');
  assert.equal(back.http.auth.password, 'WebPass1');
  store.deleteTask(t.id);
});

test('settings: secrets sealed, old shapes read, a bad repository reset', () => {
  store.updateSettings({ notifications: { email: { enabled: true, host: 'h', user: 'u', pass: 'EmailPass9', recipients: ['a@x.it'] }, telegram: { enabled: false, botToken: '1:abcdefghijklmnopqrstuvwxyz', recipients: [] } } });
  const raw = JSON.parse(fs.readFileSync(store.settingsFile(), 'utf8')).settings;
  assert.ok(raw.notifications.email.pass.startsWith('enc:v1:'));
  assert.ok(raw.notifications.telegram.botToken.startsWith('enc:v1:'));
  assert.equal(store.getSettings().notifications.email.pass, 'EmailPass9');
  assert.equal(store.updateSettings({ updateRepo: '../evil' }).updateRepo, 'djgragra/g-downloader');
});

test('a plain download works and is saved in the folder', async () => {
  mode = 'ok';
  const t = newTask();
  store.saveTask(t);
  const r = await runTaskNow(t.id);
  assert.equal(r.status, 'success');
  assert.equal(fs.statSync(path.join(dest, 'file.mp3')).size, 4096);
  store.deleteTask(t.id);
});

test('waiting for a file that is published late: tries again until it arrives', async () => {
  mode = 'late';
  hits = 0;
  fs.rmSync(path.join(dest, 'file.mp3'), { force: true });
  const t = newTask({ waitWindow: { enabled: true, everyMinutes: 1, maxMinutes: 20, minSizeKB: 0, rejectWebPage: true, stableSeconds: 0 } });
  store.saveTask(t);
  const r = await runTaskNow(t.id);
  assert.equal(r.status, 'success');
  assert.equal(hits, 4); // 404, 404, 404, then the file
}, { timeout: 60_000 });

test('without the window the first 404 is the end (the old behaviour)', async () => {
  mode = 'late';
  hits = 0;
  const t = newTask();
  store.saveTask(t);
  await assert.rejects(runTaskNow(t.id), /404/);
  assert.equal(hits, 1);
  store.deleteTask(t.id);
});

test('a web page or an empty file is "not arrived yet"; a wrong password stops at once', async () => {
  const t = newTask({ waitWindow: { enabled: true, everyMinutes: 5, maxMinutes: 20, minSizeKB: 0, rejectWebPage: true, stableSeconds: 0 }, fixedFilename: 'x.mp3' });
  store.saveTask(t);
  mode = 'html'; hits = 0;
  await assert.rejects(runTaskNow(t.id), /pagina web|web page|non è arrivato/);
  assert.equal(hits, 5); // at 0, 5, 10, 15 and 20 minutes of the fake clock
  mode = 'empty'; hits = 0;
  await assert.rejects(runTaskNow(t.id), /piccolo|small/);
  mode = 'auth'; hits = 0;
  await assert.rejects(runTaskNow(t.id), /401/);
  assert.equal(hits, 1);
  store.deleteTask(t.id);
}, { timeout: 60_000 });

test('category rename and delete are applied to the tasks and the colours', () => {
  const a = newTask({ name: 'A', category: 'News' });
  const b = newTask({ name: 'B', category: 'news' });
  store.saveTask(a); store.saveTask(b);
  store.updateSettings({ categoryColors: { News: '#112233' } });
  const cfg = store.getConfig();
  assert.equal(cfg.tasks.length >= 2, true);
  const r = renameCategory(cfg.tasks, cfg.settings.categoryColors, 'News', 'Notizie');
  const next = store.applyCategoryChange(r);
  assert.deepEqual(next.tasks.filter((t) => t.name === 'A' || t.name === 'B').map((t) => t.category), ['Notizie', 'Notizie']);
  assert.equal(next.settings.categoryColors.Notizie, '#112233');
  store.deleteTask(a.id); store.deleteTask(b.id);
});

test('exceptions are kept (and cleaned) when a task is saved; a skipped day goes in the history without being a run', () => {
  const t = newTask({ exceptions: [{ from: '2026-12-25', mode: 'skip' }, { from: 'bad', mode: 'skip' }] });
  store.saveTask(t);
  assert.equal(store.getTask(t.id).exceptions.length, 1);
  const count = () => Object.values(store.getDailyStats()).reduce((n, d) => n + d.s + d.e, 0);
  const before = count();
  store.appendSkipped(t.id, { finishedAt: new Date().toISOString(), note: 'Natale' });
  const got = store.getTask(t.id);
  assert.equal(got.history[0].status, 'skipped');
  assert.equal(got.lastStatus, null); // not a result
  assert.equal(count(), before); // not counted in the statistics
  store.deleteTask(t.id);
});

test('backup of the real store: export without secrets, import on the same PC keeps them', () => {
  const t = newTask({ name: 'Backup me', url: 'ftp://user:pw123@host.example/f.mp3' });
  store.saveTask(t);
  const cfg = store.getConfig();
  const file = buildExport(cfg);
  assert.ok(!JSON.stringify(file).includes('EmailPass9'));
  assert.ok(!JSON.stringify(file).includes('pw123'));
  const plan = prepareImport(JSON.stringify(file), cfg);
  assert.equal(plan.ok, true);
  const applied = store.applyConfig({ settings: plan.settings, tasks: plan.tasks });
  assert.equal(applied.settings.notifications.email.pass, 'EmailPass9');
  assert.equal(applied.tasks.find((x) => x.id === t.id).url, 'ftp://user:pw123@host.example/f.mp3');
  store.deleteTask(t.id);
});

test('the log has no credentials from addresses', async () => {
  const { redactUrls } = await import('../src/filelog.js');
  assert.equal(redactUrls('Avvio download: ftp://user:secret@host/x.mp3 e https://h/y'), 'Avvio download: ftp://***@host/x.mp3 e https://h/y');
  appendFileLog({ taskId: 't', level: 'info', message: 'ok https://u:p@h/z' });
});

test('the scheduler: a due schedule on an exception day is not run, it leaves one "skipped" note; without the exception it runs', async () => {
  const { startScheduler, stopScheduler } = await import('../src/scheduler.js');
  const { dayKey } = await import('../src/exceptions.js');
  mode = 'ok';
  const sched = () => ({ id: 's1', type: 'cron', cronMode: 'friendly', days: [0, 1, 2, 3, 4, 5, 6], times: ['00:00'], enabled: true, lastFired: new Date(new Date().setHours(0, 0, 0, 0) - 60_000).toISOString() }); // yesterday's 00:00 already happened
  const skipTask = newTask({ name: 'Skip today', schedules: [sched()], exceptions: [{ from: dayKey(new Date()), mode: 'skip', note: 'Test' }] });
  store.saveTask(skipTask);
  hits = 0;
  startScheduler();
  await new Promise((r) => setTimeout(r, 400));
  stopScheduler();
  const after = store.getTask(skipTask.id);
  assert.equal(hits, 0);
  assert.equal(after.history.length, 1);
  assert.equal(after.history[0].mode, 'skipped');
  assert.equal(after.lastStatus, null);
  assert.equal(after.schedules[0].lastFired, new Date(new Date().setHours(0, 0, 0, 0)).toISOString()); // today's 00:00 counts as handled: it is not caught up later
  store.deleteTask(skipTask.id);

  const runTask = newTask({ name: 'Run today', schedules: [sched()] });
  store.saveTask(runTask);
  hits = 0;
  startScheduler();
  for (let i = 0; i < 40 && store.getTask(runTask.id).lastStatus !== 'success'; i++) await new Promise((r) => setTimeout(r, 100));
  stopScheduler();
  assert.equal(hits, 1);
  assert.equal(store.getTask(runTask.id).lastStatus, 'success');
  store.deleteTask(runTask.id);
});
