import Store from 'electron-store';
import { randomUUID } from 'node:crypto';
import { app, safeStorage } from 'electron';
import { M } from './i18n.js';

const store = new Store({
  name: 'g-downloader-data',
  defaults: {
    tasks: [],
    windowBounds: { width: 1100, height: 720 },
    lastReportSentAt: null,
    dailyStats: {},
    dailyStatsBackfilled: false,
    settings: {
      startOnBoot: true,
      startMinimized: false,
      notifyOnSuccess: true,
      notifyOnError: true,
      defaultDestination: '',
      themeMode: 'dark', // 'dark' | 'light'
      trayIconStyle: process.platform === 'darwin' ? 'white' : 'color', // 'white' (macOS template) | 'color' (brand blue) — blue is the right default on Windows/Linux
      formatPreset: 'auto', // 'auto' (from language) | 'it' | 'us' | 'gb' | 'iso' | 'au' — date order + 12/24h
      language: 'it', // 'it' | 'en' | 'es' — used by the Guida/Help section
      defaultRetries: 3,
      defaultRetryDelayMs: 15000,
      openFolderOnNotificationClick: false,
      checkMinFileSize: false,
      minFileSizeKB: 1,
      warnIfUnchanged: false,
      staleAlertRuns: 0, // 0 = off; otherwise alert after N consecutive identical downloads
      maxParallelDownloads: 0, // 0 = unlimited; 1 = one download at a time
      checkUpdates: true,
      updateRepo: 'djgragra/g-downloader',
      watchdogMissedSchedules: false,
      reportFrequency: 'off', // 'off' | 'daily' | 'weekly'
      reportHour: 7,
      notifications: {
        email: {
          enabled: false,
          host: '',
          port: 587,
          secure: false,
          user: '',
          pass: '',
          from: '',
          to: ''
        },
        telegram: {
          enabled: false,
          botToken: '',
          chatId: '', // legacy single recipient, superseded by recipients
          recipients: [] // [{ chatId, note }]
        }
      }
    }
  }
});

// The updates repository used to be 'djgragra/g-downloader-releases' (now merged into the main
// repo). Saved settings keep the old value, since defaults only fill missing keys.
if (store.get('settings.updateRepo') === 'djgragra/g-downloader-releases') {
  store.set('settings.updateRepo', 'djgragra/g-downloader');
}

// ---- secrets at rest -------------------------------------------------------------
// Passwords and tokens are encrypted with the OS keystore (Windows DPAPI / macOS Keychain /
// libsecret) via Electron safeStorage. Readers get plain values; the file on disk holds
// "enc:v1:<base64>". If the keystore is unavailable, values stay as they were (plain).
const PREFIX = 'enc:v1:';

function canSeal() {
  try {
    return app.isReady() && safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function seal(v) {
  if (typeof v !== 'string' || !v || v.startsWith(PREFIX) || !canSeal()) return v;
  return PREFIX + safeStorage.encryptString(v).toString('base64');
}

function open(v) {
  if (typeof v !== 'string' || !v.startsWith(PREFIX)) return v;
  try {
    return safeStorage.decryptString(Buffer.from(v.slice(PREFIX.length), 'base64'));
  } catch {
    return ''; // keystore changed (other user/PC): the secret must be typed again
  }
}

function mapTaskSecrets(task, fn) {
  const t = structuredClone(task);
  if (t?.http?.auth?.password) t.http.auth.password = fn(t.http.auth.password);
  return t;
}

function mapSettingsSecrets(settings, fn) {
  const s = structuredClone(settings);
  const n = s.notifications;
  if (n?.email?.pass) n.email.pass = fn(n.email.pass);
  if (n?.telegram?.botToken) n.telegram.botToken = fn(n.telegram.botToken);
  return s;
}

// Rewrites data saved by older versions (plain) in encrypted form. Call once after app ready.
export function migrateSecrets() {
  if (!canSeal()) return;
  store.set('tasks', store.get('tasks').map((t) => mapTaskSecrets(t, seal)));
  store.set('settings', mapSettingsSecrets(store.get('settings'), seal));
}

export function getSettings() {
  return mapSettingsSecrets(store.get('settings'), open);
}

export function getLanguage() {
  return store.get('settings.language') || 'it';
}

export function getLastReportSentAt() {
  return store.get('lastReportSentAt');
}

export function setLastReportSentAt(iso) {
  store.set('lastReportSentAt', iso);
}

export function getWindowBounds() {
  return store.get('windowBounds');
}

export function setWindowBounds(bounds) {
  store.set('windowBounds', bounds);
}

export function updateSettings(patch) {
  const next = { ...getSettings(), ...patch };
  store.set('settings', mapSettingsSecrets(next, seal));
  return next;
}

export function getTasks() {
  return store.get('tasks').map((t) => mapTaskSecrets(t, open));
}

export function getTask(id) {
  const t = store.get('tasks').find((x) => x.id === id);
  return t ? mapTaskSecrets(t, open) : null;
}

export function saveTask(task) {
  const tasks = store.get('tasks');
  const idx = tasks.findIndex((t) => t.id === task.id);
  const stored = mapTaskSecrets(task, seal);
  if (idx >= 0) {
    tasks[idx] = stored;
  } else {
    tasks.push(stored);
  }
  store.set('tasks', tasks);
  return task;
}

export function deleteTask(id) {
  const tasks = store.get('tasks').filter((t) => t.id !== id);
  store.set('tasks', tasks);
}

export function newTaskTemplate() {
  const settings = getSettings();
  return {
    id: randomUUID(),
    name: M('Nuovo download'),
    category: '',
    enabled: true,
    sourceType: 'web', // 'web' | 'local'
    url: 'https://example.com/report_{date:yyyyMMdd}.zip',
    localPath: '',
    destinationFolder: '',
    preDownloadAction: 'none', // 'none' | 'deleteAll' | 'move'
    preDownloadMoveTarget: '',
    preDownloadScope: 'all', // 'all' | 'sameName' | 'pattern' | 'olderThan' | 'keepLast'
    preDownloadSubfolders: false,
    preDownloadTiming: 'before', // 'before' | 'afterSuccess'
    preDownloadDelete: 'permanent', // 'permanent' | 'trash'
    filenameMode: 'template', // 'fixed' | 'fromUrl' | 'template' | 'ask'
    fixedFilename: 'file.zip',
    filenameTemplate: 'report_{date:yyyy-MM-dd}.zip',
    http: {
      method: 'GET',
      headers: {},
      body: '',
      bodyType: 'json', // 'json' | 'text'
      retries: settings.defaultRetries ?? 3,
      retryDelayMs: settings.defaultRetryDelayMs ?? 15000,
      timeoutMs: 30000,
      auth: { enabled: false, username: '', password: '' }
    },
    notifyOnFailure: true,
    runOnSave: false,
    schedules: [], // [{id, type:'cron'|'once'|'interval', expr, datetime, everyMinutes, enabled}]
    postActions: [], // [{id, type:'rename'|'run'|'move'|'open'|'notify', ...}]
    seqCounter: 0,
    lastRun: null,
    lastStatus: null,
    lastError: null,
    lastFileHash: null, // sha256 of the last successful download, used for the "file invariato" warning
    unchangedStreak: 0, // consecutive downloads identical to the previous one
    expectedSha256: '', // optional: the download fails if its sha256 differs
    history: [] // recent run log entries, capped
  };
}

export function bumpSeq(id) {
  const task = getTask(id);
  if (!task) return 0;
  task.seqCounter = (task.seqCounter || 0) + 1;
  saveTask(task);
  return task.seqCounter;
}

// ---- permanent per-day statistics -------------------------------------------------
// Task history is capped (last 50 runs per task), which empties the dashboard charts as
// soon as a task runs many times a day. These counters are tiny and kept ~13 months:
//   dailyStats['YYYY-MM-DD'] = { s: successes, e: errors, bytes, hours: [24 counts], tasks: { id: [s, e] } }
const STATS_RETENTION_DAYS = 400;

function localDateKey(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function addToStats(stats, taskId, entry) {
  const when = new Date(entry.finishedAt || Date.now());
  const key = localDateKey(when);
  const day = (stats[key] ||= { s: 0, e: 0, bytes: 0, hours: new Array(24).fill(0), tasks: {} });
  const ok = entry.status === 'success';
  day[ok ? 's' : 'e']++;
  if (ok) day.bytes += entry.bytes || 0;
  day.hours[when.getHours()]++;
  const t = (day.tasks[taskId] ||= [0, 0]);
  t[ok ? 0 : 1]++;
}

export function getDailyStats() {
  if (!store.get('dailyStatsBackfilled')) {
    // First run after the upgrade: seed the counters from the history still on disk.
    const stats = {};
    for (const task of store.get('tasks')) for (const h of task.history || []) addToStats(stats, task.id, h);
    store.set('dailyStats', stats);
    store.set('dailyStatsBackfilled', true);
  }
  return store.get('dailyStats');
}

function recordStat(taskId, entry) {
  const stats = getDailyStats();
  addToStats(stats, taskId, entry);
  const cutoff = localDateKey(new Date(Date.now() - STATS_RETENTION_DAYS * 86_400_000));
  for (const key of Object.keys(stats)) if (key < cutoff) delete stats[key];
  store.set('dailyStats', stats);
}

export function appendHistory(id, entry) {
  const task = getTask(id);
  if (!task) return;
  recordStat(id, entry);
  task.history = [entry, ...(task.history || [])].slice(0, 50);
  task.lastRun = entry.finishedAt;
  task.lastStatus = entry.status;
  task.lastError = entry.error || null;
  saveTask(task);
}

export function exportConfig() {
  return {
    app: 'g-downloader',
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: store.get('tasks'),
    settings: store.get('settings')
  };
}

export function exportTask(id) {
  const task = getTask(id);
  if (!task) throw new Error(M("Task non trovato"));
  return { app: 'g-downloader', version: 1, exportedAt: new Date().toISOString(), task };
}

// Imported task gets a fresh id/history so it never collides with (or overwrites)
// an existing task, even if the same file is imported twice or shared between PCs.
export function importTask(data) {
  // A file may carry several tasks ({ tasks: [...] }): import them all, return the first.
  if (data && Array.isArray(data.tasks)) {
    const imported = data.tasks.map((t) => importTask({ task: t }));
    if (!imported.length) throw new Error(M("Il file non contiene task"));
    return Object.assign(imported[0], { _count: imported.length });
  }
  const task = data && data.task && typeof data.task === 'object' ? data.task : data;
  if (!task || typeof task !== 'object' || !task.name) throw new Error(M("File task non valido"));
  const imported = {
    ...task,
    id: randomUUID(),
    enabled: false, // imported tasks start switched off, so they can be checked before they run
    seqCounter: 0,
    lastRun: null,
    lastStatus: null,
    lastError: null,
    lastFileHash: null,
    history: [],
    // Same as editing a schedule in the UI: only occurrences after the import count,
    // so importing at 10:20 does not immediately fire the 9:57 slot.
    schedules: (task.schedules || []).map((s) => ({ ...s, lastFired: new Date().toISOString(), fired: false }))
  };
  saveTask(imported);
  return imported;
}

export function importConfig(data) {
  if (!data || typeof data !== 'object') throw new Error(M("File di configurazione non valido"));
  if (Array.isArray(data.tasks)) store.set('tasks', data.tasks.map((t) => mapTaskSecrets(t, seal)));
  if (data.settings && typeof data.settings === 'object') {
    store.set('settings', mapSettingsSecrets({ ...getSettings(), ...data.settings }, seal));
  }
  return { tasks: store.get('tasks'), settings: store.get('settings') };
}

export default store;
