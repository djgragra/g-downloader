import { app } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { httpFetch } from './httpfetch.js';
import { M } from './i18n.js';

// Update check: asks GitHub for the latest release of the public repository and compares it
// with the running version. On request it downloads the installer for this platform, verifies
// it against the release's SHA256SUMS.txt and hands it to the user; nothing installs by itself.
export const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

function parts(v) {
  return String(v || '')
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
}

export function isNewer(latest, current) {
  const a = parts(latest);
  const b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

function userAgent() {
  return `G-Downloader/${app.getVersion()}`;
}

export async function checkForUpdate(repo) {
  const current = app.getVersion();
  if (!REPO_RE.test(repo || '')) return { ok: false, current, error: M("Repository aggiornamenti non valido") };
  try {
    const res = await httpFetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': userAgent() },
      signal: AbortSignal.timeout(15000)
    });
    if (res.status === 404) return { ok: true, current, available: false, note: M('Nessuna release pubblicata') };
    if (!res.ok) return { ok: false, current, error: `GitHub HTTP ${res.status}` };
    const rel = await res.json();
    const latest = String(rel.tag_name || '').replace(/^v/i, '');
    const assets = releaseAssets(repo, rel);
    return {
      ok: true,
      current,
      latest,
      available: isNewer(latest, current),
      // only ever this repository's release page, never a URL taken as-is from the response
      url: `https://github.com/${repo}/releases/tag/${encodeURIComponent(rel.tag_name || '')}`,
      installer: pickInstaller(assets),
      sumsUrl: assets.find((a) => a.name === 'SHA256SUMS.txt')?.url || null,
      notes: String(rel.body || '').slice(0, 2000)
    };
  } catch (err) {
    return { ok: false, current, error: err.message };
  }
}

// Assets of the release, keeping only download URLs of this repository.
function releaseAssets(repo, rel) {
  const prefix = `https://github.com/${repo}/releases/download/`;
  return (rel.assets || [])
    .filter((a) => typeof a.browser_download_url === 'string' && a.browser_download_url.startsWith(prefix))
    .map((a) => ({ name: String(a.name), url: a.browser_download_url, size: a.size || 0 }));
}

// Installer for the running system: Windows setup .exe, macOS .dmg matching the processor
// (-arm64 for Apple silicon, no suffix for Intel), Linux .AppImage (built for x64 only).
export function pickInstaller(assets, platform = process.platform, arch = process.arch) {
  const tests = {
    win32: (n) => /^G-Downloader-Setup-[\d.]+\.exe$/i.test(n),
    darwin: (n) => (arch === 'arm64' ? /^G-Downloader-[\d.]+-arm64\.dmg$/i.test(n) : /^G-Downloader-[\d.]+\.dmg$/i.test(n)),
    linux: (n) => arch === 'x64' && /^G-Downloader-[\d.]+\.AppImage$/i.test(n)
  };
  const test = tests[platform];
  return (test && assets.find((a) => test(a.name))) || null;
}

// Downloads the installer into dir, reporting progress, and checks it against SHA256SUMS.txt.
// It is written as "<name>.part" and only gets its real name once the checksum matches;
// a file that does not match (or an interrupted download) is deleted.
export async function downloadInstaller(info, dir, onProgress) {
  if (!info?.installer) throw new Error('no-installer');
  if (!info.sumsUrl) throw new Error('no-checksums');
  const { name, url } = info.installer;
  const headers = { 'User-Agent': userAgent() };

  const sumsRes = await httpFetch(info.sumsUrl, { headers, signal: AbortSignal.timeout(30000) });
  if (!sumsRes.ok) throw new Error(`SHA256SUMS.txt: HTTP ${sumsRes.status}`);
  const line = (await sumsRes.text())
    .split('\n')
    .map((l) => l.trim().split(/\s+\*?/))
    .find((p) => p[1] === name);
  if (!line || !/^[0-9a-f]{64}$/i.test(line[0])) throw new Error('no-checksums');
  const expected = line[0].toLowerCase();

  const res = await httpFetch(url, { headers });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || info.installer.size || 0;
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, path.basename(name));
  const partial = `${file}.part`;
  const out = fs.createWriteStream(partial);
  const hash = crypto.createHash('sha256');
  let received = 0;
  let lastReport = 0;
  try {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
      received += value.length;
      if (!out.write(Buffer.from(value))) await new Promise((r) => out.once('drain', r));
      const now = Date.now();
      if (onProgress && now - lastReport > 250) {
        lastReport = now;
        onProgress(received, total);
      }
    }
    await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
  } catch (err) {
    out.destroy();
    fs.rmSync(partial, { force: true });
    throw err;
  }
  onProgress?.(received, total);
  if (hash.digest('hex') !== expected) {
    fs.rmSync(partial, { force: true });
    throw new Error('checksum-mismatch');
  }
  fs.renameSync(partial, file);
  return file;
}
