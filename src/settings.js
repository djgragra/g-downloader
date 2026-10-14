// The settings of the app, their defaults and one function that validates them. Everything that comes from
// outside (the saved file of an older version, an imported backup) goes through `sanitizeSettings`, so the
// rest of the app never meets an unchecked value. Electron-free: it can be tested.
export const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
export const MAX_EMAIL_RECIPIENTS = 20;
export const MAX_TELEGRAM_RECIPIENTS = 20;
export const UPDATE_REPO = 'djgragra/g-downloader';
const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;

export function defaults(platform = process.platform) {
  return {
    startOnBoot: true,
    startMinimized: false,
    keepAwake: false, // keep the PC from going to sleep while the app runs
    installationName: '', // shown in every alert as [G-Downloader · name]; empty = the computer name
    notifyOnSuccess: true,
    notifyOnError: true,
    defaultDestination: '',
    themeMode: 'dark', // 'dark' | 'light'
    trayIconStyle: platform === 'darwin' ? 'white' : 'color',
    formatPreset: 'auto', // 'auto' (from language) | 'it' | 'us' | 'gb' | 'iso' | 'au'
    language: 'it', // 'it' | 'en' | 'es'
    defaultRetries: 3,
    defaultRetryDelayMs: 15000,
    openFolderOnNotificationClick: false,
    checkMinFileSize: false,
    minFileSizeKB: 1,
    warnIfUnchanged: false,
    staleAlertRuns: 0,
    maxParallelDownloads: 0,
    checkUpdates: true,
    updateAlert: true, // one email/Telegram message per new version (only if one of them is on)
    updateRepo: UPDATE_REPO,
    watchdogMissedSchedules: false,
    reportFrequency: 'off', // 'off' | 'daily' | 'weekly'
    reportHour: 7,
    categoryColors: {},
    notifications: {
      desktop: true,
      telegram: { enabled: false, botToken: '', recipients: [] },
      email: { enabled: false, host: '', port: 587, secure: false, user: '', pass: '', from: '', recipients: [] }
    }
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const str = (v, d, max = 500) => (typeof v === 'string' ? v.slice(0, max) : d);
const int = (v, d, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};
const oneOf = (v, list, d) => (list.includes(v) ? v : d);

// "a@b.it, c@d.it; e@f.it" or an array -> unique valid addresses (at most MAX_EMAIL_RECIPIENTS).
export function parseEmailList(value) {
  const parts = Array.isArray(value) ? value : String(value ?? '').split(/[\s,;]+/);
  const out = [];
  for (const p of parts) {
    const a = String(p ?? '').trim();
    if (a && EMAIL_RE.test(a) && !out.some((x) => x.toLowerCase() === a.toLowerCase())) out.push(a);
  }
  return out.slice(0, MAX_EMAIL_RECIPIENTS);
}

export const TELEGRAM_TOKEN_RE = /^\d+:[\w-]{20,}$/;

// Older versions: `email.to` as one string and `telegram.chatId` alone. Both are still read.
export function sanitizeNotifications(raw, base = defaults().notifications) {
  const n = isObj(raw) ? raw : {};
  const e = isObj(n.email) ? n.email : {};
  const t = isObj(n.telegram) ? n.telegram : {};
  const be = base.email;
  const bt = base.telegram;

  let tgList = Array.isArray(t.recipients) ? t.recipients : [];
  if (!tgList.some((r) => String(r?.chatId || '').trim()) && String(t.chatId || '').trim()) tgList = [{ chatId: t.chatId, note: '' }];
  const recipients = [];
  for (const r of tgList) {
    const chatId = String(r?.chatId ?? '').trim().slice(0, 40);
    if (chatId && !recipients.some((x) => x.chatId === chatId)) recipients.push({ chatId, note: str(r?.note, '', 80).trim() });
  }

  return {
    desktop: bool(n.desktop, base.desktop ?? true),
    telegram: {
      enabled: bool(t.enabled, bt.enabled),
      botToken: str(t.botToken, bt.botToken, 4000).trim(),
      recipients: recipients.slice(0, MAX_TELEGRAM_RECIPIENTS)
    },
    email: {
      enabled: bool(e.enabled, be.enabled),
      host: str(e.host, be.host, 200).trim(),
      port: int(e.port, be.port, 1, 65535),
      secure: bool(e.secure, be.secure),
      user: str(e.user, be.user, 200),
      pass: str(e.pass, be.pass, 4000),
      from: str(e.from, be.from, 200).trim(),
      recipients: parseEmailList(e.recipients ?? e.to ?? be.recipients)
    }
  };
}

export function sanitizeCategoryColors(raw) {
  const out = {};
  if (isObj(raw)) for (const [k, v] of Object.entries(raw)) if (k.trim() && typeof v === 'string' && HEX_RE.test(v)) out[k.trim()] = v.toLowerCase();
  return out;
}

// Anything that is not a plain 'owner/repo' (also '..' parts, which would climb out of the API path) is reset.
export const validRepo = (repo) => REPO_RE.test(repo || '') && !String(repo).split('/').some((p) => /^\.+$/.test(p));

// raw: whatever came from outside (may be partial). base: the settings to start from (defaults, or the current ones).
export function sanitizeSettings(raw, base = defaults()) {
  const s = structuredClone(base);
  const r = isObj(raw) ? raw : {};
  const set = (k, v) => {
    s[k] = v;
  };
  for (const k of ['startOnBoot', 'startMinimized', 'keepAwake', 'notifyOnSuccess', 'notifyOnError', 'openFolderOnNotificationClick', 'checkMinFileSize', 'warnIfUnchanged', 'checkUpdates', 'watchdogMissedSchedules']) {
    if (k in r) set(k, bool(r[k], s[k]));
  }
  if ('updateAlert' in r) set('updateAlert', bool(r.updateAlert, s.updateAlert));
  else if ('notifyNewVersion' in r) set('updateAlert', bool(r.notifyNewVersion, s.updateAlert)); // the name before 26.10.2
  if ('installationName' in r) set('installationName', str(r.installationName, s.installationName, 60).trim());
  if ('defaultDestination' in r) set('defaultDestination', str(r.defaultDestination, s.defaultDestination, 1000));
  if ('themeMode' in r) set('themeMode', oneOf(r.themeMode, ['dark', 'light'], s.themeMode));
  if ('trayIconStyle' in r) set('trayIconStyle', oneOf(r.trayIconStyle, ['white', 'color'], s.trayIconStyle));
  if ('formatPreset' in r) set('formatPreset', oneOf(r.formatPreset, ['auto', 'it', 'us', 'gb', 'iso', 'au'], s.formatPreset));
  if ('language' in r) set('language', oneOf(r.language, ['it', 'en', 'es'], s.language));
  if ('defaultRetries' in r) set('defaultRetries', int(r.defaultRetries, s.defaultRetries, 0, 100));
  if ('defaultRetryDelayMs' in r) set('defaultRetryDelayMs', int(r.defaultRetryDelayMs, s.defaultRetryDelayMs, 0, 3_600_000));
  if ('minFileSizeKB' in r) set('minFileSizeKB', int(r.minFileSizeKB, s.minFileSizeKB, 0, 10_000_000));
  if ('staleAlertRuns' in r) set('staleAlertRuns', int(r.staleAlertRuns, s.staleAlertRuns, 0, 1000));
  if ('maxParallelDownloads' in r) set('maxParallelDownloads', int(r.maxParallelDownloads, s.maxParallelDownloads, 0, 100));
  if ('reportFrequency' in r) set('reportFrequency', oneOf(r.reportFrequency, ['off', 'daily', 'weekly'], s.reportFrequency));
  if ('reportHour' in r) set('reportHour', int(r.reportHour, s.reportHour, 0, 23));
  if ('categoryColors' in r) set('categoryColors', sanitizeCategoryColors(r.categoryColors));
  if ('notifications' in r) set('notifications', sanitizeNotifications(r.notifications, s.notifications));
  else s.notifications = sanitizeNotifications(s.notifications, s.notifications);
  // not editable in the interface: anything that is not this app's own repository is reset
  set('updateRepo', validRepo(r.updateRepo) && r.updateRepo !== 'djgragra/g-downloader-releases' ? r.updateRepo : validRepo(s.updateRepo) ? s.updateRepo : UPDATE_REPO);
  // small bits of interface state that live with the settings
  for (const k of ['errorsClearedAt', 'activityClearedAt']) {
    const v = k in r ? r[k] : base[k]; // null in the patch means "restore": the key goes away
    s[k] = typeof v === 'string' ? v.slice(0, 40) : undefined;
  }
  if ('taskView' in r || 'taskView' in base) {
    const v = isObj(r.taskView) ? r.taskView : isObj(base.taskView) ? base.taskView : null;
    s.taskView = v ? { sortSide: str(v.sortSide, 'category', 20), sortPage: str(v.sortPage, 'next', 20), filter: str(v.filter, 'all', 40), toolbarOpen: bool(v.toolbarOpen, true) } : undefined;
  }
  for (const k of ['errorsClearedAt', 'activityClearedAt', 'taskView']) if (s[k] === undefined) delete s[k];
  return s;
}
