import nodemailer from 'nodemailer';
import { httpFetch } from './httpfetch.js';
import { M, dateLocale } from './i18n.js';

async function sendEmail(emailCfg, subject, text) {
  if (!emailCfg?.enabled) return;
  if (!emailCfg.host || !emailCfg.to) throw new Error(M("Configurazione email incompleta (host/destinatari mancanti)"));
  const transporter = nodemailer.createTransport({
    host: emailCfg.host,
    port: Number(emailCfg.port) || 587,
    secure: !!emailCfg.secure,
    auth: emailCfg.user ? { user: emailCfg.user, pass: emailCfg.pass } : undefined
  });
  await transporter.sendMail({
    from: emailCfg.from || emailCfg.user,
    to: emailCfg.to,
    subject,
    text
  });
}

// Recipients are [{ chatId, note }]; "chatId" alone is the format of older versions.
function telegramRecipients(cfg) {
  const list = Array.isArray(cfg?.recipients) ? cfg.recipients.filter((r) => String(r?.chatId || '').trim()) : [];
  if (list.length) return list;
  return cfg?.chatId ? [{ chatId: cfg.chatId, note: '' }] : [];
}

async function sendTelegram(tgCfg, text) {
  if (!tgCfg?.enabled) return;
  const recipients = telegramRecipients(tgCfg);
  if (!tgCfg.botToken || !recipients.length) throw new Error(M("Configurazione Telegram incompleta (bot token o destinatari mancanti)"));
  // the bot may be shared with other programs: always say who is writing
  const body = text.startsWith('[G-Downloader]') ? text : '[G-Downloader] ' + text;
  const failures = [];
  for (const r of recipients) {
    try {
      const res = await httpFetch(`https://api.telegram.org/bot${tgCfg.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: String(r.chatId).trim(), text: body })
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${detail}`);
      }
    } catch (err) {
      // one bad recipient must not stop the others
      failures.push(`${r.note ? r.note + ' ' : ''}(${r.chatId}): ${err.message}`);
    }
  }
  if (failures.length) throw new Error(M("Telegram non inviato a: ") + failures.join(' | '));
}

export async function notifyFailure(settings, task, error, log) {
  const subject = M("[G-Downloader] Download fallito: {name}", { name: task.name });
  const text = M("Il task \"{name}\" è fallito dopo tutti i tentativi previsti.\n\nErrore: {message}\nOrario: {when}", { name: task.name, message: error.message, when: new Date().toLocaleString(dateLocale()) });

  const notif = settings.notifications || {};
  try {
    await sendEmail(notif.email, subject, text);
  } catch (err) {
    log?.(M("Notifica email non inviata: {message}", { message: err.message }), 'warn');
  }
  try {
    await sendTelegram(notif.telegram, text);
  } catch (err) {
    log?.(M("Notifica Telegram non inviata: {message}", { message: err.message }), 'warn');
  }
}

// Generic alert (not a failure): same channels as notifyFailure.
export async function notifyAlert(settings, subject, text, log) {
  const notif = settings.notifications || {};
  try {
    await sendEmail(notif.email, subject, text);
  } catch (err) {
    log?.(M("Notifica email non inviata: {message}", { message: err.message }), 'warn');
  }
  try {
    await sendTelegram(notif.telegram, text);
  } catch (err) {
    log?.(M("Notifica Telegram non inviata: {message}", { message: err.message }), 'warn');
  }
}

// Periodic summary email (daily/weekly), independent of the per-failure notifyFailure
// above — this rolls up everything (successes included) over the period.
export async function sendReport(settings, tasks, frequency) {
  const notif = settings.notifications || {};
  if (!notif.email?.enabled) return false;
  const now = new Date();
  const since = frequency === 'weekly' ? new Date(now.getTime() - 7 * 86_400_000) : new Date(now.getTime() - 24 * 3_600_000);
  let success = 0;
  let failed = 0;
  const failLines = [];
  for (const task of tasks) {
    for (const h of task.history || []) {
      const t = new Date(h.finishedAt);
      if (t < since) continue;
      if (h.status === 'success') success++;
      else {
        failed++;
        failLines.push(`- ${task.name}: ${h.error || M("errore sconosciuto")} (${t.toLocaleString(dateLocale())})`);
      }
    }
  }
  const periodLabel = frequency === 'weekly' ? M("settimanale (ultimi 7 giorni)") : M("giornaliero (ultime 24 ore)");
  const subject = M(frequency === 'weekly' ? '[G-Downloader] Report settimanale: {ok} ok, {failed} falliti' : '[G-Downloader] Report giornaliero: {ok} ok, {failed} falliti', { ok: success, failed });
  const text = M('Report {period}.\n\nCompletati: {ok}\nFalliti: {failed}\n{details}', {
    period: periodLabel,
    ok: success,
    failed,
    details: failLines.length ? `\n${M('Dettaglio errori:')}\n${failLines.join('\n')}` : ''
  });
  await sendEmail(notif.email, subject, text);
  return true;
}

export async function testEmail(emailCfg) {
  await sendEmail({ ...emailCfg, enabled: true }, '[G-Downloader] Test email', 'Configurazione email funzionante.');
}

export async function testTelegram(tgCfg) {
  await sendTelegram({ ...tgCfg, enabled: true }, '[G-Downloader] Test Telegram: configurazione funzionante.');
}
