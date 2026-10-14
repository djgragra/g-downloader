// A stand-in for the "electron" module, only for the integration tests (dev/*.itest.js): enough for the store, the
// scheduler and the downloader to run in plain Node. "Encryption" is a reversible fake, so sealing can be checked.
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const userData = process.env.GD_TEST_USERDATA || fs.mkdtempSync(path.join(os.tmpdir(), 'gd-userdata-'));
export const stubState = { notifications: [], userData };

export const app = {
  getPath: (n) => (n === 'userData' ? userData : n === 'downloads' ? path.join(userData, 'Downloads') : os.tmpdir()),
  getVersion: () => '26.10.2',
  isReady: () => true,
  getName: () => 'g-downloader'
};
export const safeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from('K' + s),
  decryptString: (b) => {
    const t = Buffer.from(b).toString();
    if (!t.startsWith('K')) throw new Error('cannot decrypt');
    return t.slice(1);
  }
};
export class Notification {
  static isSupported() { return false; }
  constructor(o) { stubState.notifications.push(o); }
  show() {}
  on() {}
}
export const dialog = { showSaveDialog: async () => ({ canceled: true }), showMessageBox: async () => ({ response: 0 }), showOpenDialog: async () => ({ canceled: true }) };
export const BrowserWindow = { getAllWindows: () => [] };
export const shell = { openPath() {}, showItemInFolder() {}, openExternal() {} };
export const net = { fetch: (url, opts) => globalThis.fetch(url, opts) };
export const ipcMain = { on() {}, handle() {} };
export default { app, safeStorage, Notification, dialog, BrowserWindow, shell, ipcMain, net };
