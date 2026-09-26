import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { shell, Notification } from 'electron';
import { resolveTemplate, cleanPath } from './templates.js';
import { M } from './i18n.js';

function fillContext(str, ctx) {
  if (!str) return str;
  return String(str)
    .replaceAll('{filepath}', ctx.filepath || '')
    .replaceAll('{filename}', ctx.filename || '')
    .replaceAll('{folder}', ctx.folder || '')
    .replaceAll('{taskName}', ctx.taskName || '');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function spawnAndWait(file, args, action, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd: cwd || undefined,
      shell: action.mode === 'line' ? true : action.useShell !== false,
      detached: action.detached === true,
      windowsHide: true,
      stdio: 'ignore'
    });
    if (action.detached === true) {
      child.unref();
      resolve();
      return;
    }
    child.on('error', (err) => reject(err));
    child.on('exit', (code) => {
      if (code === 0 || action.ignoreExitCode) resolve();
      else reject(new Error(M("Processo terminato con codice {code}", { code: code })));
    });
  });
}

// Two ways to define the command: "program + arguments" (spawned directly through the
// shell) or full command lines pasted verbatim, one per line, e.g. on Windows
//   Start /min "" /D "C:\App" "C:\App\tool.exe" /config=a.json
// Each line goes to the shell as-is (cmd.exe /d /s /c "..."). Several lines run one
// after the other, with an optional pause between them (a `Start` line returns at
// once, so without a pause two launches would fire practically together).
async function runProgram(action, ctx, log) {
  const now = { now: new Date() };
  const expand = (str) => resolveTemplate(fillContext(str, ctx), now);
  const sleepLog = async (seconds, what) => {
    if (seconds > 0) {
      log(M("Attendo {seconds}s {what}...", { seconds: seconds, what: what }));
      await sleep(seconds * 1000);
    }
  };
  await sleepLog(Math.max(0, Number(action.delaySeconds) || 0), M("prima di eseguire il comando"));
  const cwd = cleanPath(action.cwd ? expand(action.cwd) : ctx.folder);

  if (action.mode !== 'line') {
    const file = cleanPath(expand(action.command));
    const args = (action.args || []).map((a) => expand(a));
    log(M("Eseguo: {file} {args}", { file: file, args: args.join(' ') }));
    return spawnAndWait(file, args, action, cwd);
  }

  const lines = String(action.commandLine || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('::') && !/^rem(\s|$)/i.test(l));
  if (!lines.length) throw new Error(M("Riga di comando vuota"));
  const gap = Math.max(0, Number(action.gapSeconds) || 0);
  // "TIMEOUT /T 30", "WAIT 30" or "SLEEP 30" on a line of its own is an in-app pause (the
  // real TIMEOUT needs a console, which the app doesn't have), so pasted .cmd scripts
  // keep their pauses between launches.
  const pauseSeconds = (l) => {
    const m = l.match(/^(?:timeout\s+\/t\s+|wait\s+|sleep\s+)(\d+)(?:\s+\/nobreak)?\s*$/i);
    return m ? Number(m[1]) : null;
  };
  let ranCommand = false;
  for (let i = 0; i < lines.length; i++) {
    const pause = pauseSeconds(lines[i]);
    if (pause !== null) {
      await sleepLog(pause, M("come da riga di pausa"));
      continue;
    }
    if (ranCommand) await sleepLog(gap, M("prima del comando successivo"));
    ranCommand = true;
    const line = expand(lines[i]);
    log(lines.length > 1 ? M("Eseguo ({i}/{n}): {line}", { i: i + 1, n: lines.length, line: line }) : M("Eseguo: {line}", { line: line }));
    try {
      await spawnAndWait(line, [], action, cwd);
    } catch (err) {
      if (action.stopOnError === false && i < lines.length - 1) {
        log(M("Comando {i} fallito ({message}): proseguo con il successivo.", { i: i + 1, message: err.message }), 'warn');
        continue;
      }
      throw err;
    }
  }
}

async function moveFile(action, ctx, log) {
  const targetFolder = cleanPath(resolveTemplate(fillContext(action.targetFolder, ctx), { now: new Date() }));
  await fs.mkdir(targetFolder, { recursive: true });
  const dest = path.join(targetFolder, ctx.filename);
  log(M("Sposto file in: {dest}", { dest: dest }));
  await fs.rename(ctx.filepath, dest).catch(async (err) => {
    if (err.code === 'EXDEV') {
      await fs.copyFile(ctx.filepath, dest);
      await fs.unlink(ctx.filepath);
    } else {
      throw err;
    }
  });
  ctx.filepath = dest;
  ctx.folder = targetFolder;
}

async function openPath(action, ctx, log) {
  const target = action.target === 'folder' ? ctx.folder : ctx.filepath;
  log(M("Apro: {target}", { target: target }));
  const err = await shell.openPath(target);
  if (err) throw new Error(err);
}

async function notify(action, ctx, log) {
  const title = fillContext(action.title || ctx.taskName, ctx);
  const body = fillContext(action.body || M("Download completato: {filename}"), ctx);
  log(M("Notifica: {title} - {body}", { title: title, body: body }));
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

export async function runPostActions(postActions, ctx, log) {
  for (const action of postActions || []) {
    if (action.enabled === false) continue;
    try {
      switch (action.type) {
        case 'run':
          await runProgram(action, ctx, log);
          break;
        case 'move':
          await moveFile(action, ctx, log);
          break;
        case 'open':
          await openPath(action, ctx, log);
          break;
        case 'notify':
          await notify(action, ctx, log);
          break;
        default:
          log(M("Azione sconosciuta ignorata: {type}", { type: action.type }), 'warn');
      }
    } catch (err) {
      log(M("Azione \"{type}\" fallita: {message}", { type: action.type, message: err.message }), 'error');
      if (action.stopOnError !== false) throw err;
    }
  }
  return ctx;
}
