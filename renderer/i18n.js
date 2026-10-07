'use strict';

// Main UI chrome strings (sidebar, topbar, dashboard, settings, common buttons/labels),
// in the three supported languages. Looked up via t(key) in app.js, driven by
// settings.language, so switching language actually re-renders the interface.
const UI_STRINGS = {
  newTask: { it: '+ Task', en: '+ Task', es: '+ Tarea' },
  dashboard: { it: 'Dashboard', en: 'Dashboard', es: 'Panel' },
  tasksPage: { it: 'Palinsesto', en: 'Schedule', es: 'Programación' },
  upcomingQueue: { it: 'Prossimi download in coda', en: 'Upcoming downloads', es: 'Próximas descargas' },
  noUpcoming: { it: 'Nessuna pianificazione futura.', en: 'No upcoming schedules.', es: 'Sin programaciones futuras.' },
  task: { it: 'Task', en: 'Tasks', es: 'Tareas' },
  noTasks: { it: 'Nessun task. Crea il primo con "+ Task".', en: 'No tasks yet. Create the first one with "+ Task".', es: 'Sin tareas. Crea la primera con "+ Tarea".' },
  settings: { it: '⚙ Impostazioni', en: '⚙ Settings', es: '⚙ Ajustes' },
  aboutHelp: { it: 'ℹ️ Info e Guida', en: 'ℹ️ Info & Help', es: 'ℹ️ Info y Ayuda' },
  console: { it: 'Console', en: 'Console', es: 'Consola' },
  clear: { it: 'Pulisci', en: 'Clear', es: 'Limpiar' },
  noTaskSelected: { it: 'Nessun task selezionato', en: 'No task selected', es: 'Ninguna tarea seleccionada' },
  noTaskSelectedHint: {
    it: 'Crea un nuovo task di download o selezionane uno dalla lista a sinistra.',
    en: 'Create a new download task or pick one from the list on the left.',
    es: 'Crea una nueva tarea de descarga o elige una de la lista a la izquierda.'
  },
  nextDownload: { it: 'Prossimo download', en: 'Next download', es: 'Próxima descarga' },
  noActiveSchedule: { it: 'Nessuna pianificazione attiva', en: 'No active schedule', es: 'Sin programación activa' },
  downloadInProgress: { it: 'Download in corso', en: 'Download in progress', es: 'Descarga en curso' },
  runNow: { it: '▶ Esegui ora', en: '▶ Run now', es: '▶ Ejecutar ahora' },
  save: { it: 'Salva', en: 'Save', es: 'Guardar' },
  delete: { it: 'Elimina', en: 'Delete', es: 'Eliminar' },
  browse: { it: 'Sfoglia…', en: 'Browse…', es: 'Examinar…' },
  runOnSave: { it: 'Esegui subito dopo il salvataggio', en: 'Run immediately after saving', es: 'Ejecutar justo después de guardar' },
  source: { it: 'Sorgente', en: 'Source', es: 'Origen' },
  destinationAndFilename: { it: 'Destinazione e nome file', en: 'Destination and filename', es: 'Destino y nombre de archivo' },
  schedules: { it: 'Pianificazioni', en: 'Schedules', es: 'Programaciones' },
  postActions: { it: 'Azioni post-download', en: 'Post-download actions', es: 'Acciones tras la descarga' },
  addSchedule: { it: '+ Aggiungi pianificazione', en: '+ Add schedule', es: '+ Añadir programación' },
  addAction: { it: '+ Aggiungi azione', en: '+ Add action', es: '+ Añadir acción' },
  general: { it: 'Generali', en: 'General', es: 'General' },
  totalTasks: { it: 'Task totali', en: 'Total tasks', es: 'Tareas totales' },
  activeTasks: { it: 'Task attivi', en: 'Active tasks', es: 'Tareas activas' },
  queuedNext24h: { it: 'In coda nelle prossime 24h', en: 'Queued in the next 24h', es: 'En cola en las próximas 24h' },
  completedToday: { it: 'Completati oggi', en: 'Completed today', es: 'Completadas hoy' },
  failedToday: { it: 'Falliti oggi', en: 'Failed today', es: 'Fallidas hoy' },
  successRate30d: { it: 'Successo (ultimi 30gg)', en: 'Success rate (last 30d)', es: 'Éxito (últimos 30d)' },
  totalDataDownloaded: { it: 'Dati scaricati (totale)', en: 'Total data downloaded', es: 'Datos descargados (total)' },
  avgDownloadDuration: { it: 'Durata media download', en: 'Average download time', es: 'Duración media de descarga' },
  activityLast7Days: { it: 'Attività ultimi 7 giorni', en: 'Activity, last 7 days', es: 'Actividad, últimos 7 días' },
  next24h: { it: 'Prossime 24 ore', en: 'Next 24 hours', es: 'Próximas 24 horas' },
  noUpcoming24h: { it: 'Nessun download pianificato nelle prossime 24 ore.', en: 'No downloads scheduled in the next 24 hours.', es: 'Sin descargas programadas en las próximas 24 horas.' },
  recentActivity: { it: 'Attività recente', en: 'Recent activity', es: 'Actividad reciente' },
  noActivityYet: { it: 'Nessuna attività registrata finora.', en: 'No activity recorded yet.', es: 'Todavía no hay actividad registrada.' },
  topFailing: { it: 'Task con più errori', en: 'Tasks with the most errors', es: 'Tareas con más errores' },
  noErrors: { it: 'Nessun errore registrato. 🎉', en: 'No errors recorded. 🎉', es: 'Sin errores registrados. 🎉' },
  completedLegend: { it: 'Completati', en: 'Completed', es: 'Completadas' },
  failedLegend: { it: 'Falliti', en: 'Failed', es: 'Fallidas' },
  schedulesHint: {
    it: '— ogni task può avere più pianificazioni, anche irregolari tra loro',
    en: '— each task can have several schedules, even irregular ones',
    es: '— cada tarea puede tener varias programaciones, incluso irregulares'
  },
  postActionsHint: {
    it: '— eseguite in ordine dopo il salvataggio del file',
    en: '— run in order after the file is saved',
    es: '— se ejecutan en orden tras guardar el archivo'
  },
  noSchedulesYet: {
    it: 'Nessuna pianificazione: il task può essere avviato solo manualmente.',
    en: 'No schedules yet: this task can only be started manually.',
    es: 'Sin programaciones: esta tarea solo puede iniciarse manualmente.'
  },
  noActionsYet: {
    it: 'Nessuna azione successiva configurata.',
    en: 'No post-download actions configured.',
    es: 'Sin acciones posteriores configuradas.'
  },
  category: { it: 'Categoria', en: 'Category', es: 'Categoría' },
  categoryPlaceholder: { it: 'Categoria (opzionale)', en: 'Category (optional)', es: 'Categoría (opcional)' },
  uncategorized: { it: 'Senza categoria', en: 'Uncategorized', es: 'Sin categoría' },
  byCategory: { it: 'Task per categoria', en: 'Tasks by category', es: 'Tareas por categoría' },
  nextRunLabel: { it: 'Prossimo', en: 'Next', es: 'Próximo' },
  errorSingular: { it: 'errore', en: 'error', es: 'error' },
  errorPlural: { it: 'errori', en: 'errors', es: 'errores' },
  completedFallback: { it: 'completato', en: 'completed', es: 'completado' },
  errorFallback: { it: 'errore', en: 'error', es: 'error' }
};

// Quick-reference cheat sheet for the "Espressione cron avanzata" field, shown in a
// popup both from the Guida page and via the "?" button next to the field itself.
const CRON_HELP_CONTENT = {
  it: {
    title: 'Sintassi espressione cron',
    intro: 'L\'espressione ha 5 campi separati da spazio, in quest\'ordine:',
    fields: [
      { f: 'minuto', d: '0–59' },
      { f: 'ora', d: '0–23' },
      { f: 'giorno del mese', d: '1–31' },
      { f: 'mese', d: '1–12' },
      { f: 'giorno della settimana', d: '0–6 (0 = domenica)' }
    ],
    tokens: [
      { t: '*', d: 'qualsiasi valore' },
      { t: ',', d: 'elenco di valori, es. "13,17"' },
      { t: '-', d: 'intervallo, es. "9-17" = dalle 9 alle 17 comprese' },
      { t: '/', d: 'passo, es. "*/15" = ogni 15' }
    ],
    examplesLabel: 'Esempi',
    examples: [
      { expr: '0 9 * * *', d: 'ogni giorno alle 9:00' },
      { expr: '*/15 * * * *', d: 'ogni 15 minuti, tutto il giorno' },
      { expr: '0 6-20 * * *', d: 'ogni ora, dalle 6:00 alle 20:00 comprese' },
      { expr: '0 6,7,8,9,10,11,12,14,15,16,18,19,20 * * *', d: 'ogni ora dalle 6 alle 20, escluse le 13 e le 17' },
      { expr: '30 8 * * 1-5', d: 'alle 8:30, dal lunedì al venerdì' },
      { expr: '0 9 * * 0,6', d: 'alle 9:00, sabato e domenica' }
    ],
    tip: 'Per pattern regolari senza eccezioni (es. ogni ora, ogni 30 minuti) è più comodo il tipo di pianificazione "Ripeti ogni intervallo". Il cron serve per orari specifici o irregolari, come nell\'ultimo esempio.'
  },
  en: {
    title: 'Cron expression syntax',
    intro: 'The expression has 5 space-separated fields, in this order:',
    fields: [
      { f: 'minute', d: '0–59' },
      { f: 'hour', d: '0–23' },
      { f: 'day of month', d: '1–31' },
      { f: 'month', d: '1–12' },
      { f: 'day of week', d: '0–6 (0 = Sunday)' }
    ],
    tokens: [
      { t: '*', d: 'any value' },
      { t: ',', d: 'list of values, e.g. "13,17"' },
      { t: '-', d: 'range, e.g. "9-17" = 9 through 17 inclusive' },
      { t: '/', d: 'step, e.g. "*/15" = every 15' }
    ],
    examplesLabel: 'Examples',
    examples: [
      { expr: '0 9 * * *', d: 'every day at 9:00' },
      { expr: '*/15 * * * *', d: 'every 15 minutes, all day' },
      { expr: '0 6-20 * * *', d: 'every hour, from 6:00 to 20:00 inclusive' },
      { expr: '0 6,7,8,9,10,11,12,14,15,16,18,19,20 * * *', d: 'every hour from 6 to 20, except 13:00 and 17:00' },
      { expr: '30 8 * * 1-5', d: 'at 8:30, Monday through Friday' },
      { expr: '0 9 * * 0,6', d: 'at 9:00, on weekends' }
    ],
    tip: 'For regular patterns with no exceptions (e.g. every hour, every 30 minutes) the "Repeat every interval" schedule type is simpler. Use cron for specific or irregular times, like the last example.'
  },
  es: {
    title: 'Sintaxis de la expresión cron',
    intro: 'La expresión tiene 5 campos separados por espacio, en este orden:',
    fields: [
      { f: 'minuto', d: '0–59' },
      { f: 'hora', d: '0–23' },
      { f: 'día del mes', d: '1–31' },
      { f: 'mes', d: '1–12' },
      { f: 'día de la semana', d: '0–6 (0 = domingo)' }
    ],
    tokens: [
      { t: '*', d: 'cualquier valor' },
      { t: ',', d: 'lista de valores, ej. "13,17"' },
      { t: '-', d: 'rango, ej. "9-17" = de 9 a 17 incluidos' },
      { t: '/', d: 'paso, ej. "*/15" = cada 15' }
    ],
    examplesLabel: 'Ejemplos',
    examples: [
      { expr: '0 9 * * *', d: 'cada día a las 9:00' },
      { expr: '*/15 * * * *', d: 'cada 15 minutos, todo el día' },
      { expr: '0 6-20 * * *', d: 'cada hora, de 6:00 a 20:00 incluidas' },
      { expr: '0 6,7,8,9,10,11,12,14,15,16,18,19,20 * * *', d: 'cada hora de 6 a 20, excepto las 13 y las 17' },
      { expr: '30 8 * * 1-5', d: 'a las 8:30, de lunes a viernes' },
      { expr: '0 9 * * 0,6', d: 'a las 9:00, el fin de semana' }
    ],
    tip: 'Para patrones regulares sin excepciones (p. ej. cada hora, cada 30 minutos) el tipo de programación "Repetir cada intervalo" es más simple. Usa cron para horarios específicos o irregulares, como en el último ejemplo.'
  }
};

function tr(key) {
  const lang = (typeof state !== 'undefined' && state.settings && state.settings.language) || 'it';
  const entry = UI_STRINGS[key];
  if (!entry) return key;
  return entry[lang] || entry.it;
}

// Static help/instructions content for the "Guida" section, in the three supported
// languages. Kept separate from app.js since it's pure content, not app logic.
const GUIDE_CONTENT = {
  it: {
    label: 'Italiano',
    title: 'Guida rapida',
    sections: [
      {
        h: 'Creare un task',
        p: 'Clicca "+ Task" nella sidebar. Scegli la sorgente (un URL web o un file locale/di rete), la cartella di destinazione e come nominare il file scaricato.'
      },
      {
        h: 'Placeholder dinamici',
        p: 'In URL, percorso file e nome file puoi usare: <code>{date:yyyyMMdd}</code> (data), <code>{time:HHmmss}</code> (ora), <code>{seq:4}</code> (contatore progressivo), <code>{rand:6}</code> (stringa casuale), <code>{date+1h:H}</code> (data/ora spostata: qui l\'ora successiva; anche <code>-1d</code>, <code>+30m</code>). Utile per file che cambiano nome ogni giorno.'
      },
      {
        h: 'Pianificazioni',
        p: 'Ogni task può avere più pianificazioni indipendenti: giorni della settimana + orario (con preset Lun-Ven / Sab-Dom), una tantum, oppure ogni N minuti (con partenza opzionale ritardata). Il pannello a sinistra mostra la coda di tutti i prossimi download.'
      },
      {
        h: 'Cron avanzato',
        p: 'Per orari specifici o irregolari (es. ogni ora dalle 6 alle 20 tranne le 13 e le 17) usa la modalità "Espressione cron avanzata" in una pianificazione. <button type="button" class="btn btn-sm" data-open-cron-help>📖 Apri riferimento rapido sintassi cron</button>'
      },
      {
        h: 'Autenticazione',
        p: 'Per sorgenti Web, se il server richiede utente/password, attiva "Il server richiede autenticazione" nella scheda Sorgente.'
      },
      {
        h: 'Azioni dopo il download',
        p: 'Puoi far eseguire un programma/script, spostare il file, aprirlo, o inviare una notifica di sistema, usando i placeholder {filepath} {filename} {folder} {taskName}.'
      },
      {
        h: 'In caso di errore',
        p: 'Il numero di tentativi e l\'attesa tra un tentativo e l\'altro sono configurabili per ogni task (e come default nelle Impostazioni). Dopo l\'ultimo tentativo fallito puoi ricevere un avviso via email o Telegram, configurabile nelle Impostazioni.'
      },
      {
        h: 'File duplicati',
        p: 'Se un file con lo stesso nome esiste già nella cartella di destinazione, viene conservato rinominato: il nome pulito resta sempre riservato all\'ultimo file scaricato.'
      },
      {
        h: 'Eseguire solo una parte',
        p: 'Nell\'editor di un task <b>⬇ Solo download</b> scarica il file senza lanciare le azioni successive; <b>⚙ Solo azioni</b> esegue le azioni sul file già presente, senza scaricare (utile se hai ricevuto il file in un altro modo). Ogni azione ha anche il suo pulsante <b>▶ Esegui</b>, che la lancia da sola anche se è disattivata. Se il file non si trova, l\'app ti chiede di sceglierlo; <b>📂 Azioni su un altro file…</b> le applica a un file qualsiasi. <b>👁 Anteprima</b> su un\'azione mostra i comandi con i segnaposto già sostituiti, senza eseguirli. In ogni pianificazione, <b>Dopo il download</b> permette di non eseguire le azioni oppure di aspettare la tua conferma (con avviso email/Telegram): il task mostra "Azioni in attesa" e <b>▶ Esegui azioni ora</b>.'
      },
      {
        h: 'Primo avvio (app non firmata)',
        p: 'L\'app è gratuita e non è firmata digitalmente. <b>macOS:</b> se compare "app danneggiata" o non si apre, clic destro → Apri, oppure nel Terminale: <code>xattr -dr com.apple.quarantine /Applications/G-Downloader.app</code>. <b>Windows:</b> se compare SmartScreen, clicca "Ulteriori informazioni" → "Esegui comunque".'
      },
      {
        h: 'Aggiornamenti',
        p: 'Quando esce una nuova versione compare un avviso in alto (e in Impostazioni → Aggiornamenti). <b>Scarica e installa</b> scarica nella cartella Download l\'installer giusto per il tuo sistema e ne verifica lo SHA-256. Poi: su <b>Windows</b> "Chiudi e installa" chiude l\'app (i download pianificati si fermano), avvia l\'installazione e al termine la riapre; su <b>macOS</b> e <b>Linux</b> "Apri installer" apre il file, e tu chiudi l\'app con "Esci" e installi la nuova versione. Nulla viene installato senza che tu lo chieda.'
      }
    ]
  },
  en: {
    label: 'English',
    title: 'Quick guide',
    sections: [
      {
        h: 'Creating a task',
        p: 'Click "+ Task" in the sidebar. Choose the source (a web URL or a local/network file), the destination folder, and how the downloaded file should be named.'
      },
      {
        h: 'Dynamic placeholders',
        p: 'In the URL, local path and filename you can use: <code>{date:yyyyMMdd}</code> (date), <code>{time:HHmmss}</code> (time), <code>{seq:4}</code> (running counter), <code>{rand:6}</code> (random string), <code>{date+1h:H}</code> (shifted date/time: here the next hour; also <code>-1d</code>, <code>+30m</code>). Handy for files whose name changes every day.'
      },
      {
        h: 'Schedules',
        p: 'Each task can have several independent schedules: weekdays + time (with Mon-Fri / Sat-Sun presets), a one-off date/time, or every N minutes (with an optional delayed start). The left panel shows the queue of all upcoming downloads.'
      },
      {
        h: 'Advanced cron',
        p: 'For specific or irregular times (e.g. every hour from 6 to 20 except 13:00 and 17:00) use "Advanced cron expression" mode in a schedule. <button type="button" class="btn btn-sm" data-open-cron-help>📖 Open cron syntax quick reference</button>'
      },
      {
        h: 'Authentication',
        p: 'For web sources, if the server requires a username/password, enable "The server requires authentication" in the Source card.'
      },
      {
        h: 'Actions after download',
        p: 'You can run a program/script, move the file, open it, or send a system notification, using the placeholders {filepath} {filename} {folder} {taskName}.'
      },
      {
        h: 'On failure',
        p: 'The number of retries and the delay between attempts are configurable per task (and as defaults in Settings). After the last failed attempt you can get notified by email or Telegram, configurable in Settings.'
      },
      {
        h: 'Duplicate filenames',
        p: 'If a file with the same name already exists in the destination folder, it is kept but renamed: the clean name is always reserved for the most recently downloaded file.'
      },
      {
        h: 'Running only part of a task',
        p: 'In a task\'s editor <b>⬇ Download only</b> fetches the file without running the actions that follow; <b>⚙ Actions only</b> runs the actions on the file already there, without downloading (handy if you got the file another way). Each action also has its own <b>▶ Run</b> button, which runs it alone even if it is switched off. If the file cannot be found, the app asks you to pick it; <b>📂 Actions on another file…</b> applies them to any file. <b>👁 Preview</b> on an action shows the commands with the placeholders already filled in, without running them. In each schedule, <b>After the download</b> lets you skip the actions or wait for your confirmation (with an email/Telegram notice): the task then shows "Actions waiting" and <b>▶ Run actions now</b>.'
      },
      {
        h: 'First launch (unsigned app)',
        p: 'The app is free and not code-signed. <b>macOS:</b> if it says the app is damaged or cannot be opened, right-click it → Open, or run <code>xattr -dr com.apple.quarantine /Applications/G-Downloader.app</code> in Terminal. <b>Windows:</b> if SmartScreen appears, click "More info" → "Run anyway".'
      },
      {
        h: 'Updates',
        p: 'When a new version is out, a notice appears at the top (and in Settings → Updates). <b>Download and install</b> fetches the right installer for your system into the Downloads folder and verifies its SHA-256. Then: on <b>Windows</b> "Close and install" closes the app (scheduled downloads stop), runs the installer and reopens it when done; on <b>macOS</b> and <b>Linux</b> "Open installer" opens the file, and you quit the app with "Quit" and install the new version. Nothing is installed unless you ask.'
      }
    ]
  },
  es: {
    label: 'Español',
    title: 'Guía rápida',
    sections: [
      {
        h: 'Crear una tarea',
        p: 'Haz clic en "+ Task" en la barra lateral. Elige el origen (una URL web o un archivo local/de red), la carpeta de destino y cómo nombrar el archivo descargado.'
      },
      {
        h: 'Marcadores dinámicos',
        p: 'En la URL, la ruta local y el nombre de archivo puedes usar: <code>{date:yyyyMMdd}</code> (fecha), <code>{time:HHmmss}</code> (hora), <code>{seq:4}</code> (contador), <code>{rand:6}</code> (texto aleatorio), <code>{date+1h:H}</code> (fecha/hora desplazada: aquí la hora siguiente; también <code>-1d</code>, <code>+30m</code>). Útil para archivos que cambian de nombre cada día.'
      },
      {
        h: 'Programaciones',
        p: 'Cada tarea puede tener varias programaciones independientes: días de la semana + hora (con ajustes Lun-Vie / Sáb-Dom), una sola vez, o cada N minutos (con inicio retrasado opcional). El panel izquierdo muestra la cola de próximas descargas.'
      },
      {
        h: 'Cron avanzado',
        p: 'Para horarios específicos o irregulares (ej. cada hora de 6 a 20 excepto las 13 y las 17) usa el modo "Expresión cron avanzada" en una programación. <button type="button" class="btn btn-sm" data-open-cron-help>📖 Abrir referencia rápida de sintaxis cron</button>'
      },
      {
        h: 'Autenticación',
        p: 'Para orígenes web, si el servidor requiere usuario/contraseña, activa "El servidor requiere autenticación" en la tarjeta Origen.'
      },
      {
        h: 'Acciones tras la descarga',
        p: 'Puedes ejecutar un programa/script, mover el archivo, abrirlo, o enviar una notificación del sistema, usando los marcadores {filepath} {filename} {folder} {taskName}.'
      },
      {
        h: 'En caso de error',
        p: 'El número de reintentos y la espera entre intentos son configurables por tarea (y como valores predeterminados en Ajustes). Tras el último intento fallido puedes recibir un aviso por email o Telegram, configurable en Ajustes.'
      },
      {
        h: 'Archivos duplicados',
        p: 'Si ya existe un archivo con el mismo nombre en la carpeta de destino, se conserva pero se renombra: el nombre limpio queda siempre reservado para el archivo descargado más recientemente.'
      },
      {
        h: 'Ejecutar solo una parte',
        p: 'En el editor de una tarea, <b>⬇ Solo descarga</b> baja el archivo sin ejecutar las acciones posteriores; <b>⚙ Solo acciones</b> ejecuta las acciones sobre el archivo ya presente, sin descargar (útil si recibiste el archivo de otra forma). Cada acción tiene también su botón <b>▶ Ejecutar</b>, que la lanza sola aunque esté desactivada. Si no se encuentra el archivo, la app te pide que lo elijas; <b>📂 Acciones sobre otro archivo…</b> las aplica a cualquier archivo. <b>👁 Vista previa</b> en una acción muestra los comandos con los marcadores ya sustituidos, sin ejecutarlos. En cada programación, <b>Después de la descarga</b> permite no ejecutar las acciones o esperar tu confirmación (con aviso por correo/Telegram): la tarea muestra entonces "Acciones en espera" y <b>▶ Ejecutar acciones ahora</b>.'
      },
      {
        h: 'Primer inicio (app sin firmar)',
        p: 'La app es gratuita y no está firmada digitalmente. <b>macOS:</b> si aparece "app dañada" o no se abre, clic derecho → Abrir, o en Terminal: <code>xattr -dr com.apple.quarantine /Applications/G-Downloader.app</code>. <b>Windows:</b> si aparece SmartScreen, pulsa "Más información" → "Ejecutar de todos modos".'
      },
      {
        h: 'Actualizaciones',
        p: 'Cuando sale una versión nueva aparece un aviso arriba (y en Ajustes → Actualizaciones). <b>Descargar e instalar</b> descarga en la carpeta Descargas el instalador adecuado para tu sistema y verifica su SHA-256. Después: en <b>Windows</b> "Cerrar e instalar" cierra la app (las descargas programadas se detienen), inicia la instalación y al terminar la vuelve a abrir; en <b>macOS</b> y <b>Linux</b> "Abrir instalador" abre el archivo, y tú cierras la app con "Salir" e instalas la versión nueva. No se instala nada sin que lo pidas.'
      }
    ]
  }
};
