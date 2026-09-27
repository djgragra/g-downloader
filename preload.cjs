const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  tasks: {
    list: () => ipcRenderer.invoke('tasks:list'),
    get: (id) => ipcRenderer.invoke('tasks:get', id),
    newTemplate: () => ipcRenderer.invoke('tasks:new-template'),
    save: (task) => ipcRenderer.invoke('tasks:save', task),
    delete: (id) => ipcRenderer.invoke('tasks:delete', id),
    runNow: (id, edition) => ipcRenderer.invoke('tasks:run-now', id, edition),
    recentOccurrences: (id) => ipcRenderer.invoke('tasks:recent-occurrences', id),
    exportOne: (id) => ipcRenderer.invoke('task:export', id),
    importOne: () => ipcRenderer.invoke('task:import')
  },
  schedules: {
    preview: (schedule) => ipcRenderer.invoke('schedule:preview', schedule)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (patch) => ipcRenderer.invoke('settings:update', patch)
  },
  stats: {
    daily: () => ipcRenderer.invoke('stats:daily')
  },
  queue: {
    list: (limit) => ipcRenderer.invoke('queue:list', limit)
  },
  notifications: {
    testEmail: (cfg) => ipcRenderer.invoke('notifications:test-email', cfg),
    testTelegram: (cfg) => ipcRenderer.invoke('notifications:test-telegram', cfg)
  },
  dialogs: {
    pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),
    pickFile: () => ipcRenderer.invoke('dialog:pick-file')
  },
  app: {
    info: () => ipcRenderer.invoke('app:info')
  },
  updates: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    open: (url) => ipcRenderer.invoke('update:open', url)
  },
  files: {
    reveal: (filePath) => ipcRenderer.invoke('file:reveal', filePath)
  },
  system: {
    openLogFolder: () => ipcRenderer.invoke('system:open-log-folder')
  },
  config: {
    export: () => ipcRenderer.invoke('config:export'),
    import: () => ipcRenderer.invoke('config:import')
  },
  on: {
    log: (cb) => ipcRenderer.on('event:log', (_e, data) => cb(data)),
    progress: (cb) => ipcRenderer.on('event:progress', (_e, data) => cb(data)),
    taskStarted: (cb) => ipcRenderer.on('event:task-started', (_e, data) => cb(data)),
    updateAvailable: (cb) => ipcRenderer.on('event:update-available', (_e, data) => cb(data)),
    updateProgress: (cb) => ipcRenderer.on('event:update-progress', (_e, data) => cb(data)),
    taskFinished: (cb) => ipcRenderer.on('event:task-finished', (_e, data) => cb(data))
  }
});
