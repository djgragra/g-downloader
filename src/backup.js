// garage-common: backup 1
// Configuration backup: build the file, read it back, say what must be typed again.
// Electron-free and file-free (the main process asks for the file and applies the plan), so it can be tested.
// The data is `{ settings, tasks }` as the app uses it (plain); sealed values (enc:v1:) never come out of a file.
import { sanitizeSettings, defaults } from './settings.js';
import { SEALED_PREFIX, secretSlots, stripSecrets, withoutUserInfo, hasUserInfo, taskAuthSlotId, taskUrlSlotId, scheduleUrlSlotId, headerSlotId, SENSITIVE_HEADER_RE } from './secrets.js';

export const BACKUP_APP = 'g-downloader';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 20_000_000;
export const MAX_TASKS = 500;
// what a task remembers about its runs: not part of a backup
const TASK_RUNTIME_KEYS = ['history', 'lastRun', 'lastStatus', 'lastError', 'lastFileHash', 'unchangedStreak', 'seqCounter', 'pendingActions'];

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const dateStamp = (ms) => new Date(ms).toISOString().slice(0, 10);
export const backupFileName = (now = Date.now()) => `${BACKUP_APP}-backup-${dateStamp(now)}.json`;

function withoutRuntime(task) {
  const t = structuredClone(task);
  for (const k of TASK_RUNTIME_KEYS) delete t[k];
  for (const sc of Array.isArray(t.schedules) ? t.schedules : []) {
    delete sc.lastFired;
    delete sc.fired;
  }
  return t;
}

// config = { settings, tasks }: the plain data of the app. Returns the object to write as JSON.
export function buildExport(config, { includeSecrets = false, now = Date.now() } = {}) {
  let c = { settings: config.settings, tasks: (config.tasks || []).map(withoutRuntime) };
  let emptied = [];
  if (!includeSecrets) ({ config: c, emptied } = stripSecrets(c));
  else c = structuredClone(c);
  const file = { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date(now).toISOString(), includesSecrets: !!includeSecrets, settings: c.settings, tasks: c.tasks };
  if (emptied.length) file.emptiedSecrets = emptied; // which secrets had a value and were left out
  return file;
}

// A task from a file: the fields the app needs are checked, the others are kept as they are.
export function normalizeTask(raw) {
  if (!isObj(raw) || typeof raw.name !== 'string' || !raw.name.trim()) return null;
  const t = structuredClone(raw);
  t.id = typeof t.id === 'string' && t.id ? t.id.slice(0, 80) : `imp-${Math.random().toString(36).slice(2, 10)}`;
  t.name = t.name.trim().slice(0, 200);
  t.category = typeof t.category === 'string' ? t.category.trim().slice(0, 80) : '';
  t.enabled = t.enabled !== false;
  if (!isObj(t.http)) t.http = {};
  if (!isObj(t.http.auth)) t.http.auth = { enabled: false, username: '', password: '' };
  if (!isObj(t.http.headers)) t.http.headers = {};
  if (!Array.isArray(t.schedules)) t.schedules = [];
  if (!Array.isArray(t.postActions)) t.postActions = [];
  if (!Array.isArray(t.exceptions)) t.exceptions = [];
  t.schedules = t.schedules.filter(isObj);
  t.postActions = t.postActions.filter(isObj);
  return t;
}

const hostOf = (url) => /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?([^/:?#]+)/i.exec(String(url || ''))?.[1]?.toLowerCase() || '';

// The programs a set of tasks would run after a download: [{ task, line }], for the question asked before importing.
export function taskCommands(tasks) {
  const out = [];
  for (const t of tasks || []) {
    for (const a of t.postActions || []) {
      if (a.type !== 'run' || a.enabled === false) continue;
      const text = a.mode === 'line' ? String(a.commandLine || '') : `${a.command || ''} ${(a.args || []).join(' ')}`;
      for (const line of text.split(/\r?\n/)) if (line.trim()) out.push({ task: t.name, line: line.trim() });
    }
  }
  return out;
}

// What the user has to type again in `config`: secrets that are needed and empty.
// `emptied` (ids from the file, or sealed values dropped) marks the secrets that lost their value.
export function missingSecrets(config, emptied = [], { onlyTaskIds = null } = {}) {
  const out = [];
  const s = config.settings || {};
  if (!onlyTaskIds) {
    const em = s.notifications?.email || {};
    if ((em.enabled || em.host) && em.user && !em.pass) out.push({ id: 'email.pass', kind: 'email.pass' });
    const tg = s.notifications?.telegram || {};
    if ((tg.enabled || (tg.recipients || []).length) && !tg.botToken) out.push({ id: 'telegram.botToken', kind: 'telegram.botToken' });
  }
  for (const t of config.tasks || []) {
    if (onlyTaskIds && !onlyTaskIds.has(t.id)) continue;
    const a = t.http?.auth;
    if (a?.enabled && a.username && !a.password) out.push({ id: taskAuthSlotId(t.id), kind: 'task-auth', name: t.name });
    if (emptied.includes(taskUrlSlotId(t.id)) && !hasUserInfo(t.url)) out.push({ id: taskUrlSlotId(t.id), kind: 'url', name: t.name });
    for (const sc of t.schedules || []) {
      if (emptied.includes(scheduleUrlSlotId(t.id, sc.id)) && !hasUserInfo(sc.urlOverride)) out.push({ id: scheduleUrlSlotId(t.id, sc.id), kind: 'url', name: `${t.name} / ${sc.label || sc.type || ''}`.trim() });
    }
    for (const name of Object.keys(t.http?.headers || {})) {
      if (SENSITIVE_HEADER_RE.test(name) && emptied.includes(headerSlotId(t.id, name)) && !t.http.headers[name]) out.push({ id: headerSlotId(t.id, name), kind: 'header', name: `${t.name} / ${name}` });
    }
  }
  return out;
}

// What a task already running on this PC keeps when the file brings the same task again.
function keepFromCurrent(incoming, cur) {
  for (const k of TASK_RUNTIME_KEYS) {
    if (cur[k] === undefined) delete incoming[k];
    else incoming[k] = cur[k];
  }
  const byId = new Map((cur.schedules || []).map((sc) => [sc.id, sc]));
  for (const sc of incoming.schedules) {
    const ex = byId.get(sc.id);
    if (ex?.lastFired) {
      sc.lastFired = ex.lastFired;
      sc.fired = ex.fired;
    }
  }
}

// A task that starts here: only the occurrences after the import count (importing at 10:20 must not fire the 9:57 slot),
// and a one-off schedule already in the past does not run now.
function freshRuntime(task, nowMs) {
  for (const k of TASK_RUNTIME_KEYS) delete task[k];
  const nowIso = new Date(nowMs).toISOString();
  for (const sc of task.schedules) {
    sc.lastFired = nowIso;
    sc.fired = sc.type === 'once' ? !(sc.datetime && new Date(sc.datetime).getTime() > nowMs) : false;
  }
}

// a secret the file does not carry is kept from this PC, only for the same server and user
function keepSecrets(incoming, current) {
  const e = incoming.settings.notifications.email;
  const ce = current.settings.notifications.email;
  if (!e.pass && ce.pass && e.host && e.host.toLowerCase() === ce.host.toLowerCase() && e.user === ce.user) e.pass = ce.pass;
  if (!incoming.settings.notifications.telegram.botToken) incoming.settings.notifications.telegram.botToken = current.settings.notifications.telegram.botToken;
  const byId = new Map(current.tasks.map((t) => [t.id, t]));
  for (const t of incoming.tasks) {
    const c = byId.get(t.id);
    if (!c) continue;
    const sameHost = hostOf(t.url) && hostOf(t.url) === hostOf(c.url);
    const a = t.http.auth;
    const ca = c.http?.auth;
    if (a && !a.password && ca?.password && sameHost && a.username === ca.username) a.password = ca.password;
    if (!hasUserInfo(t.url) && hasUserInfo(c.url) && withoutUserInfo(c.url) === t.url) t.url = c.url;
    for (const sc of t.schedules) {
      const cs = (c.schedules || []).find((x) => x.id === sc.id);
      if (cs && typeof sc.urlOverride === 'string' && !hasUserInfo(sc.urlOverride) && hasUserInfo(cs.urlOverride) && withoutUserInfo(cs.urlOverride) === sc.urlOverride) sc.urlOverride = cs.urlOverride;
    }
    for (const name of Object.keys(t.http.headers)) {
      if (SENSITIVE_HEADER_RE.test(name) && !t.http.headers[name] && sameHost && c.http?.headers?.[name]) t.http.headers[name] = c.http.headers[name];
    }
  }
}

// raw: the text or the parsed object of the file. current: the plain { settings, tasks } now in use.
// mode: 'replace' (settings and tasks from the file) | 'add' (only the tasks this PC does not have, switched off; settings untouched).
// Returns { ok, mode, settings, tasks, missing, commands, added } or { ok:false, error }.
export function prepareImport(raw, current, { mode = 'replace', now = Date.now() } = {}) {
  let file = raw;
  if (typeof raw === 'string') {
    if (raw.length > MAX_BACKUP_BYTES) return { ok: false, error: 'too-big' };
    try {
      file = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'invalid' };
    }
  }
  if (!isObj(file) || !isObj(file.settings)) return { ok: false, error: 'invalid' };
  if (file.app !== BACKUP_APP) return { ok: false, error: 'wrong-app' };

  const incoming = { settings: structuredClone(file.settings), tasks: (Array.isArray(file.tasks) ? file.tasks : []).map(normalizeTask).filter(Boolean).slice(0, MAX_TASKS) };
  const emptied = new Set(Array.isArray(file.emptiedSecrets) ? file.emptiedSecrets.filter((x) => typeof x === 'string') : []);
  // a sealed value cannot be opened on another PC or account: drop it
  for (const slot of secretSlots(incoming)) {
    const v = slot.get();
    if (typeof v === 'string' && v.startsWith(SEALED_PREFIX)) {
      slot.set('');
      emptied.add(slot.id);
    }
  }
  incoming.settings = sanitizeSettings(incoming.settings, defaults());
  keepSecrets(incoming, current);

  const have = new Map(current.tasks.map((t) => [t.id, t]));
  let result;
  let addedIds = null;
  if (mode === 'add') {
    const extra = incoming.tasks.filter((t) => !have.has(t.id)).slice(0, Math.max(0, MAX_TASKS - current.tasks.length));
    for (const t of extra) {
      t.enabled = false; // a task from a file starts switched off, so it can be checked before it runs
      freshRuntime(t, now);
    }
    result = { settings: current.settings, tasks: [...current.tasks, ...extra] };
    addedIds = new Set(extra.map((t) => t.id));
  } else {
    for (const t of incoming.tasks) {
      const cur = have.get(t.id);
      if (cur) keepFromCurrent(t, cur);
      else freshRuntime(t, now);
    }
    result = incoming;
  }
  const missing = missingSecrets(result, [...emptied], { onlyTaskIds: addedIds });
  const commandTasks = addedIds ? result.tasks.filter((t) => addedIds.has(t.id)) : result.tasks;
  return { ok: true, mode, settings: result.settings, tasks: result.tasks, missing, commands: taskCommands(commandTasks), added: addedIds ? addedIds.size : null };
}

// ---- one task in a file (share or copy a task) ----
// The file carries no password, token or credentials written in an address: the task is shared, not backed up.
export function buildTaskExport(task, { now = Date.now() } = {}) {
  const { config, emptied } = stripSecrets({ settings: {}, tasks: [withoutRuntime(task)] });
  const file = { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date(now).toISOString(), includesSecrets: false, task: config.tasks[0] };
  if (emptied.length) file.emptiedSecrets = emptied;
  return file;
}

// {task}, {tasks:[…]} or a bare task (files of older versions) -> tasks ready to add: new id, switched off, no history.
export function prepareTaskImport(raw, { now = Date.now() } = {}) {
  let file = raw;
  if (typeof raw === 'string') {
    if (raw.length > MAX_BACKUP_BYTES) return { ok: false, error: 'too-big' };
    try {
      file = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'invalid' };
    }
  }
  if (!isObj(file)) return { ok: false, error: 'invalid' };
  if (file.app !== undefined && file.app !== BACKUP_APP) return { ok: false, error: 'wrong-app' };
  const list = Array.isArray(file.tasks) ? file.tasks : isObj(file.task) ? [file.task] : [file];
  const tasks = list.map(normalizeTask).filter(Boolean).slice(0, MAX_TASKS);
  if (!tasks.length) return { ok: false, error: 'no-tasks' };
  const emptied = new Set(Array.isArray(file.emptiedSecrets) ? file.emptiedSecrets.filter((x) => typeof x === 'string') : []);
  const fresh = [];
  for (const t of tasks) {
    const oldId = t.id;
    t.id = `t-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`; // never collides with an existing task
    // slot ids carry the old task id: keep the "to type again" list in step
    for (const e of [...emptied]) if (e.includes(`:${oldId}`)) emptied.add(e.replace(`:${oldId}`, `:${t.id}`));
    t.enabled = false;
    freshRuntime(t, now);
    for (const slot of secretSlots({ settings: {}, tasks: [t] })) {
      const v = slot.get();
      if (typeof v === 'string' && v.startsWith(SEALED_PREFIX)) {
        slot.set('');
        emptied.add(slot.id);
      }
    }
    fresh.push(t);
  }
  return { ok: true, tasks: fresh, missing: missingSecrets({ settings: {}, tasks: fresh }, [...emptied]), commands: taskCommands(fresh) };
}
