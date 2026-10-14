// When a schedule fires. Pure functions (no store, no Electron) so they can be tested; the scheduler loop uses them.
// Every function takes the calendar exceptions of the task (src/exceptions.js) as its last argument:
//  - a skipped day has no occurrences (for "weekdays + times", cron expressions and every-N-minutes schedules);
//  - a "treat as <weekday>" day follows the schedules of that weekday: "weekdays + times" schedules look at that weekday,
//    a cron expression gives, on that day, the times it has on the nearest day with that weekday of the same week;
//  - one-off schedules and every-N-minutes schedules are not moved by "treat as".
import { CronExpressionParser } from 'cron-parser';
import { effectiveWeekday, isSkippedDay, ruleForDay, treatDays } from './exceptions.js';

const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export function friendlyDays(schedule) {
  return Array.isArray(schedule.days) && schedule.days.length ? schedule.days : [0, 1, 2, 3, 4, 5, 6];
}

// Friendly mode allows several times of day on the same set of weekdays (e.g. an hourly news bulletin at irregular
// times) instead of a single time. Falls back to the old single `time` field for schedules saved before this existed.
export function friendlyTimes(schedule) {
  const raw = Array.isArray(schedule.times) && schedule.times.length ? schedule.times : [schedule.time || '09:00'];
  return raw
    .map((t) => String(t || '09:00').split(':').map((n) => parseInt(n, 10) || 0))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

// does the "weekdays + times" schedule run on this calendar day?
function runsOn(schedule, d, ex) {
  const wd = effectiveWeekday(ex, d);
  return wd !== null && friendlyDays(schedule).includes(wd);
}

export function mostRecentFriendlyOccurrence(schedule, now, ex = []) {
  const times = friendlyTimes(schedule);
  const back = ex.length ? 400 : 7; // a long holiday must not hide the occurrence before it
  for (let dayOffset = 0; dayOffset <= back; dayOffset++) {
    const d = addDays(now, -dayOffset);
    if (!runsOn(schedule, d, ex)) continue;
    for (let i = times.length - 1; i >= 0; i--) {
      const [hh, mm] = times[i];
      const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);
      if (candidate <= now) return candidate;
    }
  }
  return null;
}

// All friendly occurrences strictly after `from` and up to `to` (inclusive).
export function friendlyOccurrencesBetween(schedule, from, to, ex = []) {
  const times = friendlyTimes(schedule);
  const out = [];
  const dayCount = Math.ceil((to - from) / 86_400_000) + 1;
  for (let dayOffset = 0; dayOffset <= dayCount; dayOffset++) {
    const d = addDays(from, dayOffset);
    if (d > to) break;
    if (!runsOn(schedule, d, ex)) continue;
    for (const [hh, mm] of times) {
      const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);
      if (candidate > from && candidate <= to) out.push(candidate);
    }
  }
  return out;
}

// ---- cron expressions -------------------------------------------------------------------------------------
function parseCron(expr, currentDate) {
  return CronExpressionParser.parse(expr || '0 9 * * *', { currentDate });
}

// Occurrences of the expression on one calendar day.
function cronOnDay(expr, d) {
  const out = [];
  try {
    const it = parseCron(expr, new Date(endOfDay(d).getTime() + 1));
    for (let i = 0; i < 1500; i++) {
      const p = it.prev().toDate();
      if (p < day0(d)) break;
      out.push(p);
    }
  } catch {
    /* invalid expression */
  }
  return out.reverse();
}

// The times a "treat as <weekday>" day gets: the times the expression has on the nearest day with that weekday of the same week.
function mappedOnDay(expr, d, treatAs) {
  const model = addDays(d, treatAs - d.getDay());
  return cronOnDay(expr, model).map((m) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), m.getHours(), m.getMinutes(), m.getSeconds(), 0));
}

const hasRule = (ex, date) => !!ruleForDay(ex, date);

// Most recent occurrence at or before `now`.
export function cronPrev(expr, now, ex = []) {
  let best = null;
  try {
    const it = parseCron(expr, now);
    for (let i = 0; i < 500; i++) {
      const p = it.prev().toDate();
      if (p > now) continue;
      if (hasRule(ex, p)) continue;
      best = p;
      break;
    }
  } catch {
    return null;
  }
  for (const { day, treatAs } of treatDays(ex, addDays(now, -9), now)) {
    for (const t of mappedOnDay(expr, day, treatAs)) if (t <= now && (!best || t > best)) best = t;
  }
  return best;
}

// Up to `count` occurrences after `now`, ascending.
export function cronNext(expr, now, count, ex = []) {
  const out = [];
  try {
    const it = parseCron(expr, now);
    for (let i = 0; i < 500 && out.length < count; i++) {
      const p = it.next().toDate();
      if (!hasRule(ex, p)) out.push(p);
    }
  } catch {
    return out;
  }
  for (const { day, treatAs } of treatDays(ex, now, addDays(now, 366)).slice(0, 60)) {
    for (const t of mappedOnDay(expr, day, treatAs)) if (t > now) out.push(t);
  }
  return out.sort((a, b) => a - b).slice(0, count);
}

// Occurrences in (from, to], ascending.
export function cronBetween(expr, from, to, ex = []) {
  const out = [];
  try {
    const it = parseCron(expr, to);
    for (let i = 0; i < 3000; i++) {
      const p = it.prev().toDate();
      if (p <= from) break;
      if (p <= to && !hasRule(ex, p)) out.push(p);
    }
  } catch {
    /* invalid expression */
  }
  for (const { day, treatAs } of treatDays(ex, from, to)) {
    for (const t of mappedOnDay(expr, day, treatAs)) if (t > from && t <= to) out.push(t);
  }
  return out.sort((a, b) => a - b);
}

// ---- due checks --------------------------------------------------------------------------------------------
export function cronDue(schedule, now, ex = []) {
  const lastFired = schedule.lastFired ? new Date(schedule.lastFired) : null;
  const prev = schedule.cronMode !== 'advanced' ? mostRecentFriendlyOccurrence(schedule, now, ex) : cronPrev(schedule.expr, now, ex);
  return prev && prev <= now && (!lastFired || prev > lastFired) ? prev.toISOString() : null;
}

export function onceDue(schedule, now) {
  if (schedule.fired) return null;
  const when = new Date(schedule.datetime);
  return when <= now ? now.toISOString() : null;
}

const INTERVAL_UNIT_MS = { seconds: 1_000, minutes: 60_000, hours: 3_600_000, days: 86_400_000 };

// New tasks store everyValue+everyUnit (seconds/minutes/hours/days); older tasks only have everyMinutes.
export function intervalStepMs(schedule) {
  if (schedule.everyUnit && INTERVAL_UNIT_MS[schedule.everyUnit]) {
    return Math.max(1, Number(schedule.everyValue) || 1) * INTERVAL_UNIT_MS[schedule.everyUnit];
  }
  return Math.max(1, Number(schedule.everyMinutes) || 60) * 60_000;
}

export function intervalDue(schedule, now, ex = []) {
  if (schedule.untilAt && now > new Date(schedule.untilAt)) return null;
  if (isSkippedDay(ex, now)) return null;
  const everyMs = intervalStepMs(schedule);
  if (schedule.lastFired) {
    const last = new Date(schedule.lastFired);
    return now - last >= everyMs ? now.toISOString() : null;
  }
  if (schedule.startAt && now < new Date(schedule.startAt)) return null;
  return now.toISOString(); // first fire: immediately, or as soon as "a partire da" is reached
}

// ISO time of the occurrence that is due now, or null.
export function checkSchedule(schedule, now, ex = []) {
  if (schedule.enabled === false) return null;
  switch (schedule.type) {
    case 'cron':
      return cronDue(schedule, now, ex);
    case 'once':
      return onceDue(schedule, now);
    case 'interval':
      return intervalDue(schedule, now, ex);
    default:
      return null;
  }
}

// Occurrence that the exceptions kept from happening just now, or null: due without exceptions, not due with them.
// (A "treat as" day also lands here for the schedules of the weekday it does not follow.)
export function skippedByException(schedule, now, ex) {
  if (!ex?.length || schedule.type === 'once') return null;
  if (checkSchedule(schedule, now, ex)) return null;
  return checkSchedule(schedule, now, []);
}

// Up to maxCount future occurrences (ascending) of one schedule.
export function upcomingOccurrencesForSchedule(schedule, now, maxCount, ex = []) {
  if (schedule.enabled === false) return [];
  const out = [];
  if (schedule.type === 'cron') {
    if (schedule.cronMode !== 'advanced') {
      const days = friendlyDays(schedule);
      const times = friendlyTimes(schedule);
      const horizon = ex.length ? 120 : 8;
      for (let dayOffset = 0; dayOffset <= horizon && out.length < maxCount; dayOffset++) {
        const d = addDays(now, dayOffset);
        const wd = effectiveWeekday(ex, d);
        if (wd === null || !days.includes(wd)) continue;
        for (const [hh, mm] of times) {
          const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);
          if (candidate > now) {
            out.push(candidate);
            if (out.length >= maxCount) break;
          }
        }
      }
      return out;
    }
    return cronNext(schedule.expr, now, maxCount, ex);
  }
  if (schedule.type === 'once') {
    if (!schedule.fired) out.push(new Date(schedule.datetime));
    return out;
  }
  if (schedule.type === 'interval') {
    const everyMs = intervalStepMs(schedule);
    const until = schedule.untilAt ? new Date(schedule.untilAt) : null;
    let next;
    if (schedule.lastFired) next = new Date(new Date(schedule.lastFired).getTime() + everyMs);
    else if (schedule.startAt) {
      const start = new Date(schedule.startAt);
      next = start > now ? start : now;
    } else next = now;
    let guard = 0;
    while (out.length < maxCount && (!until || next <= until) && guard++ < 5000) {
      if (isSkippedDay(ex, next)) next = new Date(addDays(next, 1).setHours(0, 0, 0, 0)); // the day is skipped: resume at its end
      else {
        out.push(next);
        next = new Date(next.getTime() + everyMs);
      }
    }
    return out;
  }
  return out;
}

// The most recent occurrence (at or before "now") among the task's cron schedules. A manual "run now" uses it so that
// {date}/{time} placeholders point at the last edition instead of the click time.
export function lastScheduledOccurrence(task, now = new Date()) {
  const ex = task.exceptions || [];
  let best = null;
  for (const schedule of task.schedules || []) {
    if (schedule.enabled === false || schedule.type !== 'cron') continue;
    const when = schedule.cronMode !== 'advanced' ? mostRecentFriendlyOccurrence(schedule, now, ex) : cronPrev(schedule.expr, now, ex);
    if (when && when <= now && (!best || when > best.when)) best = { schedule, when };
  }
  return best;
}

// The last "count" occurrences (newest first, at or before "now") of the task's cron schedules within "days" days.
export function recentOccurrences(task, now = new Date(), count = 12, days = 3) {
  const ex = task.exceptions || [];
  const out = [];
  const from = new Date(now.getTime() - days * 86_400_000);
  for (const schedule of task.schedules || []) {
    if (schedule.enabled === false || schedule.type !== 'cron') continue;
    const list = schedule.cronMode !== 'advanced' ? friendlyOccurrencesBetween(schedule, from, now, ex) : cronBetween(schedule.expr, from, now, ex);
    for (const when of list) out.push({ schedule, when });
  }
  return out.sort((a, b) => b.when - a.when).slice(0, count);
}

export function nextRunForTask(task, now = new Date()) {
  const ex = task.exceptions || [];
  let best = null;
  for (const schedule of task.schedules || []) {
    const candidate = upcomingOccurrencesForSchedule(schedule, now, 1, ex)[0] || null;
    if (candidate && (!best || candidate < best)) best = candidate;
  }
  return best;
}
