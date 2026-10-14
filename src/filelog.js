import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { createLogger } from './logs.js';

// Log files: one per day under userData/logs, 5 MB at most each, the last 7 days kept (src/logs.js, apps/COMMON-FEATURES.md 5.4).
// Separate from the in-app history (capped to the last 50 runs per task) and from the console (cleared on restart).
const RETENTION_DAYS = 7;
let logger = null;
let lastError = null;

export function getLogDir() {
  const dir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function get() {
  return (logger ||= createLogger({ dir: getLogDir(), prefix: 'g-downloader', retentionDays: RETENTION_DAYS }));
}

// Credentials written inside an address (ftp://user:password@host/…) never reach a log line.
export const redactUrls = (text) => String(text ?? '').replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/?#@]*@/gi, '$1***@');

export function appendFileLog(entry) {
  const level = String(entry.level || 'info').toLowerCase();
  // one entry = one line, whatever a server put in its error text
  const message = redactUrls(String(entry.message ?? '').replace(/[\r\n]+/g, ' ⏎ '));
  const scope = entry.taskId && entry.taskId !== '-' ? String(entry.taskId) : '';
  if (level === 'error') lastError = { t: Date.now(), message };
  get().log(level, message, scope);
}

export const getLastError = () => lastError;

export function pruneOldLogs() {
  get().prune();
  // files of versions before 26.10.2 (g-downloader-YYYY-MM-DD.log)
  const dir = getLogDir();
  const cutoff = Date.now() - RETENTION_DAYS * 86_400_000;
  try {
    for (const name of fs.readdirSync(dir)) {
      if (!/^g-downloader-\d{4}-\d{2}-\d{2}\.log$/.test(name)) continue;
      const full = path.join(dir, name);
      if (fs.statSync(full).mtimeMs < cutoff) fs.rmSync(full, { force: true });
    }
  } catch {
    /* nothing to clean */
  }
}

export const flushLogs = () => (logger ? logger.flush() : Promise.resolve());
