// Calendar exceptions of a task: days on which its schedules do not run as usual.
//   task.exceptions = [{ id, from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', mode: 'skip' | 'treat', treatAs: 0..6, note }]
//  - 'skip':  the task does not download on those days (production stopped: 15 August, 25 December).
//  - 'treat': the day follows the schedules of another weekday (an agency applies its Sunday timetable on a
//             Wednesday holiday): `treatAs` is that weekday, 0 = Sunday … 6 = Saturday.
// `from` and `to` are local calendar days, both included (the same day for a single day). Pure functions.
export const MAX_EXCEPTIONS = 200;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n) => String(n).padStart(2, '0');

export const dayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// 'YYYY-MM-DD' -> local Date at midnight, or null
export function parseDay(key) {
  if (!DAY_RE.test(String(key))) return null;
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

// Valid exceptions only (a bad date, a reversed range or an unknown mode is dropped), sorted by start day.
export function normalizeExceptions(list) {
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    if (!raw || typeof raw !== 'object') continue;
    const from = parseDay(raw.from);
    const to = parseDay(raw.to || raw.from);
    if (!from || !to || to < from) continue;
    const mode = raw.mode === 'treat' ? 'treat' : 'skip';
    const treatAs = Number(raw.treatAs);
    if (mode === 'treat' && !(Number.isInteger(treatAs) && treatAs >= 0 && treatAs <= 6)) continue;
    out.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 40) : `ex-${Math.random().toString(36).slice(2, 10)}`,
      from: dayKey(from),
      to: dayKey(to),
      mode,
      ...(mode === 'treat' ? { treatAs } : {}),
      note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 120) : ''
    });
  }
  out.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  return out.slice(0, MAX_EXCEPTIONS);
}

// The exception that applies to a day, or null. If two overlap, 'skip' wins over 'treat'.
export function ruleForDay(exceptions, date) {
  if (!exceptions?.length) return null;
  const k = dayKey(date);
  let found = null;
  for (const ex of exceptions) {
    if (k < ex.from || k > ex.to) continue;
    if (ex.mode === 'skip') return ex;
    found ||= ex;
  }
  return found;
}

// Which weekday the schedules of that day follow: the real one, another one ('treat'), or null (the day is skipped).
export function effectiveWeekday(exceptions, date) {
  const r = ruleForDay(exceptions, date);
  if (!r) return date.getDay();
  return r.mode === 'skip' ? null : r.treatAs;
}

export const isSkippedDay = (exceptions, date) => ruleForDay(exceptions, date)?.mode === 'skip';

// The days of a 'treat' exception inside [from, to] (local days), as Dates at midnight.
export function treatDays(exceptions, from, to) {
  const out = [];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let d = start; d <= to && out.length < 400; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const r = ruleForDay(exceptions, d);
    if (r?.mode === 'treat') out.push({ day: d, treatAs: r.treatAs });
  }
  return out;
}

// New exception for a set of tasks: { tasks: [ids], from, to, mode, treatAs, note } -> the same exception added to each one.
// Returns the tasks that change (with the normalised list), leaving the others alone.
export function addExceptionToTasks(tasks, ids, exception) {
  const wanted = new Set(ids);
  const probe = normalizeExceptions([exception]);
  if (!probe.length) return { ok: false, error: 'invalid', changed: [] };
  const changed = [];
  for (const t of tasks) {
    if (!wanted.has(t.id)) continue;
    const next = normalizeExceptions([...(t.exceptions || []), { ...probe[0], id: `ex-${Math.random().toString(36).slice(2, 10)}` }]);
    changed.push({ ...t, exceptions: next });
  }
  return { ok: true, changed };
}
