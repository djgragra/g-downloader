// Wildcards in the file name of a source (FTP or local file): the app lists the folder and picks the file.
//   *  any run of characters      ?  one character (local files; in an ftp:// address a ? starts the query)
// Only the last part of the path (the name) can carry them, never the folder.

const hasWild = (s) => /[*?]/.test(s);

export function wildcardToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

// What the source asks for: null (an ordinary name), or { kind: 'local' | 'ftp', dir, pattern } for a wildcard name,
// or { kind: 'http' } (not possible: a web server gives no list of its files).
export function wildcardSource(source, isLocal) {
  const text = String(source || '');
  if (isLocal) {
    const cut = Math.max(text.lastIndexOf('/'), text.lastIndexOf('\\'));
    const name = text.slice(cut + 1);
    return hasWild(name) ? { kind: 'local', dir: cut >= 0 ? text.slice(0, cut + 1) : '.', pattern: name } : null;
  }
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const decoded = decodeURIComponent(url.pathname);
  const cut = decoded.lastIndexOf('/');
  const name = decoded.slice(cut + 1);
  if (!/[*]/.test(name)) return null;
  return /^ftps?:$/i.test(url.protocol) ? { kind: 'ftp', dir: decoded.slice(0, cut + 1), pattern: name, url } : { kind: 'http' };
}

// candidates: [{ name, size, mtimeMs? }] (files only). The newest wins: by modification time, then by name
// (descending: names that carry a date or an hour sort the right way). Returns { chosen, others } or null.
export function pickMatch(candidates, pattern) {
  const re = wildcardToRegex(pattern);
  const found = candidates.filter((c) => re.test(c.name));
  if (!found.length) return null;
  found.sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0) || (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
  return { chosen: found[0], others: found.slice(1) };
}

// The file picked is the one taken last time and has not changed: nothing new has arrived.
export function sameAsBefore(last, chosen) {
  return !!last && last.name === chosen.name && last.size === chosen.size && (last.mtimeMs || 0) === (chosen.mtimeMs || 0);
}

// The same ftp:// address with the real name in place of the pattern.
export function ftpUrlWithName(url, dir, name) {
  const u = new URL(url.href);
  u.pathname = dir.split('/').map(encodeURIComponent).join('/') + encodeURIComponent(name);
  return u.toString();
}
