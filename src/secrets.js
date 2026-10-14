// garage-common: secrets 1
// The one list of every place that holds a secret. Sealing at rest, opening, the backup and the
// "type it again" list all use it, so a new secret cannot be forgotten in one of them.
// Works on the plain data as the app uses it, never on the sealed data on disk.
// G-Downloader's data is `{ settings, tasks }`: the SMTP password, the Telegram token, and per task the
// HTTP/FTP password, the credentials written inside an address (user:password@host) and the values of
// headers that carry a key or a token.

export const SEALED_PREFIX = 'enc:v1:';

export const SECRET_PATHS = [
  { id: 'email.pass', path: ['notifications', 'email', 'pass'] },
  { id: 'telegram.botToken', path: ['notifications', 'telegram', 'botToken'] }
];

// header names whose value is a credential
export const SENSITIVE_HEADER_RE = /authorization|cookie|token|api[-_]?key|secret|password|x-auth/i;

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// "user:password@" in an address is a secret; the rest of the address is not.
export function splitUserInfo(url) {
  const m = /^([a-z][a-z0-9+.-]*:\/\/)([^/?#]*@)?(.*)$/is.exec(String(url || ''));
  return m ? { head: m[1], userInfo: m[2] ? m[2].slice(0, -1) : '', rest: m[3] } : { head: '', userInfo: '', rest: String(url || '') };
}
export const withoutUserInfo = (url) => {
  const p = splitUserInfo(url);
  return p.head + p.rest;
};
export const hasUserInfo = (url) => !!splitUserInfo(url).userInfo;

const getAt = (obj, path) => path.reduce((o, k) => (isObj(o) ? o[k] : undefined), obj);
function setAt(obj, path, value) {
  let o = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!isObj(o[path[i]])) return;
    o = o[path[i]];
  }
  o[path.at(-1)] = value;
}

export const taskAuthSlotId = (taskId) => `task-auth:${taskId}`;
export const taskUrlSlotId = (taskId) => `task-url:${taskId}`;
export const scheduleUrlSlotId = (taskId, scheduleId) => `task-urlov:${taskId}:${scheduleId}`;
export const headerSlotId = (taskId, name) => `task-header:${taskId}:${name}`;

// The slots of one task: { id, kind, task, get(), set(v) }.
export function taskSlots(task) {
  const slots = [];
  if (!isObj(task)) return slots;
  const id = String(task.id);
  if (isObj(task.http?.auth)) slots.push({ id: taskAuthSlotId(id), kind: 'task-auth', task, get: () => task.http.auth.password, set: (v) => (task.http.auth.password = v) });
  if (typeof task.url === 'string') slots.push({ id: taskUrlSlotId(id), kind: 'url', task, get: () => task.url, set: (v) => (task.url = v) });
  for (const sc of Array.isArray(task.schedules) ? task.schedules : []) {
    if (isObj(sc) && typeof sc.urlOverride === 'string') slots.push({ id: scheduleUrlSlotId(id, sc.id), kind: 'url', task, get: () => sc.urlOverride, set: (v) => (sc.urlOverride = v) });
  }
  const headers = task.http?.headers;
  if (isObj(headers)) {
    for (const name of Object.keys(headers)) {
      if (SENSITIVE_HEADER_RE.test(name)) slots.push({ id: headerSlotId(id, name), kind: 'header', task, name, get: () => headers[name], set: (v) => (headers[name] = v) });
    }
  }
  return slots;
}

export function settingsSlots(settings) {
  return SECRET_PATHS.map(({ id, path }) => ({ id, kind: id, get: () => getAt(settings, path), set: (v) => setAt(settings, path, v) }));
}

// Every slot that currently exists in `config` = { settings, tasks }.
export function secretSlots(config) {
  const slots = settingsSlots(config?.settings || {});
  for (const t of Array.isArray(config?.tasks) ? config.tasks : []) slots.push(...taskSlots(t));
  return slots;
}

// An address counts as secret only when it carries credentials; the other slots always.
export const isSecretValue = (slot, value) => typeof value === 'string' && !!value && (slot.kind !== 'url' || hasUserInfo(value));

function mapSlots(slots, fn) {
  for (const slot of slots) {
    const v = slot.get();
    if (typeof v === 'string' && v && (isSecretValue(slot, v) || v.startsWith(SEALED_PREFIX))) slot.set(fn(v));
  }
}

// Copies with fn applied to every secret that has a value (seal) or is already sealed (open).
export function mapTaskSecrets(task, fn) {
  const t = structuredClone(task);
  mapSlots(taskSlots(t), fn);
  return t;
}
export function mapSettingsSecrets(settings, fn) {
  const s = structuredClone(settings);
  mapSlots(settingsSlots(s), fn);
  return s;
}

// Copy without any secret, plus the ids of the slots that had one ("to type again").
export function stripSecrets(config) {
  const c = structuredClone(config);
  const emptied = [];
  for (const slot of secretSlots(c)) {
    const v = slot.get();
    if (!isSecretValue(slot, v)) continue;
    emptied.push(slot.id);
    slot.set(slot.kind === 'url' ? withoutUserInfo(v) : '');
  }
  return { config: c, emptied };
}
