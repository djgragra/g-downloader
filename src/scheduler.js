import { getTasks, saveTask, getSettings, getLastReportSentAt, setLastReportSentAt, appendSkipped } from './store.js';
import { runTask, isTaskRunning } from './downloader.js';
import { notifier } from './services.js';
import { M, dateLocale } from './i18n.js';
import { dayKey, ruleForDay } from './exceptions.js';
import { checkSchedule, skippedByException, friendlyOccurrencesBetween, upcomingOccurrencesForSchedule } from './scheduling.js';

export { upcomingOccurrencesForSchedule, lastScheduledOccurrence, recentOccurrences, nextRunForTask } from './scheduling.js';

const TICK_MS = 20_000; // check every 20s, fine-grained enough for minute-level cron/once schedules
let timer = null;
let onLog = () => {};

// Watchdog: called once at app startup, before the first scheduler tick runs its catch-up fire, so it sees schedules as
// they were left (lastFired not yet bumped). Only friendly-cron schedules are checked — that's the case with several
// times a day where "the app was closed" silently swallows all but the very last one.
export function findMissedOccurrences(tasks, now) {
  const missed = [];
  for (const task of tasks) {
    if (!task.enabled) continue;
    for (const schedule of task.schedules || []) {
      if (schedule.enabled === false) continue;
      if (schedule.type !== 'cron' || schedule.cronMode === 'advanced' || !schedule.lastFired) continue;
      const occurrences = friendlyOccurrencesBetween(schedule, new Date(schedule.lastFired), now, task.exceptions || []);
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

// One note per task and day for the occurrences an exception kept from happening (not a failure: no alert).
const skipNoted = new Set();
function noteSkipped(task, now, schedule) {
  const key = `${task.id}:${dayKey(now)}`;
  if (skipNoted.has(key)) return;
  skipNoted.add(key);
  if (skipNoted.size > 2000) skipNoted.clear();
  const rule = ruleForDay(task.exceptions, now);
  const text = rule?.mode === 'treat'
    ? M('Giorno trattato come {weekday}: la pianificazione "{name}" non gira oggi (eccezione di calendario).', { weekday: new Date(2024, 0, 7 + rule.treatAs).toLocaleDateString(dateLocale(), { weekday: 'long' }), name: schedule.label || schedule.type })
    : M('Download saltato: oggi c\'è un\'eccezione di calendario{note}.', { note: rule?.note ? ` (${rule.note})` : '' });
  appendSkipped(task.id, { finishedAt: now.toISOString(), note: text });
  onLog(task.id, text);
}

async function tick() {
  const now = new Date();
  const tasks = getTasks();
  for (const task of tasks) {
    if (!task.enabled) continue;
    const ex = task.exceptions || [];
    let dueSchedule = null;
    let dueFiredAt = null;
    let changed = false;
    const kept = [];
    for (const schedule of task.schedules || []) {
      const firedAt = checkSchedule(schedule, now, ex);
      if (firedAt) {
        schedule.lastFired = firedAt;
        if (schedule.type === 'once') schedule.fired = true;
        dueSchedule = schedule;
        dueFiredAt = firedAt;
        continue;
      }
      const skippedAt = skippedByException(schedule, now, ex);
      if (skippedAt) {
        // the occurrence belongs to a day with an exception: it is not caught up later
        schedule.lastFired = skippedAt;
        changed = true;
        kept.push(schedule);
      }
    }
    if (dueSchedule && isTaskRunning(task.id)) {
      saveTask(task);
      onLog(task.id, M("Pianificazione \"{name}\" saltata: il download precedente è ancora in corso.", { name: dueSchedule.label || dueSchedule.type }), 'warn');
    } else if (dueSchedule) {
      saveTask(task); // persist lastFired/fired before running to avoid double-fire on overlap
      onLog(task.id, M("Pianificazione \"{name}\" attivata, avvio download...", { name: dueSchedule.label || dueSchedule.type }));
      runTask(task.id, { schedule: dueSchedule, scheduledAt: dueFiredAt, fromScheduler: true }).catch((err) => {
        onLog(task.id, M("Errore imprevisto scheduler: {message}", { message: err.message }), 'error');
      });
    } else if (changed) {
      saveTask(task);
    }
    // after the task is saved: the note goes in its history, and the save above must not overwrite it
    for (const schedule of kept) noteSkipped(task, now, schedule);
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
    const sent = await notifier.report(tasks, settings.reportFrequency, dateLocale());
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

// Flat, time-sorted list of upcoming fires across every enabled task/schedule, for the
// sidebar "coda" (queue) view and the "prossimo download" countdown widget.
export function computeQueue(tasks, limit = 20) {
  const now = new Date();
  const items = [];
  for (const task of tasks) {
    if (!task.enabled) continue;
    for (const schedule of task.schedules || []) {
      for (const time of upcomingOccurrencesForSchedule(schedule, now, limit, task.exceptions || [])) {
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
