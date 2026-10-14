// Waiting for a file that is published late. A task can ask to keep trying every few minutes for a while (for example
// 20 minutes from the scheduled time) instead of failing at the first "not found". Each attempt is also checked: a file
// that is too small, or a web page where a file was expected (an error page saved under the name of the file), counts as
// "not published yet". Pure and Electron-free: the clock and the pauses are injected, so it can be tested.
const WEB_EXT = /\.(html?|xhtml|php|asp|aspx)$/i;

export const DEFAULT_WAIT = { enabled: false, everyMinutes: 1, maxMinutes: 20, minSizeKB: 0, rejectWebPage: true, stableSeconds: 5 };

const clamp = (v, d, lo, hi) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

// The window of a task, in milliseconds. `globalMinKB` is the "file too small" threshold of Settings (used when the task has none).
export function waitWindowOf(task, globalMinKB = 0) {
  const w = { ...DEFAULT_WAIT, ...(task?.waitWindow || {}) };
  return {
    enabled: w.enabled === true,
    everyMs: Math.round(clamp(w.everyMinutes, 1, 0.1, 1440) * 60_000),
    maxMs: Math.round(clamp(w.maxMinutes, 20, 1, 24 * 60) * 60_000),
    minBytes: Math.round(clamp(w.minSizeKB || globalMinKB, 0, 0, 10_000_000) * 1024),
    rejectWebPage: w.rejectWebPage !== false,
    stableMs: Math.round(clamp(w.stableSeconds, 5, 0, 300) * 1000)
  };
}

// null when the file looks right, else a short code: 'too-small' | 'web-page'.
export function checkArrived({ bytes, contentType = '', fileName = '', minBytes = 0, rejectWebPage = false }) {
  if (minBytes > 0 && bytes < minBytes) return 'too-small';
  if (bytes === 0) return 'too-small';
  if (rejectWebPage && /text\/html|application\/xhtml/i.test(contentType) && !WEB_EXT.test(fileName)) return 'web-page';
  return null;
}

// A wrong user name or password will not fix itself: no point in waiting.
export const isFatalError = (err) => /^HTTP 401\b/.test(String(err?.message)) || err?.code === 530;

export class WaitExpired extends Error {
  constructor(cause, attempts, elapsedMs) {
    super(cause?.message || 'wait expired');
    this.name = 'WaitExpired';
    this.cause = cause;
    this.attempts = attempts;
    this.elapsedMs = elapsedMs;
  }
}

// attempt(n) is tried until it works or the window is over. onWait(n, err, nextInMs, leftMs) is called before each pause.
// Throws the fatal error as it is, or WaitExpired (with the last error) when the time is up.
export async function retryWithin({ attempt, everyMs, maxMs, isFatal = isFatalError, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now, onWait = () => {}, shouldStop = () => false }) {
  const start = now();
  for (let n = 1; ; n++) {
    try {
      return await attempt(n);
    } catch (err) {
      if (isFatal(err)) throw err;
      const elapsed = now() - start;
      if (shouldStop() || elapsed + everyMs > maxMs) throw new WaitExpired(err, n, elapsed);
      onWait(n, err, everyMs, maxMs - elapsed);
      await sleep(everyMs);
    }
  }
}

// A file that is still being written (a network folder) keeps changing size: wait until two readings, `stableMs` apart,
// give the same size. -> { size } or throws Error('still-growing') after `maxChecks` readings.
export async function waitStable({ sizeOf, stableMs, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), maxChecks = 12 }) {
  let last = await sizeOf();
  if (!stableMs) return { size: last };
  for (let i = 0; i < maxChecks; i++) {
    await sleep(stableMs);
    const now = await sizeOf();
    if (now === last) return { size: now };
    last = now;
  }
  throw new Error('still-growing');
}
