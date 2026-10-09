import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { Client as FtpClient } from 'basic-ftp';
import { dialog, Notification, BrowserWindow, shell } from 'electron';
import { resolveTemplate, filenameFromUrl, cleanPath } from './templates.js';
import { getTask, saveTask, getSettings, bumpSeq, appendHistory } from './store.js';
import { runPostActions, previewAction } from './actions.js';
import { notifyFailure, notifyAlert } from './notifications.js';
import { httpFetch } from './httpfetch.js';
import { M } from './i18n.js';

export const events = new EventEmitter();

function log(taskId, message, level = 'info') {
  const entry = { taskId, message, level, ts: new Date().toISOString() };
  events.emit('log', entry);
}

// A name taken from a remote server is untrusted: no path parts, no characters that are
// invalid on Windows or meaningful to a shell (it may be pasted into a command via {filename}).
function safeFileName(name) {
  const cleaned = String(name || '')
    .replace(/[\\/:*?"<>|&^%!;$`'\x00-\x1f]/g, '_')
    .replace(/^[.\s]+|[.\s]+$/g, '');
  return cleaned || 'download';
}

function focusedWindow() {
  return BrowserWindow.getAllWindows()[0] || null;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildHeaders(http) {
  const headers = { ...(http.headers || {}) };
  if (http.auth?.enabled && http.auth.username) {
    const token = Buffer.from(`${http.auth.username}:${http.auth.password || ''}`).toString('base64');
    headers.Authorization = `Basic ${token}`;
  }
  if (http.method === 'POST' && http.resolvedBody) {
    const hasContentType = Object.keys(headers).some((k) => k.toLowerCase() === 'content-type');
    if (!hasContentType) headers['Content-Type'] = http.bodyType === 'text' ? 'text/plain' : 'application/json';
  }
  return headers;
}

// Node's fetch reports every network failure as a bare "fetch failed"; the real reason
// (DNS, refused connection, certificate, timeout...) is in err.cause.
function explainNetworkError(err) {
  const c = err?.cause?.errors?.[0] ?? err?.cause; // AggregateError when several addresses were tried
  if (!c) return err;
  const parts = [c.code, c.message && c.message !== err.message ? c.message : null, c.hostname ? `host ${c.hostname}` : null, c.address ? `${c.address}:${c.port}` : null];
  const detail = parts.filter(Boolean).join(' – ');
  return detail ? new Error(`${err.message} (${detail})`, { cause: c }) : err;
}

async function downloadToFile(url, tempPath, http, onProgress) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), http.timeoutMs || 30000);
  try {
    const res = await httpFetch(url, {
      method: http.method || 'GET',
      headers: buildHeaders(http),
      body: http.method === 'POST' && http.resolvedBody ? http.resolvedBody : undefined,
      signal: controller.signal
    }).catch((err) => {
      throw explainNetworkError(err);
    });
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const total = Number(res.headers.get('content-length')) || 0;
    let received = 0;
    const nodeStream = Readable.fromWeb(res.body);
    nodeStream.on('data', (chunk) => {
      received += chunk.length;
      if (onProgress) onProgress(received, total);
    });
    await pipeline(nodeStream, fs.createWriteStream(tempPath));
    return { bytes: received };
  } finally {
    clearTimeout(timeout);
  }
}

// Node's built-in fetch (undici) only speaks http(s) — radio stations commonly drop
// newscasts on an FTP server, so ftp:// / ftps:// URLs need a dedicated client instead
// of failing with a generic "fetch failed".
async function ftpDownloadToFile(url, tempPath, http, onProgress) {
  const parsed = new URL(url);
  const client = new FtpClient(http.timeoutMs || 30000);
  try {
    await client.access({
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : undefined,
      user: http.auth?.enabled && http.auth.username ? http.auth.username : 'anonymous',
      password: http.auth?.enabled ? http.auth.password || '' : 'anonymous@',
      secure: parsed.protocol === 'ftps:'
    });
    // RFC 1738: ftp://host/dir/file is relative to the login directory, ftp://host//abs/file
    // is absolute. Try the relative path first (what FileZilla/curl do); if the server answers
    // 550 and the path differs, also try it from the root before giving up.
    const decoded = decodeURIComponent(parsed.pathname);
    const relativePath = decoded.startsWith('//') ? decoded.slice(1) : decoded.replace(/^\//, '');
    const candidates = [relativePath];
    if (!relativePath.startsWith('/')) candidates.push('/' + relativePath);
    let lastError = null;
    for (const remotePath of candidates) {
      try {
        const total = await client.size(remotePath).catch(() => 0);
        if (onProgress) client.trackProgress((info) => onProgress(info.bytesOverall, total));
        await client.downloadTo(tempPath, remotePath);
        const stat = await fsp.stat(tempPath);
        return { bytes: stat.size };
      } catch (err) {
        lastError = err;
        if (err.code !== 550) throw err;
      }
    }
    // Every candidate gave 550: say where we looked and what the server does show, so the
    // cause (file not published yet vs wrong folder/name) is visible in the log.
    let where = '';
    try {
      const cwd = await client.pwd();
      const names = (await client.list()).slice(0, 12).map((f) => f.name);
      where = M(' — cartella di accesso "{cwd}", file presenti: {names}', { cwd, names: names.length ? names.join(', ') : M('(nessuno)') });
    } catch {
      // listing not allowed: keep the short message
    }
    throw new Error(M('FTP 550 file non trovato o non accessibile: "{files}"{where}', { files: candidates.join('" ' + M('e') + ' "'), where }), { cause: lastError });
  } finally {
    client.close();
  }
}

function isFtpUrl(url) {
  return /^ftps?:\/\//i.test(url);
}

// When "Verifica file scaricato" is on, a file smaller than the configured threshold
// is treated as a failed attempt (same retry path as a network error) instead of a
// silent success — catches the case where the source hasn't dropped the real file yet
// and returns an empty/placeholder response.
async function downloadWithRetries(taskId, url, tempPath, http, minBytes) {
  const retries = Math.max(0, Number(http.retries) || 0);
  const retryDelayMs = Math.max(0, Number(http.retryDelayMs) || 15000);
  const onProgress = (received, total) => {
    if (total) events.emit('progress', { taskId, received, total, pct: Math.round((received / total) * 100) });
  };
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) log(taskId, M("Nuovo tentativo {attempt}/{retries}...", { attempt: attempt, retries: retries }));
      const result = isFtpUrl(url)
        ? await ftpDownloadToFile(url, tempPath, http, onProgress)
        : await downloadToFile(url, tempPath, http, onProgress);
      if (minBytes > 0 && result.bytes < minBytes) {
        throw new Error(M("File troppo piccolo ({bytes} byte, minimo richiesto {min})", { bytes: result.bytes, min: minBytes }));
      }
      return result;
    } catch (err) {
      lastError = err;
      log(taskId, M("Tentativo {attempt} fallito: {message}", { attempt: attempt + 1, message: err.message }), 'warn');
      if (attempt < retries) await sleep(retryDelayMs);
    }
  }
  throw lastError;
}

// For broadcast workflows: the newscast file may not be dropped on disk/network share yet.
// Retries wait retryDelayMs between checks, same knobs as the HTTP path.
async function copyLocalWithRetries(taskId, sourcePath, tempPath, http) {
  const retries = Math.max(0, Number(http.retries) || 0);
  const retryDelayMs = Math.max(0, Number(http.retryDelayMs) || 15000);
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) log(taskId, M("File non ancora disponibile, nuovo tentativo {attempt}/{retries}...", { attempt: attempt, retries: retries }));
      const stat = await fsp.stat(sourcePath);
      if (!stat.isFile()) throw new Error(M("Il percorso indicato non è un file"));
      await fsp.copyFile(sourcePath, tempPath);
      return { bytes: stat.size };
    } catch (err) {
      lastError = err.code === 'ENOENT' ? new Error(M("File non trovato: {path}", { path: sourcePath })) : err;
      log(taskId, M("Tentativo {attempt} fallito: {message}", { attempt: attempt + 1, message: lastError.message }), 'warn');
      if (attempt < retries) await sleep(retryDelayMs);
    }
  }
  throw lastError;
}

async function moveOrCopy(from, to) {
  await fsp.rename(from, to).catch(async (err) => {
    if (err.code === 'EXDEV') {
      await fsp.cp(from, to, { recursive: true });
      await fsp.rm(from, { recursive: true, force: true });
    } else {
      throw err;
    }
  });
}

// If a file with the same final name already exists, keep it instead of overwriting it:
// rename it out of the way (tagged with its own last-modified time) so the newly
// downloaded file is always the one that ends up with the clean, intended name.
async function archiveExisting(finalPath, log) {
  const stat = await fsp.stat(finalPath).catch(() => null);
  if (!stat) return null;
  const dir = path.dirname(finalPath);
  const ext = path.extname(finalPath);
  const base = path.basename(finalPath, ext);
  const stamp = new Date(stat.mtimeMs).toISOString().replace(/[:.]/g, '-');
  let archivePath = path.join(dir, `${base}.old-${stamp}${ext}`);
  let n = 1;
  while (await fsp.stat(archivePath).catch(() => null)) {
    archivePath = path.join(dir, `${base}.old-${stamp}-${n}${ext}`);
    n++;
  }
  await moveOrCopy(finalPath, archivePath);
  log?.(M("File preesistente con lo stesso nome conservato come: {name}", { name: path.basename(archivePath) }));
  return archivePath;
}

async function finalizePath(destFolder, tempPath, filename, log, overwrite = false) {
  const finalPath = path.join(destFolder, filename);
  await fsp.mkdir(path.dirname(finalPath), { recursive: true });
  if (!overwrite) await archiveExisting(finalPath, log);
  await moveOrCopy(tempPath, finalPath);
  return finalPath;
}

// "Wildcard" patterns as typed by users: * = any run of characters, ? = one character.
// Names the app itself creates inside the destination folder: never touched by the cleanup.
const STAGING_PREFIX = '.gdl-staging-';
const TRASH_DIR = '_cestino';
const isInternalName = (name) => /\.part-\d+$/.test(name) || name.startsWith(STAGING_PREFIX) || name === TRASH_DIR;

function wildcardToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

function parsePatterns(raw, ctx0) {
  return resolveTemplate(String(raw || ''), ctx0)
    .split(/[;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(wildcardToRegex);
}

// Picks which entries of the destination folder the cleanup applies to.
// Scopes: all | sameName | pattern | olderThan | keepLast. Subfolders are only touched
// when "includeSubfolders" is on (legacy tasks without the flag keep the old behavior).
async function selectCleanupEntries(task, destFolder, entries, ctx0, filename, log, excludeNames) {
  const scope = task.preDownloadScope || 'all';
  const withSub = task.preDownloadSubfolders !== false;
  let list = entries.filter(
    (e) => (e.isFile() || (withSub && e.isDirectory())) && !isInternalName(e.name) && !excludeNames.has(e.name.toLowerCase())
  );

  if (scope === 'all') {
    const { root } = path.parse(path.resolve(destFolder));
    if (path.resolve(destFolder) === root) throw new Error(M("Pulizia \"tutto\" rifiutata: la cartella di destinazione è la radice di un disco"));
    return list;
  }
  if (scope === 'sameName') {
    if (!filename) {
      log(M("Pulizia \"solo file con lo stesso nome\": nome file non ancora noto, saltata."), 'warn');
      return [];
    }
    return list.filter((e) => e.isFile() && e.name.toLowerCase() === filename.toLowerCase());
  }

  const regexes = parsePatterns(task.preDownloadPattern, ctx0);
  if (regexes.length) list = list.filter((e) => regexes.some((r) => r.test(e.name)));
  else if (scope === 'pattern') {
    log(M("Pulizia \"per nome\": nessun modello indicato, saltata."), 'warn');
    return [];
  }
  if (scope === 'pattern') return list;

  const withTimes = await Promise.all(
    list.map(async (e) => ({ e, mtime: (await fsp.stat(path.join(destFolder, e.name)).catch(() => null))?.mtimeMs ?? 0 }))
  );
  if (scope === 'olderThan') {
    const unitMs = task.preDownloadAgeUnit === 'hours' ? 3_600_000 : 86_400_000;
    const cutoff = Date.now() - Math.max(0, Number(task.preDownloadAgeValue) || 0) * unitMs;
    return withTimes.filter((x) => x.mtime < cutoff).map((x) => x.e);
  }
  if (scope === 'keepLast') {
    const keep = Math.max(0, Number(task.preDownloadKeepLast) || 0);
    return withTimes.sort((a, b) => b.mtime - a.mtime).slice(keep).map((x) => x.e);
  }
  return list;
}

// ---- housekeeping of the destination folder -------------------------------------------
// How an entry is removed: permanently, to the system recycle bin, or into a "_cestino"
// subfolder that empties itself after a number of days (the system bin does not exist on
// network folders).
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const noop = () => {};

async function moveToTrashFolder(destFolder, full) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-'); // UTC, sortable
  const dir = path.join(destFolder, TRASH_DIR, stamp);
  await fsp.mkdir(dir, { recursive: true });
  const to = path.join(dir, path.basename(full));
  await archiveExisting(to);
  await moveOrCopy(full, to);
}

async function removeEntry(task, destFolder, full) {
  const how = task.preDownloadDelete || 'permanent';
  if (how === 'trash') await shell.trashItem(full);
  else if (how === 'folder') await moveToTrashFolder(destFolder, full);
  else await fsp.rm(full, { recursive: true, force: true });
}

// Emptying the "_cestino" folder: sub-folders named by the moment they were created.
async function trashFolderExpired(task, destFolder) {
  const days = Math.max(1, Number(task.preDownloadTrashDays) || 7);
  const dirs = await fsp.readdir(path.join(destFolder, TRASH_DIR), { withFileTypes: true }).catch(() => []);
  const out = [];
  for (const d of dirs) {
    const m = /^(\d{4})-(\d\d)-(\d\d)-(\d\d)-(\d\d)-(\d\d)$/.exec(d.name);
    if (!d.isDirectory() || !m) continue;
    const when = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    if (Date.now() - when > days * 86_400_000) out.push(d.name);
  }
  return out;
}

async function purgeTrashFolder(task, destFolder, log) {
  if ((task.preDownloadDelete || 'permanent') !== 'folder') return;
  const expired = await trashFolderExpired(task, destFolder);
  for (const name of expired) await fsp.rm(path.join(destFolder, TRASH_DIR, name), { recursive: true, force: true });
  if (expired.length) log(M("Cestino della cartella: eliminate definitivamente {n} cartelle scadute.", { n: expired.length }));
}

// Older copies ("name.old-<date>.ext") of a file that was replaced: keep the last N, and/or
// drop those older than N days. Returns the entries to remove.
async function planOldCopies(task, dir, fileName) {
  const keep = Math.max(0, Number(task.oldCopiesKeep) || 0);
  const days = Math.max(0, Number(task.oldCopiesDays) || 0);
  if ((!keep && !days) || !fileName) return [];
  const ext = path.extname(fileName);
  const re = new RegExp(`^${escapeRe(path.basename(fileName, ext))}\\.old-.*${escapeRe(ext)}$`);
  const names = (await fsp.readdir(dir).catch(() => [])).filter((n) => re.test(n));
  const withTimes = await Promise.all(names.map(async (n) => ({ n, mtime: (await fsp.stat(path.join(dir, n)).catch(() => null))?.mtimeMs ?? 0 })));
  withTimes.sort((a, b) => b.mtime - a.mtime);
  const cutoff = Date.now() - days * 86_400_000;
  return withTimes.filter((x, idx) => (keep && idx >= keep) || (days && x.mtime < cutoff)).map((x) => x.n);
}

async function pruneOldCopies(task, dir, fileName, log) {
  const names = await planOldCopies(task, dir, fileName);
  for (const n of names) await removeEntry(task, dir, path.join(dir, n));
  if (names.length) log(M("Copie vecchie eliminate: {n} ({names}).", { n: names.length, names: names.slice(0, 5).join(', ') + (names.length > 5 ? ', …' : '') }));
}

// Keep the folder under a size limit by dropping the oldest files. Never touches the file
// that was just saved. Files are deleted for good (a recycle bin would not free the space).
async function listFilesWithSize(root, withSub, rel = '') {
  const out = [];
  const entries = await fsp.readdir(path.join(root, rel), { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (isInternalName(e.name)) continue;
    const r = path.join(rel, e.name);
    if (e.isDirectory()) {
      if (withSub) out.push(...(await listFilesWithSize(root, withSub, r)));
    } else if (e.isFile()) {
      const st = await fsp.stat(path.join(root, r)).catch(() => null);
      if (st) out.push({ rel: r, size: st.size, mtime: st.mtimeMs });
    }
  }
  return out;
}

async function planQuota(task, destFolder, protectPath = null) {
  const limit = Math.max(0, Number(task.quotaGB) || 0) * 1024 ** 3;
  if (!limit) return { limit: 0, total: 0, remove: [] };
  const files = await listFilesWithSize(destFolder, task.preDownloadSubfolders !== false);
  let total = files.reduce((s, f) => s + f.size, 0);
  const remove = [];
  const protectedFull = protectPath ? path.resolve(protectPath).toLowerCase() : null;
  for (const f of files.sort((a, b) => a.mtime - b.mtime)) {
    if (total <= limit) break;
    if (protectedFull && path.resolve(destFolder, f.rel).toLowerCase() === protectedFull) continue;
    remove.push(f);
    total -= f.size;
  }
  return { limit, total, remove };
}

async function enforceQuota(task, destFolder, protectPath, log) {
  const plan = await planQuota(task, destFolder, protectPath);
  for (const f of plan.remove) await fsp.rm(path.join(destFolder, f.rel), { force: true });
  if (plan.remove.length) {
    const mb = Math.round(plan.remove.reduce((s, f) => s + f.size, 0) / 1048576);
    log(M("Limite di spazio: eliminati {n} file più vecchi ({mb} MB).", { n: plan.remove.length, mb }));
  }
}

// Files set aside before the download (so they come back if it fails) wait in a hidden
// folder inside the destination folder; they are only really removed once the new file is saved.
const activeStaging = new Set();

async function stageEntries(destFolder, selected) {
  const dir = path.join(destFolder, `${STAGING_PREFIX}${Date.now()}`);
  await fsp.mkdir(dir, { recursive: true });
  activeStaging.add(dir);
  const names = [];
  for (const entry of selected) {
    await moveOrCopy(path.join(destFolder, entry.name), path.join(dir, entry.name));
    names.push(entry.name);
  }
  return { dir, names, destFolder };
}

async function restoreStaged(staging, log) {
  if (!staging) return;
  for (const name of staging.names) {
    const from = path.join(staging.dir, name);
    if (!(await fsp.stat(from).catch(() => null))) continue;
    let to = path.join(staging.destFolder, name);
    if (await fsp.stat(to).catch(() => null)) to = path.join(staging.destFolder, `${name}.restored-${Date.now()}`);
    await moveOrCopy(from, to);
  }
  await fsp.rmdir(staging.dir).catch(() => {});
  activeStaging.delete(staging.dir);
  log(M("Download non riuscito: i file messi da parte sono stati rimessi al loro posto ({n}).", { n: staging.names.length }));
}

// A crash can leave a staging folder behind: put its files back before anything else happens.
async function recoverStaging(destFolder, log) {
  const dirs = (await fsp.readdir(destFolder, { withFileTypes: true }).catch(() => [])).filter(
    (e) => e.isDirectory() && e.name.startsWith(STAGING_PREFIX) && !activeStaging.has(path.join(destFolder, e.name))
  );
  for (const d of dirs) {
    const dir = path.join(destFolder, d.name);
    const names = await fsp.readdir(dir).catch(() => []);
    await restoreStaged({ dir, names, destFolder }, log);
  }
}

async function commitStaged(task, staging, ctx0, log) {
  if (!staging) return;
  const mode = task.preDownloadAction;
  const targetFolder = mode === 'move' ? cleanPath(resolveTemplate(task.preDownloadMoveTarget || '', ctx0)) : '';
  if (targetFolder) await fsp.mkdir(targetFolder, { recursive: true });
  try {
    for (const name of staging.names) {
      const from = path.join(staging.dir, name);
      if (!(await fsp.stat(from).catch(() => null))) continue;
      if (mode === 'move' && targetFolder) {
        const to = path.join(targetFolder, name);
        await archiveExisting(to, log);
        await moveOrCopy(from, to);
        await pruneOldCopies(task, targetFolder, name, log);
      } else {
        await removeEntry(task, staging.destFolder, from);
      }
    }
    await fsp.rm(staging.dir, { recursive: true, force: true });
    log(M("Pulizia completata dopo il download: {n} elementi.", { n: staging.names.length }));
  } finally {
    activeStaging.delete(staging.dir);
  }
}

// Housekeeping on the destination folder: delete (permanently, to the recycle bin or to the
// "_cestino" folder) or move the selected entries. Runs either before the download or, when
// configured, only after a successful one (then the file just saved is never touched).
// With options.stage the entries are only set aside and handed back in the result, so the
// caller can restore them (download failed) or finish the job (download saved).
async function applyPreDownloadAction(task, destFolder, ctx0, log, filename, excludeNames = new Set(), options = {}) {
  await recoverStaging(destFolder, log);
  await purgeTrashFolder(task, destFolder, log);
  const mode = task.preDownloadAction || 'none';
  if (mode === 'none') return null;
  const entries = await fsp.readdir(destFolder, { withFileTypes: true }).catch(() => []);
  if (!entries.length) return null;
  const selected = await selectCleanupEntries(task, destFolder, entries, ctx0, filename, log, excludeNames);
  if (!selected.length) return null;

  if (mode === 'move') {
    const targetFolder = cleanPath(resolveTemplate(task.preDownloadMoveTarget || '', ctx0));
    if (!targetFolder) {
      log(M("Azione pre-download \"sposta\" configurata senza percorso di destinazione: saltata."), 'warn');
      return null;
    }
    // Skip the archive folder itself when it lives inside destFolder (e.g. "Archivio"
    // subfolder used as the move target) — otherwise it gets moved into itself on the
    // next run, which Node rejects with EINVAL.
    const targetResolved = path.resolve(targetFolder);
    const movable = selected.filter((e) => path.resolve(path.join(destFolder, e.name)) !== targetResolved);
    if (options.stage) {
      const staging = await stageEntries(destFolder, movable);
      log(M("Messi da parte {n} elementi: verranno spostati solo se il download riesce.", { n: movable.length }));
      return { staging };
    }
    await fsp.mkdir(targetFolder, { recursive: true });
    let moved = 0;
    for (const entry of movable) {
      const to = path.join(targetFolder, entry.name);
      await archiveExisting(to, log); // keep any previous archived copy instead of overwriting it
      await moveOrCopy(path.join(destFolder, entry.name), to);
      await pruneOldCopies(task, targetFolder, entry.name, log);
      moved++;
    }
    if (moved) log(M("Spostati {n} elementi preesistenti in: {folder}", { n: moved, folder: targetFolder }));
    return null;
  }

  if (options.stage) {
    const staging = await stageEntries(destFolder, selected);
    log(M("Messi da parte {n} elementi: verranno eliminati solo se il download riesce.", { n: selected.length }));
    return { staging };
  }
  for (const entry of selected) await removeEntry(task, destFolder, path.join(destFolder, entry.name));
  const names = selected.slice(0, 5).map((e) => e.name).join(', ') + (selected.length > 5 ? ', …' : '');
  const how = task.preDownloadDelete || 'permanent';
  log(M(how === 'trash' ? 'Pulizia cartella di destinazione: {n} elementi spostati nel cestino ({names}).' : how === 'folder' ? 'Pulizia cartella di destinazione: {n} elementi spostati nella cartella _cestino ({names}).' : 'Pulizia cartella di destinazione: {n} elementi eliminati ({names}).', { n: selected.length, names }));
  return null;
}

// What a cleanup would do right now, without doing it (for the preview and "Clean now").
async function planCleanup(task, ctx0) {
  const settings = getSettings();
  const destFolder = cleanPath(task.destinationFolder || settings.defaultDestination || process.cwd());
  const filename = expectedFileName(task, ctx0);
  const plan = { folder: destFolder, action: task.preDownloadAction || 'none', how: task.preDownloadDelete || 'permanent', target: '', items: [], oldCopies: [], quota: null, trashExpired: [] };
  if (!(await fsp.stat(destFolder).catch(() => null))) return plan;
  if (plan.action !== 'none') {
    const entries = await fsp.readdir(destFolder, { withFileTypes: true }).catch(() => []);
    const selected = await selectCleanupEntries(task, destFolder, entries, ctx0, filename, noop, new Set());
    if (plan.action === 'move') plan.target = cleanPath(resolveTemplate(task.preDownloadMoveTarget || '', ctx0));
    const targetResolved = plan.target ? path.resolve(plan.target) : null;
    plan.items = selected.filter((e) => path.resolve(path.join(destFolder, e.name)) !== targetResolved).map((e) => e.name + (e.isDirectory() ? '/' : ''));
  }
  if (filename) plan.oldCopies = await planOldCopies(task, destFolder, filename);
  const quota = await planQuota(task, destFolder);
  if (quota.limit) plan.quota = { limitGB: Number(task.quotaGB), totalMB: Math.round(quota.total / 1048576), remove: quota.remove.map((f) => f.rel) };
  if ((task.preDownloadDelete || 'permanent') === 'folder') plan.trashExpired = await trashFolderExpired(task, destFolder);
  return plan;
}

export async function previewCleanup(taskId, opts = {}) {
  const task = getTask(taskId);
  if (!task) return { ok: false };
  const now = opts.scheduledAt ? new Date(opts.scheduledAt) : new Date();
  return { ok: true, ...(await planCleanup(task, { now, seq: task.seqCounter || 0 })) };
}

async function runCleanupOnly(taskId, opts) {
  const task = getTask(taskId);
  if (!task) throw new Error(M("Task non trovato"));
  const now = opts.scheduledAt ? new Date(opts.scheduledAt) : new Date();
  const ctx0 = { now, seq: task.seqCounter || 0 };
  const settings = getSettings();
  const destFolder = cleanPath(task.destinationFolder || settings.defaultDestination || process.cwd());
  const startedAt = new Date().toISOString();
  events.emit('task-started', { taskId });
  const emitLog = (msg, level) => log(taskId, msg, level);
  try {
    emitLog(M("Pulizia manuale della cartella: {folder}", { folder: destFolder }));
    const filename = expectedFileName(task, ctx0);
    await applyPreDownloadAction(task, destFolder, ctx0, emitLog, filename);
    if (filename) await pruneOldCopies(task, destFolder, filename, emitLog);
    await enforceQuota(task, destFolder, null, emitLog);
    appendHistory(taskId, { startedAt, finishedAt: new Date().toISOString(), status: 'success', mode: 'cleanup' });
    events.emit('task-finished', { taskId, status: 'success' });
    return { status: 'success', mode: 'cleanup' };
  } catch (err) {
    emitLog(`Errore: ${err.message}`, 'error');
    appendHistory(taskId, { startedAt, finishedAt: new Date().toISOString(), status: 'error', mode: 'cleanup', error: err.message });
    events.emit('task-finished', { taskId, status: 'error', error: err.message });
    throw err;
  }
}

// opts.schedule: the schedule that fired this run. Its optional urlOverride replaces the
// task URL for that run only (same product, different source per time slot / weekday).
const activeRuns = new Set();

// Optional cap on simultaneous downloads (setting "maxParallelDownloads", 0 = no limit).
let slotsInUse = 0;
const slotWaiters = [];
async function acquireSlot(taskId) {
  const limit = Math.max(0, Number(getSettings().maxParallelDownloads) || 0);
  if (limit > 0 && slotsInUse >= limit) {
    log(taskId, M("In attesta: {n} download già in corso (limite {limit}).", { n: slotsInUse, limit: limit }));
    await new Promise((resolve) => slotWaiters.push(resolve));
  }
  slotsInUse++;
}
function releaseSlot() {
  slotsInUse--;
  const next = slotWaiters.shift();
  if (next) next();
}

export function isTaskRunning(taskId) {
  return activeRuns.has(taskId);
}

export function runningTaskCount() {
  return activeRuns.size;
}

// Same task never runs twice at once (e.g. a seconds-interval task slower than its interval).
// opts.mode: 'full' (default: download, then the actions), 'download' (download only) or
// 'actions' (only the post-download actions, on a file already on disk).
export async function runTask(taskId, opts = {}) {
  if (activeRuns.has(taskId)) throw new Error(M("Task già in esecuzione"));
  activeRuns.add(taskId);
  const actionsOnly = opts.mode === 'actions';
  try {
    if (actionsOnly) return await runActionsOnly(taskId, opts);
    if (opts.mode === 'cleanup') return await runCleanupOnly(taskId, opts);
    await acquireSlot(taskId);
    try {
      return await runTaskInner(taskId, opts);
    } finally {
      releaseSlot();
    }
  } finally {
    activeRuns.delete(taskId);
  }
}

// The file name a download of this task would get for this occurrence (null: unknown, e.g. "ask").
function expectedFileName(task, ctx0) {
  if (task.filenameMode === 'fixed') return resolveTemplate(task.fixedFilename, ctx0);
  if (task.filenameMode === 'template') return resolveTemplate(task.filenameTemplate, ctx0);
  if (task.filenameMode === 'fromUrl') {
    return safeFileName(
      task.sourceType === 'local'
        ? path.basename(cleanPath(resolveTemplate(task.localPath, ctx0)))
        : filenameFromUrl(resolveTemplate(task.url, ctx0))
    );
  }
  return null;
}

function codedError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

async function isFile(p) {
  try {
    return (await fsp.stat(p)).isFile();
  } catch {
    return false;
  }
}

// The file the actions should work on: the one the user picked, else the file the task would
// have downloaded for this occurrence (e.g. placed there by hand), else the last downloaded one.
async function resolveActionsFile(task, settings, ctx0, opts) {
  if (opts.filepath) {
    const picked = cleanPath(opts.filepath);
    if (await isFile(picked)) return { filepath: picked, source: 'picked' };
    throw codedError('no-file', M("File non trovato: {path}", { path: picked }));
  }
  const candidates = [];
  // a download that is waiting for its actions to be confirmed comes first
  if (task.pendingActions?.filepath) candidates.push({ p: task.pendingActions.filepath, source: 'pending' });
  try {
    const destFolder = cleanPath(task.destinationFolder || settings.defaultDestination || process.cwd());
    const filename = expectedFileName(task, ctx0);
    if (filename) candidates.push({ p: path.join(destFolder, filename), source: 'expected' });
  } catch {
    /* name not computable: fall through to the history */
  }
  const lastDownload = (task.history || []).find((h) => h.status === 'success' && h.mode !== 'actions' && h.mode !== 'cleanup' && h.filepath);
  if (lastDownload) candidates.push({ p: lastDownload.filepath, source: 'last' });
  for (const c of candidates) if (await isFile(c.p)) return { filepath: c.p, source: c.source };
  throw codedError('no-file', M("Nessun file trovato su cui eseguire le azioni: scegline uno."));
}

function clearPendingActions(taskId) {
  const t = getTask(taskId);
  if (t?.pendingActions) {
    delete t.pendingActions;
    saveTask(t);
  }
}

// Which file "Actions only" would use right now, and where it comes from (never throws).
export async function actionsFileInfo(taskId, opts = {}) {
  const task = getTask(taskId);
  if (!task) return { ok: false };
  const now = opts.scheduledAt ? new Date(opts.scheduledAt) : new Date();
  try {
    const r = await resolveActionsFile(task, getSettings(), { now, seq: task.seqCounter || 0 }, opts);
    return { ok: true, ...r, pending: !!task.pendingActions };
  } catch {
    return { ok: false, pending: !!task.pendingActions };
  }
}

// The commands each action would run on the file "Actions only" would use (nothing is run).
export async function previewTaskActions(taskId, action, opts = {}) {
  const task = getTask(taskId);
  if (!task) return { ok: false };
  const info = await actionsFileInfo(taskId, opts);
  const filepath = info.ok ? info.filepath : '<file>';
  const ctx = { filepath, filename: path.basename(filepath), folder: info.ok ? path.dirname(filepath) : '<folder>', taskName: task.name };
  return { ok: true, file: info.ok ? filepath : null, lines: previewAction(action, ctx) };
}

async function runActionsOnly(taskId, opts) {
  const task = getTask(taskId);
  if (!task) throw new Error(M("Task non trovato"));
  const settings = getSettings();
  const now = opts.scheduledAt ? new Date(opts.scheduledAt) : new Date();
  const ctx0 = { now, seq: task.seqCounter || 0 };
  const wanted = Array.isArray(opts.actionIds) && opts.actionIds.length ? new Set(opts.actionIds) : null;
  const actions = (task.postActions || []).filter((a) => (wanted ? wanted.has(a.id) : a.enabled !== false));
  if (!actions.length) throw codedError('no-actions', M("Il task non ha azioni da eseguire."));
  // Resolved before anything is recorded: a missing file is not a failure, the user is asked for one.
  const { filepath } = await resolveActionsFile(task, settings, ctx0, opts);

  const startedAt = new Date().toISOString();
  events.emit('task-started', { taskId });
  const emitLog = (msg, level) => log(taskId, msg, level);
  try {
    emitLog(M("Solo azioni su: {path}", { path: filepath }));
    const actionCtx = { filepath, filename: path.basename(filepath), folder: path.dirname(filepath), taskName: task.name };
    await runPostActions(actions, actionCtx, (msg, level) => emitLog(msg, level), { force: !!wanted });
    if (!wanted) clearPendingActions(taskId);
    appendHistory(taskId, { startedAt, finishedAt: new Date().toISOString(), status: 'success', mode: 'actions', actionsFile: filepath });
    events.emit('task-finished', { taskId, status: 'success' });
    return { status: 'success', filepath, mode: 'actions' };
  } catch (err) {
    emitLog(`Errore: ${err.message}`, 'error');
    appendHistory(taskId, { startedAt, finishedAt: new Date().toISOString(), status: 'error', mode: 'actions', error: err.message });
    if (settings.notifyOnError && Notification.isSupported()) {
      new Notification({ title: M("Errore: {name}", { name: task.name }), body: err.message }).show();
    }
    if (task.notifyOnFailure !== false) await notifyFailure(settings, task, err, emitLog);
    events.emit('task-finished', { taskId, status: 'error', error: err.message });
    throw err;
  }
}

async function runTaskInner(taskId, opts = {}) {
  const task = getTask(taskId);
  if (!task) throw new Error(M("Task non trovato"));
  const settings = getSettings();
  const startedAt = new Date().toISOString();
  events.emit('task-started', { taskId });

  const emitLog = (msg, level) => log(taskId, msg, level);

  const seq = bumpSeq(taskId);
  // Date/time placeholders use the occurrence the schedule was meant for, so a run that
  // starts late (app restarted, catch-up) still asks for the right file, e.g. edizione0830.
  const now = opts.scheduledAt ? new Date(opts.scheduledAt) : new Date();
  const ctx0 = { now, seq };
  let tempPath = null;
  let staged = null; // files set aside before the download, restored if it fails

  try {
    const isLocal = task.sourceType === 'local';
    const resolvedUrl = isLocal
      ? cleanPath(resolveTemplate(task.localPath, ctx0))
      : resolveTemplate(opts.schedule?.urlOverride?.trim() || task.url, ctx0);
    const destFolder = cleanPath(task.destinationFolder || settings.defaultDestination || process.cwd());
    await fsp.mkdir(destFolder, { recursive: true });
    let filename;
    if (task.filenameMode === 'fixed') filename = resolveTemplate(task.fixedFilename, ctx0);
    else if (task.filenameMode === 'fromUrl') filename = safeFileName(isLocal ? path.basename(resolvedUrl) : filenameFromUrl(resolvedUrl));
    else filename = resolveTemplate(task.filenameTemplate, ctx0); // 'template' and 'ask' both download under a resolved name first

    // Whatever produced the name, the file must end up inside the destination folder.
    const rel = path.relative(path.resolve(destFolder), path.resolve(destFolder, filename));
    if (!filename || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(M("Nome file non valido (uscirebbe dalla cartella di destinazione): {filename}", { filename: filename }));
    }

    const cleanupAfter = task.preDownloadTiming === 'afterSuccess';
    if (!cleanupAfter) {
      const r = await applyPreDownloadAction(task, destFolder, ctx0, emitLog, filename, new Set(), { stage: !!task.preDownloadSafe });
      staged = r?.staging || null;
    }

    emitLog(isLocal ? M("Recupero file locale: {url}", { url: resolvedUrl }) : M("Avvio download: {url}", { url: resolvedUrl }));
    tempPath = path.join(destFolder, `.${filename}.part-${Date.now()}`);

    const httpConfig = { ...(task.http || {}) };
    if (!isLocal && httpConfig.method === 'POST' && httpConfig.body) {
      httpConfig.resolvedBody = resolveTemplate(httpConfig.body, ctx0);
    }

    const minBytes = settings.checkMinFileSize ? Math.max(0, Number(settings.minFileSizeKB) || 0) * 1024 : 0;
    const { bytes } = isLocal
      ? await copyLocalWithRetries(taskId, resolvedUrl, tempPath, httpConfig)
      : await downloadWithRetries(taskId, resolvedUrl, tempPath, httpConfig, minBytes);
    emitLog(M("Download completato ({bytes} byte).", { bytes: bytes }));

    const expected = String(task.expectedSha256 || '').trim().toLowerCase();
    if (expected) {
      const actual = crypto.createHash('sha256').update(await fsp.readFile(tempPath)).digest('hex');
      if (actual !== expected) throw new Error(M("Verifica sha256 fallita: atteso {expected}, ottenuto {actual}", { expected: expected, actual: actual }));
      emitLog(M("Verifica sha256 superata."));
    }

    let finalPath;
    if (task.filenameMode === 'ask') {
      const win = focusedWindow();
      const result = win
        ? await dialog.showSaveDialog(win, { defaultPath: path.join(destFolder, filename) })
        : await dialog.showSaveDialog({ defaultPath: path.join(destFolder, filename) });
      if (!result.canceled && result.filePath) {
        finalPath = await finalizePath(path.dirname(result.filePath), tempPath, path.basename(result.filePath), emitLog, task.existingFile === 'overwrite');
      } else {
        finalPath = await finalizePath(destFolder, tempPath, filename, emitLog, task.existingFile === 'overwrite');
        emitLog(M("Rinomina annullata dall'utente: mantenuto nome proposto."), 'warn');
      }
    } else {
      finalPath = await finalizePath(destFolder, tempPath, filename, emitLog, task.existingFile === 'overwrite');
    }
    emitLog(M("File salvato: {path}", { path: finalPath }));
    if (staged) {
      const s = staged;
      staged = null; // the download is saved: from here on nothing is restored
      await commitStaged(task, s, ctx0, emitLog);
    }
    if (cleanupAfter) {
      const savedName = path.basename(finalPath);
      await applyPreDownloadAction(task, path.dirname(finalPath), ctx0, emitLog, savedName, new Set([savedName.toLowerCase()]));
    }
    // housekeeping that follows every saved file: old copies, then the size limit
    await pruneOldCopies(task, path.dirname(finalPath), path.basename(finalPath), emitLog);
    await enforceQuota(task, path.dirname(finalPath), finalPath, emitLog);

    const staleLimit = Math.max(0, Number(settings.staleAlertRuns) || 0);
    if (settings.warnIfUnchanged || staleLimit > 0) {
      const hash = crypto.createHash('sha256').update(await fsp.readFile(finalPath)).digest('hex');
      const same = !!task.lastFileHash && task.lastFileHash === hash;
      if (same && settings.warnIfUnchanged) {
        emitLog(M("Il file scaricato è identico all'ultimo salvato: il contenuto potrebbe non essere stato aggiornato alla fonte."), 'warn');
      }
      task.unchangedStreak = same ? (task.unchangedStreak || 0) + 1 : 0;
      task.lastFileHash = hash;
      saveTask(task);
      if (staleLimit > 0 && task.unchangedStreak === staleLimit) {
        const text = M("Il task \"{name}\" ha scaricato {n} volte di fila lo stesso identico file: la fonte potrebbe essere ferma.", { name: task.name, n: staleLimit + 1 });
        emitLog(text, 'warn');
        await notifyAlert(settings, M("[G-Downloader] Fonte ferma? {name}", { name: task.name }), text, emitLog);
      }
    }

    const actionCtx = {
      filepath: finalPath,
      filename: path.basename(finalPath),
      folder: path.dirname(finalPath),
      taskName: task.name
    };
    // What follows the download: the actions (default), nothing, or a wait for confirmation.
    // A schedule can ask for the last two; a manual run only follows the buttons.
    const after = opts.mode === 'download' ? 'none' : opts.fromScheduler ? opts.schedule?.afterDownload || 'actions' : 'actions';
    if (after === 'none') {
      emitLog(M("Solo download: le azioni successive non sono state eseguite."));
    } else if (after === 'wait') {
      const t2 = getTask(taskId);
      t2.pendingActions = { filepath: finalPath, filename: path.basename(finalPath), at: new Date().toISOString() };
      saveTask(t2);
      const text = M("Il file del task \"{name}\" è pronto ({file}). Le azioni successive aspettano la tua conferma: premi \"Esegui azioni\" nell'app.", { name: task.name, file: path.basename(finalPath) });
      emitLog(text, 'warn');
      if (Notification.isSupported()) new Notification({ title: task.name, body: text }).show();
      await notifyAlert(settings, M("[G-Downloader] File pronto: {name}", { name: task.name }), text, emitLog);
    } else {
      await runPostActions(task.postActions, actionCtx, (msg, level) => emitLog(msg, level));
      clearPendingActions(taskId);
    }

    appendHistory(taskId, {
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'success',
      ...(after === 'none' ? { mode: 'download' } : after === 'wait' ? { mode: 'download', waiting: true } : {}),
      url: resolvedUrl,
      filepath: finalPath,
      bytes
    });
    if (settings.notifyOnSuccess && Notification.isSupported()) {
      const n = new Notification({ title: task.name, body: M("Download completato: {name}", { name: path.basename(finalPath) }) });
      if (settings.openFolderOnNotificationClick) n.on('click', () => shell.showItemInFolder(finalPath));
      n.show();
    }
    events.emit('task-finished', { taskId, status: 'success' });
    return { status: 'success', filepath: finalPath };
  } catch (err) {
    emitLog(`Errore: ${err.message}`, 'error');
    appendHistory(taskId, {
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'error',
      error: err.message
    });
    if (tempPath) await fsp.unlink(tempPath).catch(() => {});
    if (staged) await restoreStaged(staged, emitLog).catch((e) => emitLog(`Errore nel ripristino: ${e.message}`, 'error'));
    if (settings.notifyOnError && Notification.isSupported()) {
      new Notification({ title: M("Errore: {name}", { name: task.name }), body: err.message }).show();
    }
    if (task.notifyOnFailure !== false) {
      await notifyFailure(settings, task, err, emitLog);
    }
    events.emit('task-finished', { taskId, status: 'error', error: err.message });
    throw err;
  }
}

export async function runTaskNow(taskId, opts = {}) {
  return runTask(taskId, opts);
}
