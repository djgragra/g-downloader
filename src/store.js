import Store from 'electron-store';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { app, safeStorage } from 'electron';
import { M } from './i18n.js';
import { defaults, sanitizeSettings, validRepo, UPDATE_REPO } from './settings.js';
import { SEALED_PREFIX, mapTaskSecrets, mapSettingsSecrets } from './secrets.js';
import { normalizeExceptions } from './exceptions.js';

// Read before the store is created: creating it writes the file with its defaults.
// A settings file existed before this start: the first start of a new version then counts as an update, not as a new installation.
export const hadSettingsFile = (() => {
  try {
    return fs.existsSync(path.join(app.getPath('userData'), 'g-downloader-data.json'));
  } catch {
    return false;
  }
})();

const store = new Store({
  name: 'g-downloader-data',
  defaults: {
    tasks: [],
    windowBounds: { width: 1100, height: 720 },
    lastReportSentAt: null,
    dailyStats: {},
    dailyStatsBackfilled: false,
    // kept apart from the settings on purpose: not part of a backup, not reset by an import
    updateState: { skipVersion: '', remindUntil: 0, lastCheck: null },
    lastSeenVersion: '',
    closeHintShown: false,
    settings: defaults()
  }
});

export const settingsFile = () => store.path;

// Whatever is on disk goes through the same validation as imported files (older versions saved a partial object,
// `email.to` as one string, a retired updates repository…). Secrets stay as they are: sealed, or plain until sealed.
{
  const legacy = store.get('settings') || {};
  const clean = sanitizeSettings(legacy, defaults());
  // the memory of the new-version notice moved to alert-state.json: main reads this value once and then it goes away
  if (typeof legacy.lastNotifiedVersion === 'string' && legacy.lastNotifiedVersion) store.set('legacyNotifiedVersion', legacy.lastNotifiedVersion);
  store.set('settings', clean);
}
if (!validRepo(store.get('settings.updateRepo'))) store.set('settings.updateRepo', UPDATE_REPO);

export function takeLegacyNotifiedVersion() {
  const v = store.get('legacyNotifiedVersion') || '';
  store.delete('legacyNotifiedVersion');
  return v;
}

// ---- secrets at rest -------------------------------------------------------------
// Passwords, tokens and credentials written in addresses are encrypted with the OS keystore (Windows DPAPI / macOS
// Keychain / libsecret) via Electron safeStorage. Readers get plain values; the file on disk holds "enc:v1:<base64>".
// The list of what is a secret is src/secrets.js. If the keystore is unavailable, values stay as they were (plain).
export function canSeal() {
  try {
    return app.isReady() && safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function seal(v) {
  if (typeof v !== 'string' || !v || v.startsWith(SEALED_PREFIX) || !canSeal()) return v;
  return SEALED_PREFIX + safeStorage.encryptString(v).toString('base64');
}

function open(v) {
  if (typeof v !== 'string' || !v.startsWith(SEALED_PREFIX)) return v;
  try {
    return safeStorage.decryptString(Buffer.from(v.slice(SEALED_PREFIX.length), 'base64'));
  } catch {
    return ''; // keystore changed (other user/PC): the secret must be typed again
  }
}

// Rewrites data saved by older versions (plain) in encrypted form. Call once after app ready.
export function migrateSecrets() {
  if (!canSeal()) return false;
  store.set('tasks', store.get('tasks').map((t) => mapTaskSecrets(t, seal)));
  store.set('settings', mapSettingsSecrets(store.get('settings'), seal));
  return true;
}

// Sealed values on disk that cannot be opened here (the file came from another PC or account): the slots to type again.
export function unreadableSecrets() {
  const out = [];
  const raw = store.get('settings');
  for (const id of ['email.pass', 'telegram.botToken']) {
    const v = id === 'email.pass' ? raw.notifications?.email?.pass : raw.notifications?.telegram?.botToken;
    if (typeof v === 'string' && v.startsWith(SEALED_PREFIX) && !open(v)) out.push(id);
  }
  return out;
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
  const next = sanitizeSettings(patch, getSettings());
  store.set('settings', mapSettingsSecrets(next, seal));
  return next;
}

export function replaceSettings(settings) {
  const next = sanitizeSettings(settings, defaults());
  store.set('settings', mapSettingsSecrets(next, seal));
  return next;
}

// ---- what the app remembers apart from the settings ----
export const getUpdateState = () => ({ skipVersion: '', remindUntil: 0, lastCheck: null, ...(store.get('updateState') || {}) });
export function setUpdateState(patch) {
  const next = { ...getUpdateState(), ...patch };
  store.set('updateState', next);
  return next;
}
export const getLastSeenVersion = () => store.get('lastSeenVersion') || '';
export const setLastSeenVersion = (v) => store.set('lastSeenVersion', String(v || ''));
export const getCloseHintShown = () => !!store.get('closeHintShown');
export const setCloseHintShown = () => store.set('closeHintShown', true);

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
  task.exceptions = normalizeExceptions(task.exceptions);
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
    exceptions: [], // [{id, from, to, mode:'skip'|'treat', treatAs, note}]: calendar exceptions (src/exceptions.js)
    // wait for a file that is published late: retry every N minutes for at most M minutes (src/waitwindow.js)
    waitWindow: { enabled: false, everyMinutes: 1, maxMinutes: 20, minSizeKB: 0, rejectWebPage: true, stableSeconds: 5 },
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

// Runs that do not count as downloads: parts of a run (actions only, cleanup only) and days skipped by an exception.
const NOT_A_DOWNLOAD = new Set(['actions', 'cleanup', 'skipped']);

export function appendHistory(id, entry) {
  const task = getTask(id);
  if (!task) return;
  if (!NOT_A_DOWNLOAD.has(entry.mode)) recordStat(id, entry); // only downloads count
  task.history = [entry, ...(task.history || [])].slice(0, 50);
  task.lastRun = entry.finishedAt;
  task.lastStatus = entry.status;
  task.lastError = entry.error || null;
  saveTask(task);
}

// A day on which a calendar exception kept the task from running. It shows in the history ("skipped"), but it is not
// a run: it changes neither the last result, nor the statistics, nor the failure count.
export function appendSkipped(id, { finishedAt, note }) {
  const task = getTask(id);
  if (!task) return;
  task.history = [{ startedAt: finishedAt, finishedAt, status: 'skipped', mode: 'skipped', note }, ...(task.history || [])].slice(0, 50);
  saveTask(task);
}

// ---- the whole configuration (backup, restore) ----
export function getConfig() {
  return { settings: getSettings(), tasks: getTasks() };
}

// Applies what src/backup.js prepared: `settings` and `tasks` are the plain final data.
export function applyConfig({ settings, tasks }, { replaceSettingsToo = true } = {}) {
  if (replaceSettingsToo && settings) store.set('settings', mapSettingsSecrets(sanitizeSettings(settings, defaults()), seal));
  store.set('tasks', tasks.map((t) => mapTaskSecrets({ ...t, exceptions: normalizeExceptions(t.exceptions) }, seal)));
  return getConfig();
}

// Replaces the tasks that changed (category rename / delete) and the colours map. Items are plain.
export function applyCategoryChange({ changed, colors }) {
  const byId = new Map(changed.map((t) => [t.id, t.category]));
  const tasks = store.get('tasks').map((raw) => (byId.has(raw.id) ? { ...raw, category: byId.get(raw.id) } : raw));
  store.set('tasks', tasks);
  store.set('settings.categoryColors', colors);
  return getConfig();
}

// Adds tasks prepared by src/backup.js (new ids, switched off, no history). Returns them.
export function addTasks(list) {
  for (const t of list) saveTask(t);
  return list;
}

export function exportTaskData(id) {
  const task = getTask(id);
  if (!task) throw new Error(M("Task non trovato"));
  return task;
}

export default store;
