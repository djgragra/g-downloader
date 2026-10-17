import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sendEmail, sendTelegram, sendWithRetry, createNotifier, maskSecrets, alertPrefix, withPrefix, reportText, fmt } from '../src/notify.js';
import { createAlertState } from '../src/alert-state.js';
import { sanitizeSettings, defaults, parseEmailList } from '../src/settings.js';

const TOKEN = '123456:ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const mailCfg = { enabled: true, host: 'smtp.example.com', port: 587, secure: false, user: 'me@example.com', pass: 'S3cretPass', from: 'g@example.com', recipients: ['a@x.it', 'b@y.it', 'a@x.it', 'not-an-address'] };

function fakeTransport(opts = {}) {
  const made = [];
  const factory = (cfg) => {
    const sent = [];
    made.push({ cfg, sent });
    return { sendMail: async (m) => { sent.push(m); if (opts.fail) throw new Error(opts.fail(cfg)); return { rejected: opts.rejected || [] }; }, close() {} };
  };
  return { factory, made };
}

test('one email to everybody, all in Bcc, from a connection that must be encrypted', async () => {
  const t = fakeTransport();
  await sendEmail(mailCfg, 'Subject', 'Body', { transportFactory: t.factory });
  const { cfg, sent } = t.made[0];
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].bcc, ['a@x.it', 'b@y.it']); // unique and valid only
  assert.equal(sent[0].to, 'undisclosed-recipients:;'); // nobody sees the others' addresses, and the sender gets no copy
  assert.equal(cfg.requireTLS, true);
  assert.deepEqual([cfg.connectionTimeout, cfg.greetingTimeout, cfg.socketTimeout], [15_000, 15_000, 20_000]);
  const secure = fakeTransport();
  await sendEmail({ ...mailCfg, secure: true, port: 465 }, 's', 'b', { transportFactory: secure.factory });
  assert.equal(secure.made[0].cfg.requireTLS, false);
  assert.equal(secure.made[0].cfg.secure, true);
});

test('the sender gets no copy unless it is a recipient (real nodemailer envelope)', async () => {
  const nodemailer = (await import('nodemailer')).default;
  const run = async (recipients) => {
    let envelope;
    const factory = () => {
      const tr = nodemailer.createTransport({ streamTransport: true, buffer: true });
      return { sendMail: async (m) => { const info = await tr.sendMail(m); envelope = info.envelope; return { rejected: [] }; }, close() {} };
    };
    await sendEmail({ ...mailCfg, recipients }, 's', 'b', { transportFactory: factory });
    return envelope;
  };
  const other = await run(['gm@example.org']);
  assert.equal(other.from, 'g@example.com');
  assert.deepEqual(other.to, ['gm@example.org']); // the sender (g@example.com) is not in the envelope
  const self = await run(['g@example.com', 'gm@example.org']);
  assert.deepEqual(self.to, ['g@example.com', 'gm@example.org']); // a recipient that is also the sender: once
});

test('the old "to" string still works as the list of recipients', async () => {
  const t = fakeTransport();
  await sendEmail({ ...mailCfg, recipients: undefined, to: 'one@x.it, two@x.it; three@x.it' }, 's', 'b', { transportFactory: t.factory });
  assert.equal(t.made[0].sent[0].bcc.length, 3);
});

test('the password never appears in an error, and rejected addresses are named', async () => {
  const t = fakeTransport({ fail: (cfg) => `535 auth failed for ${cfg.auth.pass}` });
  await assert.rejects(sendEmail(mailCfg, 's', 'b', { transportFactory: t.factory }), (e) => !e.message.includes('S3cretPass') && e.message.includes('***'));
  const r = fakeTransport({ rejected: ['b@y.it'] });
  await assert.rejects(sendEmail(mailCfg, 's', 'b', { transportFactory: r.factory }), /b@y\.it/);
  assert.equal(maskSecrets('pw=ab', { notifications: { email: { pass: 'ab' } } }), 'pw=ab'); // too short to mask without wrecking the text
  assert.equal(maskSecrets(`x ${TOKEN} y`, { notifications: { telegram: { botToken: TOKEN } } }), 'x *** y');
});

test('Telegram: every message says who writes, one bad chat does not stop the others, the token is masked', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    if (body.chat_id === '2') throw new Error(`failed ${url}`);
    return { ok: true, text: async () => '' };
  };
  const cfg = { enabled: true, botToken: TOKEN, recipients: [{ chatId: '1', note: 'Anna' }, { chatId: '2', note: 'Regia' }, { chatId: '3' }] };
  await assert.rejects(sendTelegram(cfg, 'Hello', { fetchFn, prefix: '[G-Downloader · Studio 1]' }), (e) => {
    assert.ok(e.message.includes('Regia (2)'));
    assert.ok(!e.message.includes(TOKEN));
    return true;
  });
  assert.equal(calls.length, 3);
  assert.ok(calls.every((c) => c.body.text.startsWith('[G-Downloader · Studio 1] Hello')));
  await assert.rejects(sendTelegram({ ...cfg, botToken: 'bad-token' }, 'x', { fetchFn }), /formato/);
});

test('every send is tried three times: right away, after 10 s and after 60 s', async () => {
  const waits = [];
  let n = 0;
  const r = await sendWithRetry(async () => { if (++n < 3) throw new Error('network'); }, { sleep: async (ms) => waits.push(ms) });
  assert.deepEqual([r.ok, r.attempts], [true, 3]);
  assert.deepEqual(waits, [10_000, 60_000]);
  const bad = await sendWithRetry(async () => { throw new Error('still down'); }, { sleep: async () => {} });
  assert.deepEqual([bad.ok, bad.attempts, bad.error], [false, 3, 'still down']);
});

function makeNotifier(over = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-alert-'));
  const file = path.join(dir, 'alert-state.json');
  const settings = sanitizeSettings({ installationName: 'Sala 2', notifications: { telegram: { enabled: true, botToken: TOKEN, recipients: [{ chatId: '1' }] }, email: mailCfg } }, defaults());
  const log = [];
  const sent = { telegram: [], email: [] };
  const deps = over.deps || {
    sendTelegram: async (cfg, text) => { sent.telegram.push(text); },
    sendEmail: async (cfg, subject, text) => { sent.email.push({ subject, text }); }
  };
  const make = () => createNotifier({ getSettings: () => settings, state: createAlertState({ file }), t: fmt, log: (m, l) => log.push([l, m]), deps, delays: [0, 0, 0], sleep: async () => {} });
  return { make, sent, log, file, settings };
}

test('a failure alert goes to both channels and starts with [App · Installation name]', async () => {
  const n = makeNotifier();
  const out = await n.make().failure({ name: 'Notiziario' }, new Error('HTTP 404'));
  assert.deepEqual([out.telegram.ok, out.email.ok], [true, true]);
  assert.ok(n.sent.telegram[0].startsWith('[G-Downloader · Sala 2] '));
  assert.ok(n.sent.email[0].subject.startsWith('[G-Downloader · Sala 2] '));
  assert.match(n.sent.email[0].text, /Notiziario/);
  assert.equal(alertPrefix({ installationName: '' }).startsWith('[G-Downloader'), true);
  assert.equal(withPrefix('[G-Downloader] x', '[G-Downloader · A]'), '[G-Downloader · A] x');
});

test('a channel that keeps failing does not stop the other one, and the log has no secrets', async () => {
  const n = makeNotifier({ deps: {
    sendTelegram: async () => { throw new Error(`down ${TOKEN}`); },
    sendEmail: async (cfg, s, t) => { /* ok */ }
  } });
  const out = await n.make().failure({ name: 'X' }, new Error('e'));
  assert.deepEqual([out.telegram.ok, out.email.ok], [false, true]);
  assert.ok(n.log.length >= 3);
  assert.ok(n.log.every(([, m]) => !m.includes(TOKEN)));
});

test('new version: once per version and per channel, marked only after delivery, remembered across restarts', async () => {
  const info = { available: true, latest: '26.10.9', current: '26.10.2', url: 'https://github.com/djgragra/g-downloader/releases/tag/v26.10.9' };
  let emailWorks = false;
  const n = makeNotifier({ deps: {
    sendTelegram: async (cfg, text) => { n.sent.telegram.push(text); },
    sendEmail: async () => { if (!emailWorks) throw new Error('smtp down'); n.sent.email.push('ok'); }
  } });
  const first = await n.make().updateNotice(info);
  assert.deepEqual([first.telegram.ok, first.email.ok], [true, false]);
  const again = await n.make().updateNotice(info); // "restart": a new notifier on the same file
  assert.equal(again.telegram, undefined); // told already
  assert.equal(again.email.ok, false); // not delivered: tried again
  emailWorks = true;
  const third = await n.make().updateNotice(info);
  assert.deepEqual([third.telegram, third.email.ok], [undefined, true]);
  assert.equal(n.sent.telegram.length, 1);
  assert.deepEqual(await n.make().updateNotice(info), {}); // nothing left to say
  assert.deepEqual(await n.make().updateNotice({ ...info, latest: '26.10.10' }).then((r) => Object.keys(r).sort()), ['email', 'telegram']); // a newer version starts again
  const body = n.sent.telegram[0];
  assert.match(body, /26\.10\.9/);
  assert.match(body, /releases\/tag\/v26\.10\.9/);
});

test('the option "updateAlert" switches the new-version message off', async () => {
  const n = makeNotifier();
  n.settings.updateAlert = false;
  assert.deepEqual(await n.make().updateNotice({ available: true, latest: '9', current: '1' }), {});
});

test('the test buttons make one attempt and return { ok } or { ok:false, error } without the secrets', async () => {
  const n = makeNotifier({ deps: { sendTelegram: async () => { throw new Error(`bad ${TOKEN}`); }, sendEmail: async () => {} } });
  const nn = n.make();
  const t = await nn.testTelegram({ botToken: TOKEN, recipients: [{ chatId: '1' }] });
  assert.equal(t.ok, false);
  assert.ok(!t.error.includes(TOKEN));
  assert.deepEqual(await nn.testEmail(mailCfg), { ok: true });
});

test('the periodic report does not count skipped days as failures', () => {
  const now = new Date();
  const iso = (m) => new Date(now.getTime() - m * 60_000).toISOString();
  const tasks = [{ name: 'A', history: [{ finishedAt: iso(5), status: 'success' }, { finishedAt: iso(10), status: 'error', error: 'HTTP 404' }, { finishedAt: iso(20), status: 'skipped', mode: 'skipped' }] }];
  const r = reportText(fmt, tasks, 'daily', now);
  assert.match(r.body, /Completati: 1/);
  assert.match(r.body, /Falliti: 1/);
  assert.match(r.body, /A: HTTP 404/);
});

test('settings: the old shapes are read and rewritten in the new one', () => {
  const s = sanitizeSettings({ notifyNewVersion: false, updateRepo: '../evil', notifications: { email: { enabled: true, host: 'h', to: 'a@x.it, b@x.it' }, telegram: { enabled: true, botToken: TOKEN, chatId: '999' } } }, defaults());
  assert.equal(s.updateAlert, false);
  assert.equal(s.updateRepo, 'djgragra/g-downloader');
  assert.deepEqual(s.notifications.email.recipients, ['a@x.it', 'b@x.it']);
  assert.deepEqual(s.notifications.telegram.recipients, [{ chatId: '999', note: '' }]);
  assert.equal('to' in s.notifications.email, false);
  assert.equal('chatId' in s.notifications.telegram, false);
  assert.equal(sanitizeSettings({ updateRepo: 'djgragra/g-downloader-releases' }, defaults()).updateRepo, 'djgragra/g-downloader');
  assert.equal(parseEmailList(Array.from({ length: 40 }, (_, i) => `u${i}@x.it`)).length, 20);
});

test('settings: bad values fall back, sealed secrets are not cut short, restore clears an interface flag', () => {
  const sealed = 'enc:v1:' + 'A'.repeat(900);
  const s = sanitizeSettings({ language: 'fr', themeMode: 'blue', reportHour: 99, defaultRetries: -4, categoryColors: { a: '#ABCDEF', b: 'red' }, notifications: { email: { pass: sealed, port: 99999 } } }, defaults());
  assert.deepEqual([s.language, s.themeMode, s.reportHour, s.defaultRetries], ['it', 'dark', 23, 0]);
  assert.deepEqual(s.categoryColors, { a: '#abcdef' });
  assert.equal(s.notifications.email.pass, sealed);
  assert.equal(s.notifications.email.port, 65535);
  const base = sanitizeSettings({ activityClearedAt: '2026-10-01T00:00:00.000Z' }, defaults());
  assert.equal(base.activityClearedAt, '2026-10-01T00:00:00.000Z');
  assert.equal('activityClearedAt' in sanitizeSettings({ activityClearedAt: null }, base), false);
});
