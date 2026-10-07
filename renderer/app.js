'use strict';

const state = {
  tasks: [],
  selectedId: null,
  editing: null, // working copy of the task currently shown in the editor
  mode: 'dashboard', // 'empty' | 'task' | 'settings' | 'dashboard'
  settings: null,
  logsByTask: {},
  queue: [], // upcoming schedule fires, time-sorted
  activeDownloads: {}, // taskId -> { name, pct, received, total }
  categoryFilter: null // set from the dashboard "by category" card, filters the sidebar task list
};

let lastFocusedTemplateInput = null;

const PLACEHOLDERS = [
  { label: '{date:yyyyMMdd}', desc: 'Data odierna, es. 20260921' },
  { label: '{date:yyyy-MM-dd}', desc: 'Data ISO' },
  { label: '{time:HHmmss}', desc: 'Ora corrente' },
  { label: '{date+1h:H}', desc: 'Ora successiva (es. 7 alle 6:57); anche -1d, +30m ...' },
  { label: '{seq:4}', desc: 'Contatore progressivo (0001, 0002, ...)' },
  { label: '{rand:6}', desc: 'Stringa casuale' }
];

// ---------- utils ----------
function uid() {
  return 'id-' + Math.random().toString(36).slice(2, 10);
}

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma'];

function toFileUrl(p) {
  let s = String(p).replace(/\\/g, '/');
  if (!s.startsWith('/')) s = '/' + s;
  return 'file://' + encodeURI(s).replace(/#/g, '%23');
}

// Formats a Date as the local (not UTC) "YYYY-MM-DDTHH:mm" string a
// datetime-local input expects.
function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Clones a schedule shifted 1 hour forward, for the "Duplica +1 ora" button —
// handy for recurring drops like an hourly news bulletin.
function shiftScheduleByHour(sched) {
  const clone = JSON.parse(JSON.stringify(sched));
  clone.id = uid();
  delete clone.lastFired;
  delete clone.fired;
  if (clone.type === 'once' && clone.datetime) {
    const d = new Date(clone.datetime);
    d.setHours(d.getHours() + 1);
    clone.datetime = toDatetimeLocalValue(d);
  } else if (clone.type === 'interval' && clone.startAt) {
    const d = new Date(clone.startAt);
    d.setHours(d.getHours() + 1);
    clone.startAt = toDatetimeLocalValue(d);
  }
  return clone;
}

// Stamps a schedule as "just (re)configured now": prevents the scheduler from treating
// an already-passed occurrence (computed from the new definition) as a missed run to
// fire immediately — only occurrences strictly after this moment can trigger it.
function rearmSchedule(sched) {
  sched.lastFired = new Date().toISOString();
  if (sched.type === 'once') sched.fired = false;
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (cur[k] == null) cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

function cleanPathForDisplay(p) {
  let s = String(p ?? '').trim();
  if (s.length >= 2) {
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) s = s.slice(1, -1);
  }
  // Only unescape backslash+space (shell paste artifact), not every backslash —
  // a bare "\X" is a normal Windows path separator, not an escape sequence.
  s = s.replace(/\\ /g, ' ');
  return s.trim();
}

// ---------- updates ----------
// One state, shown both in the bar at the top and in Settings -> Updates:
// 'available' -> 'downloading' -> 'ready' (installer downloaded and verified), or 'error'.
const upd = { state: null, info: null, text: '', pct: 0, hidden: false };

function updateErrorText(code) {
  const known = {
    'checksum-mismatch': L('il file scaricato non corrisponde al checksum della release ed è stato eliminato'),
    'no-installer': L('nella release non c\'è un installer per questo sistema'),
    'no-checksums': L('nella release manca il checksum SHA-256 dell\'installer'),
    'no-update': L('nessun aggiornamento disponibile'),
    busy: L('un download è in corso: riprova quando è finito')
  };
  return known[code] || code;
}

function setUpdateState(stateName, text, info) {
  upd.state = stateName;
  upd.text = text;
  if (info) upd.info = info;
  if (stateName !== 'downloading') upd.pct = 0;
  upd.hidden = false;
  paintUpdate();
}

function installLabel() {
  return window.api.platform === 'win32' ? L('Chiudi e installa') : L('Apri installer');
}

// Draws the shared state into the bar and, when Settings is open, into its Updates card.
function paintUpdate() {
  const s = upd.state;
  let bar = document.getElementById('update-banner');
  if (!s || upd.hidden) {
    bar?.remove();
  } else {
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'update-banner';
      bar.className = 'update-banner';
      document.querySelector('.main').prepend(bar);
    }
    bar.classList.toggle('ready', s === 'ready');
    bar.classList.toggle('error', s === 'error');
    bar.innerHTML = `
      <span class="update-banner-text">${escapeHtml(upd.text)}</span>
      ${s === 'downloading' ? `<span class="upd-progress"><i style="width:${upd.pct}%"></i></span>` : ''}
      ${s === 'available' ? `<button class="btn btn-sm" data-upd="download">${escapeHtml(L('Scarica e installa'))}</button>` : ''}
      ${s === 'ready' ? `<button class="btn btn-sm btn-install" data-upd="install">${escapeHtml(installLabel())}</button>` : ''}
      ${s === 'error' ? `<button class="btn btn-sm" data-upd="page">${escapeHtml(L('Apri pagina di download'))}</button>` : ''}
      ${s !== 'downloading' ? `<button class="btn btn-sm" data-upd="hide" title="${escapeHtml(L('Nascondi'))}">×</button>` : ''}`;
  }

  const out = document.getElementById('update-result');
  if (!out) return;
  const color = { error: 'var(--err)', ready: 'var(--ok)', available: 'var(--warn)' }[s];
  if (s) {
    out.textContent = upd.text;
    out.style.color = color || '';
  }
  const show = (id, on) => {
    const el = document.getElementById(id);
    if (el) el.style.display = on ? '' : 'none';
  };
  show('btn-update-download', s === 'available');
  show('btn-update-install', s === 'ready');
  show('btn-update-page', s === 'error');
  show('update-progress-settings', s === 'downloading');
  const fill = document.querySelector('#update-progress-settings i');
  if (fill) fill.style.width = `${upd.pct}%`;
  const install = document.getElementById('btn-update-install');
  if (install) install.textContent = installLabel();
  const check = document.getElementById('btn-check-updates');
  if (check) check.disabled = s === 'downloading';
}

function showUpdateBanner(info) {
  if (!info?.available) return;
  // never go back to "available" while downloading, or once this version is ready to install
  if (upd.state === 'downloading' || (upd.state === 'ready' && upd.info?.latest === info.latest)) return;
  setUpdateState('available', L('Nuova versione {latest} disponibile (installata: {current}).', { latest: info.latest, current: info.current }), info);
}

async function startUpdateDownload() {
  if (upd.state === 'downloading') return;
  const v = upd.info?.latest || '';
  setUpdateState('downloading', L('Download della versione {v}…', { v }));
  const res = await window.api.updates.download();
  if (res.ok) {
    const text =
      window.api.platform === 'win32'
        ? L('Versione {v} scaricata e verificata. "Chiudi e installa" chiude G-Downloader (i download pianificati si fermano) e avvia l\'installazione; al termine l\'app si riapre.', { v })
        : window.api.platform === 'darwin'
          ? L('Versione {v} scaricata e verificata. "Apri installer" apre il file .dmg: chiudi G-Downloader con "Esci" dall\'icona nella barra dei menu e trascina la nuova versione in Applicazioni.', { v })
          : L('Versione {v} scaricata e verificata. "Apri installer" mostra il file AppImage nella cartella: chiudi G-Downloader con "Esci" e avvia il nuovo file.', { v });
    setUpdateState('ready', text);
  } else {
    setUpdateState('error', L('Download dell\'aggiornamento non riuscito: {error}', { error: updateErrorText(res.error) }));
  }
}

async function installUpdate() {
  const res = await window.api.updates.install();
  if (!res.ok) setUpdateState('error', L('Installazione non avviata: {error}', { error: updateErrorText(res.error) }));
}

function handleUpdateAction(action) {
  if (action === 'download') startUpdateDownload();
  else if (action === 'install') installUpdate();
  else if (action === 'page') window.api.updates.open(upd.info?.url);
  else if (action === 'hide') {
    upd.hidden = true;
    paintUpdate();
  }
}

function onUpdateProgress({ received, total }) {
  if (upd.state !== 'downloading') return;
  const mb = (n) => (n / 1048576).toFixed(0);
  upd.pct = total ? Math.round((received * 100) / total) : 0;
  upd.text =
    L('Download della versione {v}…', { v: upd.info?.latest || '' }) +
    (total ? ` ${upd.pct}% (${mb(received)}/${mb(total)} MB)` : ` ${mb(received)} MB`);
  paintUpdate();
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatBytes(n) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

// Two independent settings: dateFormatStyle controls the NUMERIC layout (day/month
// order, 24h vs AM/PM) — built manually here so it never depends on locale data.
// language controls the TEXTUAL weekday/month names (via nameLocale, Intl-driven).
const LANG_LOCALE = { it: 'it-IT', en: 'en-US', es: 'es-ES' };

function nameLocale() {
  return LANG_LOCALE[state.settings?.language] || 'it-IT';
}

function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// ---------- category colors & task icons ----------
// Every category gets a color automatically (stable hash of its name over a palette);
// Settings -> "Categorie e colori" can override it per category.
const CATEGORY_PALETTE = ['#5b8cff', '#a478f0', '#38c6d9', '#35c98f', '#e6b450', '#ef6bab', '#ff8a4c', '#7bd88f', '#c084fc', '#4dd0e1', '#f2727f', '#8fb339'];

function autoCategoryColor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
}

function categoryColor(name) {
  const key = (name || '').trim();
  if (!key) return '#9aa1ae';
  const custom = state.settings?.categoryColors?.[key];
  return /^#[0-9a-f]{6}$/i.test(custom || '') ? custom : autoCategoryColor(key);
}

const FILE_TYPES = [
  { icon: '🎵', label: 'Audio', ext: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma', 'aif', 'aiff', 'opus'] },
  { icon: '🎬', label: 'Video', ext: ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'mpg', 'mpeg', 'm4v'] },
  { icon: '📦', label: 'Archivio', ext: ['zip', 'rar', '7z', 'gz', 'tar', 'tgz', 'bz2', 'xz'] },
  { icon: '📕', label: 'PDF', ext: ['pdf'] },
  { icon: '📄', label: 'Documento', ext: ['doc', 'docx', 'odt', 'rtf', 'txt', 'md'] },
  { icon: '🧮', label: 'Foglio di calcolo', ext: ['xls', 'xlsx', 'csv', 'ods'] },
  { icon: '🖼️', label: 'Immagine', ext: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tif', 'tiff'] },
  { icon: '🧾', label: 'Dati', ext: ['json', 'xml', 'yaml', 'yml', 'sql', 'log'] },
  { icon: '⚙️', label: 'Programma', ext: ['exe', 'msi', 'dmg', 'appimage', 'deb', 'rpm'] }
];

// Icon by the kind of file the task downloads, guessed from the saved name (or the source
// when the name comes from it). Placeholders like {date:yyyyMMdd} are ignored.
function fileTypeOf(task) {
  const name =
    task.filenameMode === 'fixed'
      ? task.fixedFilename
      : task.filenameMode === 'template'
        ? task.filenameTemplate
        : task.sourceType === 'local'
          ? task.localPath
          : task.url;
  const clean = String(name || '').replace(/\{[^}]*\}/g, '').split(/[?#]/)[0];
  const ext = (clean.match(/\.([A-Za-z0-9]{1,8})$/) || [])[1]?.toLowerCase();
  const found = FILE_TYPES.find((t) => t.ext.includes(ext));
  return found || { icon: '📥', label: 'File' };
}

function taskIcon(task) {
  const ft = fileTypeOf(task);
  const src = task.sourceType === 'local' ? L('file locale/rete') : 'web';
  return `<span class="task-icon" title="${escapeHtml(L(ft.label))} · ${src}">${ft.icon}</span>`;
}

function categoryDot(name) {
  return `<i class="cat-dot" style="background:${categoryColor(name)}"></i>`;
}

function categoryPill(name, cls = 'task-card-cat') {
  const c = categoryColor(name);
  return `<span class="${cls}" style="color:${c};background:${c}22;border-color:${c}66">${escapeHtml(name)}</span>`;
}

// Date/time layout comes from the "formato data e ora" preset (Settings). Default 'auto':
// Italian/Spanish -> 24h + DD/MM/YYYY, English -> AM/PM + MM/DD/YYYY. The language only
// drives the TEXTUAL day/month names (nameLocale).
const FORMAT_PRESETS = {
  it: { label: '24 ore, GG/MM/AAAA (Italia, Spagna)', h12: false, order: 'dmy', sep: '/' },
  us: { label: 'AM/PM, MM/GG/AAAA (USA, Regno Unito anglosassone)', h12: true, order: 'mdy', sep: '/' },
  gb: { label: '24 ore, GG/MM/AAAA (Regno Unito)', h12: false, order: 'dmy', sep: '/' },
  iso: { label: '24 ore, AAAA-MM-GG (internazionale ISO)', h12: false, order: 'ymd', sep: '-' },
  au: { label: 'AM/PM, GG/MM/AAAA', h12: true, order: 'dmy', sep: '/' }
};

function activePreset() {
  const st = state.settings || {};
  if (FORMAT_PRESETS[st.formatPreset]) return FORMAT_PRESETS[st.formatPreset];
  const legacyUs = st.formatPreset === undefined && st.dateFormatStyle === 'en';
  return FORMAT_PRESETS[legacyUs || st.language === 'en' ? 'us' : 'it'];
}

function fmtTime(date, withSeconds) {
  const min = pad2(date.getMinutes());
  const sec = withSeconds ? `:${pad2(date.getSeconds())}` : '';
  if (activePreset().h12) {
    const h12 = date.getHours() % 12 || 12;
    return `${h12}:${min}${sec} ${date.getHours() < 12 ? 'AM' : 'PM'}`;
  }
  return `${pad2(date.getHours())}:${min}${sec}`;
}

// Short date (no year) + time, e.g. "25/09, 07:57" or "09/25, 7:57 AM".
function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  const { order, sep } = activePreset();
  const dd = pad2(date.getDate());
  const mm = pad2(date.getMonth() + 1);
  const datePart = order === 'mdy' ? `${mm}${sep}${dd}` : order === 'ymd' ? `${mm}${sep}${dd}` : `${dd}${sep}${mm}`;
  return `${datePart}, ${fmtTime(date, false)}`;
}

// ---------- data loading ----------
async function loadTasks() {
  state.tasks = await window.api.tasks.list();
}

async function refreshSidebar() {
  await loadTasks();
  renderSidebar();
  if (state.mode === 'dashboard') renderDashboard();
  if (state.mode === 'tasks') renderTasksPage();
}

// ---------- sidebar ----------
function statusBadge(task) {
  if (!task.enabled) return `<span class="badge badge-off">${L("Disattivo")}</span>`;
  if (task.lastStatus === 'success') return `<span class="badge badge-ok">OK</span>`;
  if (task.lastStatus === 'error') return `<span class="badge badge-err">${L("Errore")}</span>`;
  return `<span class="badge badge-idle">${L("In attesa")}</span>`;
}

function statusClass(task) {
  if (!task.enabled) return 'status-off';
  if (task.lastStatus === 'success') return 'status-ok';
  if (task.lastStatus === 'error') return 'status-err';
  return 'status-idle';
}

function groupTasksByCategory(tasks) {
  const groups = new Map();
  for (const task of tasks) {
    const key = (task.category || '').trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
  }
  const named = [...groups.entries()]
    .filter(([key]) => key)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, items]) => ({ name, items }));
  const uncategorized = groups.get('');
  if (uncategorized?.length) named.push({ name: tr('uncategorized'), items: uncategorized });
  return named;
}

function renderTaskItem(t) {
  return `
    <div class="task-item ${statusClass(t)} ${t.id === state.selectedId && state.mode === 'task' ? 'active' : ''}" data-task-id="${t.id}">
      <div class="task-item-top">
        <span class="task-item-name">${categoryDot(t.category)}${taskIcon(t)} ${escapeHtml(t.name)}</span>
        ${statusBadge(t)}
      </div>
      <div class="task-item-meta">
        <span>${escapeHtml(tr('nextRunLabel'))}: ${fmtDate(t.nextRun)}</span>
      </div>
    </div>`;
}

function renderSidebar() {
  document.getElementById('btn-dashboard').classList.toggle('active', state.mode === 'dashboard');
  document.getElementById('btn-tasks').classList.toggle('active', state.mode === 'tasks');
  const header = document.getElementById('task-list-header');
  const list = document.getElementById('task-list');

  if (state.categoryFilter) {
    header.innerHTML = `${escapeHtml(tr('task'))} <span class="category-filter-chip">${escapeHtml(state.categoryFilter)} <span id="btn-clear-category-filter" title="×">✕</span></span>`;
    const clearBtn = document.getElementById('btn-clear-category-filter');
    if (clearBtn)
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.categoryFilter = null;
        renderSidebar();
      });
  } else {
    header.textContent = tr('task');
  }

  if (!state.tasks.length) {
    list.innerHTML = `<div class="hint" style="padding:10px">${escapeHtml(tr('noTasks'))}</div>`;
    return;
  }
  const visibleTasks = state.categoryFilter
    ? state.tasks.filter((x) => (x.category || tr('uncategorized')) === state.categoryFilter)
    : state.tasks;
  const groups = groupTasksByCategory(visibleTasks);
  if (groups.length === 1 && groups[0].name === tr('uncategorized')) {
    list.innerHTML = visibleTasks.map(renderTaskItem).join('');
  } else {
    list.innerHTML = groups
      .map(
        (g) => `
        <div class="category-group">
          <div class="category-group-title" style="color:${categoryColor(g.name === tr('uncategorized') ? '' : g.name)}">${escapeHtml(g.name)} <span class="category-count" style="background:${categoryColor(g.name === tr('uncategorized') ? '' : g.name)}22;color:inherit">${g.items.length}</span></div>
          ${g.items.map(renderTaskItem).join('')}
        </div>`
      )
      .join('');
  }

  list.querySelectorAll('[data-task-id]').forEach((el) => {
    el.addEventListener('click', () => selectTask(el.dataset.taskId));
  });
}

// ---------- task selection ----------
async function selectTask(id) {
  state.mode = 'task';
  state.selectedId = id;
  state.editing = await window.api.tasks.get(id);
  renderSidebar();
  renderEditor();
}

async function newTask() {
  const t = await window.api.tasks.newTemplate();
  await window.api.tasks.save(t);
  await refreshSidebar();
  await selectTask(t.id);
}

// ---------- editor: task ----------
function scheduleSummary(s) {
  if (s.type === 'cron') return `Cron: ${s.expr || '* * * * *'}`;
  if (s.type === 'once') return `${L('Una volta:')} ${s.datetime ? fmtDate(s.datetime) : '—'}`;
  if (s.type === 'interval') return L('Ogni {n} min', { n: s.everyMinutes || 60 });
  return s.type;
}

// Short weekday names follow the interface language (Mon/Lun/...).
const DAY_DEFS = [1, 2, 3, 4, 5, 6, 0].map((v) => ({
  v,
  get l() {
    const name = new Date(2024, 0, 7 + v).toLocaleDateString(nameLocale(), { weekday: 'short' }).replace('.', '');
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
}));

function renderScheduleRow(s, idx) {
  const type = s.type || 'cron';
  let fields = '';
  if (type === 'cron') {
    const cronMode = s.cronMode || 'friendly';
    const days = Array.isArray(s.days) ? s.days : [1, 2, 3, 4, 5];
    const times = Array.isArray(s.times) && s.times.length ? s.times : [s.time || '09:00'];
    fields = `
      <div class="field span-2">
        <label>${L("Modalità")}</label>
        <select data-bind="schedules.${idx}.cronMode" data-reflow="true">
          <option value="friendly" ${cronMode === 'friendly' ? 'selected' : ''}>${L("Giorni della settimana + orario")}</option>
          <option value="advanced" ${cronMode === 'advanced' ? 'selected' : ''}>${L("Espressione cron avanzata")}</option>
        </select>
      </div>
      ${
        cronMode === 'friendly'
          ? `<div class="field span-2">
              <label>${L("Giorni")}</label>
              <div class="day-presets">
                <button type="button" class="btn btn-xs" data-day-preset="weekdays:${idx}">${L("Lun-Ven")}</button>
                <button type="button" class="btn btn-xs" data-day-preset="weekend:${idx}">${L("Sab-Dom")}</button>
                <button type="button" class="btn btn-xs" data-day-preset="all:${idx}">${L("Tutti i giorni")}</button>
              </div>
              <div class="day-chips">
                ${DAY_DEFS.map((d) => `<span class="day-chip ${days.includes(d.v) ? 'on' : ''}" data-day-toggle="${idx}:${d.v}">${d.l}</span>`).join('')}
              </div>
              <div class="hint">${L("Per un giorno singolo seleziona una sola casella (es. solo \"Ven\").")}</div>
            </div>
            <div class="field span-2">
              <label>${L("Orari (uno o più, stessi giorni sopra — es. bollettino ogni ora)")}</label>
              <div class="times-list">
                ${times
                  .map(
                    (t, ti) => `
                  <div class="inline-fields" style="margin-bottom:6px">
                    <input type="time" style="flex:1" data-bind="schedules.${idx}.times.${ti}" value="${escapeHtml(t)}" />
                    ${times.length > 1 ? `<button type="button" class="btn btn-ghost btn-icon" data-remove-time="${idx}:${ti}" title="${escapeHtml(L("Rimuovi orario"))}">✕</button>` : ''}
                  </div>`
                  )
                  .join('')}
              </div>
              <button type="button" class="btn btn-sm" data-add-time="${idx}">${L("+ Aggiungi orario (+1h dall'ultimo)")}</button>
              <div class="hint">${L("Utile per orari fissi ma irregolari (es. ogni ora dalle 6 alle 20 escluse le 13 e le 17): aggiungi qui ogni orario di uscita.")}</div>
            </div>`
          : `<div class="field span-2">
              <label>${L("Espressione cron (min ora giorno mese giorno-settimana)")}</label>
              <div class="inline-fields">
                <input type="text" style="flex:1" data-bind="schedules.${idx}.expr" value="${escapeHtml(s.expr || '0 9 * * *')}" placeholder="0 9 * * 1-5" />
                <button type="button" class="btn btn-sm" data-open-cron-help title="${escapeHtml(L("Aiuto sintassi cron"))}">${L("? Aiuto")}</button>
              </div>
              <div class="hint">${L("Es. \"0 9 * * 1-5\" = ogni giorno feriale alle 9:00. \"*/30 * * * *\" = ogni 30 minuti.")}</div>
            </div>`
      }`;
  } else if (type === 'once') {
    fields = `
      <div class="field">
        <label>${L("Data e ora")}</label>
        <div class="inline-fields">
          <input type="datetime-local" style="flex:1" data-bind="schedules.${idx}.datetime" value="${escapeHtml(s.datetime || '')}" />
          <button type="button" class="btn btn-sm" data-copy-schedule="${idx}" title="${escapeHtml(L("Duplica questa pianificazione +1 ora"))}">+1h</button>
        </div>
      </div>`;
  } else if (type === 'interval') {
    const everyUnit = s.everyUnit || 'minutes';
    const everyValue = s.everyValue ?? s.everyMinutes ?? 60;
    const unitLabels = { seconds: L('Secondi'), minutes: L('Minuti'), hours: L('Ore'), days: L('Giorni') };
    fields = `
      <div class="field-grid">
        <div class="field">
          <label>${L("Ripeti ogni")}</label>
          <div class="inline-fields">
            <input type="number" min="1" style="width:90px" data-bind="schedules.${idx}.everyValue" value="${everyValue}" />
            <select data-bind="schedules.${idx}.everyUnit" style="flex:1">
              ${Object.entries(unitLabels).map(([v, l]) => `<option value="${v}" ${everyUnit === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label>${L("A partire da (opzionale)")}</label>
          <div class="inline-fields">
            <input type="datetime-local" style="flex:1" data-bind="schedules.${idx}.startAt" value="${escapeHtml(s.startAt || '')}" />
            <button type="button" class="btn btn-sm" data-copy-schedule="${idx}" title="${escapeHtml(L("Duplica questa pianificazione +1 ora"))}">+1h</button>
          </div>
        </div>
        <div class="field">
          <label>${L("Ripeti fino a (opzionale)")}</label>
          <input type="datetime-local" data-bind="schedules.${idx}.untilAt" value="${escapeHtml(s.untilAt || '')}" />
        </div>
      </div>
      <div class="hint">${L("Se vuoto parte subito; se impostata, il primo tentativo avviene a quell'orario e poi si ripete ad ogni intervallo, fino al limite indicato (se presente).")}</div>`;
  }
  return `
    <div class="row" data-schedule-idx="${idx}">
      <div class="row-top">
        <select data-bind="schedules.${idx}.type" data-reflow="true">
          <option value="cron" ${type === 'cron' ? 'selected' : ''}>${L("Espressione cron")}</option>
          <option value="once" ${type === 'once' ? 'selected' : ''}>${L("Una tantum")}</option>
          <option value="interval" ${type === 'interval' ? 'selected' : ''}>${L("Ripeti ogni intervallo (sec/min/ore/giorni)")}</option>
        </select>
        <input type="text" style="flex:1" data-bind="schedules.${idx}.label" value="${escapeHtml(s.label || '')}" placeholder="${escapeHtml(L("Etichetta (opzionale)"))}" />
        <label class="toggle">
          <span class="switch ${s.enabled === false ? '' : 'on'}" data-toggle="schedules.${idx}.enabled"></span>
          ${L("Attiva")}
        </label>
        <button type="button" class="btn btn-sm" data-preview-schedule="${idx}" title="${escapeHtml(L("Mostra le prossime occorrenze"))}">${L("👁 Anteprima")}</button>
        <button class="btn btn-ghost btn-icon" data-remove-schedule="${idx}" title="${escapeHtml(L("Rimuovi"))}">✕</button>
      </div>
      ${fields}
      <div class="field span-2">
        <label>${L("URL solo per questa pianificazione (opzionale)")}</label>
        <input type="text" class="template-field" data-bind="schedules.${idx}.urlOverride" value="${escapeHtml(s.urlOverride || '')}" placeholder="${escapeHtml(L("Se vuoto usa l'URL del task — utile quando lo stesso prodotto ha un file diverso a seconda dell'orario o del giorno"))}" />
      </div>
      <div class="field span-2">
        <label>${L("Dopo il download")}</label>
        <select data-bind="schedules.${idx}.afterDownload">
          <option value="actions" ${(s.afterDownload || 'actions') === 'actions' ? 'selected' : ''}>${L("Esegui le azioni successive")}</option>
          <option value="none" ${s.afterDownload === 'none' ? 'selected' : ''}>${L("Solo download: non eseguire le azioni")}</option>
          <option value="wait" ${s.afterDownload === 'wait' ? 'selected' : ''}>${L("Aspetta la mia conferma e avvisami (email/Telegram)")}</option>
        </select>
      </div>
      <div class="schedule-preview" id="schedule-preview-${idx}" style="display:none"></div>
    </div>`;
}

function renderActionRow(a, idx) {
  const type = a.type || 'run';
  let fields = '';
  if (type === 'run') {
    const mode = a.mode === 'line' ? 'line' : 'program';
    const modeFields =
      mode === 'line'
        ? `<div class="field span-2">
            <label>${L("Righe di comando (una per riga, incollale così come sono)")}</label>
            <textarea data-bind="postActions.${idx}.commandLine" rows="4" spellcheck="false" placeholder='Start /min "" /D "C:\App" "C:\App\tool.exe" /config=config.json /id=1&#10;Start /min "" /D "C:\App" "C:\App\tool.exe" /config=config2.json /id=2'>${escapeHtml(a.commandLine || '')}</textarea>
            <div class="hint">${L("Ogni riga viene eseguita dalla shell del sistema (cmd.exe su Windows), una dopo l'altra: funzionano Start, pipe, redirect e le virgolette come dal prompt dei comandi. Le righe vuote e quelle che iniziano con :: o REM sono ignorate.")}</div>
          </div>
          <div class="field">
            <label>${L("Pausa tra una riga e la successiva (secondi)")}</label>
            <input type="number" min="0" data-bind="postActions.${idx}.gapSeconds" value="${a.gapSeconds ?? 0}" />
          </div>`
        : `<div class="inline-fields">
            <div class="field">
              <label>${L("Comando / eseguibile")}</label>
              <div class="inline-fields">
                <input type="text" style="flex:1;min-width:220px" data-bind="postActions.${idx}.command" value="${escapeHtml(a.command || '')}" placeholder="${escapeHtml(L("es. python o C:\\Script\\avvia.bat"))}" />
                <button class="btn btn-sm" data-pick-action-file="${idx}">${L("Sfoglia…")}</button>
              </div>
            </div>
            <div class="field">
              <label>${L("Argomenti (uno per riga)")}</label>
              <textarea data-bind-list="postActions.${idx}.args" rows="2" placeholder="{filepath}">${escapeHtml((a.args || []).join('\n'))}</textarea>
            </div>
          </div>`;
    fields = `
      <div class="field span-2">
        <label>${L("Come indicare il comando")}</label>
        <select data-bind="postActions.${idx}.mode" data-reflow="true">
          <option value="program" ${mode === 'program' ? 'selected' : ''}>${L("Programma + argomenti")}</option>
          <option value="line" ${mode === 'line' ? 'selected' : ''}>${L("Riga di comando completa")}</option>
        </select>
      </div>
      ${modeFields}
      <div class="inline-fields">
        <div class="field">
          <label>${L("Cartella di lavoro (opzionale)")}</label>
          <input type="text" data-bind="postActions.${idx}.cwd" value="${escapeHtml(a.cwd || '')}" placeholder="{folder}" />
        </div>
        <div class="field">
          <label>${L("Attesa iniziale dopo il download, prima della prima riga (secondi)")}</label>
          <input type="number" min="0" data-bind="postActions.${idx}.delaySeconds" value="${a.delaySeconds ?? 0}" />
        </div>
      </div>
      <div class="field span-2">
        <label class="toggle"><span class="switch ${a.stopOnError === false ? '' : 'on'}" data-toggle="postActions.${idx}.stopOnError"></span> ${L("Se il comando fallisce, segna il task come errore")}</label>
      </div>
      <div class="hint">${L("Placeholder: {filepath} {filename} {folder} {taskName} e date/ore come {date:yyyyMMdd}, {date+1h:H}. L'azione parte solo se il download è riuscito. Tempi: download ok → attesa iniziale (una volta sola) → prima riga → pausa → seconda riga → pausa → … La pausa vale solo tra le righe di questo campo, non tra azioni diverse (ognuna ha la sua attesa iniziale).")}</div>`;
  } else if (type === 'move') {
    fields = `
      <div class="field">
        <label>${L("Cartella di destinazione")}</label>
        <div class="inline-fields">
          <input type="text" style="flex:1;min-width:220px" data-bind="postActions.${idx}.targetFolder" value="${escapeHtml(a.targetFolder || '')}" placeholder="${escapeHtml(L("es. D:\\Archivio\\{date:yyyy}"))}" />
          <button class="btn btn-sm" data-pick-action-folder="${idx}">${L("Sfoglia…")}</button>
        </div>
      </div>`;
  } else if (type === 'open') {
    fields = `
      <div class="field">
        <label>${L("Cosa aprire")}</label>
        <select data-bind="postActions.${idx}.target">
          <option value="file" ${a.target !== 'folder' ? 'selected' : ''}>${L("Il file scaricato")}</option>
          <option value="folder" ${a.target === 'folder' ? 'selected' : ''}>${L("La cartella di destinazione")}</option>
        </select>
      </div>`;
  } else if (type === 'notify') {
    fields = `
      <div class="inline-fields">
        <div class="field">
          <label>${L("Titolo")}</label>
          <input type="text" data-bind="postActions.${idx}.title" value="${escapeHtml(a.title || '')}" placeholder="{taskName}" />
        </div>
        <div class="field">
          <label>${L("Messaggio")}</label>
          <input type="text" data-bind="postActions.${idx}.body" value="${escapeHtml(a.body || '')}" placeholder="${escapeHtml(L("Download completato: {filename}"))}" />
        </div>
      </div>`;
  }
  const typeLabels = { run: L('Esegui programma/script'), move: L('Sposta file'), open: L('Apri file/cartella'), notify: L('Notifica di sistema') };
  return `
    <div class="row" data-action-idx="${idx}">
      <div class="row-top">
        <select data-bind="postActions.${idx}.type" data-reflow="true">
          ${Object.entries(typeLabels).map(([v, l]) => `<option value="${v}" ${type === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <span class="spacer"></span>
        <label class="toggle">
          <span class="switch ${a.enabled === false ? '' : 'on'}" data-toggle="postActions.${idx}.enabled"></span>
          ${L("Attiva")}
        </label>
        <button class="btn btn-sm" data-preview-action="${idx}" title="${escapeHtml(L("Mostra i comandi con i segnaposto già sostituiti, senza eseguirli"))}">${L("👁 Anteprima")}</button>
        <button class="btn btn-sm" data-run-action="${idx}" title="${escapeHtml(L("Esegui solo questa azione sul file già presente (anche se è disattivata)"))}">${L("▶ Esegui")}</button>
        <button class="btn btn-ghost btn-icon" data-remove-action="${idx}" title="${escapeHtml(L("Rimuovi"))}">✕</button>
      </div>
      ${fields}
      <pre class="action-preview" id="action-preview-${idx}" style="display:none"></pre>
    </div>`;
}

async function renderDashboard() {
  const root = document.getElementById('editor-root');
  const dailyStats = await window.api.stats.daily();
  if (state.mode !== 'dashboard') return;
  const tasks = state.tasks;
  const allHistory = [];
  for (const t of tasks) {
    for (const h of t.history || []) allHistory.push({ ...h, taskName: t.name, taskId: t.id });
  }
  allHistory.sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));

  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((t) => t.enabled).length;
  const isToday = (iso) => iso && new Date(iso).toDateString() === new Date().toDateString();
  const todayStats = dailyStats[dateKey(new Date())] || {};
  const successToday = todayStats.s || 0;
  const errorToday = todayStats.e || 0;
  const next24hItems = state.queue.filter((q) => new Date(q.time) - new Date() <= 24 * 3600_000);
  const queuedNext24h = next24hItems.length;

  const totalBytes = Object.values(dailyStats).reduce((sum, d) => sum + (d.bytes || 0), 0);
  const durations = allHistory
    .filter((h) => h.status === 'success' && h.startedAt && h.finishedAt)
    .map((h) => new Date(h.finishedAt) - new Date(h.startedAt));
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  let ok30 = 0;
  let ko30 = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const st = dailyStats[dateKey(d)];
    if (st) {
      ok30 += st.s || 0;
      ko30 += st.e || 0;
    }
  }
  const successRate = ok30 + ko30 ? Math.round((ok30 / (ok30 + ko30)) * 100) : null;

  const actClear = state.settings?.activityClearedAt || null;
  const errClear = state.settings?.errorsClearedAt || null;
  const recentList = actClear ? allHistory.filter((h) => new Date(h.finishedAt) > new Date(actClear)) : allHistory;
  const failuresByTask = {};
  for (const h of allHistory) {
    if (h.status === 'error' && (!errClear || new Date(h.finishedAt) > new Date(errClear))) {
      const key = h.taskId;
      if (!failuresByTask[key]) failuresByTask[key] = { name: h.taskName, count: 0 };
      failuresByTask[key].count++;
    }
  }
  const topFailing = Object.entries(failuresByTask)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const categoryStats = {};
  for (const task of tasks) {
    const cat = (task.category || '').trim() || tr('uncategorized');
    if (!categoryStats[cat]) categoryStats[cat] = { count: 0, active: 0 };
    categoryStats[cat].count++;
    if (task.enabled) categoryStats[cat].active++;
  }
  const categoryRows = Object.entries(categoryStats).sort((a, b) => b[1].count - a[1].count);

  // Success/error counts per day for the selected period (7/14/30 days), oldest to newest.
  // Read from the permanent daily counters, not from the capped per-task history.
  const range = [7, 14, 30].includes(state.chartRange) ? state.chartRange : 7;
  const dayList = [];
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    dayList.push(d);
  }
  const dayCounts = dayList.map((d) => {
    const st = dailyStats[dateKey(d)] || {};
    return {
      date: d,
      label: range === 7 ? d.toLocaleDateString(nameLocale(), { weekday: 'short' }) : String(d.getDate()),
      success: st.s || 0,
      error: st.e || 0
    };
  });
  const rangeSuccess = dayCounts.reduce((a, d) => a + d.success, 0);
  const rangeError = dayCounts.reduce((a, d) => a + d.error, 0);
  const rangeBytes = dayList.reduce((a, d) => a + (dailyStats[dateKey(d)]?.bytes || 0), 0);
  const maxCount = Math.max(1, ...dayCounts.map((d) => d.success + d.error));
  const chartH = 110;
  const barW = range === 7 ? 34 : range === 14 ? 22 : 12;
  const gap = range === 7 ? 16 : range === 14 ? 10 : 5;
  const chartW = range * (barW + gap) - gap;
  const bars = dayCounts
    .map((d, i) => {
      const x = i * (barW + gap);
      const sH = Math.round((d.success / maxCount) * chartH);
      const eH = Math.round((d.error / maxCount) * chartH);
      const total = d.success + d.error;
      const showLabel = range < 30 || i % 3 === 0 || i === range - 1;
      const tip = `${d.date.toLocaleDateString(nameLocale(), { weekday: 'long', day: '2-digit', month: 'long' })}: ${d.success} ok, ${d.error} ${L('falliti')}`;
      return `
        <g>
          <title>${escapeHtml(tip)}</title>
          ${d.error ? `<rect x="${x}" y="${chartH - sH - eH}" width="${barW}" height="${eH}" rx="3" fill="var(--err)" />` : ''}
          ${d.success ? `<rect x="${x}" y="${chartH - sH}" width="${barW}" height="${sH}" rx="3" fill="var(--ok)" />` : ''}
          ${!total ? `<rect x="${x}" y="${chartH - 3}" width="${barW}" height="3" rx="1.5" fill="var(--border)" />` : ''}
          ${total && range <= 14 ? `<text x="${x + barW / 2}" y="${chartH - sH - eH - 4}" text-anchor="middle" fill="var(--text)" font-size="10" font-weight="700">${total}</text>` : ''}
          ${showLabel ? `<text x="${x + barW / 2}" y="${chartH + 16}" text-anchor="middle" fill="var(--text-dim)" font-size="${range === 30 ? 9 : 10}">${d.label}</text>` : ''}
        </g>`;
    })
    .join('');

  // Per-task totals over the same period (stacked ok/error bars), busiest first.
  const perTask = {};
  for (const d of dayList) {
    const dayTasks = dailyStats[dateKey(d)]?.tasks || {};
    for (const [id, [s, e]] of Object.entries(dayTasks)) {
      perTask[id] ||= { s: 0, e: 0 };
      perTask[id].s += s;
      perTask[id].e += e;
    }
  }
  const taskRows = Object.entries(perTask)
    .map(([id, v]) => ({ id, name: tasks.find((t) => t.id === id)?.name, ...v }))
    .filter((r) => r.name)
    .sort((a, b) => b.s + b.e - (a.s + a.e));
  const maxTaskTotal = Math.max(1, ...taskRows.map((r) => r.s + r.e));

  // Downloads by hour of the day over the same period.
  const hourTotals = new Array(24).fill(0);
  for (const d of dayList) (dailyStats[dateKey(d)]?.hours || []).forEach((n, h) => (hourTotals[h] += n));
  const maxHour = Math.max(1, ...hourTotals);
  const hourBars = hourTotals
    .map((n, h) => {
      const bh = Math.round((n / maxHour) * 70);
      return `<g><title>${pad2(h)}:00 – ${n} ${L('download')}</title>
        <rect x="${h * 14}" y="${74 - bh}" width="11" height="${Math.max(bh, n ? 2 : 1)}" rx="2" fill="${n ? 'var(--accent)' : 'var(--border)'}" />
        ${h % 3 === 0 ? `<text x="${h * 14 + 5.5}" y="90" text-anchor="middle" fill="var(--text-dim)" font-size="9">${pad2(h)}</text>` : ''}</g>`;
    })
    .join('');

  root.innerHTML = `
    <div class="editor-header">
      <div class="editor-title">
        <span class="editor-title-logo" style="display:inline-flex;align-items:center;justify-content:center;font-size:22px;line-height:1">📊</span>
        <h2 style="margin:0">${escapeHtml(tr('dashboard'))}</h2>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-tile stat-blue"><div class="stat-value">${totalTasks}</div><div class="stat-label">${escapeHtml(tr('totalTasks'))}</div></div>
      <div class="stat-tile stat-purple"><div class="stat-value">${activeTasks}</div><div class="stat-label">${escapeHtml(tr('activeTasks'))}</div></div>
      <div class="stat-tile stat-teal"><div class="stat-value">${queuedNext24h}</div><div class="stat-label">${escapeHtml(tr('queuedNext24h'))}</div></div>
      <div class="stat-tile stat-ok"><div class="stat-value">${successToday}</div><div class="stat-label">${escapeHtml(tr('completedToday'))}</div></div>
      <div class="stat-tile stat-err"><div class="stat-value">${errorToday}</div><div class="stat-label">${escapeHtml(tr('failedToday'))}</div></div>
    </div>

    <div class="stat-grid">
      <div class="stat-tile stat-teal"><div class="stat-value">${successRate === null ? '—' : successRate + '%'}</div><div class="stat-label">${escapeHtml(tr('successRate30d'))}</div></div>
      <div class="stat-tile stat-blue"><div class="stat-value">${formatBytes(totalBytes)}</div><div class="stat-label">${escapeHtml(tr('totalDataDownloaded'))}</div></div>
      <div class="stat-tile stat-purple"><div class="stat-value">${formatDuration(avgDuration)}</div><div class="stat-label">${escapeHtml(tr('avgDownloadDuration'))}</div></div>
    </div>

    <div class="dashboard-columns">
      <div class="card">
        <div class="card-head">
          <h3>${L('Attività ultimi {n} giorni', { n: range })}</h3>
          <div class="seg-control seg-small">
            ${[7, 14, 30].map((n) => `<button class="seg-btn ${range === n ? 'on' : ''}" data-chart-range="${n}">${L('{n}g', { n })}</button>`).join('')}
          </div>
        </div>
        <div class="chart-summary">
          <span><b>${rangeSuccess + rangeError}</b> ${L("download")}</span>
          <span style="color:var(--ok)"><b>${rangeSuccess}</b> ok</span>
          <span style="color:${rangeError ? 'var(--err)' : 'var(--text-dim)'}"><b>${rangeError}</b> ${L("falliti")}</span>
          <span><b>${formatBytes(rangeBytes)}</b> ${L("scaricati")}</span>
          <span><b>${(( rangeSuccess + rangeError) / range).toFixed(1)}</b> ${L("al giorno")}</span>
        </div>
        <svg viewBox="0 -16 ${chartW} ${chartH + 40}" class="dashboard-chart">
          ${bars}
        </svg>
        <div class="chart-legend">
          <span><i class="legend-dot" style="background:var(--ok)"></i> ${escapeHtml(tr('completedLegend'))}</span>
          <span><i class="legend-dot" style="background:var(--err)"></i> ${escapeHtml(tr('failedLegend'))}</span>
        </div>
      </div>

      <div class="card">
        <h3>${escapeHtml(tr('next24h'))}</h3>
        ${
          next24hItems.length
            ? `<div class="activity-list">
                ${next24hItems
                  .map(
                    (q) => `
                  <div class="activity-row clickable" data-goto-task="${q.taskId}">
                    <span class="activity-dot idle"></span>
                    <span class="activity-name">${escapeHtml(q.taskName)}</span>
                    <span class="activity-detail"></span>
                    <span class="activity-time">${fmtDate(q.time)}</span>
                  </div>`
                  )
                  .join('')}
              </div>`
            : `<div class="hint">${escapeHtml(tr('noUpcoming24h'))}</div>`
        }
      </div>
    </div>

    <div class="dashboard-columns">
      <div class="card">
        <h3>${L("Download per task")} <span class="hint">— ${L('ultimi {n} giorni', { n: range })}</span></h3>
        ${
          taskRows.length
            ? `<div class="task-bars">${taskRows
                .map(
                  (r) => `
              <div class="task-bar-row clickable" data-goto-task="${r.id}" title="${escapeHtml(r.name)}: ${r.s} ok, ${r.e} ${L('falliti')}">
                <span class="task-bar-name">${escapeHtml(r.name)}</span>
                <span class="task-bar-track">
                  <i style="width:${((r.s / maxTaskTotal) * 100).toFixed(1)}%;background:var(--ok)"></i><i style="width:${((r.e / maxTaskTotal) * 100).toFixed(1)}%;background:var(--err)"></i>
                </span>
                <span class="task-bar-num">${r.s + r.e}</span>
              </div>`
                )
                .join('')}</div>`
            : `<div class="hint">${L("Nessun download nel periodo.")}</div>`
        }
      </div>
      <div class="card">
        <h3>${L("Download per ora del giorno")} <span class="hint">— ${L('ultimi {n} giorni', { n: range })}</span></h3>
        <svg viewBox="0 0 336 96" class="dashboard-chart">${hourBars}</svg>
      </div>
    </div>

    <div class="dashboard-columns">
      <div class="card">
        <div class="card-head">
          <h3>${escapeHtml(tr('recentActivity'))}</h3>
          <button class="btn btn-xs btn-ghost" data-clear-activity title="${escapeHtml(L("Nasconde l'attività registrata finora (lo storico dei task resta)"))}">${L("🧹 Pulisci")}</button>
        </div>
        ${actClear ? `<div class="hint">${L('Elenco pulito il {d}', { d: fmtDate(actClear) })} · <a href="#" data-restore-activity>${L("mostra tutto")}</a></div>` : ''}
        ${
          recentList.length
            ? `<div class="activity-list">
                ${recentList
                  .slice(0, 12)
                  .map(
                    (h) => `
                  <div class="activity-row clickable" data-goto-task="${h.taskId}">
                    <span class="activity-dot ${h.status === 'success' ? 'ok' : 'err'}"></span>
                    <span class="activity-name">${escapeHtml(h.taskName)}</span>
                    <span class="activity-detail">${h.status === 'success' ? escapeHtml(h.filepath ? h.filepath.split('/').pop() : tr('completedFallback')) : escapeHtml(h.error || tr('errorFallback'))}</span>
                    <span class="activity-time">${fmtDate(h.finishedAt)}</span>
                  </div>`
                  )
                  .join('')}
              </div>`
            : `<div class="hint">${escapeHtml(tr('noActivityYet'))}</div>`
        }
      </div>

      <div class="card">
        <div class="card-head">
          <h3>${escapeHtml(tr('topFailing'))}</h3>
          <button class="btn btn-xs btn-ghost" data-clear-errors title="${escapeHtml(L("Azzera il conteggio errori da adesso (lo storico dei task resta)"))}">${L("🧹 Pulisci")}</button>
        </div>
        ${errClear ? `<div class="hint">${L('Conteggio azzerato il {d}', { d: fmtDate(errClear) })} · <a href="#" data-restore-errors>${L("mostra tutto")}</a></div>` : ''}
        ${
          topFailing.length
            ? `<div class="activity-list">
                ${topFailing
                  .map(
                    ([taskId, info]) => `
                  <div class="activity-row clickable" data-goto-task="${taskId}">
                    <span class="activity-dot err"></span>
                    <span class="activity-name">${escapeHtml(info.name)}</span>
                    <span class="activity-detail">${info.count} ${info.count > 1 ? escapeHtml(tr('errorPlural')) : escapeHtml(tr('errorSingular'))}</span>
                  </div>`
                  )
                  .join('')}
              </div>`
            : `<div class="hint">${escapeHtml(tr('noErrors'))}</div>`
        }
      </div>
    </div>

    <div class="card">
      <h3>${escapeHtml(tr('byCategory'))}</h3>
      ${
        categoryRows.length
          ? `<div class="activity-list">
              ${categoryRows
                .map(
                  ([name, info]) => `
                <div class="activity-row clickable" data-filter-category="${escapeHtml(name)}">
                  <span class="activity-dot idle"></span>
                  <span class="activity-name">${escapeHtml(name)}</span>
                  <span class="activity-detail">${info.active}/${info.count} ${escapeHtml(tr('activeTasks').toLowerCase())}</span>
                </div>`
                )
                .join('')}
            </div>`
          : ''
      }
    </div>
  `;

  root.querySelectorAll('[data-goto-task]').forEach((el) => {
    el.addEventListener('click', () => selectTask(el.dataset.gotoTask));
  });
  root.querySelectorAll('[data-chart-range]').forEach((el) => {
    el.addEventListener('click', () => {
      state.chartRange = Number(el.dataset.chartRange);
      renderDashboard();
    });
  });
  const setSetting = async (patch) => {
    state.settings = await window.api.settings.update(patch);
    renderDashboard();
  };
  const bindClear = (sel, patch) => {
    const el = root.querySelector(sel);
    if (el)
      el.addEventListener('click', (e) => {
        e.preventDefault();
        setSetting(patch);
      });
  };
  bindClear('[data-clear-activity]', { activityClearedAt: new Date().toISOString() });
  bindClear('[data-clear-errors]', { errorsClearedAt: new Date().toISOString() });
  bindClear('[data-restore-activity]', { activityClearedAt: null });
  bindClear('[data-restore-errors]', { errorsClearedAt: null });
  root.querySelectorAll('[data-filter-category]').forEach((el) => {
    el.addEventListener('click', () => {
      state.categoryFilter = el.dataset.filterCategory;
      renderSidebar();
    });
  });
}

function renderEditor() {
  const root = document.getElementById('editor-root');
  if (state.mode === 'settings') return renderSettings();
  if (state.mode === 'dashboard') return renderDashboard();
  if (state.mode === 'tasks') return renderTasksPage();
  if (state.mode === 'about') return renderAbout();
  const t = state.editing;
  if (!t) {
    root.innerHTML = `<div class="empty-state"><h2>${escapeHtml(tr('noTaskSelected'))}</h2><p>${escapeHtml(tr('noTaskSelectedHint'))}</p></div>`;
    return;
  }

  const filenameMode = t.filenameMode || 'template';
  const sourceType = t.sourceType || 'web';
  const authEnabled = !!t.http?.auth?.enabled;
  const preDownloadAction = t.preDownloadAction || 'none';

  root.innerHTML = `
    <div class="editor-header">
      <div class="editor-title">
        <label class="toggle">
          <span class="switch ${t.enabled ? 'on' : ''}" data-toggle="enabled"></span>
        </label>
        <input type="text" data-bind="name" value="${escapeHtml(t.name)}" />
        <input type="text" class="category-input" data-bind="category" list="category-datalist" value="${escapeHtml(t.category || '')}" placeholder="${escapeHtml(tr('categoryPlaceholder'))}" />
        <datalist id="category-datalist">
          ${[...new Set(state.tasks.map((x) => x.category).filter(Boolean))].map((c) => `<option value="${escapeHtml(c)}"></option>`).join('')}
        </datalist>
      </div>
      <div class="editor-actions">
        <label class="toggle" title="${escapeHtml(L("Se attivo, avvia subito un download di prova ogni volta che salvi"))}">
          <span class="switch ${t.runOnSave ? 'on' : ''}" data-toggle="runOnSave"></span>
          ${escapeHtml(tr('runOnSave'))}
        </label>
        <button class="btn" id="btn-run-now" title="${escapeHtml(L("Scarica il file ed esegue le azioni successive"))}">${escapeHtml(tr('runNow'))}</button>
        <button class="btn" id="btn-run-download" title="${escapeHtml(L("Scarica il file senza eseguire le azioni successive"))}">${L("⬇ Solo download")}</button>
        ${(t.postActions || []).length ? `<button class="btn" id="btn-run-actions" title="${escapeHtml(L("Esegue solo le azioni successive sul file già presente, senza scaricare"))}">${L("⚙ Solo azioni")}</button>
        <button class="btn" id="btn-run-actions-other" title="${escapeHtml(L("Sceglie un file qualsiasi ed esegue le azioni su quello, senza scaricare"))}">${L("📂 Azioni su un altro file…")}</button>
        <span class="hint" id="actions-file-status"></span>` : ''}
      </div>
    </div>

    ${t.pendingActions ? `<div class="card pending-card">
        <div class="card-head">
          <h3>${L("⏸ Azioni in attesa di conferma")}</h3>
          <button type="button" class="btn btn-sm btn-install" id="btn-run-pending">${L("▶ Esegui azioni ora")}</button>
        </div>
        <div class="hint">${escapeHtml(t.pendingActions.filename || '')} — ${escapeHtml(fmtDate(t.pendingActions.at))}</div>
      </div>` : ''}

    ${(() => {
      const last = (t.history || []).find((h) => h.mode !== 'actions');
      if (!last || last.status !== 'success' || !last.filepath) return '';
      const isAudio = AUDIO_EXTENSIONS.some((ext) => last.filepath.toLowerCase().endsWith(ext));
      return `<div class="card">
        <div class="card-head">
          <h3>${L("Ultimo download riuscito")}</h3>
          <button type="button" class="btn btn-sm" data-reveal-file="${escapeHtml(last.filepath)}" title="${escapeHtml(L("Apre la cartella con il file selezionato (o la cartella, se il file è stato spostato)"))}">${L("📂 Mostra file")}</button>
        </div>
        <div class="hint">${escapeHtml(last.filepath.split(/[\\/]/).pop())} — ${escapeHtml(fmtDate(last.finishedAt))}${last.bytes ? ' · ' + formatBytes(last.bytes) : ''}</div>
        <span class="reveal-result hint"></span>
        ${isAudio ? `<audio controls preload="none" style="width:100%;margin-top:8px" src="${escapeHtml(toFileUrl(last.filepath))}"></audio>` : ''}
      </div>`;
    })()}

    <div class="card">
      <h3>${escapeHtml(tr('source'))}</h3>
      <div class="field span-2">
        <label>${L("Tipo sorgente")}</label>
        <select data-bind="sourceType" data-reflow="true">
          <option value="web" ${sourceType === 'web' ? 'selected' : ''}>${L("Web (URL http/https)")}</option>
          <option value="local" ${sourceType === 'local' ? 'selected' : ''}>${L("File locale / rete (percorso su disco)")}</option>
        </select>
      </div>
      ${
        sourceType === 'web'
          ? `<div class="field span-2">
              <label>${L("URL (supporta placeholder dinamici)")}</label>
              <input type="text" class="template-field" data-bind="url" value="${escapeHtml(t.url)}" placeholder="${escapeHtml(L("https://esempio.com/report_{date:yyyyMMdd}.zip"))}" />
              <div class="placeholder-chips">
                ${PLACEHOLDERS.map((p) => `<span class="chip" data-insert="${escapeHtml(p.label)}" title="${escapeHtml(L(p.desc))}">${escapeHtml(p.label)}</span>`).join('')}
              </div>
            </div>`
          : `<div class="field span-2">
              <label>${L("Percorso file (supporta placeholder dinamici)")}</label>
              <div class="inline-fields">
                <input type="text" class="template-field" style="flex:1;min-width:280px" data-bind="localPath" value="${escapeHtml(t.localPath || '')}" placeholder="${escapeHtml(L("\\\\server\\audio\\clip_{date:yyyyMMdd}.mp3"))}" />
                <button class="btn" id="btn-pick-local-path">${escapeHtml(tr('browse'))}</button>
              </div>
              <div class="placeholder-chips">
                ${PLACEHOLDERS.map((p) => `<span class="chip" data-insert="${escapeHtml(p.label)}" title="${escapeHtml(L(p.desc))}">${escapeHtml(p.label)}</span>`).join('')}
              </div>
              <div class="hint">${L("Se il file non è ancora presente (es. file non ancora consegnato), verranno ripetuti i tentativi come per il web.")}</div>
            </div>`
      }
      ${
        sourceType === 'web'
          ? `<div class="field-grid">
              <div class="field">
                <label>${L("Metodo HTTP")}</label>
                <select data-bind="http.method" data-reflow="true">
                  ${['GET', 'POST'].map((m) => `<option ${t.http?.method === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label>${L("Timeout (ms)")}</label>
                <input type="number" min="1000" step="1000" data-bind="http.timeoutMs" value="${t.http?.timeoutMs ?? 30000}" />
              </div>
            </div>
            ${
              t.http?.method === 'POST'
                ? `<div class="field-grid">
                    <div class="field">
                      <label>${L("Tipo corpo (Content-Type)")}</label>
                      <select data-bind="http.bodyType">
                        <option value="json" ${(t.http?.bodyType || 'json') === 'json' ? 'selected' : ''}>${L("JSON (application/json)")}</option>
                        <option value="text" ${t.http?.bodyType === 'text' ? 'selected' : ''}>${L("Testo semplice (text/plain)")}</option>
                      </select>
                    </div>
                  </div>
                  <div class="field span-2">
                    <label>${L("Corpo della richiesta (supporta placeholder dinamici)")}</label>
                    <textarea class="template-field" data-bind="http.body" rows="4" placeholder='{"data": "{date:yyyy-MM-dd}"}'>${escapeHtml(t.http?.body || '')}</textarea>
                  </div>`
                : ''
            }
            <div class="field span-2">
              <label class="toggle"><span class="switch ${authEnabled ? 'on' : ''}" data-toggle="http.auth.enabled"></span> ${L("Il server richiede autenticazione (utente/password)")}</label>
            </div>
            ${
              authEnabled
                ? `<div class="field-grid">
                    <div class="field">
                      <label>${L("Utente")}</label>
                      <input type="text" data-bind="http.auth.username" value="${escapeHtml(t.http?.auth?.username || '')}" autocomplete="off" />
                    </div>
                    <div class="field">
                      <label>${L("Password")}</label>
                      <div class="password-wrap"><input type="password" data-bind="http.auth.password" value="${escapeHtml(t.http?.auth?.password || '')}" autocomplete="new-password" /><button type="button" class="btn btn-sm password-eye" data-toggle-password title="${escapeHtml(L("Mostra/nascondi password"))}">👁</button></div>
                    </div>
                  </div>`
                : ''
            }`
          : ''
      }
      <div class="field-grid">
        <div class="field">
          <label>${L("Tentativi in caso di errore")}</label>
          <input type="number" min="0" data-bind="http.retries" value="${t.http?.retries ?? 3}" />
        </div>
        <div class="field">
          <label>${L("Attesa tra un tentativo e l'altro (ms)")}</label>
          <input type="number" min="1000" step="1000" data-bind="http.retryDelayMs" value="${t.http?.retryDelayMs ?? 15000}" />
        </div>
      </div>
      <div class="field span-2">
        <label class="toggle"><span class="switch ${t.notifyOnFailure !== false ? 'on' : ''}" data-toggle="notifyOnFailure"></span> ${L("Avvisa via email/Telegram se il download fallisce dopo tutti i tentativi")}</label>
      </div>
    </div>

    <div class="card">
      <h3>${escapeHtml(tr('destinationAndFilename'))}</h3>
      <div class="field span-2">
        <label>${L("Cartella di destinazione")}</label>
        <div class="inline-fields">
          <input type="text" style="flex:1;min-width:280px" data-bind="destinationFolder" value="${escapeHtml(t.destinationFolder)}" placeholder="${escapeHtml(L("Lascia vuoto per usare la cartella predefinita"))}" />
          <button class="btn" id="btn-pick-folder">${escapeHtml(tr('browse'))}</button>
        </div>
      </div>
      <div class="field span-2">
        <label>${L("Pulizia della cartella di destinazione")}</label>
        <select data-bind="preDownloadAction" data-reflow="true">
          <option value="none" ${preDownloadAction === 'none' ? 'selected' : ''}>${L("Non fare nulla")}</option>
          <option value="deleteAll" ${preDownloadAction === 'deleteAll' ? 'selected' : ''}>${L("Elimina file")}</option>
          <option value="move" ${preDownloadAction === 'move' ? 'selected' : ''}>${L("Sposta altrove i file")}</option>
        </select>
      </div>
      ${
        preDownloadAction !== 'none'
          ? (() => {
              const scope = t.preDownloadScope || 'all';
              const timing = t.preDownloadTiming || 'before';
              const needsPattern = scope === 'pattern' || scope === 'olderThan' || scope === 'keepLast';
              return `
      <div class="field span-2">
        <label>${L("A quali file si applica")}</label>
        <select data-bind="preDownloadScope" data-reflow="true">
          <option value="all" ${scope === 'all' ? 'selected' : ''}>${L("Tutto il contenuto della cartella")}</option>
          <option value="sameName" ${scope === 'sameName' ? 'selected' : ''}>${L("Solo il file con lo stesso nome di questo download")}</option>
          <option value="pattern" ${scope === 'pattern' ? 'selected' : ''}>${L("Solo i file che corrispondono a un modello (es. report_*.mp3)")}</option>
          <option value="olderThan" ${scope === 'olderThan' ? 'selected' : ''}>${L("Solo i file più vecchi di…")}</option>
          <option value="keepLast" ${scope === 'keepLast' ? 'selected' : ''}>${L("Tutti tranne gli ultimi N file più recenti")}</option>
        </select>
      </div>
      ${
        needsPattern
          ? `<div class="field span-2">
              <label>${L('Modello nome file')} ${scope === 'pattern' ? '' : L('(opzionale: se vuoto vale per tutti i file)')}</label>
              <input type="text" class="template-field" data-bind="preDownloadPattern" value="${escapeHtml(t.preDownloadPattern || '')}" placeholder="${escapeHtml(L("es. report_*.mp3; *.tmp — * = qualsiasi testo, ? = un carattere, più modelli separati da ;"))}" />
            </div>`
          : ''
      }
      ${
        scope === 'olderThan'
          ? `<div class="field-grid">
              <div class="field"><label>${L("Età minima")}</label><input type="number" min="0" data-bind="preDownloadAgeValue" value="${t.preDownloadAgeValue ?? 7}" /></div>
              <div class="field"><label>${L("Unità")}</label>
                <select data-bind="preDownloadAgeUnit">
                  <option value="days" ${(t.preDownloadAgeUnit || 'days') === 'days' ? 'selected' : ''}>${L("Giorni")}</option>
                  <option value="hours" ${t.preDownloadAgeUnit === 'hours' ? 'selected' : ''}>${L("Ore")}</option>
                </select>
              </div>
            </div>`
          : ''
      }
      ${
        scope === 'keepLast'
          ? `<div class="field"><label>${L("Quanti file più recenti tenere")}</label><input type="number" min="0" data-bind="preDownloadKeepLast" value="${t.preDownloadKeepLast ?? 5}" /></div>`
          : ''
      }
      ${
        scope !== 'sameName'
          ? `<div class="field span-2"><label class="toggle"><span class="switch ${t.preDownloadSubfolders === false ? '' : 'on'}" data-toggle="preDownloadSubfolders"></span> ${L("Includi anche le sottocartelle (se spento tocca solo i file)")}</label></div>`
          : ''
      }
      ${
        preDownloadAction === 'deleteAll'
          ? `<div class="field span-2">
              <label>${L("Come eliminare")}</label>
              <select data-bind="preDownloadDelete">
                <option value="permanent" ${(t.preDownloadDelete || 'permanent') === 'permanent' ? 'selected' : ''}>${L("Definitivamente")}</option>
                <option value="trash" ${t.preDownloadDelete === 'trash' ? 'selected' : ''}>${L("Nel cestino (non funziona sulle cartelle di rete)")}</option>
              </select>
            </div>`
          : ''
      }
      ${
        preDownloadAction === 'move'
          ? `<div class="field span-2">
              <label>${L("Cartella dove spostare i file")}</label>
              <div class="inline-fields">
                <input type="text" style="flex:1;min-width:280px" class="template-field" data-bind="preDownloadMoveTarget" value="${escapeHtml(t.preDownloadMoveTarget || '')}" placeholder="${escapeHtml(L("es. D:\\Archivio\\{date:yyyy-MM-dd}"))}" />
                <button class="btn" id="btn-pick-predownload-folder">${escapeHtml(tr('browse'))}</button>
              </div>
            </div>`
          : ''
      }
      <div class="field span-2">
        <label>${L("Quando eseguire la pulizia")}</label>
        <select data-bind="preDownloadTiming" data-reflow="true">
          <option value="before" ${timing === 'before' ? 'selected' : ''}>${L("Prima di scaricare")}</option>
          <option value="afterSuccess" ${timing === 'afterSuccess' ? 'selected' : ''}>${L("Solo dopo un download riuscito (il file appena salvato non viene toccato)")}</option>
        </select>
      </div>
      ${
        preDownloadAction === 'deleteAll' && scope === 'all'
          ? `<div class="hint" style="color:var(--err)">${L("Attenzione: verranno eliminati TUTTI i file della cartella, anche quelli non scaricati da questo task (per esempio file .txt di configurazione di altri programmi). Se la cartella è condivisa con altri task o programmi scegli \"Solo il file con lo stesso nome\" o un modello.")}</div>`
          : timing === 'before' && preDownloadAction === 'deleteAll'
            ? `<div class="hint">${L("Con \"Prima di scaricare\", se il download poi fallisce i file eliminati non tornano: per cancellare solo a download riuscito scegli \"Solo dopo un download riuscito\".")}</div>`
            : ''
      }`;
            })()
          : ''
      }
      <div class="field span-2">
        <label>${L("Se nella cartella esiste già un file con lo stesso nome")}</label>
        <select data-bind="existingFile">
          <option value="archive" ${(t.existingFile || 'archive') === 'archive' ? 'selected' : ''}>${L("Conserva il vecchio rinominandolo (.old-data-ora)")}</option>
          <option value="overwrite" ${t.existingFile === 'overwrite' ? 'selected' : ''}>${L("Sovrascrivi (nessuna copia: utile per cartelle di scambio)")}</option>
        </select>
      </div>
      <div class="field span-2">
        <label>${L("Checksum SHA-256 atteso (facoltativo: se il file scaricato non coincide, il download fallisce)")}</label>
        <input type="text" data-bind="expectedSha256" value="${escapeHtml(t.expectedSha256 || '')}" placeholder="${escapeHtml(L("es. 9f86d081884c7d659a2feaa0c55ad015…"))}" />
      </div>
      <div class="field span-2">
        <label>${L("Nome del file")}</label>
        <select data-bind="filenameMode" data-reflow="true">
          <option value="fixed" ${filenameMode === 'fixed' ? 'selected' : ''}>${L("Nome fisso")}</option>
          <option value="fromUrl" ${filenameMode === 'fromUrl' ? 'selected' : ''}>${L("Come nell'URL")}</option>
          <option value="template" ${filenameMode === 'template' ? 'selected' : ''}>${L("Modello con placeholder (data, contatore, ...)")}</option>
          <option value="ask" ${filenameMode === 'ask' ? 'selected' : ''}>${L("Chiedi dove salvare e come nominare a fine download")}</option>
        </select>
      </div>
      ${
        filenameMode === 'fixed'
          ? `<div class="field span-2"><label>${L("Nome file")}</label><input type="text" data-bind="fixedFilename" value="${escapeHtml(t.fixedFilename)}" /></div>`
          : ''
      }
      ${
        filenameMode === 'template'
          ? `<div class="field span-2">
              <label>${L("Modello nome file")}</label>
              <input type="text" class="template-field" data-bind="filenameTemplate" value="${escapeHtml(t.filenameTemplate)}" />
              <div class="placeholder-chips">
                ${PLACEHOLDERS.map((p) => `<span class="chip" data-insert="${escapeHtml(p.label)}" title="${escapeHtml(L(p.desc))}">${escapeHtml(p.label)}</span>`).join('')}
              </div>
            </div>`
          : ''
      }
      ${
        filenameMode === 'ask'
          ? `<div class="hint">${L("Al termine del download si aprirà la finestra \"Salva con nome\" per scegliere nome e cartella finali.")}</div>`
          : ''
      }
    </div>

    <div class="card">
      <h3>${escapeHtml(tr('schedules'))} <span class="hint">${escapeHtml(tr('schedulesHint'))}</span></h3>
      <div id="schedules-list">
        ${(t.schedules || []).map(renderScheduleRow).join('') || `<div class="hint">${escapeHtml(tr('noSchedulesYet'))}</div>`}
      </div>
      <button class="btn btn-sm" id="btn-add-schedule">${escapeHtml(tr('addSchedule'))}</button>
    </div>

    <div class="card">
      <h3>${escapeHtml(tr('postActions'))} <span class="hint">${escapeHtml(tr('postActionsHint'))}</span></h3>
      <div id="actions-list">
        ${(t.postActions || []).map(renderActionRow).join('') || `<div class="hint">${escapeHtml(tr('noActionsYet'))}</div>`}
      </div>
      <button class="btn btn-sm" id="btn-add-action">${escapeHtml(tr('addAction'))}</button>
    </div>

    <div class="editor-actions editor-actions-bottom">
      <button class="btn" id="btn-export-task" title="${escapeHtml(L("Salva questo task in un file, per condividerlo o duplicarlo su un altro PC"))}">${L("⤓ Esporta task")}</button>
      <div class="editor-actions" style="margin-left:auto">
        <button class="btn btn-danger" id="btn-delete-task">${escapeHtml(tr('delete'))}</button>
        <button class="btn btn-primary" id="btn-save-task">${escapeHtml(tr('save'))}</button>
      </div>
    </div>
  `;

  bindEditorEvents();
}

function renderSettings() {
  const root = document.getElementById('editor-root');
  const s = state.settings || {};
  const email = s.notifications?.email || {};
  const telegram = s.notifications?.telegram || {};
  const tgRecipients = Array.isArray(telegram.recipients) && telegram.recipients.length ? telegram.recipients : telegram.chatId ? [{ chatId: telegram.chatId, note: '' }] : [];
  root.innerHTML = `
    <div class="editor-header">
      <div class="editor-title"><h2 style="margin:0">${L("Impostazioni")}</h2></div>
    </div>
    <div class="card">
      <h3>${escapeHtml(tr('general'))}</h3>
      <div class="field-grid">
        <div class="field">
          <label>${L("Tema interfaccia")}</label>
          <select id="setting-theme-mode">
            <option value="dark" ${(s.themeMode || 'dark') === 'dark' ? 'selected' : ''}>${L("Scuro")}</option>
            <option value="light" ${s.themeMode === 'light' ? 'selected' : ''}>${L("Chiaro")}</option>
          </select>
        </div>
        <div class="field">
          <label>${L("Lingua guida/istruzioni")}</label>
          <select id="setting-language">
            <option value="it" ${(s.language || 'it') === 'it' ? 'selected' : ''}>Italiano</option>
            <option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option>
            <option value="es" ${s.language === 'es' ? 'selected' : ''}>Español</option>
          </select>
        </div>
        <div class="field">
          <label>${L("Icona barra menù")}</label>
          <select id="setting-tray-style">
            <option value="white" ${(s.trayIconStyle || 'white') === 'white' ? 'selected' : ''}>${L("Bianca (MacOs like)")}</option>
            <option value="color" ${s.trayIconStyle === 'color' ? 'selected' : ''}>${L("Blu (colore del brand)")}</option>
          </select>
        </div>
        <div class="field">
          <label>${L("Formato data e ora")}</label>
          <select id="setting-date-format">
            <option value="auto" ${(s.formatPreset ?? (s.dateFormatStyle === 'en' ? 'us' : 'auto')) === 'auto' ? 'selected' : ''}>${L("Automatico (secondo la lingua: it/es 24 ore GG/MM/AAAA, en AM/PM MM/GG/AAAA)")}</option>
            ${Object.entries(FORMAT_PRESETS)
              .map(([k, p]) => `<option value="${k}" ${(s.formatPreset ?? (s.dateFormatStyle === 'en' ? 'us' : 'auto')) === k ? 'selected' : ''}>${escapeHtml(L(p.label))}</option>`)
              .join('')}
          </select>
          <div class="hint">${L("Vale per tutta l'interfaccia. I campi orario/data dell'editor delle pianificazioni cambiano dopo il riavvio dell'app.")}</div>
        </div>
      </div>
      <div class="field span-2">
        <label class="toggle"><span class="switch ${s.startOnBoot ? 'on' : ''}" data-setting-toggle="startOnBoot"></span> ${L("Avvia G-Downloader all'accensione del computer")}</label>
      </div>
      <div class="field span-2">
        <label class="toggle"><span class="switch ${s.startMinimized ? 'on' : ''}" data-setting-toggle="startMinimized"></span> ${L("Avvia ridotto a icona (nella tray)")}</label>
      </div>
      <div class="field span-2">
        <label class="toggle"><span class="switch ${s.notifyOnSuccess ? 'on' : ''}" data-setting-toggle="notifyOnSuccess"></span> ${L("Notifica quando un download va a buon fine")}</label>
      </div>
      <div class="field span-2">
        <label class="toggle"><span class="switch ${s.notifyOnError ? 'on' : ''}" data-setting-toggle="notifyOnError"></span> ${L("Notifica in caso di errore")}</label>
      </div>
      <div class="field span-2">
        <label class="toggle"><span class="switch ${s.openFolderOnNotificationClick ? 'on' : ''}" data-setting-toggle="openFolderOnNotificationClick"></span> ${L("Cliccando la notifica di successo, apri la cartella del file scaricato")}</label>
      </div>
      <div class="field span-2">
        <label>${L("Cartella di destinazione predefinita")}</label>
        <div class="inline-fields">
          <input type="text" style="flex:1;min-width:280px" id="setting-default-dest" value="${escapeHtml(s.defaultDestination || '')}" />
          <button class="btn" id="btn-pick-default-folder">${escapeHtml(tr('browse'))}</button>
        </div>
      </div>
      <div class="field-grid">
        <div class="field">
          <label>${L("Tentativi di default per i nuovi task")}</label>
          <input type="number" min="0" id="setting-default-retries" value="${s.defaultRetries ?? 3}" />
        </div>
        <div class="field">
          <label>${L("Attesa di default tra tentativi (ms)")}</label>
          <input type="number" min="1000" step="1000" id="setting-default-retry-delay" value="${s.defaultRetryDelayMs ?? 15000}" />
        </div>
      </div>
      <div class="hint">${L("Valgono solo per i nuovi task creati da qui in poi; i task esistenti mantengono il proprio valore, modificabile nella scheda \"Sorgente\".")}</div>
    </div>

    <div class="card">
      <h3>${L("Affidabilità")}</h3>
      <div class="field span-2">
        <label class="toggle"><span class="switch ${s.checkMinFileSize ? 'on' : ''}" data-setting-toggle="checkMinFileSize"></span> ${L("Verifica che il file scaricato non sia troppo piccolo (tratta come errore e riprova)")}</label>
      </div>
      ${
        s.checkMinFileSize
          ? `<div class="field">
              <label>${L("Dimensione minima accettata (KB)")}</label>
              <input type="number" min="1" id="setting-min-file-size" value="${s.minFileSizeKB ?? 1}" />
            </div>`
          : ''
      }
      <div class="field span-2">
        <label class="toggle"><span class="switch ${s.warnIfUnchanged ? 'on' : ''}" data-setting-toggle="warnIfUnchanged"></span> ${L("Avvisa se il file scaricato è identico all'ultimo (possibile contenuto non aggiornato alla fonte)")}</label>
      </div>
      <div class="field span-2">
        <label class="toggle"><span class="switch ${s.watchdogMissedSchedules ? 'on' : ''}" data-setting-toggle="watchdogMissedSchedules"></span> ${L("Avvisa all'avvio se sono state saltate pianificazioni (app non attiva all'orario previsto)")}</label>
      </div>
    </div>

    <div class="card">
      <h3>${L("Prestazioni e controlli")}</h3>
      <div class="field-grid">
        <div class="field">
          <label>${L("Download contemporanei al massimo (0 = nessun limite, 1 = uno alla volta)")}</label>
          <input type="number" min="0" id="setting-max-parallel" value="${s.maxParallelDownloads ?? 0}" />
        </div>
        <div class="field">
          <label>${L("Avvisa se la fonte risulta ferma dopo N download identici di fila (0 = disattivato)")}</label>
          <input type="number" min="0" id="setting-stale-runs" value="${s.staleAlertRuns ?? 0}" />
        </div>
      </div>
      <div class="hint">${L("L'avviso \"fonte ferma\" usa email/Telegram se attivi. I download in eccesso restano in attesa e partono appena se ne libera uno.")}</div>
    </div>

    <div class="card">
      <h3>${L("Aggiornamenti")}</h3>
      <div class="field span-2">
        <label class="toggle"><span class="switch ${s.checkUpdates !== false ? 'on' : ''}" data-setting-toggle="checkUpdates"></span> ${L("Controlla automaticamente se esiste una nuova versione (avviso e download su richiesta, nessuna installazione automatica)")}</label>
      </div>
      <div class="btn-row">
        <button class="btn" id="btn-check-updates">${L("Controlla aggiornamenti")}</button>
        <button class="btn" id="btn-update-download" data-upd="download" style="display:none">${L("Scarica e installa")}</button>
        <button class="btn btn-install" id="btn-update-install" data-upd="install" style="display:none"></button>
        <button class="btn" id="btn-update-page" data-upd="page" style="display:none">${L("Apri pagina di download")}</button>
      </div>
      <span id="update-progress-settings" class="upd-progress upd-progress-settings" style="display:none"><i></i></span>
      <span id="update-result" class="hint"></span>
    </div>

    <div class="card">
      <h3>${L("Report e log")}</h3>
      <div class="field-grid">
        <div class="field">
          <label>${L("Report riepilogativo via email")}</label>
          <select id="setting-report-frequency">
            <option value="off" ${(s.reportFrequency || 'off') === 'off' ? 'selected' : ''}>${L("Disattivato")}</option>
            <option value="daily" ${s.reportFrequency === 'daily' ? 'selected' : ''}>${L("Giornaliero")}</option>
            <option value="weekly" ${s.reportFrequency === 'weekly' ? 'selected' : ''}>${L("Settimanale (lunedì)")}</option>
          </select>
        </div>
        <div class="field">
          <label>${L("Ora di invio")}</label>
          <input type="number" min="0" max="23" id="setting-report-hour" value="${s.reportHour ?? 7}" />
        </div>
      </div>
      <div class="hint">${L("Usa la configurazione email qui sotto. Riepiloga i download completati/falliti nel periodo, con dettaglio errori.")}</div>
      <div class="field span-2" style="margin-top:12px">
        <label>${L("Log su file")}</label>
        <div class="inline-fields">
          <button class="btn btn-sm" id="btn-open-log-folder">${L("Apri cartella log")}</button>
        </div>
        <div class="hint">${L("Un file al giorno, conservato 30 giorni, oltre alla cronologia mostrata nell'app.")}</div>
      </div>
    </div>

    <div class="card">
      <h3>${L("Categorie e colori")}</h3>
      <div class="hint">${L("Ogni categoria ha un colore assegnato in automatico, usato nell'elenco dei task, nel Palinsesto e nelle etichette. Cliccalo per sceglierne un altro, ↺ ripristina quello automatico.")}</div>
      ${(() => {
        const cats = [...new Set(state.tasks.map((x) => (x.category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        return cats.length
          ? `<div class="cat-color-list">${cats
              .map(
                (c) => `<div class="cat-color-row">
              <input type="color" value="${categoryColor(c)}" data-cat-color="${escapeHtml(c)}" title="${escapeHtml(L("Cambia colore"))}" />
              <span class="cat-color-name">${escapeHtml(c)}</span>
              <span class="hint">${state.tasks.filter((x) => (x.category || '').trim() === c).length} ${L('task')}</span>
              <button type="button" class="btn btn-xs btn-ghost" data-cat-reset="${escapeHtml(c)}" title="${escapeHtml(L("Ripristina il colore automatico"))}">↺</button>
            </div>`
              )
              .join('')}</div>`
          : `<div class="hint">${L("Nessuna categoria: assegnane una ai task dal campo \"Categoria\".")}</div>`;
      })()}
    </div>

    <div class="card">
      <h3>${L("Notifica via email (download falliti)")}</h3>
      <div class="field span-2">
        <label class="toggle"><span class="switch ${email.enabled ? 'on' : ''}" data-notif-toggle="email.enabled"></span> ${L("Abilita notifiche email")}</label>
      </div>
      <div class="field-grid">
        <div class="field"><label>${L("Server SMTP")}</label><input type="text" data-notif="email.host" value="${escapeHtml(email.host || '')}" placeholder="${escapeHtml(L("smtp.esempio.com"))}" /></div>
        <div class="field"><label>${L("Porta")}</label><input type="number" data-notif="email.port" value="${email.port ?? 587}" /></div>
        <div class="field"><label class="toggle"><span class="switch ${email.secure ? 'on' : ''}" data-notif-toggle="email.secure"></span> ${L("Connessione sicura (SSL/TLS)")}</label></div>
        <div class="field"><label>${L("Utente SMTP")}</label><input type="text" data-notif="email.user" value="${escapeHtml(email.user || '')}" /></div>
        <div class="field"><label>${L("Password SMTP")}</label><div class="password-wrap"><input type="password" data-notif="email.pass" value="${escapeHtml(email.pass || '')}" autocomplete="new-password" /><button type="button" class="btn btn-sm password-eye" data-toggle-password title="${escapeHtml(L("Mostra/nascondi password"))}">👁</button></div></div>
        <div class="field"><label>${L("Mittente")}</label><input type="text" data-notif="email.from" value="${escapeHtml(email.from || '')}" placeholder="${escapeHtml(L("downloader@tuodominio.it"))}" /></div>
        <div class="field span-2"><label>${L("Destinatari (separati da virgola)")}</label><input type="text" data-notif="email.to" value="${escapeHtml(email.to || '')}" placeholder="${escapeHtml(L("anna@example.com, mario@example.com"))}" /></div>
      </div>
      <button class="btn btn-sm" id="btn-test-email">${L("Invia email di prova")}</button>
      <span id="email-test-result" class="hint"></span>
    </div>

    <div class="card">
      <h3>${L("Notifica via Telegram (download falliti)")}</h3>
      <div class="field span-2">
        <label class="toggle"><span class="switch ${telegram.enabled ? 'on' : ''}" data-notif-toggle="telegram.enabled"></span> ${L("Abilita notifiche Telegram")}</label>
      </div>
      <div class="field-grid">
        <div class="field"><label>${L("Bot Token")}</label><input type="text" data-notif="telegram.botToken" value="${escapeHtml(telegram.botToken || '')}" placeholder="123456:ABC-DEF..." /></div>
      </div>
      <label class="field-label">${L("Destinatari")}</label>
      <div id="telegram-recipients">
        ${tgRecipients
          .map(
            (r, i) => `<div class="inline-fields" style="margin-bottom:6px">
              <input type="text" data-tg-chat="${i}" value="${escapeHtml(r.chatId || '')}" placeholder="${escapeHtml(L("Chat ID (es. 123456789 o -1001234567890)"))}" />
              <input type="text" data-tg-note="${i}" value="${escapeHtml(r.note || '')}" placeholder="${escapeHtml(L("Nota: chi è (es. Anna, Regia)"))}" />
              <button class="btn btn-sm" data-tg-remove="${i}" title="${escapeHtml(L("Rimuovi"))}">✕</button>
            </div>`
          )
          .join('')}
      </div>
      <button class="btn btn-sm" id="btn-add-tg-recipient">${L("+ Aggiungi destinatario")}</button>
      <details class="help-details">
        <summary>${L("Come trovo il Bot Token e i Chat ID?")}</summary>
        <div class="hint">
          <b>${L("Bot Token")}</b> ${L("(uguale per tutti i destinatari)")}
          <ol>
            <li>${L("Su Telegram apri")} <b>@BotFather</b> ${L("e scrivi")} <code>/newbot</code>${L("; scegli un nome e un username che finisce con \"bot\".")}</li>
            <li>${L("BotFather risponde con il token, del tipo")} <code>123456789:AAF…</code>${L(": copialo qui. Se usi già un bot, dal suo menu in BotFather (")}<code>/mybots</code> ${L("→ il bot → API Token) lo rivedi.")}</li>
            <li>${L("Il token è come una password: non pubblicarlo. Se finisce in mani sbagliate,")} <code>/revoke</code> ${L("in BotFather ne crea uno nuovo (poi aggiornalo ovunque il bot sia usato).")}</li>
          </ol>
          <b>${L("Chat ID di una persona")}</b>
          <ol>
            <li>${L("La persona apre il bot e preme")} <b>${L("Avvia")}</b> (<code>/start</code>${L("): senza questo passaggio il bot non può scriverle.")}</li>
            <li>${L("Poi scrive a")} <b>@userinfobot</b> ${L("(o @getidsbot): risponde con il suo")} <code>Id</code>${L(", un numero come")} <code>123456789</code>${L(". Quello è il Chat ID.")}</li>
          </ol>
          <b>${L("Chat ID di un gruppo o di un canale")}</b>
          <ol>
            <li>${L("Aggiungi il bot al gruppo (per un canale, come amministratore) e scrivi un messaggio.")}</li>
            <li>${L("Il Chat ID inizia con")} <code>-</code> (es. <code>-1001234567890</code>${L("): inseriscilo con il segno meno. Per leggerlo puoi aggiungere temporaneamente @getidsbot al gruppo.")}</li>
          </ol>
          <b>${L("Se il bot è già usato da altri programmi (es. Home Assistant)")}</b>${L(": hanno il loro webhook e la ricerca degli update da browser non funziona (errore 409). Non toglierlo: usa @userinfobot per i Chat ID. G-Downloader invia soltanto e non disturba gli altri programmi.")}
        </div>
      </details>
      <div class="hint">${L("Ogni destinatario riceve gli avvisi. Usa la nota per ricordare chi è.")}</div>
      <button class="btn btn-sm" id="btn-test-telegram">${L("Invia messaggio di prova")}</button>
      <span id="telegram-test-result" class="hint"></span>
    </div>

    <div class="card">
      <h3>${L("Backup / Trasferimento su un altro PC")}</h3>
      <div class="hint">${L("Esporta task e impostazioni in un file, da riportare identico su un altro computer con Importa configurazione. Il file contiene anche eventuali password SMTP e token Telegram salvati: conservalo in un posto sicuro.")}</div>
      <div class="inline-fields" style="margin-top:8px">
        <button class="btn" id="btn-export-config">${L("Esporta configurazione")}</button>
        <button class="btn" id="btn-import-config">${L("Importa configurazione")}</button>
      </div>
      <span id="config-transfer-result" class="hint"></span>
    </div>
  `;

  root.querySelectorAll('[data-setting-toggle]').forEach((el) => {
    el.addEventListener('click', async () => {
      const key = el.dataset.settingToggle;
      const next = { [key]: !el.classList.contains('on') };
      state.settings = await window.api.settings.update(next);
      renderSettings();
    });
  });
  document.getElementById('setting-theme-mode').addEventListener('change', async (e) => {
    state.settings = await window.api.settings.update({ themeMode: e.target.value });
    applyTheme(state.settings.themeMode);
  });
  document.getElementById('setting-tray-style').addEventListener('change', async (e) => {
    state.settings = await window.api.settings.update({ trayIconStyle: e.target.value });
  });
  document.getElementById('setting-date-format').addEventListener('change', async (e) => {
    state.settings = await window.api.settings.update({ formatPreset: e.target.value });
    renderSidebar();
    renderNextWidget();
    tickClock();
  });
  document.getElementById('setting-language').addEventListener('change', async (e) => {
    state.settings = await window.api.settings.update({ language: e.target.value });
    applyStaticTranslations();
    renderSidebar();
    renderNextWidget();
    renderSettings();
  });
  document.getElementById('setting-default-dest').addEventListener('change', async (e) => {
    state.settings = await window.api.settings.update({ defaultDestination: e.target.value });
  });
  document.getElementById('btn-pick-default-folder').addEventListener('click', async () => {
    const folder = await window.api.dialogs.pickFolder();
    if (folder) {
      document.getElementById('setting-default-dest').value = folder;
      state.settings = await window.api.settings.update({ defaultDestination: folder });
    }
  });
  document.getElementById('setting-default-retries').addEventListener('change', async (e) => {
    state.settings = await window.api.settings.update({ defaultRetries: Number(e.target.value) });
  });
  document.getElementById('setting-default-retry-delay').addEventListener('change', async (e) => {
    state.settings = await window.api.settings.update({ defaultRetryDelayMs: Number(e.target.value) });
  });
  document.getElementById('setting-max-parallel').addEventListener('change', async (e) => {
    state.settings = await window.api.settings.update({ maxParallelDownloads: Math.max(0, Number(e.target.value) || 0) });
  });
  document.getElementById('setting-stale-runs').addEventListener('change', async (e) => {
    state.settings = await window.api.settings.update({ staleAlertRuns: Math.max(0, Number(e.target.value) || 0) });
  });
  document.getElementById('btn-check-updates').addEventListener('click', async () => {
    if (upd.state === 'downloading') return;
    const out = document.getElementById('update-result');
    out.style.color = '';
    out.textContent = L('Controllo in corso…');
    const info = await window.api.updates.check();
    if (!info.ok) {
      // a failed check leaves a downloaded installer usable
      if (upd.state === 'ready') paintUpdate();
      else {
        out.style.color = 'var(--err)';
        out.textContent = L('Controllo non riuscito: ') + info.error;
      }
    } else if (info.available) {
      showUpdateBanner(info);
      paintUpdate();
    } else {
      out.style.color = 'var(--ok)';
      out.textContent = L('Sei aggiornato (versione {current}) ✓', { current: info.current }) + (info.note ? ' ' + info.note + '.' : '');
    }
  });
  paintUpdate();
  const minFileSizeInput = document.getElementById('setting-min-file-size');
  if (minFileSizeInput) {
    minFileSizeInput.addEventListener('change', async (e) => {
      state.settings = await window.api.settings.update({ minFileSizeKB: Number(e.target.value) });
    });
  }
  const saveCategoryColor = async (name, color) => {
    const colors = { ...(state.settings.categoryColors || {}) };
    if (color) colors[name] = color;
    else delete colors[name];
    state.settings = await window.api.settings.update({ categoryColors: colors });
    renderSidebar();
    renderSettings();
  };
  root.querySelectorAll('[data-cat-color]').forEach((el) => {
    el.addEventListener('change', () => saveCategoryColor(el.dataset.catColor, el.value));
  });
  root.querySelectorAll('[data-cat-reset]').forEach((el) => {
    el.addEventListener('click', () => saveCategoryColor(el.dataset.catReset, null));
  });
  document.getElementById('setting-report-frequency').addEventListener('change', async (e) => {
    state.settings = await window.api.settings.update({ reportFrequency: e.target.value });
  });
  document.getElementById('setting-report-hour').addEventListener('change', async (e) => {
    state.settings = await window.api.settings.update({ reportHour: Number(e.target.value) });
  });
  document.getElementById('btn-open-log-folder').addEventListener('click', () => {
    window.api.system.openLogFolder();
  });

  async function patchNotifications(path, value) {
    const notifications = JSON.parse(JSON.stringify(state.settings.notifications || {}));
    setPath(notifications, path, value);
    state.settings = await window.api.settings.update({ notifications });
    return notifications;
  }

  root.querySelectorAll('[data-notif-toggle]').forEach((el) => {
    el.addEventListener('click', async () => {
      await patchNotifications(el.dataset.notifToggle, !el.classList.contains('on'));
      renderSettings();
    });
  });

  root.querySelectorAll('[data-notif]').forEach((el) => {
    el.addEventListener('change', async () => {
      const value = el.type === 'number' ? Number(el.value) : el.value;
      await patchNotifications(el.dataset.notif, value);
    });
  });

  const saveRecipients = async (list) => {
    await patchNotifications('telegram.recipients', list);
    await patchNotifications('telegram.chatId', '');
  };
  const readRecipients = () =>
    tgRecipients.map((r, i) => ({
      chatId: root.querySelector(`[data-tg-chat="${i}"]`)?.value.trim() ?? r.chatId,
      note: root.querySelector(`[data-tg-note="${i}"]`)?.value.trim() ?? r.note
    }));
  root.querySelectorAll('[data-tg-chat],[data-tg-note]').forEach((el) => {
    el.addEventListener('change', () => saveRecipients(readRecipients()));
  });
  root.querySelectorAll('[data-tg-remove]').forEach((el) => {
    el.addEventListener('click', async () => {
      await saveRecipients(readRecipients().filter((_, i) => i !== Number(el.dataset.tgRemove)));
      renderSettings();
    });
  });
  document.getElementById('btn-add-tg-recipient').addEventListener('click', async () => {
    await saveRecipients([...readRecipients(), { chatId: '', note: '' }]);
    renderSettings();
  });

  document.getElementById('btn-test-email').addEventListener('click', async () => {
    const out = document.getElementById('email-test-result');
    out.textContent = L('Invio in corso…');
    const result = await window.api.notifications.testEmail(state.settings.notifications.email);
    out.textContent = result.ok ? L('✓ Email inviata') : `✕ ${result.error}`;
  });

  document.getElementById('btn-test-telegram').addEventListener('click', async () => {
    const out = document.getElementById('telegram-test-result');
    out.textContent = L('Invio in corso…');
    const result = await window.api.notifications.testTelegram(state.settings.notifications.telegram);
    out.textContent = result.ok ? L('✓ Messaggio inviato a tutti i destinatari') : `✕ ${result.error}`;
  });

  document.getElementById('btn-export-config').addEventListener('click', async () => {
    const out = document.getElementById('config-transfer-result');
    const result = await window.api.config.export();
    if (result.canceled) return;
    out.textContent = result.ok ? L('✓ Salvato in {path}', { path: result.filePath }) : `✕ ${result.error}`;
  });

  document.getElementById('btn-import-config').addEventListener('click', async () => {
    const out = document.getElementById('config-transfer-result');
    const result = await window.api.config.import();
    if (result.canceled) return;
    if (result.ok) {
      out.textContent = L('✓ Importati {n} task e impostazioni', { n: result.tasksCount });
      state.settings = result.settings;
      applyTheme(state.settings.themeMode);
      await loadTasks();
      renderSidebar();
      renderSettings();
    } else {
      out.textContent = `✕ ${result.error}`;
    }
  });
}

async function renderAbout() {
  const root = document.getElementById('editor-root');
  if (!state.appInfo) state.appInfo = await window.api.app.info();
  const lang = state.settings?.language || 'it';
  const guide = GUIDE_CONTENT[lang] || GUIDE_CONTENT.it;

  root.innerHTML = `
    <div class="editor-header">
      <div class="editor-title"><h2 style="margin:0">${L("Info e Guida")}</h2></div>
    </div>

    <div class="card about-card">
      <img src="../assets/icon.png" alt="G-Downloader" class="about-icon" />
      <div>
        <div class="about-name">${escapeHtml(state.appInfo.name)}</div>
        <div class="about-version">${L('Versione')} ${escapeHtml(state.appInfo.version)}</div>
        <div class="hint">Electron ${escapeHtml(state.appInfo.electron)} · Node ${escapeHtml(state.appInfo.node)} · ${escapeHtml(state.appInfo.platform)}</div>
      </div>
    </div>

    <div class="card">
      <h3>${L("Sviluppatore")}</h3>
      <p>Graziano Melzi · OnAir Garage</p>
      <p class="hint">hello@onairgarage.com · <a href="#" id="about-site-link">onairgarage.com</a></p>
    </div>

    <div class="card">
      <div class="row-top" style="margin-bottom:12px">
        <h3 style="margin:0">${escapeHtml(guide.title)}</h3>
        <span class="spacer"></span>
        <select id="guide-language-select">
          ${Object.entries(GUIDE_CONTENT)
            .map(([code, g]) => `<option value="${code}" ${code === lang ? 'selected' : ''}>${g.label}</option>`)
            .join('')}
        </select>
      </div>
      ${guide.sections
        .map(
          (s) => `
        <div class="guide-section">
          <h4>${escapeHtml(s.h)}</h4>
          <p>${s.p}</p>
        </div>`
        )
        .join('')}
    </div>
  `;

  document.getElementById('about-site-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.api.updates.open('https://onairgarage.com');
  });
  document.getElementById('guide-language-select').addEventListener('change', async (e) => {
    state.settings = await window.api.settings.update({ language: e.target.value });
    applyStaticTranslations();
    renderSidebar();
    renderNextWidget();
    renderAbout();
  });
}

// ---------- editor events ----------
function bindEditorEvents() {
  const root = document.getElementById('editor-root');

  root.querySelectorAll('[data-bind]').forEach((el) => {
    const bindPath = el.dataset.bind;
    if (el.classList.contains('template-field')) {
      el.addEventListener('focus', () => (lastFocusedTemplateInput = el));
    }
    const evt = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      let value = el.value;
      if (el.type === 'number') value = value === '' ? '' : Number(value);
      setPath(state.editing, bindPath, value);
      const scheduleFieldMatch = bindPath.match(/^schedules\.(\d+)\.(?!label$|enabled$)/);
      if (scheduleFieldMatch) rearmSchedule(state.editing.schedules[Number(scheduleFieldMatch[1])]);
      if (el.dataset.reflow) renderEditor();
    });
    // Paths pasted from Terminal/Finder often come wrapped in quotes or backslash-escaped
    // spaces (e.g. '/path/With MP3' or /path/With\ MP3) — clean them up once the user leaves the field.
    if (bindPath === 'localPath' || bindPath === 'destinationFolder') {
      el.addEventListener('blur', () => {
        const cleaned = cleanPathForDisplay(el.value);
        if (cleaned !== el.value) {
          el.value = cleaned;
          setPath(state.editing, bindPath, cleaned);
        }
      });
    }
  });

  root.querySelectorAll('[data-bind-list]').forEach((el) => {
    el.addEventListener('input', () => {
      const path = el.dataset.bindList;
      setPath(
        state.editing,
        path,
        el.value.split('\n').map((s) => s).filter((s) => s.length)
      );
    });
  });

  root.querySelectorAll('[data-toggle]').forEach((el) => {
    el.addEventListener('click', () => {
      const path = el.dataset.toggle;
      const current = getPath(state.editing, path);
      const next = !(current !== false);
      setPath(state.editing, path, next);
      const scheduleEnableMatch = path.match(/^schedules\.(\d+)\.enabled$/);
      if (scheduleEnableMatch && next) rearmSchedule(state.editing.schedules[Number(scheduleEnableMatch[1])]);
      renderEditor();
    });
  });

  root.querySelectorAll('[data-day-toggle]').forEach((el) => {
    el.addEventListener('click', () => {
      const [idxStr, dayStr] = el.dataset.dayToggle.split(':');
      const idx = Number(idxStr);
      const day = Number(dayStr);
      const sched = state.editing.schedules[idx];
      sched.days = Array.isArray(sched.days) ? sched.days : [];
      const pos = sched.days.indexOf(day);
      if (pos >= 0) sched.days.splice(pos, 1);
      else sched.days.push(day);
      rearmSchedule(sched);
      renderEditor();
    });
  });

  root.querySelectorAll('[data-day-preset]').forEach((el) => {
    el.addEventListener('click', () => {
      const [preset, idxStr] = el.dataset.dayPreset.split(':');
      const idx = Number(idxStr);
      const sched = state.editing.schedules[idx];
      if (preset === 'weekdays') sched.days = [1, 2, 3, 4, 5];
      else if (preset === 'weekend') sched.days = [0, 6];
      else if (preset === 'all') sched.days = [0, 1, 2, 3, 4, 5, 6];
      rearmSchedule(sched);
      renderEditor();
    });
  });

  root.querySelectorAll('.chip[data-insert]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const target = lastFocusedTemplateInput || root.querySelector('.template-field');
      if (!target) return;
      const insertText = chip.dataset.insert;
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      target.value = target.value.slice(0, start) + insertText + target.value.slice(end);
      target.dispatchEvent(new Event('input'));
      target.focus();
      target.selectionStart = target.selectionEnd = start + insertText.length;
    });
  });

  const addScheduleBtn = document.getElementById('btn-add-schedule');
  if (addScheduleBtn)
    addScheduleBtn.addEventListener('click', () => {
      state.editing.schedules = state.editing.schedules || [];
      const sched = {
        id: uid(),
        type: 'cron',
        cronMode: 'friendly',
        days: [1, 2, 3, 4, 5],
        times: ['09:00'],
        expr: '0 9 * * 1-5',
        enabled: true
      };
      rearmSchedule(sched);
      state.editing.schedules.push(sched);
      renderEditor();
    });

  root.querySelectorAll('[data-remove-schedule]').forEach((el) => {
    el.addEventListener('click', () => {
      state.editing.schedules.splice(Number(el.dataset.removeSchedule), 1);
      renderEditor();
    });
  });

  root.querySelectorAll('[data-preview-schedule]').forEach((el) => {
    el.addEventListener('click', async () => {
      const idx = Number(el.dataset.previewSchedule);
      const box = document.getElementById(`schedule-preview-${idx}`);
      if (box.style.display !== 'none') {
        box.style.display = 'none';
        return;
      }
      box.style.display = 'block';
      box.innerHTML = `<div class="hint">${L("Calcolo in corso…")}</div>`;
      const times = await window.api.schedules.preview(state.editing.schedules[idx]);
      box.innerHTML = times.length
        ? `<div class="hint">${L("Prossime occorrenze:")}</div><ul class="cron-help-examples">${times
            .map((t) => `<li>${escapeHtml(new Date(t).toLocaleDateString(nameLocale(), { weekday: 'short' }) + ' ' + fmtDate(t))}</li>`)
            .join('')}</ul>`
        : `<div class="hint">${L("Nessuna occorrenza futura trovata (controlla i campi della pianificazione).")}</div>`;
    });
  });

  root.querySelectorAll('[data-copy-schedule]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = Number(el.dataset.copySchedule);
      const clone = shiftScheduleByHour(state.editing.schedules[idx]);
      rearmSchedule(clone);
      state.editing.schedules.splice(idx + 1, 0, clone);
      renderEditor();
    });
  });

  root.querySelectorAll('[data-add-time]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = Number(el.dataset.addTime);
      const sched = state.editing.schedules[idx];
      const times = Array.isArray(sched.times) && sched.times.length ? sched.times : [sched.time || '09:00'];
      const [hh, mm] = String(times[times.length - 1] || '09:00').split(':').map((n) => parseInt(n, 10) || 0);
      times.push(`${String((hh + 1) % 24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
      sched.times = times;
      delete sched.time;
      rearmSchedule(sched);
      renderEditor();
    });
  });

  root.querySelectorAll('[data-remove-time]').forEach((el) => {
    el.addEventListener('click', () => {
      const [idxStr, tiStr] = el.dataset.removeTime.split(':');
      const sched = state.editing.schedules[Number(idxStr)];
      sched.times.splice(Number(tiStr), 1);
      rearmSchedule(sched);
      renderEditor();
    });
  });

  const addActionBtn = document.getElementById('btn-add-action');
  if (addActionBtn)
    addActionBtn.addEventListener('click', () => {
      state.editing.postActions = state.editing.postActions || [];
      state.editing.postActions.push({ id: uid(), type: 'run', command: '', args: [], enabled: true });
      renderEditor();
    });

  root.querySelectorAll('[data-remove-action]').forEach((el) => {
    el.addEventListener('click', () => {
      state.editing.postActions.splice(Number(el.dataset.removeAction), 1);
      renderEditor();
    });
  });

  const pickFolderBtn = document.getElementById('btn-pick-folder');
  if (pickFolderBtn)
    pickFolderBtn.addEventListener('click', async () => {
      const folder = await window.api.dialogs.pickFolder();
      if (folder) {
        state.editing.destinationFolder = folder;
        renderEditor();
      }
    });

  const pickPreDownloadFolderBtn = document.getElementById('btn-pick-predownload-folder');
  if (pickPreDownloadFolderBtn)
    pickPreDownloadFolderBtn.addEventListener('click', async () => {
      const folder = await window.api.dialogs.pickFolder();
      if (folder) {
        state.editing.preDownloadMoveTarget = folder;
        renderEditor();
      }
    });

  const pickLocalPathBtn = document.getElementById('btn-pick-local-path');
  if (pickLocalPathBtn)
    pickLocalPathBtn.addEventListener('click', async () => {
      const file = await window.api.dialogs.pickFile();
      if (file) {
        state.editing.localPath = file;
        renderEditor();
      }
    });

  root.querySelectorAll('[data-pick-action-file]').forEach((el) => {
    el.addEventListener('click', async () => {
      const file = await window.api.dialogs.pickFile();
      if (file) {
        state.editing.postActions[Number(el.dataset.pickActionFile)].command = file;
        renderEditor();
      }
    });
  });

  root.querySelectorAll('[data-pick-action-folder]').forEach((el) => {
    el.addEventListener('click', async () => {
      const folder = await window.api.dialogs.pickFolder();
      if (folder) {
        state.editing.postActions[Number(el.dataset.pickActionFolder)].targetFolder = folder;
        renderEditor();
      }
    });
  });

  const saveBtn = document.getElementById('btn-save-task');
  if (saveBtn)
    saveBtn.addEventListener('click', async () => {
      await window.api.tasks.save(state.editing);
      await refreshSidebar();
      await refreshQueue();
      flashButton(saveBtn, L('Salvato ✓'));
      if (state.editing.runOnSave) {
        await window.api.tasks.runNow(state.editing.id);
      }
    });

  const deleteBtn = document.getElementById('btn-delete-task');
  if (deleteBtn)
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(L('Eliminare definitivamente il task "{name}"?', { name: state.editing.name }))) return;
      await window.api.tasks.delete(state.editing.id);
      state.editing = null;
      state.selectedId = null;
      state.mode = 'empty';
      await refreshSidebar();
      renderEditor();
    });

  const exportTaskBtn = document.getElementById('btn-export-task');
  if (exportTaskBtn)
    exportTaskBtn.addEventListener('click', async () => {
      const result = await window.api.tasks.exportOne(state.editing.id);
      if (result.canceled) return;
      flashButton(exportTaskBtn, result.ok ? 'Esportato ✓' : `✕ ${result.error}`);
    });

  const runBtn = document.getElementById('btn-run-now');
  if (runBtn) runBtn.addEventListener('click', () => runPartFromEditor(runBtn, {}));
  const runDownloadBtn = document.getElementById('btn-run-download');
  if (runDownloadBtn) runDownloadBtn.addEventListener('click', () => runPartFromEditor(runDownloadBtn, { mode: 'download' }));
  const runActionsBtn = document.getElementById('btn-run-actions');
  if (runActionsBtn) runActionsBtn.addEventListener('click', () => runPartFromEditor(runActionsBtn, { mode: 'actions' }));
  const runOtherBtn = document.getElementById('btn-run-actions-other');
  if (runOtherBtn)
    runOtherBtn.addEventListener('click', async () => {
      const file = await window.api.dialogs.pickFile();
      if (file) runPartFromEditor(runOtherBtn, { mode: 'actions', filepath: file });
    });
  const runPendingBtn = document.getElementById('btn-run-pending');
  if (runPendingBtn)
    runPendingBtn.addEventListener('click', async () => {
      const result = await runPartFromEditor(runPendingBtn, { mode: 'actions' });
      if (result.status !== 'error') selectTask(state.editing.id);
    });
  paintActionsStatus(state.editing.id, document.getElementById('actions-file-status'));
  root.querySelectorAll('[data-preview-action]').forEach((el) => {
    el.addEventListener('click', async () => {
      const idx = Number(el.dataset.previewAction);
      const box = document.getElementById(`action-preview-${idx}`);
      if (box.style.display !== 'none') {
        box.style.display = 'none';
        return;
      }
      await window.api.tasks.save(state.editing);
      const r = await window.api.tasks.previewAction(state.editing.id, state.editing.postActions[idx]);
      box.textContent =
        (r.file ? L('File: {file}', { file: r.file }) : L('Nessun file trovato: vengono mostrati i segnaposto.')) + '\n' + (r.lines || []).join('\n');
      box.style.display = '';
    });
  });
  root.querySelectorAll('[data-run-action]').forEach((el) => {
    el.addEventListener('click', () => {
      const action = state.editing.postActions[Number(el.dataset.runAction)];
      if (action) runPartFromEditor(el, { mode: 'actions', actionIds: [action.id] });
    });
  });

  // "Run a past edition": for tasks whose URL depends on the scheduled time/date, offer the
  // latest scheduled occurrences, so an edition that was missed can be fetched by hand.
  if (runBtn && /{(time|date)/.test(`${state.editing.url || ''}${state.editing.localPath || ''}`)) {
    window.api.tasks.recentOccurrences(state.editing.id).then((list) => {
      if (!list.length || !document.body.contains(runBtn)) return;
      const sel = document.createElement('select');
      sel.id = 'run-edition';
      sel.title = L("Scarica una edizione precedente (usa la sua data e ora nel nome del file)");
      sel.innerHTML =
        `<option value="">${L("Esegui edizione…")}</option>` +
        list.map((o, i) => `<option value="${i}">${escapeHtml(fmtDate(o.iso))}${o.scheduleLabel ? ' · ' + escapeHtml(o.scheduleLabel) : ''}</option>`).join('');
      (document.getElementById('btn-run-actions') || document.getElementById('btn-run-download') || runBtn).after(sel);
      sel.addEventListener('change', async () => {
        const o = list[Number(sel.value)];
        sel.value = '';
        if (!o) return;
        await window.api.tasks.save(state.editing);
        runBtn.disabled = true;
        const result = await window.api.tasks.runNow(state.editing.id, { scheduledAt: o.iso, scheduleId: o.scheduleId });
        runBtn.disabled = false;
        await refreshSidebar();
        flashButton(runBtn, result.status === 'error' ? L('Errore ✕') : L('Fatto ✓'));
      });
    });
  }
}

// Runs a task (or only a part of it) and returns the result. When the actions find no file to
// work on, the user is asked to pick one and the run is repeated on it.
async function runTaskPart(id, opts = {}) {
  let res = await window.api.tasks.runNow(id, opts);
  if (res.status === 'error' && res.code === 'no-file') {
    const file = confirm(L('Nessun file trovato per questo task. Vuoi scegliere il file su cui eseguire le azioni?')) ? await window.api.dialogs.pickFile() : null;
    if (file) res = await window.api.tasks.runNow(id, { ...opts, filepath: file });
  }
  if (res.status === 'error' && res.code === 'no-actions') alert(res.error);
  return res;
}

// Shows whether "Actions only" has a file to work on (and which), for the editor and the cards.
async function paintActionsStatus(taskId, el) {
  if (!el) return;
  const info = await window.api.tasks.actionsStatus(taskId);
  if (!document.body.contains(el)) return;
  const sources = { pending: L('in attesa'), expected: L('file del task'), last: L('ultimo scaricato') };
  const name = info.ok ? info.filepath.split(/[\\/]/).pop() : '';
  el.textContent = info.ok ? `● ${L('file presente')}: ${name} (${sources[info.source] || ''})` : `○ ${L('nessun file: verrà chiesto')}`;
  el.title = info.ok ? info.filepath : '';
  el.style.color = info.ok ? 'var(--ok)' : 'var(--warn)';
}

async function runPartFromEditor(btn, opts) {
  await window.api.tasks.save(state.editing);
  document.querySelectorAll('#btn-run-now,#btn-run-download,#btn-run-actions,#btn-run-actions-other,[data-run-action]').forEach((b) => (b.disabled = true));
  const result = await runTaskPart(state.editing.id, opts);
  document.querySelectorAll('#btn-run-now,#btn-run-download,#btn-run-actions,#btn-run-actions-other,[data-run-action]').forEach((b) => (b.disabled = false));
  await refreshSidebar();
  if (btn && document.body.contains(btn)) flashButton(btn, result.status === 'error' ? L('Errore ✕') : L('Fatto ✓'));
  return result;
}

function flashButton(btn, text) {
  const original = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = original), 1600);
}

// ---------- console ----------
function appendLog(entry) {
  const body = document.getElementById('console-body');
  const line = document.createElement('div');
  line.className = `log-line ${entry.level || 'info'}`;
  const taskName = state.tasks.find((t) => t.id === entry.taskId)?.name || entry.taskId;
  line.innerHTML = `<span class="log-ts">${fmtTime(new Date(entry.ts), true)}</span><span class="log-msg">[${escapeHtml(taskName)}] ${escapeHtml(entry.message)}</span>`;
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
}

// ---------- clock ----------
function tickClock() {
  const now = new Date();
  document.getElementById('clock-time').textContent = fmtTime(now, true);
  document.getElementById('clock-date').textContent = now.toLocaleDateString(nameLocale(), { weekday: 'long', day: '2-digit', month: 'long' });
}

// ---------- queue / next-download countdown ----------
async function refreshQueue() {
  state.queue = await window.api.queue.list();
  renderQueueSidebar();
  renderNextWidget();
}

function renderQueueSidebar() {
  const list = document.getElementById('queue-list');
  if (!state.queue.length) {
    list.innerHTML = `<div class="queue-empty">${escapeHtml(tr('noUpcoming'))}</div>`;
    return;
  }
  list.innerHTML = state.queue
    .map(
      (item, idx) => `
      <div class="queue-item ${idx === 0 ? 'next' : ''}">
        <span class="queue-time">${fmtDate(item.time)}</span>
        <span class="queue-name">${escapeHtml(item.taskName)}</span>
      </div>`
    )
    .join('');
}

function formatCountdown(ms) {
  if (ms <= 0) return L('adesso');
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return L('tra {t}', { t: `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s` });
  if (m > 0) return L('tra {t}', { t: `${m}m ${String(s).padStart(2, '0')}s` });
  return L('tra {t}', { t: `${s}s` });
}

function renderNextWidget() {
  const nameEl = document.getElementById('next-widget-name');
  const countEl = document.getElementById('next-widget-countdown');
  const next = state.queue[0];
  if (!next) {
    nameEl.textContent = tr('noActiveSchedule');
    countEl.textContent = '—';
    return;
  }
  // Every download due at the same minute as the first one, not just the first.
  const minute = (iso) => Math.floor(new Date(iso).getTime() / 60_000);
  const together = state.queue.filter((q) => minute(q.time) === minute(next.time));
  const names = [...new Set(together.map((q) => q.taskName))];
  nameEl.textContent = `${names.join(' · ')} — ${fmtDate(next.time)}`;
  nameEl.title = names.length > 1 ? L('{n} download insieme: {names}', { n: names.length, names: names.join(', ') }) : '';
  const diff = new Date(next.time) - new Date();
  countEl.textContent = formatCountdown(diff);
  if (diff <= 0) refreshQueue();
}

function tickCountdown() {
  if (state.queue.length) renderNextWidget();
  document.querySelectorAll('.task-card-countdown[data-time]').forEach((el) => {
    el.textContent = formatCountdown(new Date(el.dataset.time) - new Date());
  });
}

// ---------- tasks overview page ----------
function describeSchedule(s) {
  if (s.type === 'once') return `${L('Una volta:')} ${fmtDate(s.datetime)}`;
  if (s.type === 'interval') {
    const units = { seconds: L('sec'), minutes: L('min'), hours: L('ore'), days: L('giorni') };
    const n = s.everyValue ?? s.everyMinutes ?? 60;
    const u = s.everyUnit ? units[s.everyUnit] : L('min');
    const isDays = s.everyUnit === 'days';
    let txt = n === 1 && isDays ? L('Ogni giorno') : n === 2 && isDays ? L('Giorni alterni') : L('Ogni {n} {u}', { n, u });
    if (s.startAt) txt += ` · ${L('da {d}', { d: fmtDate(s.startAt) })}`;
    if (s.untilAt) txt += ` · ${L('fino a {d}', { d: fmtDate(s.untilAt) })}`;
    return txt;
  }
  if (s.cronMode === 'advanced') return `Cron: ${s.expr || ''}`;
  const days = (Array.isArray(s.days) && s.days.length ? s.days : [0, 1, 2, 3, 4, 5, 6]).slice().sort((a, b) => a - b);
  const key = days.join(',');
  let dayTxt;
  if (days.length === 7) dayTxt = L('Ogni giorno');
  else if (key === '1,2,3,4,5') dayTxt = L('Lun-Ven');
  else if (key === '0,6') dayTxt = L('Sab-Dom');
  else if (days.length === 1) dayTxt = L('Ogni {day} (settimanale)', { day: DAY_DEFS.find((d) => d.v === days[0]).l });
  else dayTxt = DAY_DEFS.filter((d) => days.includes(d.v)).map((d) => d.l).join(' ');
  const times = (Array.isArray(s.times) && s.times.length ? s.times : [s.time || '09:00']).slice().sort();
  const shown = times.slice(0, 6).join(' · ');
  return `${dayTxt} · ${shown}${times.length > 6 ? ` +${times.length - 6}` : ''}`;
}

function dayLabel(date) {
  const today = new Date();
  const d0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((d1 - d0) / 86_400_000);
  if (diff === 0) return L('Oggi');
  if (diff === 1) return L('Domani');
  return date.toLocaleDateString(nameLocale(), { weekday: 'long', day: '2-digit', month: 'long' });
}

async function renderTasksPage() {
  const root = document.getElementById('editor-root');
  const view = state.tasksView === 'steps' ? 'steps' : 'task';
  const range = state.stepsRange === '7d' ? '7d' : '24h';
  const active = state.tasks.filter((t) => t.enabled).length;
  const header = `
    <div class="editor-header">
      <div class="editor-title">
        <span class="editor-title-logo" style="display:inline-flex;align-items:center;justify-content:center;font-size:22px;line-height:1">📅</span>
        <h2 style="margin:0">${escapeHtml(tr('tasksPage'))}</h2>
        <span class="hint">${L('{n} task · {a} attivi', { n: state.tasks.length, a: active })}</span>
      </div>
      <div class="seg-control">
        <button class="seg-btn ${view === 'task' ? 'on' : ''}" data-tasks-view="task">${L("Task")}</button>
        <button class="seg-btn ${view === 'steps' ? 'on' : ''}" data-tasks-view="steps">${L("Tutti i passaggi")}</button>
      </div>
    </div>
    ${
      view === 'task'
        ? `<div class="page-actions">
            <button class="btn btn-primary" id="page-new-task">${L("+ Nuovo task")}</button>
            <button class="btn" id="page-import-task">${L("⤒ Importa task da file")}</button>
          </div>`
        : `<div class="page-actions">
            <div class="seg-control">
              <button class="seg-btn ${range === '24h' ? 'on' : ''}" data-steps-range="24h">${L("Prossime 24 ore")}</button>
              <button class="seg-btn ${range === '7d' ? 'on' : ''}" data-steps-range="7d">${L("Prossimi 7 giorni")}</button>
            </div>
          </div>`
    }`;

  let body = '';
  if (view === 'steps') {
    const queue = await window.api.queue.list(2000);
    if (state.mode !== 'tasks') return;
    const limit = Date.now() + (range === '7d' ? 7 * 24 : 24) * 3_600_000;
    const items = queue.filter((q) => new Date(q.time).getTime() <= limit);
    let lastDay = '';
    const rows = items
      .map((q) => {
        const t = state.tasks.find((x) => x.id === q.taskId) || {};
        const when = new Date(q.time);
        const label = dayLabel(when);
        const heading = label !== lastDay ? `<div class="timeline-day">${escapeHtml(label)}</div>` : '';
        lastDay = label;
        return `${heading}
        <div class="timeline-row ${statusClass(t)}" data-open-task="${q.taskId}">
          <div class="timeline-time">${fmtTime(when, false)}</div>
          <div class="timeline-main">
            <div class="timeline-name">${categoryDot(t.category)}${taskIcon(t)} ${escapeHtml(q.taskName)}</div>
            <div class="timeline-sub">${escapeHtml(q.scheduleLabel || '')}${t.category ? ` · ${escapeHtml(t.category)}` : ''}</div>
          </div>
          ${statusBadge(t)}
          <div class="task-card-countdown timeline-count" data-time="${when.toISOString()}">${formatCountdown(when - new Date())}</div>
        </div>`;
      })
      .join('');
    body = items.length
      ? `<div class="hint" style="margin-bottom:10px">${range === '7d' ? L('{n} passaggi previsti nei prossimi 7 giorni', { n: items.length }) : L('{n} passaggi previsti nelle prossime 24 ore', { n: items.length })}</div><div class="timeline">${rows}</div>`
      : `<div class="hint">${L("Nessun passaggio previsto nel periodo.")}</div>`;
  } else {
    const sorted = [...state.tasks].sort((a, b) => {
      const ka = a.enabled && a.nextRun ? new Date(a.nextRun).getTime() : Infinity;
      const kb = b.enabled && b.nextRun ? new Date(b.nextRun).getTime() : Infinity;
      return ka - kb || a.name.localeCompare(b.name);
    });
    const cards = sorted
      .map((t) => {
        const next = t.enabled && t.nextRun ? new Date(t.nextRun) : null;
        const history = t.history || [];
        const ok = history.filter((h) => h.status === 'success').length;
        const ko = history.filter((h) => h.status === 'error').length;
        const last = history.find((h) => h.mode !== 'actions');
        const schedules = (t.schedules || []).filter((s) => s.enabled !== false);
        const source = t.sourceType === 'local' ? t.localPath : t.url;
        const running = !!state.activeDownloads[t.id];
        return `
      <div class="task-card ${statusClass(t)}" data-open-task="${t.id}" style="border-top:3px solid ${categoryColor(t.category)}">
        <div class="task-card-head">
          <div class="task-card-name">${taskIcon(t)} ${escapeHtml(t.name)}</div>
          ${t.category ? categoryPill(t.category) : ''}
        </div>
        <div class="task-card-next">
          <div class="task-card-time">${next ? fmtTime(next, false) : '--:--'}</div>
          <div class="task-card-nextinfo">
            <div>${next ? fmtDate(next) : escapeHtml(t.enabled ? L('Nessuna pianificazione') : L('Task disattivato'))}</div>
            ${next ? `<div class="task-card-countdown" data-time="${next.toISOString()}">${formatCountdown(next - new Date())}</div>` : ''}
          </div>
        </div>
        <div class="task-card-badges">
          ${running ? `<span class="badge badge-idle">${L("⏳ In corso")}</span>` : ''}
          ${t.enabled ? `<span class="badge badge-ok">${L("Attivo")}</span>` : `<span class="badge badge-off">${L("Disattivo")}</span>`}
          ${statusBadge({ ...t, enabled: true })}
          ${t.pendingActions ? `<span class="badge badge-idle">${L("⏸ Azioni in attesa")}</span>` : ''}
        </div>
        <div class="task-card-sched">
          ${schedules.length ? schedules.map((s) => `<div><b>${escapeHtml(s.label || L('Pianificazione'))}</b><span>${escapeHtml(describeSchedule(s))}</span></div>`).join('') : `<div><span>${L("Nessuna pianificazione attiva")}</span></div>`}
        </div>
        <div class="task-card-info">
          <div><span>${L("Ultimo download")}</span><b>${last ? fmtDate(last.finishedAt) : '—'}${last && last.bytes ? ` · ${formatBytes(last.bytes)}` : ''}</b></div>
          ${t.lastStatus === 'error' && t.lastError ? `<div class="task-card-error"><span>${L("Ultimo errore")}</span><b>${escapeHtml(t.lastError)}</b></div>` : ''}
          <div><span>${L('Esito (ultimi {n})', { n: history.length })}</span><b><span style="color:var(--ok)">${ok} ok</span> · <span style="color:${ko ? 'var(--err)' : 'var(--text-dim)'}">${ko} ${L('falliti')}</span></b></div>
          ${(t.postActions || []).some((a) => a.enabled !== false) ? `<div><span>${L("Azioni")}</span><b data-actions-status="${t.id}">…</b></div>` : ''}
          <div><span>${L("Sorgente")}</span><b title="${escapeHtml(source || '')}">${escapeHtml(source || '—')}</b></div>
          <div><span>${L("Destinazione")}</span><b title="${escapeHtml(t.destinationFolder || '')}">${escapeHtml(t.destinationFolder || L('Cartella predefinita'))}</b></div>
        </div>
        <div class="task-card-actions">
          <button class="btn btn-sm" data-run-task="${t.id}" ${running ? 'disabled' : ''}>${L("▶ Esegui ora")}</button>
          ${(t.postActions || []).some((a) => a.enabled !== false) ? `<button class="btn btn-sm" data-run-task-actions="${t.id}" ${running ? 'disabled' : ''} title="${escapeHtml(L("Esegue solo le azioni successive sul file già presente, senza scaricare"))}">${L("⚙ Solo azioni")}</button>` : ''}
          ${last && last.filepath ? `<button class="btn btn-sm" data-reveal-file="${escapeHtml(last.filepath)}" title="${escapeHtml(L("Mostra l'ultimo file scaricato"))}">${L("📂 File")}</button>` : ''}
          <button class="btn btn-sm" data-toggle-task="${t.id}">${t.enabled ? L('⏸ Disattiva') : L('▶ Attiva')}</button>
          <button class="btn btn-sm btn-primary" data-open-task-btn="${t.id}">${L("Modifica")}</button>
        </div>
      </div>`;
      })
      .join('');
    body = cards ? `<div class="task-grid">${cards}</div>` : `<div class="hint">${escapeHtml(tr('noTasks'))}</div>`;
  }

  root.innerHTML = header + body;

  root.querySelectorAll('[data-steps-range]').forEach((el) => {
    el.addEventListener('click', () => {
      state.stepsRange = el.dataset.stepsRange;
      renderTasksPage();
    });
  });
  const pageNew = document.getElementById('page-new-task');
  if (pageNew) pageNew.addEventListener('click', newTask);
  const pageImport = document.getElementById('page-import-task');
  if (pageImport) pageImport.addEventListener('click', () => document.getElementById('btn-import-task').click());
  root.querySelectorAll('[data-tasks-view]').forEach((el) => {
    el.addEventListener('click', () => {
      state.tasksView = el.dataset.tasksView;
      renderTasksPage();
    });
  });
  root.querySelectorAll('[data-open-task]').forEach((el) => {
    el.addEventListener('click', () => selectTask(el.dataset.openTask));
  });
  root.querySelectorAll('[data-open-task-btn],[data-run-task],[data-run-task-actions],[data-toggle-task],[data-reveal-file]').forEach((el) => {
    el.addEventListener('click', (e) => e.stopPropagation());
  });
  root.querySelectorAll('[data-run-task]').forEach((el) => {
    el.addEventListener('click', async () => {
      el.disabled = true;
      await window.api.tasks.runNow(el.dataset.runTask);
      await refreshSidebar();
    });
  });
  root.querySelectorAll('[data-actions-status]').forEach((el) => paintActionsStatus(el.dataset.actionsStatus, el));
  root.querySelectorAll('[data-run-task-actions]').forEach((el) => {
    el.addEventListener('click', async () => {
      el.disabled = true;
      await runTaskPart(el.dataset.runTaskActions, { mode: 'actions' });
      await refreshSidebar();
    });
  });
  root.querySelectorAll('[data-toggle-task]').forEach((el) => {
    el.addEventListener('click', async () => {
      const task = await window.api.tasks.get(el.dataset.toggleTask);
      task.enabled = !task.enabled;
      await window.api.tasks.save(task);
      await refreshSidebar();
      await refreshQueue();
    });
  });
  root.querySelectorAll('[data-open-task-btn]').forEach((el) => {
    el.addEventListener('click', () => selectTask(el.dataset.openTaskBtn));
  });
}

// ---------- active downloads (in corso) ----------
function renderActiveWidget() {
  const widget = document.getElementById('active-widget');
  const body = document.getElementById('active-widget-body');
  const entries = Object.entries(state.activeDownloads);
  if (!entries.length) {
    widget.style.display = 'none';
    return;
  }
  widget.style.display = 'flex';
  body.innerHTML = entries
    .map(
      ([, d]) => `
      <div class="active-download-row">
        <div class="active-download-name"><span>${escapeHtml(d.name)}</span><span>${d.total ? d.pct + '%' : '…'}</span></div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${d.total ? d.pct : 8}%"></div></div>
      </div>`
    )
    .join('');
}

// ---------- cron quick-reference modal ----------
function renderCronHelpBox() {
  const lang = state.settings?.language || 'it';
  const c = CRON_HELP_CONTENT[lang] || CRON_HELP_CONTENT.it;
  return `
    <button type="button" class="modal-close" data-close-cron-help title="${escapeHtml(L("Chiudi"))}">✕</button>
    <h3>${escapeHtml(c.title)}</h3>
    <p>${escapeHtml(c.intro)}</p>
    <table class="cron-help-table">
      ${c.fields.map((f) => `<tr><td>${escapeHtml(f.f)}</td><td>${escapeHtml(f.d)}</td></tr>`).join('')}
    </table>
    <table class="cron-help-table">
      ${c.tokens.map((t) => `<tr><td>${escapeHtml(t.t)}</td><td>${escapeHtml(t.d)}</td></tr>`).join('')}
    </table>
    <h4>${escapeHtml(c.examplesLabel)}</h4>
    <ul class="cron-help-examples">
      ${c.examples.map((ex) => `<li><code>${escapeHtml(ex.expr)}</code>${escapeHtml(ex.d)}</li>`).join('')}
    </ul>
    <div class="hint">${escapeHtml(c.tip)}</div>
  `;
}

function openCronHelp() {
  document.getElementById('cron-help-box').innerHTML = renderCronHelpBox();
  document.getElementById('cron-help-overlay').classList.add('open');
}

function closeCronHelp() {
  document.getElementById('cron-help-overlay').classList.remove('open');
}

// ---------- top-level wiring ----------
function initGlobalUI() {
  document.getElementById('btn-new-task').addEventListener('click', newTask);
  document.getElementById('btn-import-task').addEventListener('click', async () => {
    const result = await window.api.tasks.importOne();
    if (result.canceled) return;
    if (!result.ok) {
      alert(L('Import fallito: {error}', { error: result.error }));
      return;
    }
    await refreshSidebar();
    selectTask(result.task.id);
    if (result.count > 1) alert(L('Importati {n} task.', { n: result.count }));
  });

  // Delegated on document (not editor-root, which gets replaced on every render)
  // so the "?" button works no matter which screen/schedule row it's clicked from.
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-cron-help]')) {
      openCronHelp();
    } else if (e.target.id === 'cron-help-overlay' || e.target.closest('.modal-close')) {
      closeCronHelp();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCronHelp();
  });
  document.getElementById('btn-dashboard').addEventListener('click', () => {
    state.mode = 'dashboard';
    state.selectedId = null;
    renderSidebar();
    renderEditor();
  });
  // "Mostra file": delegated because the editor and the Palinsesto re-render often.
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-reveal-file]');
    if (!btn) return;
    e.stopPropagation();
    const result = await window.api.files.reveal(btn.dataset.revealFile);
    const out = btn.parentElement.parentElement.querySelector('.reveal-result');
    const msg = result.ok ? (result.kind === 'folder' ? L('File non più presente: aperta la cartella.') : '') : result.error;
    if (out) out.textContent = msg;
    else if (!result.ok) alert(result.error);
  });
  // Show/hide password fields (delegated: the editor re-renders often).
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toggle-password]');
    if (!btn) return;
    const input = btn.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? '🙈' : '👁';
  });
  document.getElementById('btn-tasks').addEventListener('click', async () => {
    state.mode = 'tasks';
    state.selectedId = null;
    await loadTasks();
    renderSidebar();
    renderEditor();
  });
  document.getElementById('btn-settings').addEventListener('click', async () => {
    state.mode = 'settings';
    state.settings = await window.api.settings.get();
    renderSidebar();
    renderEditor();
  });
  document.getElementById('btn-about').addEventListener('click', () => {
    state.mode = 'about';
    state.selectedId = null;
    renderSidebar();
    renderEditor();
  });
  document.getElementById('btn-clear-console').addEventListener('click', () => {
    document.getElementById('console-body').innerHTML = '';
  });
  document.getElementById('btn-toggle-console').addEventListener('click', (e) => {
    const el = document.getElementById('console');
    el.classList.toggle('collapsed');
    e.target.textContent = el.classList.contains('collapsed') ? '▸' : '▾';
  });

  const consoleEl = document.getElementById('console');
  const resizeHandle = document.getElementById('console-resize-handle');
  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = consoleEl.getBoundingClientRect().height;
    const onMove = (moveEvent) => {
      const delta = startY - moveEvent.clientY;
      const newHeight = Math.min(Math.max(startHeight + delta, 40), Math.round(window.innerHeight * 0.75));
      consoleEl.style.height = `${newHeight}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  window.api.on.log(appendLog);
  window.api.on.taskStarted(({ taskId }) => {
    const task = state.tasks.find((t) => t.id === taskId);
    state.activeDownloads[taskId] = { name: task?.name || taskId, pct: 0, received: 0, total: 0 };
    renderActiveWidget();
    refreshSidebar();
  });
  window.api.on.progress(({ taskId, pct, received, total }) => {
    if (!state.activeDownloads[taskId]) return;
    Object.assign(state.activeDownloads[taskId], { pct, received, total });
    renderActiveWidget();
  });
  window.api.on.updateAvailable((info) => showUpdateBanner(info));
  window.api.on.updateProgress(onUpdateProgress);
  // buttons in the bar and in Settings share the same actions
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-upd]');
    if (btn) handleUpdateAction(btn.dataset.upd);
  });
  window.api.on.taskFinished(({ taskId }) => {
    delete state.activeDownloads[taskId];
    renderActiveWidget();
    refreshSidebar();
    refreshQueue();
  });
}

function applyTheme(mode) {
  const isLight = mode === 'light';
  document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
  const logo = document.getElementById('brand-logo-img');
  if (logo) logo.src = isLight ? '../assets/logo-black.png' : '../assets/logo-white.png';
}

function applyStaticTranslations() {
  document.getElementById('btn-new-task').textContent = tr('newTask');
  document.getElementById('btn-dashboard-label').textContent = tr('dashboard');
  document.getElementById('btn-tasks-label').textContent = tr('tasksPage');
  document.getElementById('queue-panel-title').textContent = tr('upcomingQueue');
  document.getElementById('task-list-header').textContent = tr('task');
  document.getElementById('btn-settings').textContent = tr('settings');
  document.getElementById('btn-about').textContent = tr('aboutHelp');
  document.getElementById('console-title').textContent = tr('console');
  document.getElementById('btn-clear-console').textContent = tr('clear');
  document.getElementById('next-widget-label').textContent = tr('nextDownload');
  document.getElementById('active-widget-label').textContent = tr('downloadInProgress');
  document.getElementById('btn-new-task').title = L('Nuovo task');
  document.getElementById('btn-import-task').title = L('Importa task da file');
  document.getElementById('console-resize-handle').title = L('Trascina per ridimensionare');
}

(async function init() {
  initGlobalUI();
  state.settings = await window.api.settings.get();
  applyTheme(state.settings.themeMode);
  applyStaticTranslations();
  tickClock();
  setInterval(tickClock, 1000);
  setInterval(tickCountdown, 1000);
  await refreshSidebar();
  await refreshQueue();
  renderEditor();
  setInterval(refreshSidebar, 30000); // keep "prossimo run" / badges fresh
  setInterval(refreshQueue, 30000);
})();
