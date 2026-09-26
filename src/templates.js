import { format, addMinutes, addHours, addDays } from 'date-fns';

// Placeholder syntax supported inside URL / filename templates:
//   {date}            -> yyyy-MM-dd (today)
//   {date:FORMAT}      -> date-fns format token, e.g. {date:yyyyMMdd}, {date:dd-MM-yyyy}
//   {time:FORMAT}      -> same engine, use for time tokens e.g. {time:HHmm}
//   {date+1h:H}        -> date/time shifted by an offset: +/-N then m (minutes), h (hours) or d (days),
//                         e.g. {date+1h:H} = next hour, {date-1d:yyyyMMdd} = yesterday
//   {seq}              -> per-task incrementing counter
//   {seq:N}            -> counter zero-padded to N digits
//   {rand}             -> short random alphanumeric string
//   {rand:N}           -> random string of length N
//   {env:NAME}         -> value of environment variable NAME
const PLACEHOLDER_RE = /\{([a-zA-Z]+)(?:([+-]\d+)([mhd]))?(?::([^}]*))?\}/g;

function shifted(now, amount, unit) {
  if (!amount) return now;
  const n = parseInt(amount, 10);
  if (unit === 'm') return addMinutes(now, n);
  if (unit === 'h') return addHours(now, n);
  return addDays(now, n);
}

function randomString(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function resolveTemplate(template, ctx = {}) {
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const seq = Number.isFinite(ctx.seq) ? ctx.seq : 0;

  return String(template).replace(PLACEHOLDER_RE, (match, key, amount, unit, arg) => {
    switch (key) {
      case 'date':
        return format(shifted(now, amount, unit), arg && arg.length ? arg : 'yyyy-MM-dd');
      case 'time':
        return format(shifted(now, amount, unit), arg && arg.length ? arg : 'HHmmss');
      case 'seq': {
        const digits = arg ? parseInt(arg, 10) : 0;
        return digits > 0 ? String(seq).padStart(digits, '0') : String(seq);
      }
      case 'rand':
        return randomString(arg ? parseInt(arg, 10) || 6 : 6);
      case 'env':
        return process.env[arg] ?? '';
      default:
        return match;
    }
  });
}

// Cleans up local paths pasted from Terminal/Finder ("Copia come nome percorso" or a
// drag-and-drop into a shell often wraps the path in quotes or backslash-escapes spaces).
export function cleanPath(p) {
  let s = String(p ?? '').trim();
  if (s.length >= 2) {
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      s = s.slice(1, -1);
    }
  }
  // Undo shell-style escaped spaces from a Terminal/Finder paste, e.g. "Liekrone\ MP3".
  // Only backslash+space, not every backslash: on Windows the backslash is the path
  // separator itself, so a blanket unescape here used to eat every "\" in the path
  // (e.g. "C:\Users\Name" becoming "C:UsersName").
  s = s.replace(/\\ /g, ' ');
  return s.trim();
}

// Extracts the filename portion of a resolved URL, used when filenameMode === 'fromUrl'.
export function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : 'download';
  } catch {
    const parts = String(url).split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : 'download';
  }
}
