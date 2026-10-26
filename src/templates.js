import { format, addMinutes, addHours, addDays } from 'date-fns';

// Placeholder syntax supported inside URL / filename templates:
//   {date}            -> yyyy-MM-dd (today)
//   {date:FORMAT}      -> date-fns format token, e.g. {date:yyyyMMdd}, {date:dd-MM-yyyy}
//   {time:FORMAT}      -> same engine, use for time tokens e.g. {time:HHmm}
//   {date+1h:H}        -> date/time shifted by an offset: +/-N then m (minutes), h (hours) or d (days),
//                         e.g. {date+1h:H} = next hour, {date-1d:yyyyMMdd} = yesterday
//   {date@Europe/London:HHmm} -> the same, as the wall clock of another time zone (IANA name)
//   {tz}               -> abbreviation of the zone the app runs in (GMT/BST, CET/CEST, ...)
//   {tz:Europe/London} -> the abbreviation of a fixed zone; add :lower or :upper for the case,
//                         e.g. {tz:lower}, {tz:Europe/London:upper}; the date offset works too: {tz+1d}
//   {dst:bst|gmt}      -> first text while daylight saving time is on, second text otherwise
//                         (zone: this computer's, or {dst@Europe/London:bst|gmt})
//   {seq}              -> per-task incrementing counter
//   {seq:N}            -> counter zero-padded to N digits
//   {rand}             -> short random alphanumeric string
//   {rand:N}           -> random string of length N
//   {env:NAME}         -> value of environment variable NAME
const PLACEHOLDER_RE = /\{([a-zA-Z]+)(?:([+-]\d+)([mhd]))?(?:@([A-Za-z0-9_+\-/]+))?(?::([^}]*))?\}/g;

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

// Intl throws on a zone name it does not know; the placeholder is then left as typed.
function zoneParts(date, timeZone, options) {
  return new Intl.DateTimeFormat('en-GB', { ...(timeZone ? { timeZone } : {}), ...options }).formatToParts(date);
}

// Offset from UTC, in minutes, of a zone at an instant (this computer's zone when none is given).
function zoneOffset(date, timeZone) {
  const p = Object.fromEntries(zoneParts(date, timeZone, {
    hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
  }).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

// The wall clock of a zone as a local Date, so date-fns formats it with the usual letters.
function inZone(date, timeZone) {
  if (!timeZone) return date;
  const p = Object.fromEntries(zoneParts(date, timeZone, {
    hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
  }).map((x) => [x.type, x.value]));
  return new Date(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second, date.getMilliseconds());
}

// Daylight saving time is on when the offset is above the smaller of the two yearly extremes.
function isDst(date, timeZone) {
  const year = date.getUTCFullYear();
  const jan = zoneOffset(new Date(Date.UTC(year, 0, 1)), timeZone);
  const jul = zoneOffset(new Date(Date.UTC(year, 6, 1)), timeZone);
  return jan !== jul && zoneOffset(date, timeZone) > Math.min(jan, jul);
}

function zoneAbbreviation(date, timeZone) {
  return zoneParts(date, timeZone, { timeZoneName: 'short' }).find((x) => x.type === 'timeZoneName')?.value ?? '';
}

export function resolveTemplate(template, ctx = {}) {
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const seq = Number.isFinite(ctx.seq) ? ctx.seq : 0;

  return String(template).replace(PLACEHOLDER_RE, (match, key, amount, unit, zone, arg) => {
    try {
      switch (key) {
        case 'tz': {
          // {tz}, {tz:lower}, {tz:Europe/London}, {tz:Europe/London:upper}
          const parts = (arg || '').split(':');
          let letterCase = '';
          if (/^(lower|upper)$/i.test(parts[parts.length - 1])) letterCase = parts.pop().toLowerCase();
          const abbr = zoneAbbreviation(shifted(now, amount, unit), zone || parts[0] || undefined);
          return letterCase === 'lower' ? abbr.toLowerCase() : letterCase === 'upper' ? abbr.toUpperCase() : abbr;
        }
        case 'dst': {
          const [on, off = ''] = String(arg ?? '').split('|');
          return isDst(shifted(now, amount, unit), zone) ? on : off;
        }
        case 'date':
          return format(inZone(shifted(now, amount, unit), zone), arg && arg.length ? arg : 'yyyy-MM-dd');
        case 'time':
          return format(inZone(shifted(now, amount, unit), zone), arg && arg.length ? arg : 'HHmmss');
      }
    } catch {
      return match; // unknown zone name
    }
    switch (key) {
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
