import { getLanguage } from './store.js';

// Texts produced by the main process (logs, errors, notifications, dialogs, e-mails), written in
// Italian in the source. M(text) returns the English/Spanish version according to the language
// chosen in Settings; Italian and any missing text fall back to the original. {name}
// placeholders are filled from the optional params object.
const TEXT = {
 "Processo terminato con codice {code}": [
  "Process exited with code {code}",
  "El proceso terminó con el código {code}"
 ],
 "Attendo {seconds}s {what}...": [
  "Waiting {seconds}s {what}...",
  "Esperando {seconds}s {what}..."
 ],
 "prima di eseguire il comando": [
  "before running the command",
  "antes de ejecutar el comando"
 ],
 "come da riga di pausa": [
  "as per the pause line",
  "según la línea de pausa"
 ],
 "prima del comando successivo": [
  "before the next command",
  "antes del siguiente comando"
 ],
 "Eseguo: {file} {args}": [
  "Running: {file} {args}",
  "Ejecutando: {file} {args}"
 ],
 "Riga di comando vuota": [
  "Empty command line",
  "Línea de comandos vacía"
 ],
 "Eseguo ({i}/{n}): {line}": [
  "Running ({i}/{n}): {line}",
  "Ejecutando ({i}/{n}): {line}"
 ],
 "Eseguo: {line}": [
  "Running: {line}",
  "Ejecutando: {line}"
 ],
 "Comando {i} fallito ({message}): proseguo con il successivo.": [
  "Command {i} failed ({message}): continuing with the next one.",
  "El comando {i} falló ({message}): continúo con el siguiente."
 ],
 "Sposto file in: {dest}": [
  "Moving file to: {dest}",
  "Moviendo el archivo a: {dest}"
 ],
 "Apro: {target}": [
  "Opening: {target}",
  "Abriendo: {target}"
 ],
 "Download completato: {filename}": [
  "Download completed: {filename}",
  "Descarga completada: {filename}"
 ],
 "Notifica: {title} - {body}": [
  "Notification: {title} - {body}",
  "Notificación: {title} - {body}"
 ],
 "Azione sconosciuta ignorata: {type}": [
  "Unknown action ignored: {type}",
  "Acción desconocida ignorada: {type}"
 ],
 "Azione \"{type}\" fallita: {message}": [
  "Action \"{type}\" failed: {message}",
  "La acción \"{type}\" falló: {message}"
 ],
 "Nuovo tentativo {attempt}/{retries}...": [
  "Retry {attempt}/{retries}...",
  "Reintento {attempt}/{retries}..."
 ],
 "File troppo piccolo ({bytes} byte, minimo richiesto {min})": [
  "File too small ({bytes} bytes, minimum required {min})",
  "Archivo demasiado pequeño ({bytes} bytes, mínimo requerido {min})"
 ],
 "Tentativo {attempt} fallito: {message}": [
  "Attempt {attempt} failed: {message}",
  "Intento {attempt} fallido: {message}"
 ],
 "File non ancora disponibile, nuovo tentativo {attempt}/{retries}...": [
  "File not available yet, retry {attempt}/{retries}...",
  "Archivo aún no disponible, reintento {attempt}/{retries}..."
 ],
 "Il percorso indicato non è un file": [
  "The given path is not a file",
  "La ruta indicada no es un archivo"
 ],
 "File non trovato: {path}": [
  "File not found: {path}",
  "Archivo no encontrado: {path}"
 ],
 "File preesistente con lo stesso nome conservato come: {name}": [
  "Existing file with the same name kept as: {name}",
  "Archivo preexistente con el mismo nombre conservado como: {name}"
 ],
 "Pulizia \"tutto\" rifiutata: la cartella di destinazione è la radice di un disco": [
  "Cleanup \"everything\" refused: the destination folder is the root of a drive",
  "Limpieza \"todo\" rechazada: la carpeta de destino es la raíz de un disco"
 ],
 "Pulizia \"solo file con lo stesso nome\": nome file non ancora noto, saltata.": [
  "Cleanup \"only the file with the same name\": file name not known yet, skipped.",
  "Limpieza \"solo el archivo con el mismo nombre\": nombre aún desconocido, omitida."
 ],
 "Pulizia \"per nome\": nessun modello indicato, saltata.": [
  "Cleanup \"by name\": no pattern given, skipped.",
  "Limpieza \"por nombre\": ningún patrón indicado, omitida."
 ],
 "Azione pre-download \"sposta\" configurata senza percorso di destinazione: saltata.": [
  "Pre-download \"move\" action set without a destination path: skipped.",
  "Acción previa \"mover\" configurada sin ruta de destino: omitida."
 ],
 "Spostati {n} elementi preesistenti in: {folder}": [
  "Moved {n} existing items to: {folder}",
  "Movidos {n} elementos preexistentes a: {folder}"
 ],
 "In attesta: {n} download già in corso (limite {limit}).": [
  "Waiting: {n} downloads already running (limit {limit}).",
  "En espera: {n} descargas ya en curso (límite {limit})."
 ],
 "Task già in esecuzione": [
  "Task already running",
  "Tarea ya en ejecución"
 ],
 "Task non trovato": [
  "Task not found",
  "Tarea no encontrada"
 ],
 "Nome file non valido (uscirebbe dalla cartella di destinazione): {filename}": [
  "Invalid file name (it would leave the destination folder): {filename}",
  "Nombre de archivo no válido (saldría de la carpeta de destino): {filename}"
 ],
 "Recupero file locale: {url}": [
  "Fetching local file: {url}",
  "Recuperando archivo local: {url}"
 ],
 "Avvio download: {url}": [
  "Starting download: {url}",
  "Iniciando descarga: {url}"
 ],
 "Download completato ({bytes} byte).": [
  "Download completed ({bytes} bytes).",
  "Descarga completada ({bytes} bytes)."
 ],
 "Verifica sha256 fallita: atteso {expected}, ottenuto {actual}": [
  "sha256 check failed: expected {expected}, got {actual}",
  "Verificación sha256 fallida: esperado {expected}, obtenido {actual}"
 ],
 "Verifica sha256 superata.": [
  "sha256 check passed.",
  "Verificación sha256 superada."
 ],
 "Rinomina annullata dall'utente: mantenuto nome proposto.": [
  "Rename cancelled by the user: kept the proposed name.",
  "Renombrado cancelado por el usuario: se mantiene el nombre propuesto."
 ],
 "File salvato: {path}": [
  "File saved: {path}",
  "Archivo guardado: {path}"
 ],
 "Il file scaricato è identico all'ultimo salvato: il contenuto potrebbe non essere stato aggiornato alla fonte.": [
  "The downloaded file is identical to the last one saved: the content may not have been updated at the source.",
  "El archivo descargado es idéntico al último guardado: es posible que el contenido no se haya actualizado en el origen."
 ],
 "Il task \"{name}\" ha scaricato {n} volte di fila lo stesso identico file: la fonte potrebbe essere ferma.": [
  "The task \"{name}\" downloaded the exact same file {n} times in a row: the source may be stuck.",
  "La tarea \"{name}\" descargó {n} veces seguidas exactamente el mismo archivo: es posible que el origen esté detenido."
 ],
 "[G-Downloader] Fonte ferma? {name}": [
  "[G-Downloader] Source stuck? {name}",
  "[G-Downloader] ¿Origen detenido? {name}"
 ],
 "Download completato: {name}": [
  "Download completed: {name}",
  "Descarga completada: {name}"
 ],
 "Errore: {name}": [
  "Error: {name}",
  "Error: {name}"
 ],
 "Configurazione email incompleta (host/destinatari mancanti)": [
  "Incomplete email configuration (host/recipients missing)",
  "Configuración de correo incompleta (faltan servidor/destinatarios)"
 ],
 "Configurazione Telegram incompleta (bot token o destinatari mancanti)": [
  "Incomplete Telegram configuration (bot token or recipients missing)",
  "Configuración de Telegram incompleta (faltan el bot token o los destinatarios)"
 ],
 "Telegram non inviato a: ": [
  "Telegram not sent to: ",
  "Telegram no enviado a: "
 ],
 "Notifica email non inviata: {message}": [
  "Email notification not sent: {message}",
  "Notificación por correo no enviada: {message}"
 ],
 "Notifica Telegram non inviata: {message}": [
  "Telegram notification not sent: {message}",
  "Notificación de Telegram no enviada: {message}"
 ],
 "[G-Downloader] Download fallito: {name}": [
  "[G-Downloader] Download failed: {name}",
  "[G-Downloader] Descarga fallida: {name}"
 ],
 "Il task \"{name}\" è fallito dopo tutti i tentativi previsti.\n\nErrore: {message}\nOrario: {when}": [
  "The task \"{name}\" failed after all the planned attempts.\n\nError: {message}\nTime: {when}",
  "La tarea \"{name}\" falló tras todos los intentos previstos.\n\nError: {message}\nHora: {when}"
 ],
 "errore sconosciuto": [
  "unknown error",
  "error desconocido"
 ],
 "settimanale (ultimi 7 giorni)": [
  "weekly (last 7 days)",
  "semanal (últimos 7 días)"
 ],
 "giornaliero (ultime 24 ore)": [
  "daily (last 24 hours)",
  "diario (últimas 24 horas)"
 ],
 "Pianificazione \"{name}\" saltata: il download precedente è ancora in corso.": [
  "Schedule \"{name}\" skipped: the previous download is still running.",
  "Programación \"{name}\" omitida: la descarga anterior sigue en curso."
 ],
 "Pianificazione \"{name}\" attivata, avvio download...": [
  "Schedule \"{name}\" triggered, starting download...",
  "Programación \"{name}\" activada, iniciando descarga..."
 ],
 "Errore imprevisto scheduler: {message}": [
  "Unexpected scheduler error: {message}",
  "Error inesperado del planificador: {message}"
 ],
 "Invio report non riuscito: {message}": [
  "Sending the report failed: {message}",
  "Falló el envío del informe: {message}"
 ],
 "Il file non contiene task": [
  "The file contains no tasks",
  "El archivo no contiene tareas"
 ],
 "File task non valido": [
  "Invalid task file",
  "Archivo de tarea no válido"
 ],
 "File di configurazione non valido": [
  "Invalid configuration file",
  "Archivo de configuración no válido"
 ],
 "Repository aggiornamenti non valido": [
  "Invalid updates repository",
  "Repositorio de actualizaciones no válido"
 ],
 "Nessun file registrato": [
  "No file recorded",
  "Ningún archivo registrado"
 ],
 "Il file e la sua cartella non sono più disponibili": [
  "The file and its folder are no longer available",
  "El archivo y su carpeta ya no están disponibles"
 ],
 "Apri G-Downloader": [
  "Open G-Downloader",
  "Abrir G-Downloader"
 ],
 "Esci": [
  "Quit",
  "Salir"
 ],
 "{name}: pianificazioni saltate": [
  "{name}: missed schedules",
  "{name}: programaciones omitidas"
 ],
 "Il file esegue comandi": [
  "The file runs commands",
  "El archivo ejecuta comandos"
 ],
 "Questo file contiene azioni che eseguono comandi sul computer.": [
  "This file contains actions that run commands on your computer.",
  "Este archivo contiene acciones que ejecutan comandos en tu ordenador."
 ],
 "\n\nImporta solo file di cui ti fidi.": [
  "\n\nOnly import files you trust.",
  "\n\nImporta solo archivos de confianza."
 ],
 "\n… e altri {n}": [
  "\n… and {n} more",
  "\n… y {n} más"
 ],
 "Importa": [
  "Import",
  "Importar"
 ],
 "Annulla": [
  "Cancel",
  "Cancelar"
 ],
 "File di configurazione": [
  "Configuration files",
  "Archivos de configuración"
 ],
 "Esporta configurazione": [
  "Export configuration",
  "Exportar configuración"
 ],
 "Importa configurazione": [
  "Import configuration",
  "Importar configuración"
 ],
 "Esporta task": [
  "Export task",
  "Exportar tarea"
 ],
 "Importa task": [
  "Import task",
  "Importar tarea"
 ],
 " — cartella di accesso \"{cwd}\", file presenti: {names}": [
  " — login folder \"{cwd}\", files present: {names}",
  " — carpeta de acceso \"{cwd}\", archivos presentes: {names}"
 ],
 "(nessuno)": [
  "(none)",
  "(ninguno)"
 ],
 "FTP 550 file non trovato o non accessibile: \"{files}\"{where}": [
  "FTP 550 file not found or not accessible: \"{files}\"{where}",
  "FTP 550 archivo no encontrado o no accesible: \"{files}\"{where}"
 ],
 "e": [
  "and",
  "y"
 ],
 "Pulizia cartella di destinazione: {n} elementi spostati nel cestino ({names}).": [
  "Destination folder cleanup: {n} items moved to the trash ({names}).",
  "Limpieza de la carpeta de destino: {n} elementos movidos a la papelera ({names})."
 ],
 "Pulizia cartella di destinazione: {n} elementi eliminati ({names}).": [
  "Destination folder cleanup: {n} items deleted ({names}).",
  "Limpieza de la carpeta de destino: {n} elementos eliminados ({names})."
 ],
 "Report settimanale inviato via email.": [
  "Weekly report sent by email.",
  "Informe semanal enviado por correo."
 ],
 "Report giornaliero inviato via email.": [
  "Daily report sent by email.",
  "Informe diario enviado por correo."
 ],
 "[G-Downloader] Report settimanale: {ok} ok, {failed} falliti": [
  "[G-Downloader] Weekly report: {ok} ok, {failed} failed",
  "[G-Downloader] Informe semanal: {ok} ok, {failed} fallidas"
 ],
 "[G-Downloader] Report giornaliero: {ok} ok, {failed} falliti": [
  "[G-Downloader] Daily report: {ok} ok, {failed} failed",
  "[G-Downloader] Informe diario: {ok} ok, {failed} fallidas"
 ],
 "Report {period}.\n\nCompletati: {ok}\nFalliti: {failed}\n{details}": [
  "Report {period}.\n\nCompleted: {ok}\nFailed: {failed}\n{details}",
  "Informe {period}.\n\nCompletadas: {ok}\nFallidas: {failed}\n{details}"
 ],
 "Dettaglio errori:": [
  "Error details:",
  "Detalle de errores:"
 ],
 "Pianificazione \"{label}\" saltata 1 volta (app non attiva): verrà eseguito solo l'ultimo orario dovuto.": [
  "Schedule \"{label}\" missed once (app not running): only the last due time will run.",
  "La programación \"{label}\" se omitió 1 vez (app no activa): solo se ejecutará la última hora debida."
 ],
 "Pianificazione \"{label}\" saltata {count} volte (app non attiva): verrà eseguito solo l'ultimo orario dovuto.": [
  "Schedule \"{label}\" missed {count} times (app not running): only the last due time will run.",
  "La programación \"{label}\" se omitió {count} veces (app no activa): solo se ejecutará la última hora debida."
 ],
 "File task": [
  "Task files",
  "Archivos de tarea"
 ],
 "Nuovo download": [
  "New download",
  "Nueva descarga"
 ],
 "Pianificazione": [
  "Schedule",
  "Programación"
 ],
 "Pianificazione ricorrente": [
  "Recurring schedule",
  "Programación recurrente"
 ],
 "Una tantum": [
  "One-off",
  "Una sola vez"
 ],
 "Ogni {n} {u}": [
  "Every {n} {u}",
  "Cada {n} {u}"
 ],
 "Ogni {n} min": [
  "Every {n} min",
  "Cada {n} min"
 ],
 "sec": [
  "sec",
  "seg"
 ],
 "min": [
  "min",
  "min"
 ],
 "ore": [
  "hours",
  "horas"
 ],
 "giorni": [
  "days",
  "días"
 ],
 "Nessuna release pubblicata": [
  "No release published",
  "Ninguna versión publicada"
 ],
 "Aggiornamento {v} scaricato e verificato: {file}": [
  "Update {v} downloaded and verified: {file}",
  "Actualización {v} descargada y verificada: {file}"
 ],
 "Download dell'aggiornamento non riuscito: {error}": [
  "Update download failed: {error}",
  "Falló la descarga de la actualización: {error}"
 ],
 "Il programma è ancora in esecuzione nella system tray.": [
  "The program is still running in the system tray.",
  "El programa sigue ejecutándose en la bandeja del sistema."
 ],
 "L'icona appare nell'area notifiche in basso a destra.\n\n• Doppio click sull'icona → riapri finestra\n• Tasto destro sull'icona → Esci → chiudi completamente": [
  "The icon appears in the notification area at the bottom right.\n\n• Double click the icon → reopen window\n• Right click the icon → Quit → close completely",
  "El icono aparece en el área de notificaciones abajo a la derecha.\n\n• Doble clic en el icono → reabrir ventana\n• Clic derecho en el icono → Salir → cerrar completamente"
 ],
 "Nessun file trovato su cui eseguire le azioni: scegline uno.": [
  "No file found to run the actions on: pick one.",
  "No se ha encontrado ningún archivo sobre el que ejecutar las acciones: elige uno."
 ],
 "Il task non ha azioni da eseguire.": [
  "The task has no actions to run.",
  "La tarea no tiene acciones que ejecutar."
 ],
 "Solo azioni su: {path}": [
  "Actions only, on: {path}",
  "Solo acciones sobre: {path}"
 ],
 "Solo download: le azioni successive non sono state eseguite.": [
  "Download only: the following actions were not run.",
  "Solo descarga: no se han ejecutado las acciones posteriores."
 ],
 "(cartella di lavoro: {cwd})": [
  "(working folder: {cwd})",
  "(carpeta de trabajo: {cwd})"
 ],
 "Sposta {file} in: {dest}": [
  "Moves {file} to: {dest}",
  "Mueve {file} a: {dest}"
 ],
 "Apre: {target}": [
  "Opens: {target}",
  "Abre: {target}"
 ],
 "Il file del task \"{name}\" è pronto ({file}). Le azioni successive aspettano la tua conferma: premi \"Esegui azioni\" nell'app.": [
  "The file of the task \"{name}\" is ready ({file}). The following actions are waiting for your confirmation: press \"Run actions\" in the app.",
  "El archivo de la tarea \"{name}\" está listo ({file}). Las acciones posteriores esperan tu confirmación: pulsa \"Ejecutar acciones\" en la app."
 ],
 "[G-Downloader] File pronto: {name}": [
  "[G-Downloader] File ready: {name}",
  "[G-Downloader] Archivo listo: {name}"
 ]
};

export function M(it, params) {
  const lang = getLanguage();
  const idx = lang === 'en' ? 0 : lang === 'es' ? 1 : -1;
  let out = idx >= 0 && TEXT[it] ? TEXT[it][idx] : it;
  if (params) for (const [k, v] of Object.entries(params)) out = out.split('{' + k + '}').join(String(v));
  return out;
}

export function dateLocale() {
  const lang = getLanguage();
  return lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'it-IT';
}
