import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

// One file per day under userData/logs, kept for LOG_RETENTION_DAYS then pruned —
// a durable trail for audit over long periods, separate from the in-app history
// (capped to the last 50 runs per task) and the console (cleared on restart).
const LOG_RETENTION_DAYS = 30;

function logDir() {
  const dir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function logFilePath(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return path.join(logDir(), `g-downloader-${y}-${m}-${d}.log`);
}

export function appendFileLog(entry) {
  const ts = entry.ts || new Date().toISOString();
  const level = (entry.level || 'info').toUpperCase();
  // one entry = one line, whatever a server put in its error text
  const message = String(entry.message ?? '').replace(/[\r\n]+/g, ' ⏎ ');
  const line = `[${ts}] [${level}] [${entry.taskId || '-'}] ${message}\n`;
  fs.appendFile(logFilePath(new Date(ts)), line, () => {});
}

export function pruneOldLogs(days = LOG_RETENTION_DAYS) {
  const dir = logDir();
  const cutoff = Date.now() - days * 86_400_000;
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    fs.stat(full, (err, stat) => {
      if (!err && stat.mtimeMs < cutoff) fs.unlink(full, () => {});
    });
  }
}

export function getLogDir() {
  return logDir();
}
