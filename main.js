import { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage, nativeTheme, Notification, shell, clipboard, powerSaveBlocker } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  getTasks,
  getTask,
  saveTask,
  deleteTask,
  newTaskTemplate,
  getSettings,
  updateSettings,
  getWindowBounds,
  setWindowBounds,
  getConfig,
  applyConfig,
  applyCategoryChange,
  addTasks,
  exportTaskData,
  getDailyStats,
  migrateSecrets,
  unreadableSecrets,
  takeLegacyNotifiedVersion,
  getUpdateState,
  setUpdateState,
  getLastSeenVersion,
  setLastSeenVersion,
  getCloseHintShown,
  setCloseHintShown,
  hadSettingsFile,
  settingsFile
} from './src/store.js';
import { startScheduler, lastScheduledOccurrence, recentOccurrences, nextRunForTask, computeQueue, findMissedOccurrences, upcomingOccurrencesForSchedule } from './src/scheduler.js';
import { runTaskNow, runningTaskCount, actionsFileInfo, previewTaskActions, previewCleanup, events as downloadEvents } from './src/downloader.js';
import { notifier, getAlertState } from './src/services.js';
import { checkForUpdate, downloadInstaller, sweepPartials, bannerState, remindLaterState, skipVersionState, makeSafetyCopy, installPlan, whatsNew, startupKind } from './src/updater.js';
import { buildExport, backupFileName, prepareImport, buildTaskExport, prepareTaskImport } from './src/backup.js';
import { renameCategory, deleteCategory } from './src/categories.js';
import { addExceptionToTasks, normalizeExceptions } from './src/exceptions.js';
import { buildSupportInfo } from './src/support.js';
import { httpFetch } from './src/httpfetch.js';
import { appendFileLog, pruneOldLogs, getLogDir, getLastError } from './src/filelog.js';
import { M } from './src/i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The native time/date inputs of the schedule editor follow Chromium's locale (on an
// English Windows they show AM/PM). Pick that locale from the format preset before the
// app is ready; changing the preset therefore needs a restart for those fields.
const PRESET_LOCALES = { it: 'it-IT', us: 'en-US', gb: 'en-GB', iso: 'sv-SE', au: 'en-AU' };
function inputLocale() {
  const st = getSettings();
  let preset = st.formatPreset;
  if (!PRESET_LOCALES[preset]) {
    // 'auto' (or a store from before presets existed): follow the interface language
    preset = (preset === undefined && st.dateFormatStyle === 'en') || st.language === 'en' ? 'us' : 'it';
  }
  return PRESET_LOCALES[preset];
}
app.commandLine.appendSwitch('lang', inputLocale());

// The app keeps running in the tray after the window is closed (see
// window-all-closed below), so without a single-instance lock every
// "npm start" / relaunch during dev would pile up a new hidden process
// instead of reusing the existing one — the tray icon then shows whichever
// instance happens to still have focus, which can be stale code.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  const bounds = getWindowBounds();
  mainWindow = new BrowserWindow({
    width: bounds.width || 1100,
    height: bounds.height || 720,
    x: bounds.x,
    y: bounds.y,
    minWidth: 860,
    minHeight: 560,
    show: false,
    backgroundColor: '#12141a',
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // The UI is one local page: never let it navigate elsewhere or open new windows.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) e.preventDefault();
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    const settings = getSettings();
    if (!settings.startMinimized) mainWindow.show();
  });

  let boundsSaveTimer = null;
  const persistBounds = () => {
    if (boundsSaveTimer) clearTimeout(boundsSaveTimer);
    boundsSaveTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) setWindowBounds(mainWindow.getBounds());
    }, 400);
  };
  mainWindow.on('resize', persistBounds);
  mainWindow.on('move', persistBounds);

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      // said once: the window closes into the tray (apps/COMMON-FEATURES.md 5.5)
      if (!getCloseHintShown()) {
        setCloseHintShown();
        dialog
          .showMessageBox({
            type: 'info',
            title: 'G-Downloader',
            message: M("Il programma è ancora in esecuzione nella system tray."),
            detail: M("L'icona appare nell'area notifiche in basso a destra.\n\n• Doppio click sull'icona → riapri finestra\n• Tasto destro sull'icona → Esci → chiudi completamente\n\nQuesto avviso compare una sola volta."),
            buttons: ['OK'],
            icon: trayIcon(getSettings().trayIconStyle)
          })
          .catch(() => {});
      }
    } else {
      setWindowBounds(mainWindow.getBounds());
    }
  });

  downloadEvents.on('log', (entry) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('event:log', entry);
  });
  downloadEvents.on('progress', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('event:progress', data);
  });
  downloadEvents.on('task-started', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('event:task-started', data);
    activeDownloadCount++;
    if (activeDownloadCount === 1) startTrayAnimation();
  });
  downloadEvents.on('task-finished', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('event:task-finished', data);
    activeDownloadCount = Math.max(0, activeDownloadCount - 1);
    if (activeDownloadCount === 0) stopTrayAnimation();
  });
}

const TRAY_ICON_HEIGHT = 26; // px, matches the visual weight of the other menu-bar glyphs
const TRAY_ANIM_PULSE_HEIGHT = TRAY_ICON_HEIGHT + 6;
const TRAY_ANIM_INTERVAL_MS = 450;

// The source glyph only fills ~52% of its 64x64 canvas (macOS menu-bar icons
// carry generous padding by convention). Windows tray icons render at a tiny
// fixed slot (16-32px), so that padding halves the glyph's already-small
// on-screen size. Cropping tight to the opaque pixels before resizing makes
// the glyph itself fill the slot instead of floating in transparent margin.
function tightCropToContent(image, paddingRatio = 0.12) {
  const { width, height } = image.getSize();
  const bitmap = image.toBitmap(); // BGRA
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = bitmap[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return image; // fully transparent source, nothing to crop
  const glyphSide = Math.max(maxX - minX + 1, maxY - minY + 1);
  const boxSide = Math.min(width, Math.round(glyphSide * (1 + paddingRatio * 2)));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const x = Math.max(0, Math.min(width - boxSide, Math.round(cx - boxSide / 2)));
  const y = Math.max(0, Math.min(height - boxSide, Math.round(cy - boxSide / 2)));
  return image.crop({ x, y, width: boxSide, height: boxSide });
}

// The "white" glyph is authored as solid black, relying on macOS to auto-tint
// template images per menu-bar theme. Windows does no such tinting, so on the
// default dark taskbar the black glyph is nearly invisible. Recolor it to
// match the current Windows taskbar theme instead.
function recolorPreservingAlpha(image, [r, g, b]) {
  const { width, height } = image.getSize();
  const buf = Buffer.from(image.toBitmap()); // BGRA
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = b;
    buf[i + 1] = g;
    buf[i + 2] = r;
  }
  return nativeImage.createFromBuffer(buf, { width, height });
}

function trayIcon(style, height = TRAY_ICON_HEIGHT) {
  const filename = style === 'color' ? 'tray-icon-color.png' : 'tray-icon.png';
  let fromFile = nativeImage.createFromPath(path.join(__dirname, 'assets', filename));
  if (!fromFile.isEmpty()) {
    // macOS scales status-bar icons to fill the menu bar height regardless of source
    // resolution, so an explicit target size is what actually controls how big it
    // reads next to the other status items (Wi-Fi, Bluetooth, ...).
    if (process.platform === 'darwin') {
      fromFile = fromFile.resize({ height });
      // Only the monochrome variant should be auto-tinted by the OS; the colored
      // orange glyph must keep its own colors regardless of light/dark menu bar.
      fromFile.isMacTemplateImage = style !== 'color';
    } else if (process.platform === 'win32') {
      fromFile = tightCropToContent(fromFile);
      if (style !== 'color') {
        const dark = nativeTheme.shouldUseDarkColors;
        fromFile = recolorPreservingAlpha(fromFile, dark ? [255, 255, 255] : [0, 0, 0]);
      }
      fromFile = fromFile.resize({ width: 32, height: 32, quality: 'best' });
    }
    return fromFile;
  }
  // Fallback embedded pixel icon, in case the asset is missing (e.g. running from a stripped build).
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKklEQVR4nGNgoBAwUqifgWr' +
    '4/38GBgYGRlyKGRkY/kOAWAWEZKMDFHkA+SoNAI2CYr8AAAAASUVORK5CYII=';
  return nativeImage.createFromBuffer(Buffer.from(png, 'base64'));
}

let trayAnimTimer = null;
let trayAnimFrame = 0;
let activeDownloadCount = 0;

function startTrayAnimation() {
  if (trayAnimTimer || !tray) return;
  trayAnimTimer = setInterval(() => {
    trayAnimFrame = 1 - trayAnimFrame;
    const height = trayAnimFrame ? TRAY_ANIM_PULSE_HEIGHT : TRAY_ICON_HEIGHT;
    tray.setImage(trayIcon(getSettings().trayIconStyle, height));
  }, TRAY_ANIM_INTERVAL_MS);
}

function stopTrayAnimation() {
  if (trayAnimTimer) {
    clearInterval(trayAnimTimer);
    trayAnimTimer = null;
  }
  if (tray) tray.setImage(trayIcon(getSettings().trayIconStyle));
}

function createTray() {
  tray = new Tray(trayIcon(getSettings().trayIconStyle));
  tray.setToolTip('G-Downloader');
  const menu = Menu.buildFromTemplate([
    { label: M("Apri G-Downloader"), click: () => mainWindow.show() },
    { type: 'separator' },
    {
      label: M("Esci"),
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => mainWindow.show());
}

let awakeId = null;
function applyKeepAwake(on) {
  if (on && awakeId === null) awakeId = powerSaveBlocker.start('prevent-app-suspension');
  else if (!on && awakeId !== null) {
    powerSaveBlocker.stop(awakeId);
    awakeId = null;
  }
}

app.on('second-instance', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon-mac.png')));
  }
  createWindow();
  createTray();

  migrateSecrets();
  pruneOldLogs();
  downloadEvents.on('log', appendFileLog);
  for (const id of unreadableSecrets()) {
    appendFileLog({ taskId: 'SISTEMA', level: 'warn', message: M('Una password salvata non si può aprire su questo PC o con questo utente: va riscritta ({id}).', { id }) });
  }
  applyKeepAwake(getSettings().keepAwake);
  sweepPartials(app.getPath('downloads')); // installers left half-downloaded by a closed app
  adoptLegacyUpdateMemory();
  prepareStartupNotice();
  scheduleUpdateChecks();

  // Snapshot missed occurrences BEFORE the first scheduler tick runs its catch-up
  // fire and bumps lastFired — otherwise there'd be nothing left to detect as missed.
  if (getSettings().watchdogMissedSchedules) {
    const missed = findMissedOccurrences(getTasks(), new Date());
    for (const m of missed) {
      const msg = M(m.count === 1 ? 'Pianificazione "{label}" saltata 1 volta (app non attiva): verrà eseguito solo l\'ultimo orario dovuto.' : 'Pianificazione "{label}" saltata {count} volte (app non attiva): verrà eseguito solo l\'ultimo orario dovuto.', { label: m.scheduleLabel, count: m.count });
      downloadEvents.emit('log', { taskId: m.taskId, message: msg, level: 'warn', ts: new Date().toISOString() });
      if (Notification.isSupported()) {
        new Notification({ title: M("{name}: pianificazioni saltate", { name: m.taskName }), body: msg }).show();
      }
    }
  }

  startScheduler((taskId, message, level) => {
    downloadEvents.emit('log', { taskId, message, level: level || 'info', ts: new Date().toISOString() });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // Keep running in tray: app stays alive until explicit quit from the tray menu.
});

// ---- IPC: tasks ----
ipcMain.handle('tasks:list', () => {
  return getTasks().map((t) => ({ ...t, nextRun: nextRunForTask(t) }));
});

ipcMain.handle('tasks:get', (_e, id) => getTask(id));

ipcMain.handle('tasks:new-template', () => newTaskTemplate());

// The editor works on a copy loaded earlier. Saving it as-is would roll back what the
// engine wrote meanwhile (run history, counters and, worse, schedule "lastFired": an old
// value makes the scheduler fire the occurrence again). Keep the engine's values.
ipcMain.handle('tasks:save', (_e, task) => {
  const existing = getTask(task.id);
  if (existing) {
    for (const k of ['history', 'lastRun', 'lastStatus', 'lastError', 'lastFileHash', 'seqCounter', 'pendingActions']) {
      if (existing[k] === undefined) delete task[k];
      else task[k] = existing[k];
    }
    const byId = new Map((existing.schedules || []).map((sc) => [sc.id, sc]));
    for (const sc of task.schedules || []) {
      const ex = byId.get(sc.id);
      if (ex?.lastFired && (!sc.lastFired || new Date(ex.lastFired) > new Date(sc.lastFired))) {
        sc.lastFired = ex.lastFired;
        sc.fired = ex.fired;
      }
    }
  }
  return saveTask(task);
});

ipcMain.handle('tasks:delete', (_e, id) => {
  deleteTask(id);
  return true;
});

ipcMain.handle('tasks:recent-occurrences', (_e, id) => {
  const task = getTask(id);
  if (!task) return [];
  return recentOccurrences(task).map((o) => ({
    iso: o.when.toISOString(),
    scheduleId: o.schedule.id,
    scheduleLabel: o.schedule.label || ''
  }));
});

// Manual run of a task named after its edition ({time} in the URL): behave like the
// last scheduled occurrence, otherwise the file would be looked up under the click time.
function manualOccurrence(task) {
  const usesTime = task && /{time/.test(`${task.url || ''}${task.localPath || ''}`);
  const last = usesTime ? lastScheduledOccurrence(task) : null;
  return last ? { schedule: last.schedule, scheduledAt: last.when.toISOString() } : {};
}

// File "Actions only" would work on, for the status shown next to the button.
ipcMain.handle('tasks:actions-status', (_e, id) => actionsFileInfo(id, manualOccurrence(getTask(id))));
// The commands an action would run, placeholders filled in, without running them.
// What the folder cleanup would do right now (nothing is touched).
ipcMain.handle('tasks:preview-cleanup', (_e, id) => previewCleanup(id, manualOccurrence(getTask(id))));
ipcMain.handle('tasks:preview-action', (_e, id, action) => previewTaskActions(id, action, manualOccurrence(getTask(id))));

ipcMain.handle('tasks:run-now', async (_e, id, edition) => {
  try {
    // mode: 'download' (no actions) | 'actions' (no download); actionIds: only these actions;
    // filepath: the file the actions work on. All optional: no mode = download, then actions.
    const extra = { mode: edition?.mode, actionIds: edition?.actionIds, filepath: edition?.filepath };
    // A specific past edition chosen by the user ("Esegui edizione…").
    if (edition?.scheduledAt) {
      const t = getTask(id);
      const schedule = (t?.schedules || []).find((sc) => sc.id === edition.scheduleId);
      return await runTaskNow(id, { schedule, scheduledAt: edition.scheduledAt, ...extra });
    }
    return await runTaskNow(id, { ...manualOccurrence(getTask(id)), ...extra });
  } catch (err) {
    return { status: 'error', error: err.message, code: err.code };
  }
});

ipcMain.handle('stats:daily', () => getDailyStats());
ipcMain.handle('queue:list', (_e, limit) => computeQueue(getTasks(), limit || 20));

// ---- IPC: notifications ----
ipcMain.handle('notifications:test-email', (_e, emailCfg) => notifier.testEmail(emailCfg));
ipcMain.handle('notifications:test-telegram', (_e, tgCfg) => notifier.testTelegram(tgCfg));

// ---- IPC: settings ----
ipcMain.handle('settings:get', () => getSettings());
ipcMain.handle('settings:update', (_e, patch) => {
  const next = updateSettings(patch);
  app.setLoginItemSettings({ openAtLogin: !!next.startOnBoot, openAsHidden: true });
  if ('keepAwake' in patch) applyKeepAwake(next.keepAwake);
  if ('trayIconStyle' in patch && tray) tray.setImage(trayIcon(next.trayIconStyle));
  return next;
});

// ---- updates (apps/COMMON-FEATURES.md, section 4) ----
// The check shows a banner; on request the installer is downloaded to the Downloads folder and verified (SHA-256).
// Nothing installs by itself: it runs only when the user presses "Close and install" / "Open installer".
let lastUpdateInfo = null;
let downloadedInstaller = null; // { version, file } once downloaded and verified
let installerDownload = null; // promise of the download in progress, shared by concurrent requests
let downloadAbort = null;
let startupNotice = null; // { version, previous, whatsNew } for the first start after an update

const send = (channel, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, data);
};

const updateView = (info) => ({ ...info, banner: bannerState(info, getUpdateState()), state: getUpdateState() });

async function runUpdateCheck(manual) {
  const settings = getSettings();
  const info = await checkForUpdate({ repo: settings.updateRepo, current: app.getVersion(), fetchFn: httpFetch });
  setUpdateState({ lastCheck: { at: Date.now(), ok: !!info.ok, error: info.ok ? '' : String(info.error || '').slice(0, 200) } });
  if (info.ok) lastUpdateInfo = info;
  if (manual && info.ok && info.available) setUpdateState({ remindUntil: 0, skipVersion: '' }); // asked on purpose: show it
  const view = updateView(info);
  if (!manual && view.banner === 'show') send('event:update-available', view);
  if (info.ok && info.available) await announceNewVersion(info);
  return view;
}

// A machine nobody looks at still gets to know: the new version is announced ONCE per channel (desktop, Telegram, email),
// the channel being marked only after the message was delivered (src/notify.js, alert-state.json).
async function announceNewVersion(info) {
  const state = getAlertState();
  const s = getSettings();
  if (s.updateAlert !== false && s.notifications?.desktop !== false && Notification.isSupported() && !state.isTold(info.latest, 'desktop')) {
    new Notification({ title: 'G-Downloader', body: M('Nuova versione {latest} disponibile (installata: {current}).', { latest: info.latest, current: info.current }) }).show();
    state.markTold(info.latest, 'desktop');
  }
  await notifier.updateNotice(info);
}

// 26.10.1 remembered the last announced version in the settings; it moved to alert-state.json.
function adoptLegacyUpdateMemory() {
  const v = takeLegacyNotifiedVersion();
  if (!v) return;
  for (const c of ['desktop', 'telegram', 'email']) getAlertState().markTold(v, c);
}

function scheduleUpdateChecks() {
  setTimeout(() => getSettings().checkUpdates && runUpdateCheck(false), 15_000);
  setInterval(() => getSettings().checkUpdates && runUpdateCheck(false), 24 * 3600 * 1000);
}

function readChangelog() {
  try {
    return fs.readFileSync(path.join(__dirname, 'CHANGELOG.md'), 'utf8');
  } catch {
    return '';
  }
}

// First start after an update: "Updated to X" and the What's new window (once, until the user closes it).
function prepareStartupNotice() {
  const current = app.getVersion();
  const kind = startupKind(getLastSeenVersion(), current, hadSettingsFile);
  if (kind === 'first') setLastSeenVersion(current);
  else if (kind === 'updated') startupNotice = { version: current, previous: getLastSeenVersion(), whatsNew: whatsNew(readChangelog(), current) };
}

ipcMain.handle('update:check', () => runUpdateCheck(true));
ipcMain.handle('update:state', () => ({ last: lastUpdateInfo ? updateView(lastUpdateInfo) : null, state: getUpdateState(), ready: downloadedInstaller && fs.existsSync(downloadedInstaller.file) ? { version: downloadedInstaller.version } : null }));
ipcMain.handle('update:remind-later', () => {
  setUpdateState(remindLaterState(getUpdateState()));
  return { ok: true };
});
ipcMain.handle('update:skip', (_e, version) => {
  setUpdateState(skipVersionState(getUpdateState(), version || lastUpdateInfo?.latest));
  return { ok: true };
});
ipcMain.handle('update:startup', () => startupNotice);
ipcMain.handle('update:startup-ack', () => {
  setLastSeenVersion(app.getVersion());
  startupNotice = null;
  return true;
});

ipcMain.handle('update:download', async () => {
  const info = lastUpdateInfo;
  if (!info?.available) return { ok: false, error: 'no-update' };
  if (downloadedInstaller?.version === info.latest && fs.existsSync(downloadedInstaller.file)) {
    return { ok: true, file: downloadedInstaller.file, version: info.latest };
  }
  if (installerDownload) return installerDownload; // a second click joins the download in progress
  const dir = app.getPath('downloads');
  sweepPartials(dir); // only now: never while a download of this process is running
  downloadAbort = new AbortController();
  installerDownload = downloadInstaller({
    info,
    dir,
    fetchFn: httpFetch,
    current: app.getVersion(),
    signal: downloadAbort.signal,
    onProgress: (received, total) => send('event:update-progress', { received, total })
  })
    .then((file) => {
      downloadedInstaller = { version: info.latest, file };
      appendFileLog({ taskId: 'SISTEMA', message: M('Aggiornamento {v} scaricato e verificato: {file}', { v: info.latest, file }) });
      return { ok: true, file, version: info.latest };
    })
    .catch((err) => {
      if (err.cancelled) return { ok: false, error: 'cancelled' };
      appendFileLog({ taskId: 'SISTEMA', level: 'error', message: M('Download dell\'aggiornamento non riuscito: {error}', { error: err.message }) });
      return { ok: false, error: err.message };
    })
    .finally(() => {
      installerDownload = null;
      downloadAbort = null;
    });
  return installerDownload;
});
ipcMain.handle('update:cancel', () => {
  downloadAbort?.abort();
  return true;
});

// Windows: start the installer and quit, so it can replace the app (the installer starts it again when done).
// macOS / Linux: open the disk image / show the AppImage; the user completes the installation.
// Refused while a download is running: closing the app would interrupt it.
ipcMain.handle('update:install', () => {
  const d = downloadedInstaller;
  if (!d || !fs.existsSync(d.file)) return { ok: false, error: 'no-installer' };
  const busy = runningTaskCount();
  if (busy > 0) return { ok: false, error: 'busy', count: busy };
  try {
    makeSafetyCopy({ file: settingsFile(), dir: path.join(app.getPath('userData'), 'backups'), version: d.version });
  } catch (err) {
    appendFileLog({ taskId: 'SISTEMA', level: 'warn', message: M('Copia di sicurezza prima dell\'aggiornamento non riuscita: {error}', { error: err.message }) });
  }
  const plan = installPlan(process.platform, d.file);
  if (plan.kind === 'run-installer') {
    spawn(plan.file, [], { detached: true, stdio: 'ignore' }).unref();
    isQuitting = true;
    setTimeout(() => app.quit(), 500);
  } else if (plan.kind === 'open-image') {
    shell.openPath(plan.file);
  } else {
    shell.showItemInFolder(plan.file);
  }
  return { ok: true, hint: plan.hint || '' };
});

// Only this repository's release pages, or the author's site.
ipcMain.handle('update:open', (_e, url) => {
  const releases = `https://github.com/${getSettings().updateRepo}/releases/`;
  if (url === 'https://onairgarage.com') return shell.openExternal(url);
  if (typeof url === 'string' && url.startsWith('https://onairgarage.com/tools/g-downloader')) return shell.openExternal(url);
  if (url === 'mailto:hello@onairgarage.com') return shell.openExternal(url);
  return shell.openExternal(typeof url === 'string' && url.startsWith(releases) ? url : `${releases}latest`);
});

// ---- IPC: app info, support info (apps/COMMON-FEATURES.md 5.2) ----
ipcMain.handle('app:info', () => ({
  name: 'G-Downloader',
  version: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  platform: process.platform,
  arch: process.arch,
  installationName: getSettings().installationName || os.hostname()
}));

// What the owner may ask a user to paste into an email: never settings values, addresses, tokens or file names.
ipcMain.handle('support:copy', () => {
  const s = getSettings();
  const text = buildSupportInfo({
    app: 'G-Downloader',
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    language: s.language,
    installationName: s.installationName || os.hostname(),
    lastCheck: getUpdateState().lastCheck,
    lastError: getLastError(),
    home: os.homedir()
  });
  clipboard.writeText(text);
  return { ok: true, text };
});

// ---- IPC: pickers ----
ipcMain.handle('dialog:pick-folder', async () => {
  const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] });
  return res.canceled ? null : res.filePaths[0];
});

ipcMain.handle('dialog:pick-file', async () => {
  const res = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] });
  return res.canceled ? null : res.filePaths[0];
});

// Shows a downloaded file in the file manager; if it is gone (e.g. another program moved
// it), opens the folder it was saved in. Reveal/open only, nothing is ever executed.
ipcMain.handle('file:reveal', async (_e, filePath) => {
  if (typeof filePath !== 'string' || !filePath.trim()) return { ok: false, error: M("Nessun file registrato") };
  try {
    await fs.promises.access(filePath);
    shell.showItemInFolder(filePath);
    return { ok: true, kind: 'file' };
  } catch {
    // not there any more: fall through to the folder
  }
  const dir = path.dirname(filePath);
  try {
    await fs.promises.access(dir);
    await shell.openPath(dir);
    return { ok: true, kind: 'folder' };
  } catch {
    return { ok: false, error: M("Il file e la sua cartella non sono più disponibili") };
  }
});

ipcMain.handle('system:open-log-folder', () => {
  shell.openPath(getLogDir());
  return true;
});

// A shared/imported file can carry post-download actions that run programs. Show them and
// ask before importing, so a file from someone else cannot silently plant a command.
async function confirmImportedCommands(commands) {
  if (!commands?.length) return true;
  const shown = commands.slice(0, 8).map((c) => `[${c.task}] ${c.line}`).join('\n') + (commands.length > 8 ? M("\n… e altri {n}", { n: commands.length - 8 }) : '');
  const res = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: [M("Importa"), M("Annulla")],
    defaultId: 1,
    cancelId: 1,
    title: M("Il file esegue comandi"),
    message: M("Questo file contiene azioni che eseguono comandi sul computer."),
    detail: shown + M("\n\nImporta solo file di cui ti fidi.")
  });
  return res.response === 0;
}

const importErrorText = (code) =>
  ({
    invalid: M("File di configurazione non valido"),
    'wrong-app': M("Questo file non è un backup di G-Downloader"),
    'too-big': M("Il file è troppo grande"),
    'no-tasks': M("Il file non contiene task")
  })[code] || code;

// ---- IPC: configuration backup (apps/COMMON-FEATURES.md, section 3) ----
// Settings, tasks, categories and colours; never the history, the logs or what the alerts already said.
ipcMain.handle('config:export', async (_e, opts = {}) => {
  const includeSecrets = opts.includeSecrets === true;
  const res = await dialog.showSaveDialog(mainWindow, {
    title: M("Esporta configurazione"),
    defaultPath: backupFileName(),
    filters: [{ name: M("File di configurazione"), extensions: ['json'] }]
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  try {
    const file = buildExport(getConfig(), { includeSecrets });
    // with passwords inside the file is readable only by its owner
    fs.writeFileSync(res.filePath, JSON.stringify(file, null, 2), { encoding: 'utf-8', mode: includeSecrets ? 0o600 : 0o644 });
    if (includeSecrets) fs.chmodSync(res.filePath, 0o600);
    return { ok: true, filePath: res.filePath, includesSecrets: includeSecrets };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// mode: 'replace' (settings and tasks from the file) | 'add' (only the tasks this PC does not have, switched off)
ipcMain.handle('config:import', async (_e, opts = {}) => {
  const mode = opts.mode === 'add' ? 'add' : 'replace';
  const res = await dialog.showOpenDialog(mainWindow, {
    title: M("Importa configurazione"),
    properties: ['openFile'],
    filters: [{ name: M("File di configurazione"), extensions: ['json'] }]
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
  try {
    const stat = fs.statSync(res.filePaths[0]);
    if (stat.size > 25_000_000) return { ok: false, error: importErrorText('too-big') };
    const plan = prepareImport(fs.readFileSync(res.filePaths[0], 'utf-8'), getConfig(), { mode });
    if (!plan.ok) return { ok: false, error: importErrorText(plan.error) };
    if (mode === 'replace') {
      const sure = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: [M("Sostituisci tutto"), M("Annulla")],
        defaultId: 1,
        cancelId: 1,
        title: M("Importa configurazione"),
        message: M("Sostituire tutte le impostazioni e i task con quelli del file?"),
        detail: M("I task e le impostazioni attuali saranno sostituiti ({n} task nel file).", { n: plan.tasks.length })
      });
      if (sure.response !== 0) return { ok: false, canceled: true };
    }
    if (!(await confirmImportedCommands(plan.commands))) return { ok: false, canceled: true };
    const next = applyConfig({ settings: plan.settings, tasks: plan.tasks }, { replaceSettingsToo: mode === 'replace' });
    app.setLoginItemSettings({ openAtLogin: !!next.settings.startOnBoot, openAsHidden: true });
    applyKeepAwake(next.settings.keepAwake);
    if (tray) tray.setImage(trayIcon(next.settings.trayIconStyle));
    return { ok: true, mode, settings: next.settings, tasksCount: plan.tasks.length, added: plan.added, missing: plan.missing };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ---- IPC: single-task export/import (share/duplicate one task instead of the whole config) ----
// The file of one task carries no password and no credentials written in an address.
ipcMain.handle('task:export', async (_e, id) => {
  const task = getTask(id);
  if (!task) return { ok: false, error: M("Task non trovato") };
  const res = await dialog.showSaveDialog(mainWindow, {
    title: M("Esporta task"),
    defaultPath: `${task.name.replace(/[\\/:*?"<>|]+/g, '_')}.json`,
    filters: [{ name: M('File task'), extensions: ['json'] }]
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  try {
    fs.writeFileSync(res.filePath, JSON.stringify(buildTaskExport(exportTaskData(id)), null, 2), 'utf-8');
    return { ok: true, filePath: res.filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('task:import', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: M("Importa task"),
    properties: ['openFile'],
    filters: [{ name: M('File task'), extensions: ['json'] }]
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
  try {
    const plan = prepareTaskImport(fs.readFileSync(res.filePaths[0], 'utf-8'));
    if (!plan.ok) return { ok: false, error: importErrorText(plan.error) };
    if (!(await confirmImportedCommands(plan.commands))) return { ok: false, canceled: true };
    addTasks(plan.tasks);
    return { ok: true, task: plan.tasks[0], count: plan.tasks.length, missing: plan.missing };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ---- IPC: categories (apps/COMMON-FEATURES.md, section 2) ----
ipcMain.handle('categories:rename', (_e, from, to) => {
  const cfg = getConfig();
  const r = renameCategory(cfg.tasks, cfg.settings.categoryColors, from, to);
  if (!r.ok) return r;
  const next = applyCategoryChange(r);
  return { ok: true, merged: r.merged, count: r.changed.length, settings: next.settings };
});
ipcMain.handle('categories:delete', (_e, name, moveTo) => {
  const cfg = getConfig();
  const r = deleteCategory(cfg.tasks, cfg.settings.categoryColors, name, moveTo);
  if (!r.ok) return r;
  const next = applyCategoryChange(r);
  return { ok: true, count: r.changed.length, settings: next.settings };
});

// ---- IPC: calendar exceptions for one or more tasks at once ----
ipcMain.handle('exceptions:apply', (_e, ids, exception) => {
  const r = addExceptionToTasks(getTasks(), Array.isArray(ids) ? ids : [], exception || {});
  if (!r.ok) return r;
  for (const t of r.changed) saveTask(t);
  return { ok: true, count: r.changed.length };
});

// ---- IPC: schedule preview ("simulatore") — next occurrences for an unsaved schedule ----
ipcMain.handle('schedule:preview', (_e, schedule, exceptions) => {
  return upcomingOccurrencesForSchedule(schedule, new Date(), 8, normalizeExceptions(exceptions)).map((d) => d.toISOString());
});
