import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExceptions, ruleForDay, effectiveWeekday, addExceptionToTasks, dayKey, parseDay } from '../src/exceptions.js';
import { checkSchedule, skippedByException, upcomingOccurrencesForSchedule, mostRecentFriendlyOccurrence, friendlyOccurrencesBetween, cronDue, cronNext, cronPrev, lastScheduledOccurrence, recentOccurrences, nextRunForTask } from '../src/scheduling.js';

// 2026-12-23 is a Wednesday, 2026-12-25 a Friday, 2026-12-27 a Sunday
const at = (d, hh = 0, mm = 0) => new Date(`${d}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
const WD = { id: 'wd', type: 'cron', cronMode: 'friendly', days: [1, 2, 3, 4, 5], times: ['07:00'], lastFired: at('2026-12-01').toISOString() };
const weekdaySched = WD;

const WE = { id: 'we', type: 'cron', cronMode: 'friendly', days: [0, 6], times: ['08:30'], lastFired: at('2026-12-01').toISOString() };

test('exceptions are validated, sorted and capped', () => {
  const list = normalizeExceptions([
    { from: '2026-12-25', to: '2026-12-25', mode: 'skip' },
    { from: '2026-08-14', to: '2026-08-16', mode: 'skip', note: 'Ferragosto' },
    { from: '2026-13-01', mode: 'skip' }, // month 13
    { from: '2026-12-30', to: '2026-12-01', mode: 'skip' }, // reversed
    { from: '2026-12-24', mode: 'treat' }, // treat without a weekday
    { from: '2026-12-26', mode: 'treat', treatAs: 0 },
    'rubbish',
    null
  ]);
  assert.deepEqual(list.map((e) => [e.from, e.to, e.mode]), [['2026-08-14', '2026-08-16', 'skip'], ['2026-12-25', '2026-12-25', 'skip'], ['2026-12-26', '2026-12-26', 'treat']]);
  assert.equal(list[0].note, 'Ferragosto');
  assert.deepEqual(normalizeExceptions(undefined), []);
  assert.equal(parseDay('2026-02-30'), null);
});

test('a range includes both of its days; skip wins over treat when they overlap', () => {
  const ex = normalizeExceptions([{ from: '2026-12-24', to: '2026-12-26', mode: 'treat', treatAs: 0 }, { from: '2026-12-25', mode: 'skip' }]);
  assert.equal(ruleForDay(ex, at('2026-12-24', 10)).mode, 'treat');
  assert.equal(ruleForDay(ex, at('2026-12-25', 23, 59)).mode, 'skip');
  assert.equal(ruleForDay(ex, at('2026-12-26', 0, 1)).mode, 'treat');
  assert.equal(ruleForDay(ex, at('2026-12-27', 1)), null);
  assert.equal(effectiveWeekday(ex, at('2026-12-25', 8)), null);
  assert.equal(effectiveWeekday(ex, at('2026-12-24', 8)), 0);
  assert.equal(effectiveWeekday(ex, at('2026-12-28', 8)), 1);
});

test('a skipped day has no occurrences for the weekday schedule, the days around it are normal', () => {
  const ex = normalizeExceptions([{ from: '2026-12-25', mode: 'skip' }]);
  const days = friendlyOccurrencesBetween(weekdaySched, at('2026-12-23', 12), at('2026-12-29', 12), ex).map(dayKey);
  assert.deepEqual(days, ['2026-12-24', '2026-12-28', '2026-12-29']); // 25 skipped, 26/27 weekend
  const next = upcomingOccurrencesForSchedule(weekdaySched, at('2026-12-24', 8), 2, ex).map(dayKey);
  assert.deepEqual(next, ['2026-12-28', '2026-12-29']);
});

test('"treat as Sunday" on a Wednesday: the weekday schedule stays quiet and the weekend schedule runs', () => {
  const ex = normalizeExceptions([{ from: '2026-12-23', mode: 'treat', treatAs: 0 }]);
  const weekdaySched = { ...WD, lastFired: at('2026-12-22', 7).toISOString() }; // Tuesday's run already happened
  const weekendSched = { ...WE, lastFired: at('2026-12-20', 8, 30).toISOString() }; // so did last Sunday's
  const wed7 = at('2026-12-23', 7, 1);
  assert.equal(checkSchedule(weekdaySched, wed7, ex), null);
  assert.equal(checkSchedule(weekendSched, at('2026-12-23', 8, 31), ex), at('2026-12-23', 8, 30).toISOString());
  // without the exception it is the other way round
  assert.equal(checkSchedule(weekdaySched, wed7, []), at('2026-12-23', 7).toISOString());
  assert.equal(checkSchedule(weekendSched, at('2026-12-23', 8, 31), []), null);
  // what the exception took away is reported as such (for the history note), the other schedule is not
  assert.equal(skippedByException(weekdaySched, wed7, ex), at('2026-12-23', 7).toISOString());
  assert.equal(skippedByException(weekendSched, at('2026-12-23', 8, 31), ex), null);
});

test('the occurrence an exception took away is not caught up afterwards', () => {
  const ex = normalizeExceptions([{ from: '2026-12-25', mode: 'skip' }]);
  const s = { ...weekdaySched, lastFired: at('2026-12-24', 7).toISOString() };
  const kept = skippedByException(s, at('2026-12-25', 7, 1), ex);
  assert.equal(kept, at('2026-12-25', 7).toISOString());
  s.lastFired = kept; // what the scheduler does
  assert.equal(checkSchedule(s, at('2026-12-25', 18), ex), null);
  assert.equal(checkSchedule(s, at('2026-12-26', 12), ex), null); // Saturday: not a weekday-schedule day
  assert.equal(checkSchedule(s, at('2026-12-28', 7, 5), ex), at('2026-12-28', 7).toISOString());
});

test('a long holiday does not hide the occurrence before it', () => {
  const ex = normalizeExceptions([{ from: '2026-12-21', to: '2027-01-10', mode: 'skip' }]);
  assert.equal(mostRecentFriendlyOccurrence(weekdaySched, at('2026-12-30', 12), ex)?.toISOString(), at('2026-12-18', 7).toISOString());
  const next = upcomingOccurrencesForSchedule(weekdaySched, at('2026-12-22', 12), 1, ex).map(dayKey);
  assert.deepEqual(next, ['2027-01-11']);
});

test('advanced cron: skip removes the day, treat gives the times of the other weekday', () => {
  const expr = '0 7 * * 1-5'; // weekdays 07:00
  const exSkip = normalizeExceptions([{ from: '2026-12-23', mode: 'skip' }]);
  assert.equal(cronPrev(expr, at('2026-12-23', 12), exSkip).toISOString(), at('2026-12-22', 7).toISOString());
  assert.deepEqual(cronNext(expr, at('2026-12-22', 12), 2, exSkip).map(dayKey), ['2026-12-24', '2026-12-25']);

  // Saturday 09:15 is a weekend time of the expression; treating Wednesday as Saturday gives Wednesday 09:15 and no 07:00
  const expr2 = '0 7 * * 1-5;15 9 * * 6'.split(';');
  assert.ok(expr2.length === 2);
  const exTreat = normalizeExceptions([{ from: '2026-12-23', mode: 'treat', treatAs: 6 }]);
  const sat = '15 9 * * 6';
  // an expression that only runs on Saturdays: on the treated Wednesday it runs at 09:15
  assert.equal(cronPrev(sat, at('2026-12-23', 10), exTreat).toISOString(), at('2026-12-23', 9, 15).toISOString());
  assert.equal(cronPrev(expr, at('2026-12-23', 12), exTreat).toISOString(), at('2026-12-22', 7).toISOString()); // no 07:00 on Wednesday: Saturday has no run of this expression
  const due = cronDue({ type: 'cron', cronMode: 'advanced', expr: sat, lastFired: at('2026-12-22').toISOString() }, at('2026-12-23', 10), exTreat);
  assert.equal(due, at('2026-12-23', 9, 15).toISOString());
});

test('every-N-minutes schedules stop on a skipped day and are not moved by "treat as"', () => {
  const iv = { id: 'i', type: 'interval', everyUnit: 'minutes', everyValue: 15, lastFired: at('2026-12-25', 9).toISOString() };
  const skip = normalizeExceptions([{ from: '2026-12-25', mode: 'skip' }]);
  assert.equal(checkSchedule(iv, at('2026-12-25', 10), skip), null);
  assert.ok(checkSchedule(iv, at('2026-12-26', 0, 1), skip));
  const treat = normalizeExceptions([{ from: '2026-12-25', mode: 'treat', treatAs: 0 }]);
  assert.ok(checkSchedule(iv, at('2026-12-25', 10), treat));
  const up = upcomingOccurrencesForSchedule({ ...iv, lastFired: at('2026-12-25', 23, 50).toISOString() }, at('2026-12-25', 23, 55), 2, skip);
  assert.ok(up.every((d) => dayKey(d) !== '2026-12-25'));
});

test('one-off schedules are not touched by exceptions', () => {
  const once = { id: 'o', type: 'once', datetime: at('2026-12-25', 6).toISOString(), fired: false };
  const skip = normalizeExceptions([{ from: '2026-12-25', mode: 'skip' }]);
  assert.ok(checkSchedule(once, at('2026-12-25', 6, 1), skip));
  assert.equal(skippedByException(once, at('2026-12-25', 6, 1), skip), null);
});

test('last scheduled occurrence, recent occurrences and next run follow the exceptions of the task', () => {
  const task = { schedules: [weekdaySched], exceptions: normalizeExceptions([{ from: '2026-12-24', mode: 'skip' }]) };
  assert.equal(lastScheduledOccurrence(task, at('2026-12-24', 12)).when.toISOString(), at('2026-12-23', 7).toISOString());
  assert.deepEqual(recentOccurrences(task, at('2026-12-28', 12), 12, 6).map((o) => dayKey(o.when)), ['2026-12-28', '2026-12-25', '2026-12-23']);
  assert.equal(dayKey(nextRunForTask(task, at('2026-12-23', 12))), '2026-12-25');
});

test('one exception can be added to several tasks at once; the others stay as they are', () => {
  const tasks = [{ id: 'a', exceptions: [] }, { id: 'b' }, { id: 'c', exceptions: [{ id: 'x', from: '2026-08-15', mode: 'skip' }] }];
  const r = addExceptionToTasks(tasks, ['a', 'c'], { from: '2026-12-25', to: '2026-12-26', mode: 'skip', note: 'Natale' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.changed.map((t) => t.id), ['a', 'c']);
  assert.equal(r.changed[1].exceptions.length, 2);
  assert.equal(r.changed[0].exceptions[0].note, 'Natale');
  assert.equal(addExceptionToTasks(tasks, ['a'], { from: 'nope' }).ok, false);
});
