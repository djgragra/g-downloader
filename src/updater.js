import { app } from 'electron';
import { httpFetch } from './httpfetch.js';
import { M } from './i18n.js';

// Update notice only: asks GitHub for the latest release of the public releases repo and
// compares it with the running version. Nothing is downloaded or installed automatically.
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

export async function checkForUpdate(repo) {
  const current = app.getVersion();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) return { ok: false, current, error: M("Repository aggiornamenti non valido") };
  try {
    const res = await httpFetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'G-Downloader' },
      signal: AbortSignal.timeout(15000)
    });
    if (res.status === 404) return { ok: true, current, available: false, note: 'Nessuna release pubblicata' };
    if (!res.ok) return { ok: false, current, error: `GitHub HTTP ${res.status}` };
    const rel = await res.json();
    const latest = String(rel.tag_name || '').replace(/^v/i, '');
    return {
      ok: true,
      current,
      latest,
      available: isNewer(latest, current),
      url: rel.html_url,
      notes: String(rel.body || '').slice(0, 2000)
    };
  } catch (err) {
    return { ok: false, current, error: err.message };
  }
}
