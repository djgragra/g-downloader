// garage-common: notify 1
// Alerts: desktop notification, Telegram (Bot API) and email (SMTP). Nothing is hard-coded: the token, the chat IDs,
// the server and the password come from the user's settings (apps/COMMON-FEATURES.md, section 1).
//  - email: ONE message to everybody, all in Bcc; with a user name the connection must be encrypted (requireTLS);
//    timeouts 15/15/20 s; the password is masked in errors and logs.
//  - Telegram: several recipients, each on its own (one bad chat never stops the others); the token is masked.
//  - every send is tried three times (right away, after 10 s, after 60 s), each channel on its own.
//  - every alert starts with [App · Installation name].
// Electron-free: the translator, the fetch and the SMTP transport are injected, so it can be tested.
import os from 'node:os';
import { parseEmailList, TELEGRAM_TOKEN_RE } from './settings.js';

export const APP_NAME = 'G-Downloader';
const HAS_PREFIX = /^\[G-Downloader( · [^\]\n]*)?\]/;
export const RETRY_DELAYS = [0, 10_000, 60_000];

// text with {name} placeholders, used when no translator is given
export const fmt = (text, params = {}) => String(text).replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));

// Which installation speaks: the name the user gave, else the computer name. With several PCs in the studio the alert says which.
export const installationName = (settings) => String(settings?.installationName || os.hostname() || '').trim();
export const alertPrefix = (settings) => {
  const name = installationName(settings);
  return name ? `[${APP_NAME} · ${name}]` : `[${APP_NAME}]`;
};
export const withPrefix = (text, prefix) => (HAS_PREFIX.test(text) ? text.replace(HAS_PREFIX, prefix) : `${prefix} ${text}`);
const clip = (s) => (s.length > 4000 ? s.slice(0, 3997) + '…' : s);

// Replaces the password and the token with *** in a text (very short passwords are left alone, or the text becomes unreadable).
export function maskSecrets(text, settings) {
  let out = String(text ?? '');
  const n = settings?.notifications || {};
  if (n.email?.pass && n.email.pass.length >= 4) out = out.split(n.email.pass).join('***');
  if (n.telegram?.botToken) out = out.split(n.telegram.botToken).join('***');
  return out;
}

export async function sendTelegram(cfg, text, { t = fmt, fetchFn = globalThis.fetch, prefix = `[${APP_NAME}]` } = {}) {
  if (!cfg?.enabled) return;
  const recipients = (cfg.recipients || []).filter((r) => String(r?.chatId || '').trim());
  if (!cfg.botToken || !recipients.length) throw new Error(t('Configurazione Telegram incompleta (bot token o destinatari mancanti)'));
  if (!TELEGRAM_TOKEN_RE.test(cfg.botToken)) throw new Error(t('Il bot token non ha il formato giusto (numero:codice, come lo dà BotFather)'));
  const body = clip(withPrefix(text, prefix)); // the bot may be shared with other programs: always say who is writing
  const failures = [];
  for (const r of recipients) {
    try {
      const res = await fetchFn(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: String(r.chatId).trim(), text: body, disable_web_page_preview: true }),
        signal: AbortSignal.timeout(15_000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    } catch (err) {
      // one bad recipient must not stop the others; the token must never reach a log line
      failures.push(`${r.note ? r.note + ' ' : ''}(${r.chatId}): ${String(err.message).split(cfg.botToken).join('***')}`);
    }
  }
  if (failures.length) throw new Error(t('Telegram non inviato a: ') + failures.join(' | '));
}

export async function sendEmail(cfg, subject, text, { t = fmt, transportFactory = null } = {}) {
  if (!cfg?.enabled) return;
  const to = parseEmailList(cfg.recipients ?? cfg.to);
  if (!cfg.host || !to.length || !(cfg.from || cfg.user)) throw new Error(t('Configurazione email incompleta (host/destinatari mancanti)'));
  // loaded on first use: keeps start-up light and lets tests run with a fake transport
  const create = transportFactory || (await import('nodemailer')).default.createTransport;
  const transporter = create({
    host: cfg.host,
    port: Number(cfg.port) || 587,
    secure: !!cfg.secure, // true = TLS from the start (usually port 465); false = STARTTLS
    requireTLS: !cfg.secure && !!cfg.user, // never send the password in clear text
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000
  });
  try {
    // one message, all recipients in Bcc: they do not see each other's addresses. `to` is never the sender,
    // or the sender's own mailbox would get a copy of every alert.
    const info = await transporter.sendMail({ from: cfg.from || cfg.user, to: 'undisclosed-recipients:;', bcc: to, subject, text });
    const rejected = info?.rejected || [];
    if (rejected.length) throw new Error(t('{list}: rifiutati dal server', { list: rejected.join(', ') }));
  } catch (err) {
    throw new Error(maskSecrets(String(err.message), { notifications: { email: cfg } }));
  } finally {
    transporter.close?.();
  }
}

// Runs fn up to delays.length times, waiting between tries. Never throws: { ok } or { ok:false, error, attempts }.
export async function sendWithRetry(fn, { delays = RETRY_DELAYS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), onFail = () => {} } = {}) {
  let last = null;
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i]);
    try {
      await fn();
      return { ok: true, attempts: i + 1 };
    } catch (err) {
      last = err;
      onFail(i + 1, err);
    }
  }
  return { ok: false, error: last?.message || String(last), attempts: delays.length };
}

// The texts, built once for the three channels.
export function failureText(t, task, error, when = new Date(), locale = undefined) {
  return {
    subject: t('Download fallito: {name}', { name: task.name }),
    body: t('Il task "{name}" è fallito dopo tutti i tentativi previsti.\n\nErrore: {message}\nOrario: {when}', { name: task.name, message: error.message, when: when.toLocaleString(locale) })
  };
}

export function updateText(t, info) {
  return {
    subject: t('Nuova versione {latest} disponibile', { latest: info.latest }),
    body: t('È disponibile la nuova versione {latest} di G-Downloader (installata: {current}).\nApri l\'app: in alto trovi l\'avviso con "Scarica e installa".\n{url}', { latest: info.latest, current: info.current, url: info.pageUrl || info.url })
  };
}

// Summary of the period (daily / weekly): everything that ran, successes included. `skipped` runs are not failures.
export function reportText(t, tasks, frequency, now = new Date(), locale = undefined) {
  const since = frequency === 'weekly' ? new Date(now.getTime() - 7 * 86_400_000) : new Date(now.getTime() - 24 * 3_600_000);
  let ok = 0;
  let failed = 0;
  const lines = [];
  for (const task of tasks) {
    for (const h of task.history || []) {
      const when = new Date(h.finishedAt);
      if (when < since || h.mode === 'skipped' || h.status === 'skipped') continue;
      if (h.status === 'success') ok++;
      else {
        failed++;
        lines.push(`- ${task.name}: ${h.error || t('errore sconosciuto')} (${when.toLocaleString(locale)})`);
      }
    }
  }
  const period = frequency === 'weekly' ? t('settimanale (ultimi 7 giorni)') : t('giornaliero (ultime 24 ore)');
  return {
    subject: t(frequency === 'weekly' ? 'Report settimanale: {ok} ok, {failed} falliti' : 'Report giornaliero: {ok} ok, {failed} falliti', { ok, failed }),
    body: t('Report {period}.\n\nCompletati: {ok}\nFalliti: {failed}\n{details}', { period, ok, failed, details: lines.length ? `\n${t('Dettaglio errori:')}\n${lines.join('\n')}` : '' })
  };
}

// notifier: what the rest of the app calls. state = createAlertState (what was already told).
// deps lets the tests replace the channels; delays/sleep make the retries instant.
export function createNotifier({ getSettings, state = null, t = fmt, log = () => {}, deps = {}, delays = RETRY_DELAYS, sleep }) {
  const tg = deps.sendTelegram || sendTelegram;
  const mail = deps.sendEmail || sendEmail;
  const retry = (fn, name) =>
    sendWithRetry(fn, {
      delays,
      sleep,
      onFail: (n, err) => log(`${name}: ${t('tentativo {n} non riuscito: {message}', { n, message: maskSecrets(err.message, getSettings()) })}`, 'warn')
    });

  // to the enabled channels; returns { telegram?, email? } results. Never throws.
  async function broadcast(subject, body) {
    const s = getSettings();
    const n = s.notifications || {};
    const prefix = alertPrefix(s);
    const full = withPrefix(body, prefix);
    const fullSubject = withPrefix(subject, prefix);
    const jobs = {};
    if (n.telegram?.enabled) jobs.telegram = retry(() => tg(getSettings().notifications.telegram, full, { t, prefix }), 'Telegram');
    if (n.email?.enabled) jobs.email = retry(() => mail(getSettings().notifications.email, fullSubject, full, { t }), 'Email');
    const out = {};
    for (const [k, p] of Object.entries(jobs)) {
      out[k] = await p;
      if (!out[k].ok) log(`${k === 'email' ? 'Email' : 'Telegram'}: ${t('avviso non inviato: {message}', { message: maskSecrets(out[k].error, getSettings()) })}`, 'warn');
    }
    return out;
  }

  return {
    broadcast,
    failure: (task, error) => {
      const x = failureText(t, task, error);
      return broadcast(x.subject, x.body);
    },
    // the periodic summary goes by email only (it can be long); false when email is off
    async report(tasks, frequency, locale) {
      const s = getSettings();
      if (!s.notifications?.email?.enabled) return false;
      const x = reportText(t, tasks, frequency, new Date(), locale);
      const prefix = alertPrefix(s);
      const r = await retry(() => mail(getSettings().notifications.email, withPrefix(x.subject, prefix), withPrefix(x.body, prefix), { t }), 'Email');
      if (!r.ok) throw new Error(maskSecrets(r.error, getSettings()));
      return true;
    },
    // one message per new version and per channel, remembered only after it was delivered (a failure is tried again at the next check)
    async updateNotice(info) {
      const s = getSettings();
      if (s.updateAlert === false || !info?.available) return {};
      const n = s.notifications || {};
      const wanted = ['telegram', 'email'].filter((c) => n[c]?.enabled && !state?.isTold(info.latest, c));
      if (!wanted.length) return {};
      const x = updateText(t, info);
      const prefix = alertPrefix(s);
      const full = withPrefix(x.body, prefix);
      const out = {};
      for (const c of wanted) {
        out[c] = await (c === 'telegram' ? retry(() => tg(getSettings().notifications.telegram, full, { t, prefix }), 'Telegram') : retry(() => mail(getSettings().notifications.email, withPrefix(x.subject, prefix), full, { t }), 'Email'));
        if (out[c].ok) state?.markTold(info.latest, c);
        else log(`${c}: ${t('avviso di nuova versione non inviato: {message}', { message: maskSecrets(out[c].error, getSettings()) })}`, 'warn');
      }
      return out;
    },
    // buttons "Send test": one attempt, the result is shown next to the button
    async testEmail(cfg) {
      try {
        await mail({ ...cfg, enabled: true }, withPrefix(t('Email di prova'), alertPrefix(getSettings())), withPrefix(t('Configurazione email funzionante.'), alertPrefix(getSettings())), { t });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: maskSecrets(err.message, { notifications: { email: cfg } }) };
      }
    },
    async testTelegram(cfg) {
      try {
        await tg({ ...cfg, enabled: true }, t('Prova Telegram: configurazione funzionante.'), { t, prefix: alertPrefix(getSettings()) });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: String(err.message).split(cfg?.botToken || '\u0000').join('***') };
      }
    }
  };
}
