// The pieces the main process shares: the notifier (Telegram, email, retries, what was already told). Needs Electron.
import path from 'node:path';
import { app } from 'electron';
import { createNotifier } from './notify.js';
import { createAlertState } from './alert-state.js';
import { getSettings } from './store.js';
import { M } from './i18n.js';
import { appendFileLog } from './filelog.js';

let alertState = null;
export const getAlertState = () => (alertState ||= createAlertState({ file: path.join(app.getPath('userData'), 'alert-state.json') }));

export const notifier = createNotifier({
  getSettings,
  t: M,
  state: { isTold: (v, c) => getAlertState().isTold(v, c), markTold: (v, c) => getAlertState().markTold(v, c) },
  log: (message, level = 'info') => appendFileLog({ taskId: 'SISTEMA', level, message })
});
