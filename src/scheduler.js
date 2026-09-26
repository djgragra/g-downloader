import { CronExpressionParser } from 'cron-parser';
import { getTasks, saveTask, getSettings, getLastReportSentAt, setLastReportSentAt } from './store.js';
import { runTask, isTaskRunning } from './downloader.js';
import { sendReport } from './notifications.js';
import { M } from './i18n.js';

const TICK_MS = 20_000; // check every 20s, fine-grained enough for minute-level cron/once schedules
let timer = null;
let onLog = () => {};

function friendlyDays(schedule) {
  return Array.isArray(schedule.days) && schedule.days.length ? schedule.days : [0, 1, 2, 3, 4, 5, 6];
}

// Friendly mode allows several times of day on the same set of weekdays (e.g. an
// hourly news bulletin at irregular times) instead of a single time. Falls back to
// the old single `time` field for schedules saved before this existed.
function friendlyTimes(schedule) {
  const raw = Array.isArray(schedule.times) && schedule.times.length ? schedule.times : [schedule.time || '09:00'];
  return raw
    .map((t) => String(t || '09:00').split(':').map((n) => parseInt(n, 10) || 0))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

function mostRecentFriendlyOccurrence(schedule, now) {
  const days = friendlyDays(schedule);
  const times = friendlyTimes(schedule);
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
    if (!days.includes(d.getDay())) continue;
    for (let i = times.length - 1; i >= 0; i--) {
      const [hh, mm] = times[i];
      const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);
      if (candidate <= now) return candidate;
    }
  }
  return null;
}

function nextFriendlyOccurrence(schedule, now) {
  const days = friendlyDays(schedule);
  const times = friendlyTimes(schedule);
  for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
    if (!days.includes(d.getDay())) continue;
    for (const [hh, mm] of times) {
      const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);
      if (candidate > now) return candidate;
    }
  }
  return null;
}

// All friendly-cron occurrences strictly after `from` and up to `to` (inclusive).
function friendlyOccurrencesBetween(schedule, from, to) {
  const days = friendlyDays(schedule);
  const times = friendlyTimes(schedule);
  const out = [];
  const dayCount = Math.ceil((to - from) / 86_400_000) + 1;
  for (let dayOffset = 0; dayOffset <= dayCount; dayOffset++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + dayOffset);
    if (d > to) break;
    if (!days.includes(d.getDay())) continue;
    for (const [hh, mm] of times) {
      const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);
      if (candidate > from && candidate <= to) out.push(candidate);
    }
  }
  return out;
}

// Watchdog: called once at app startup, before the first scheduler tick runs its
// catch-up fire, so it sees schedules as they were left (lastFired not yet bumped).
// Only friendly-cron schedules are checked — that's the case with several times a
// day where "the app was closed" silently swallows all but the very last one.
export function findMissedOccurrences(tasks, now) {
  const missed = [];
  for (const task of tasks) {
    if (!task.enabled) continue;
    for (const schedule of task.schedules || []) {
      if (schedule.enabled === false) continue;
      if (schedule.type !== 'cron' || schedule.cronMode === 'advanced' || !schedule.lastFired) continue;
      const occurrences = friendlyOccurrencesBetween(schedule, new Date(schedule.lastFired), now);
      if (occurrences.length > 1) {
        missed.push({
          taskId: task.id,
          taskName: task.name,
          scheduleLabel: schedule.label || M('Pianificazione'),
          count: occurrences.length - 1 // the most recent one still fires normally via catch-up
        });
      }
    }
  }
  return missed;
}

function cronDue(schedule, now) {
  const lastFired = schedule.lastFired ? new Date(schedule.lastFired) : null;
  if (schedule.cronMode !== 'advanced') {
    const prev = mostRecentFriendlyOccurrence(schedule, now);
    if (prev && (!lastFired || prev > lastFired)) return prev.toISOString();
    return null;
  }
  try {
    const expr = schedule.expr || '0 9 * * *';
    const interval = CronExpressionParser.parse(expr, { currentDate: now });
    const prev = interval.prev().toDate();
    if (prev <= now && (!lastFired || prev > lastFired)) {
      return prev.toISOString();
    }
  } catch {
    // invalid expression, ignore
  }
  return null;
}

function onceDue(schedule, now) {
  if (schedule.fired) return null;
  const when = new Date(schedule.datetime);
  if (when <= now) return now.toISOString();
  return null;
}

const INTERVAL_UNIT_MS = { seconds: 1_000, minutes: 60_000, hours: 3_600_000, days: 86_400_000 };

// New tasks store everyValue+everyUnit (secondi/minuti/ore/giorni); older tasks
// only have everyMinutes, kept as a fallback for backward compatibility.
function intervalStepMs(schedule) {
  if (schedule.everyUnit && INTERVAL_UNIT_MS[schedule.everyUnit]) {
    return Math.max(1, Number(schedule.everyValue) || 1) * INTERVAL_UNIT_MS[schedule.everyUnit];
  }
  return Math.max(1, Number(schedule.everyMinutes) || 60) * 60_000;
}

function intervalDue(schedule, now) {
  if (schedule.untilAt && now > new Date(schedule.untilAt)) return null;
  const everyMs = intervalStepMs(schedule);
  if (schedule.lastFired) {
    const last = new Date(schedule.lastFired);
    return now - last >= everyMs ? now.toISOString() : null;
  }
  if (schedule.startAt) {
    const start = new Date(schedule.startAt);
    if (now < start) return null;
  }
  return now.toISOString(); // first fire: immediately, or as soon as "a partire da" is reached
}

function checkSchedule(schedule, now) {
  if (schedule.enabled === false) return null;
  switch (schedule.type) {
    case 'cron':
      return cronDue(schedule, now);
    case 'once':
      return onceDue(schedule, now);
    case 'interval':
      return intervalDue(schedule, now);
    default:
      return null;
  }
}

async function tick() {
  const now = new Date();
  const tasks = getTasks();
  for (const task of tasks) {
    if (!task.enabled) continue;
    let dueSchedule = null;
    let dueFiredAt = null;
    for (const schedule of task.schedules || []) {
      const firedAt = checkSchedule(schedule, now);
      if (firedAt) {
        schedule.lastFired = firedAt;
        if (schedule.type === 'once') schedule.fired = true;
        dueSchedule = schedule;
        dueFiredAt = firedAt;
      }
    }
    if (dueSchedule && isTaskRunning(task.id)) {
      saveTask(task);
      onLog(task.id, M("Pianificazione \"{name}\" saltata: il download precedente è ancora in corso.", { name: dueSchedule.label || dueSchedule.type }), 'warn');
    } else if (dueSchedule) {
      saveTask(task); // persist lastFired/fired before running to avoid double-fire on overlap
      onLog(task.id, M("Pianificazione \"{name}\" attivata, avvio download...", { name: dueSchedule.label || dueSchedule.type }));
      runTask(task.id, { schedule: dueSchedule, scheduledAt: dueFiredAt }).catch((err) => {
        onLog(task.id, M("Errore imprevisto scheduler: {message}", { message: err.message }), 'error');
      });
    }
  }
  await checkReportDue(now, tasks);
}

// Sends the daily/weekly summary email once per period, at the configured hour.
// Gated on the current hour (checked every tick) plus a minimum gap since the last
// send, so a tick landing anywhere within that hour triggers exactly one send.
async function checkReportDue(now, tasks) {
  const settings = getSettings();
  if (!settings.reportFrequency || settings.reportFrequency === 'off') return;
  if (now.getHours() !== (Number(settings.reportHour) ?? 7)) return;
  if (settings.reportFrequency === 'weekly' && now.getDay() !== 1) return; // Monday
  const last = getLastReportSentAt();
  const minGapMs = settings.reportFrequency === 'weekly' ? 6 * 86_400_000 : 20 * 3_600_000;
  if (last && now - new Date(last) < minGapMs) return;
  try {
    const sent = await sendReport(settings, tasks, settings.reportFrequency);
    if (sent) {
      setLastReportSentAt(now.toISOString());
      onLog('SISTEMA', M(settings.reportFrequency === 'weekly' ? 'Report settimanale inviato via email.' : 'Report giornaliero inviato via email.'));
    }
  } catch (err) {
    onLog('SISTEMA', M("Invio report non riuscito: {message}", { message: err.message }), 'error');
  }
}

export function startScheduler(logCallback) {
  if (logCallback) onLog = logCallback;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    tick().catch((err) => console.error('Scheduler tick error:', err));
  }, TICK_MS);
  tick().catch((err) => console.error('Scheduler tick error:', err));
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

function nextOccurrenceForSchedule(schedule, now) {
  return upcomingOccurrencesForSchedule(schedule, now, 1)[0] || null;
}

// Returns up to maxCount future occurrences (ascending) for a single schedule. A
// friendly/advanced-cron or interval schedule can fire many times a day (e.g. an
// hourly bulletin), so the "coda" queue needs the real list of upcoming times, not
// just the very next one — otherwise most of today's remaining downloads are invisible.
export function upcomingOccurrencesForSchedule(schedule, now, maxCount) {
  if (schedule.enabled === false) return [];
  const out = [];
  if (schedule.type === 'cron') {
    if (schedule.cronMode !== 'advanced') {
      const days = friendlyDays(schedule);
      const times = friendlyTimes(schedule);
      for (let dayOffset = 0; dayOffset <= 8 && out.length < maxCount; dayOffset++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
        if (!days.includes(d.getDay())) continue;
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
    try {
      const expr = schedule.expr || '0 9 * * *';
      const interval = CronExpressionParser.parse(expr, { currentDate: now });
      for (let i = 0; i < maxCount; i++) out.push(interval.next().toDate());
    } catch {
      // invalid expression, ignore
    }
    return out;
  }
  if (schedule.type === 'once') {
    if (!schedule.fired) out.push(new Date(schedule.datetime));
    return out;
  }
  if (schedule.type === 'interval') {
    const everyMs = intervalStepMs(schedule);
    const until = schedule.untilAt ? new Date(schedule.untilAt) : null;
    let next;
    if (schedule.lastFired) {
      next = new Date(new Date(schedule.lastFired).getTime() + everyMs);
    } else if (schedule.startAt) {
      const start = new Date(schedule.startAt);
      next = start > now ? start : now;
    } else {
      next = now;
    }
    while (out.length < maxCount && (!until || next <= until)) {
      out.push(next);
      next = new Date(next.getTime() + everyMs);
    }
    return out;
  }
  return out;
}

// Computes the next occurrence (Date) across all schedules of a task, for UI display.
// The most recent occurrence (at or before "now") among the task's cron schedules.
// A manual "run now" uses it so that {date}/{time} placeholders point at the last
// edition, e.g. "edizione1030" run at 10:34, instead of a file named after the click time.
export function lastScheduledOccurrence(task, now = new Date()) {
  let best = null;
  for (const schedule of task.schedules || []) {
    if (schedule.enabled === false || schedule.type !== 'cron') continue;
    let when = null;
    if (schedule.cronMode !== 'advanced') {
      when = mostRecentFriendlyOccurrence(schedule, now);
    } else {
      try {
        when = CronExpressionParser.parse(schedule.expr || '0 9 * * *', { currentDate: now }).prev().toDate();
      } catch {
        // invalid expression: ignore
      }
    }
    if (when && when <= now && (!best || when > best.when)) best = { schedule, when };
  }
  return best;
}

// The last "count" occurrences (newest first, at or before "now") of the task's cron
// schedules, within "days" days. Used to re-run a specific past edition by hand.
export function recentOccurrences(task, now = new Date(), count = 12, days = 3) {
  const out = [];
  const from = new Date(now.getTime() - days * 86_400_000);
  for (const schedule of task.schedules || []) {
    if (schedule.enabled === false || schedule.type !== 'cron') continue;
    if (schedule.cronMode !== 'advanced') {
      for (const when of friendlyOccurrencesBetween(schedule, from, now)) out.push({ schedule, when });
    } else {
      try {
        const it = CronExpressionParser.parse(schedule.expr || '0 9 * * *', { currentDate: now });
        for (let i = 0; i < count; i++) {
          const when = it.prev().toDate();
          if (when < from) break;
          out.push({ schedule, when });
        }
      } catch {
        // invalid expression: ignore
      }
    }
  }
  return out.sort((a, b) => b.when - a.when).slice(0, count);
}

export function nextRunForTask(task) {
  const now = new Date();
  let best = null;
  for (const schedule of task.schedules || []) {
    const candidate = nextOccurrenceForSchedule(schedule, now);
    if (candidate && (!best || candidate < best)) best = candidate;
  }
  return best;
}

// Flat, time-sorted list of upcoming fires across every enabled task/schedule, for the
// sidebar "coda" (queue) view and the "prossimo download" countdown widget.
export function computeQueue(tasks, limit = 20) {
  const now = new Date();
  const items = [];
  for (const task of tasks) {
    if (!task.enabled) continue;
    for (const schedule of task.schedules || []) {
      for (const time of upcomingOccurrencesForSchedule(schedule, now, limit)) {
        if (time > now) {
          items.push({
            taskId: task.id,
            taskName: task.name,
            scheduleLabel: schedule.label || scheduleTypeLabel(schedule),
            time: time.toISOString()
          });
        }
      }
    }
  }
  items.sort((a, b) => new Date(a.time) - new Date(b.time));
  return items.slice(0, limit);
}

const intervalUnitLabel = (u) => ({ seconds: M('sec'), minutes: M('min'), hours: M('ore'), days: M('giorni') })[u] || u;

function scheduleTypeLabel(schedule) {
  if (schedule.type === 'cron') return M('Pianificazione ricorrente');
  if (schedule.type === 'once') return M('Una tantum');
  if (schedule.type === 'interval') {
    if (schedule.everyUnit) return M('Ogni {n} {u}', { n: schedule.everyValue || 1, u: intervalUnitLabel(schedule.everyUnit) });
    return M('Ogni {n} min', { n: schedule.everyMinutes || 60 });
  }
  return schedule.type;
}
