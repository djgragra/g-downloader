import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExport, prepareImport, missingSecrets, buildTaskExport, prepareTaskImport, taskCommands, BACKUP_APP } from '../src/backup.js';
import { sanitizeSettings, defaults } from '../src/settings.js';
import { secretSlots, stripSecrets, mapTaskSecrets, mapSettingsSecrets, withoutUserInfo, hasUserInfo, splitUserInfo, SEALED_PREFIX } from '../src/secrets.js';

const TOKEN = '123456:ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NOW = Date.parse('2026-10-14T10:00:00Z');

function task(over = {}) {
  return {
    id: 't1', name: 'Notiziario', category: 'News', enabled: true, sourceType: 'web',
    url: 'ftp://user:pw123@ftp.agency.it/news{date:yyyyMMdd}.mp3',
    http: { auth: { enabled: true, username: 'agency', password: 'WebPass1' }, headers: { Authorization: 'Bearer abc', Accept: 'audio/mpeg' } },
    schedules: [{ id: 's1', type: 'cron', times: ['07:00'], lastFired: '2026-10-14T05:00:00.000Z', urlOverride: 'https://u:p@h.example/x' }, { id: 's2', type: 'once', datetime: '2026-01-01T10:00', fired: true }],
    postActions: [{ id: 'a1', type: 'run', command: 'normalize.exe', args: ['--in', '{filepath}'] }],
    exceptions: [{ id: 'e1', from: '2026-12-25', to: '2026-12-25', mode: 'skip', note: 'Natale' }],
    history: [{ status: 'success' }], lastRun: 'x', lastStatus: 'success', seqCounter: 7, lastFileHash: 'abc', pendingActions: { filepath: 'z' },
    ...over
  };
}
function config() {
  const settings = sanitizeSettings({
    installationName: 'Sala 2', categoryColors: { News: '#112233' },
    notifications: { email: { enabled: true, host: 'smtp.x.it', user: 'me', pass: 'EmailPass9', from: 'g@x.it', recipients: ['a@x.it'] }, telegram: { enabled: true, botToken: TOKEN, recipients: [{ chatId: '1', note: 'Anna' }] } }
  }, defaults());
  return { settings, tasks: [task(), task({ id: 't2', name: 'Altro', url: 'https://example.com/a.zip', http: { auth: { enabled: false, username: '', password: '' }, headers: {} }, schedules: [], postActions: [] })] };
}
const text = (o) => JSON.stringify(o);

test('every secret place is in the list: passwords, tokens, addresses with credentials, key headers', () => {
  const ids = secretSlots(config()).map((s) => s.id);
  for (const id of ['email.pass', 'telegram.botToken', 'task-auth:t1', 'task-url:t1', 'task-urlov:t1:s1', 'task-header:t1:Authorization']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('task-header:t1:Accept'));
  assert.deepEqual(splitUserInfo('ftp://u:p@h/x'), { head: 'ftp://', userInfo: 'u:p', rest: 'h/x' });
  assert.equal(withoutUserInfo('https://u:p@h/{date:yyyy}'), 'https://h/{date:yyyy}');
  assert.equal(hasUserInfo('https://h/a@b'), false); // an @ after the first slash is not a login
});

test('sealing and opening goes through the same list; an address without credentials is not a secret', () => {
  const sealed = mapTaskSecrets(task(), (v) => 'enc:v1:' + Buffer.from(v).toString('base64'));
  assert.ok(sealed.url.startsWith(SEALED_PREFIX));
  assert.ok(sealed.http.auth.password.startsWith(SEALED_PREFIX));
  assert.ok(sealed.http.headers.Authorization.startsWith(SEALED_PREFIX));
  assert.equal(sealed.http.headers.Accept, 'audio/mpeg');
  const plain = mapTaskSecrets(task({ url: 'https://example.com/a.mp3' }), (v) => 'SEALED');
  assert.equal(plain.url, 'https://example.com/a.mp3');
  const opened = mapTaskSecrets(sealed, (v) => Buffer.from(v.slice(SEALED_PREFIX.length), 'base64').toString());
  assert.equal(opened.http.auth.password, 'WebPass1');
  assert.ok(mapSettingsSecrets(config().settings, () => 'X').notifications.email.pass === 'X');
});

test('without the box no secret is in the file; the file says what was left out', () => {
  const file = buildExport(config(), { now: NOW });
  const raw = text(file);
  for (const secret of ['EmailPass9', TOKEN, 'WebPass1', 'pw123', 'Bearer abc', 'u:p@']) assert.ok(!raw.includes(secret), secret);
  assert.equal(file.app, BACKUP_APP);
  assert.equal(file.includesSecrets, false);
  assert.equal(file.exportedAt, '2026-10-14T10:00:00.000Z');
  assert.equal(file.tasks[0].url, 'ftp://ftp.agency.it/news{date:yyyyMMdd}.mp3'); // the rest of the address stays
  assert.ok(file.emptiedSecrets.includes('task-url:t1') && file.emptiedSecrets.includes('email.pass'));
  assert.equal(buildExport({ settings: defaults(), tasks: [] }).emptiedSecrets, undefined);
});

test('what a task remembers about its runs is not in the file; settings, categories and colours are', () => {
  const file = buildExport(config(), { includeSecrets: true });
  const t = file.tasks[0];
  for (const k of ['history', 'lastRun', 'lastStatus', 'seqCounter', 'lastFileHash', 'pendingActions']) assert.equal(k in t, false, k);
  assert.equal('lastFired' in t.schedules[0], false);
  assert.equal(t.category, 'News');
  assert.deepEqual(t.exceptions[0].note, 'Natale');
  assert.deepEqual(file.settings.categoryColors, { News: '#112233' });
  assert.equal(file.settings.installationName, 'Sala 2');
});

test('with the box the secrets are written in plain text', () => {
  const file = buildExport(config(), { includeSecrets: true });
  assert.equal(file.includesSecrets, true);
  assert.equal(file.emptiedSecrets, undefined);
  assert.equal(file.settings.notifications.email.pass, 'EmailPass9');
  assert.equal(file.tasks[0].url, 'ftp://user:pw123@ftp.agency.it/news{date:yyyyMMdd}.mp3');
  assert.equal(file.tasks[0].http.auth.password, 'WebPass1');
});

test('import on another PC: nothing to keep, so the list of what to type again is complete', () => {
  const file = buildExport(config(), { now: NOW });
  const fresh = { settings: defaults(), tasks: [] };
  const r = prepareImport(text(file), fresh, { now: NOW });
  assert.equal(r.ok, true);
  const ids = r.missing.map((m) => m.id).sort();
  assert.deepEqual(ids, ['email.pass', 'task-auth:t1', 'task-header:t1:Authorization', 'task-url:t1', 'task-urlov:t1:s1', 'telegram.botToken'].sort());
  assert.ok(r.missing.find((m) => m.id === 'task-auth:t1').name === 'Notiziario');
  assert.equal(r.tasks.length, 2);
  assert.equal(r.settings.installationName, 'Sala 2');
});

test('import on the same PC keeps the secrets, only for the same server and user', () => {
  const file = buildExport(config(), { now: NOW });
  const same = prepareImport(text(file), config(), { now: NOW });
  assert.equal(same.settings.notifications.email.pass, 'EmailPass9');
  assert.equal(same.settings.notifications.telegram.botToken, TOKEN);
  assert.equal(same.tasks[0].url, 'ftp://user:pw123@ftp.agency.it/news{date:yyyyMMdd}.mp3');
  assert.equal(same.tasks[0].http.auth.password, 'WebPass1');
  assert.equal(same.tasks[0].http.headers.Authorization, 'Bearer abc');
  assert.deepEqual(same.missing, []);

  const other = config();
  other.settings.notifications.email.user = 'someone-else';
  other.tasks[0].http.auth.username = 'another-user';
  other.tasks[0].url = 'ftp://elsewhere.example/news.mp3';
  const diff = prepareImport(text(file), other, { now: NOW });
  assert.equal(diff.settings.notifications.email.pass, ''); // a password for another account would be wrong
  assert.equal(diff.tasks[0].http.auth.password, '');
  assert.ok(diff.missing.some((m) => m.id === 'email.pass'));
  assert.ok(diff.missing.some((m) => m.id === 'task-auth:t1'));
});

test('values still sealed in a file (the 26.10.1 export) are dropped and listed to type again', () => {
  const old = { app: 'g-downloader', version: 1, exportedAt: '2026-10-01T00:00:00Z', tasks: [task({ http: { auth: { enabled: true, username: 'agency', password: 'enc:v1:AAAA' }, headers: {} }, url: 'https://example.com/a.mp3' })], settings: { language: 'en', notifyNewVersion: false, lastNotifiedVersion: '26.9.9', notifications: { email: { enabled: true, host: 'h', user: 'me', pass: 'enc:v1:BBBB', to: 'a@x.it, b@x.it' }, telegram: { enabled: true, botToken: 'enc:v1:CCCC', chatId: '5' } } } };
  const r = prepareImport(old, { settings: defaults(), tasks: [] }, { now: NOW });
  assert.equal(r.ok, true);
  assert.equal(r.settings.notifications.email.pass, '');
  assert.deepEqual(r.settings.notifications.email.recipients, ['a@x.it', 'b@x.it']);
  assert.deepEqual(r.settings.notifications.telegram.recipients, [{ chatId: '5', note: '' }]);
  assert.equal(r.settings.updateAlert, false);
  assert.equal(r.settings.language, 'en');
  assert.equal(r.tasks[0].http.auth.password, '');
  assert.deepEqual(r.missing.map((m) => m.id).sort(), ['email.pass', 'task-auth:t1', 'telegram.botToken']);
  assert.ok(!text(r).includes('enc:v1:'));
});

test('the file must belong to this app and be readable', () => {
  assert.equal(prepareImport('not json', config()).error, 'invalid');
  assert.equal(prepareImport({ app: 'flowcast', settings: {} }, config()).error, 'wrong-app');
  assert.equal(prepareImport({ app: BACKUP_APP }, config()).error, 'invalid');
  assert.equal(prepareImport('x'.repeat(21_000_000), config()).error, 'too-big');
});

test('replace: the file wins, but a task that is already here keeps its history and schedule memory', () => {
  const cur = config();
  cur.tasks[0].history = [{ status: 'success', finishedAt: 'z' }];
  cur.tasks[0].seqCounter = 41;
  cur.tasks[0].schedules[0].lastFired = '2026-10-14T05:00:00.000Z';
  const file = buildExport(config(), { includeSecrets: true, now: NOW });
  file.tasks.push(task({ id: 'new1', name: 'Nuovo', schedules: [{ id: 'n1', type: 'cron', times: ['07:00'] }, { id: 'n2', type: 'once', datetime: '2026-01-01T10:00' }, { id: 'n3', type: 'once', datetime: '2026-12-31T10:00' }] }));
  file.tasks = file.tasks.filter((t) => t.id !== 't2'); // t2 is not in the file: replace removes it
  const r = prepareImport(file, cur, { now: NOW });
  assert.deepEqual(r.tasks.map((t) => t.id), ['t1', 'new1']);
  assert.equal(r.tasks[0].seqCounter, 41);
  assert.equal(r.tasks[0].history.length, 1);
  assert.equal(r.tasks[0].schedules[0].lastFired, '2026-10-14T05:00:00.000Z');
  // a task that starts here: only occurrences after the import count, a one-off already in the past does not run
  const fresh = r.tasks[1].schedules;
  assert.equal(fresh[0].lastFired, '2026-10-14T10:00:00.000Z');
  assert.equal(fresh[1].fired, true);
  assert.equal(fresh[2].fired, false);
  assert.equal(r.tasks[1].history, undefined);
});

test('add only the missing tasks: switched off, the settings untouched, only their secrets listed', () => {
  const cur = config();
  const file = buildExport(config(), { now: NOW });
  file.tasks.push(task({ id: 'new1', name: 'Nuovo', enabled: true, url: 'https://x.it/a', http: { auth: { enabled: true, username: 'u', password: '' }, headers: {} } }));
  file.settings.language = 'es';
  const r = prepareImport(file, cur, { mode: 'add', now: NOW });
  assert.equal(r.added, 1);
  assert.deepEqual(r.tasks.map((t) => t.id), ['t1', 't2', 'new1']);
  assert.equal(r.tasks.find((t) => t.id === 'new1').enabled, false);
  assert.equal(r.tasks[0].enabled, true); // the ones already here are not touched
  assert.equal(r.settings.language, cur.settings.language);
  assert.ok(r.missing.every((m) => /new1/.test(m.id)));
  assert.ok(r.missing.length >= 1);
});

test('the programs a file would run are listed, so the app can ask before importing', () => {
  const cmds = taskCommands([task(), task({ id: 'x', postActions: [{ type: 'run', mode: 'line', commandLine: 'a.exe\nb.exe', enabled: true }, { type: 'run', enabled: false, command: 'off.exe' }, { type: 'move' }] })]);
  assert.deepEqual(cmds.map((c) => c.line), ['normalize.exe --in {filepath}', 'a.exe', 'b.exe']);
  const r = prepareImport(buildExport(config(), { now: NOW }), { settings: defaults(), tasks: [] }, { now: NOW });
  assert.equal(r.commands.length, 1);
});

test('one task in a file: no password inside, a new id, switched off, nothing remembered from the other PC', () => {
  const file = buildTaskExport(task(), { now: NOW });
  const raw = text(file);
  for (const secret of ['WebPass1', 'pw123', 'Bearer abc']) assert.ok(!raw.includes(secret), secret);
  const r = prepareTaskImport(raw, { now: NOW });
  assert.equal(r.ok, true);
  const t = r.tasks[0];
  assert.notEqual(t.id, 't1');
  assert.equal(t.enabled, false);
  assert.equal(t.history, undefined);
  assert.ok(r.missing.some((m) => m.id === `task-auth:${t.id}` && m.name === 'Notiziario'));
  assert.equal(r.commands.length, 1);
  // older files: a bare task, or { tasks: [...] }
  assert.equal(prepareTaskImport({ name: 'Bare', url: 'https://x.it/a' }).tasks[0].name, 'Bare');
  assert.equal(prepareTaskImport({ tasks: [{ name: 'A' }, { name: 'B' }] }).tasks.length, 2);
  assert.equal(prepareTaskImport({ app: 'flowcast', task: { name: 'A' } }).error, 'wrong-app');
  assert.equal(prepareTaskImport({ task: {} }).error, 'no-tasks');
});

test('the helper that lists the missing secrets reads the current data only', () => {
  const c = config();
  c.settings.notifications.email.pass = '';
  c.tasks[1].http.auth = { enabled: true, username: 'u', password: '' };
  assert.deepEqual(missingSecrets(c).map((m) => m.id).sort(), ['email.pass', 'task-auth:t2']);
  assert.deepEqual(stripSecrets(c).emptied.includes('email.pass'), false); // already empty
});
