'use strict';

// Interface texts written inline in app.js in Italian (the source language). L(text) returns
// the English/Spanish version according to settings.language; Italian and any missing text
// fall back to the original. {name} placeholders are filled from the optional params object.
const UI_TEXT = {
 "Disattivo": [
  "Off",
  "Desactivado"
 ],
 "Errore": [
  "Error",
  "Error"
 ],
 "In attesa": [
  "Waiting",
  "En espera"
 ],
 "Modalità": [
  "Mode",
  "Modo"
 ],
 "Giorni della settimana + orario": [
  "Weekdays + time",
  "Días de la semana + hora"
 ],
 "Espressione cron avanzata": [
  "Advanced cron expression",
  "Expresión cron avanzada"
 ],
 "Giorni": [
  "Days",
  "Días"
 ],
 "Lun-Ven": [
  "Mon-Fri",
  "Lun-Vie"
 ],
 "Sab-Dom": [
  "Sat-Sun",
  "Sáb-Dom"
 ],
 "Tutti i giorni": [
  "Every day",
  "Todos los días"
 ],
 "Per un giorno singolo seleziona una sola casella (es. solo \"Ven\").": [
  "For a single day, tick just one box (e.g. only \"Fri\").",
  "Para un solo día, marca una sola casilla (p. ej. solo \"Vie\")."
 ],
 "Orari (uno o più, stessi giorni sopra — es. bollettino ogni ora)": [
  "Times (one or more, same days as above — e.g. an hourly bulletin)",
  "Horas (una o más, mismos días de arriba — p. ej. boletín cada hora)"
 ],
 "+ Aggiungi orario (+1h dall'ultimo)": [
  "+ Add time (+1h from the last one)",
  "+ Añadir hora (+1h desde la última)"
 ],
 "Utile per orari fissi ma irregolari (es. ogni ora dalle 6 alle 20 escluse le 13 e le 17): aggiungi qui ogni orario di uscita.": [
  "Useful for fixed but irregular times (e.g. every hour from 6 to 20 except 13 and 17): add each release time here.",
  "Útil para horas fijas pero irregulares (p. ej. cada hora de 6 a 20 salvo las 13 y las 17): añade aquí cada hora de salida."
 ],
 "Espressione cron (min ora giorno mese giorno-settimana)": [
  "Cron expression (min hour day month weekday)",
  "Expresión cron (min hora día mes día-semana)"
 ],
 "? Aiuto": [
  "? Help",
  "? Ayuda"
 ],
 "Es. \"0 9 * * 1-5\" = ogni giorno feriale alle 9:00. \"*/30 * * * *\" = ogni 30 minuti.": [
  "E.g. \"0 9 * * 1-5\" = every weekday at 9:00. \"*/30 * * * *\" = every 30 minutes.",
  "P. ej. \"0 9 * * 1-5\" = cada día laborable a las 9:00. \"*/30 * * * *\" = cada 30 minutos."
 ],
 "Data e ora": [
  "Date and time",
  "Fecha y hora"
 ],
 "Ripeti ogni": [
  "Repeat every",
  "Repetir cada"
 ],
 "A partire da (opzionale)": [
  "Starting from (optional)",
  "A partir de (opcional)"
 ],
 "Ripeti fino a (opzionale)": [
  "Repeat until (optional)",
  "Repetir hasta (opcional)"
 ],
 "Se vuoto parte subito; se impostata, il primo tentativo avviene a quell'orario e poi si ripete ad ogni intervallo, fino al limite indicato (se presente).": [
  "If empty it starts right away; if set, the first run happens at that time and then repeats at every interval, up to the limit (if any).",
  "Si está vacío empieza enseguida; si se define, la primera ejecución ocurre a esa hora y luego se repite en cada intervalo, hasta el límite indicado (si existe)."
 ],
 "Espressione cron": [
  "Cron expression",
  "Expresión cron"
 ],
 "Una tantum": [
  "One-off",
  "Una sola vez"
 ],
 "Ripeti ogni intervallo (sec/min/ore/giorni)": [
  "Repeat at an interval (sec/min/hours/days)",
  "Repetir por intervalo (seg/min/horas/días)"
 ],
 "Attiva": [
  "Enabled",
  "Activa"
 ],
 "👁 Anteprima": [
  "👁 Preview",
  "👁 Vista previa"
 ],
 "URL solo per questa pianificazione (opzionale)": [
  "URL for this schedule only (optional)",
  "URL solo para esta programación (opcional)"
 ],
 "Righe di comando (una per riga, incollale così come sono)": [
  "Command lines (one per line, paste them as they are)",
  "Líneas de comandos (una por línea, pégalas tal cual)"
 ],
 "Ogni riga viene eseguita dalla shell del sistema (cmd.exe su Windows), una dopo l'altra: funzionano Start, pipe, redirect e le virgolette come dal prompt dei comandi. Le righe vuote e quelle che iniziano con :: o REM sono ignorate.": [
  "Each line is run by the system shell (cmd.exe on Windows), one after the other: Start, pipes, redirects and quotes work as at the command prompt. Empty lines and lines starting with :: or REM are ignored.",
  "Cada línea la ejecuta el shell del sistema (cmd.exe en Windows), una tras otra: funcionan Start, tuberías, redirecciones y comillas como en el símbolo del sistema. Las líneas vacías y las que empiezan por :: o REM se ignoran."
 ],
 "Pausa tra una riga e la successiva (secondi)": [
  "Pause between one line and the next (seconds)",
  "Pausa entre una línea y la siguiente (segundos)"
 ],
 "Comando / eseguibile": [
  "Command / executable",
  "Comando / ejecutable"
 ],
 "Sfoglia…": [
  "Browse…",
  "Examinar…"
 ],
 "Argomenti (uno per riga)": [
  "Arguments (one per line)",
  "Argumentos (uno por línea)"
 ],
 "Come indicare il comando": [
  "How to specify the command",
  "Cómo indicar el comando"
 ],
 "Programma + argomenti": [
  "Program + arguments",
  "Programa + argumentos"
 ],
 "Riga di comando completa": [
  "Full command line",
  "Línea de comandos completa"
 ],
 "Cartella di lavoro (opzionale)": [
  "Working folder (optional)",
  "Carpeta de trabajo (opcional)"
 ],
 "Attesa iniziale dopo il download, prima della prima riga (secondi)": [
  "Initial wait after the download, before the first line (seconds)",
  "Espera inicial tras la descarga, antes de la primera línea (segundos)"
 ],
 "Se il comando fallisce, segna il task come errore": [
  "If the command fails, mark the task as failed",
  "Si el comando falla, marca la tarea como error"
 ],
 "Placeholder: {filepath} {filename} {folder} {taskName} e date/ore come {date:yyyyMMdd}, {date+1h:H}. L'azione parte solo se il download è riuscito. Tempi: download ok → attesa iniziale (una volta sola) → prima riga → pausa → seconda riga → pausa → … La pausa vale solo tra le righe di questo campo, non tra azioni diverse (ognuna ha la sua attesa iniziale).": [
  "Placeholders: {filepath} {filename} {folder} {taskName} and dates/times like {date:yyyyMMdd}, {date+1h:H}. The action only runs if the download succeeded. Timing: download ok → initial wait (once) → first line → pause → second line → pause → … The pause only applies between the lines of this field, not between different actions (each has its own initial wait).",
  "Marcadores: {filepath} {filename} {folder} {taskName} y fechas/horas como {date:yyyyMMdd}, {date+1h:H}. La acción solo se ejecuta si la descarga tuvo éxito. Tiempos: descarga ok → espera inicial (una sola vez) → primera línea → pausa → segunda línea → pausa → … La pausa solo se aplica entre las líneas de este campo, no entre acciones distintas (cada una tiene su espera inicial)."
 ],
 "Cartella di destinazione": [
  "Destination folder",
  "Carpeta de destino"
 ],
 "Cosa aprire": [
  "What to open",
  "Qué abrir"
 ],
 "Il file scaricato": [
  "The downloaded file",
  "El archivo descargado"
 ],
 "La cartella di destinazione": [
  "The destination folder",
  "La carpeta de destino"
 ],
 "Titolo": [
  "Title",
  "Título"
 ],
 "Messaggio": [
  "Message",
  "Mensaje"
 ],
 "download": [
  "downloads",
  "descargas"
 ],
 "falliti": [
  "failed",
  "fallidas"
 ],
 "scaricati": [
  "downloaded",
  "descargados"
 ],
 "al giorno": [
  "per day",
  "al día"
 ],
 "Download per task": [
  "Downloads per task",
  "Descargas por tarea"
 ],
 "Nessun download nel periodo.": [
  "No downloads in this period.",
  "Ninguna descarga en el periodo."
 ],
 "Download per ora del giorno": [
  "Downloads by hour of day",
  "Descargas por hora del día"
 ],
 "🧹 Pulisci": [
  "🧹 Clear",
  "🧹 Limpiar"
 ],
 "mostra tutto": [
  "show all",
  "mostrar todo"
 ],
 "Ultimo download riuscito": [
  "Last successful download",
  "Última descarga correcta"
 ],
 "📂 Mostra file": [
  "📂 Show file",
  "📂 Mostrar archivo"
 ],
 "Tipo sorgente": [
  "Source type",
  "Tipo de origen"
 ],
 "Web (URL http/https)": [
  "Web (http/https URL)",
  "Web (URL http/https)"
 ],
 "File locale / rete (percorso su disco)": [
  "Local / network file (path on disk)",
  "Archivo local / de red (ruta en disco)"
 ],
 "URL (supporta placeholder dinamici)": [
  "URL (supports dynamic placeholders)",
  "URL (admite marcadores dinámicos)"
 ],
 "Percorso file (supporta placeholder dinamici)": [
  "File path (supports dynamic placeholders)",
  "Ruta del archivo (admite marcadores dinámicos)"
 ],
 "Se il file non è ancora presente (es. file non ancora consegnato), verranno ripetuti i tentativi come per il web.": [
  "If the file is not there yet (e.g. not delivered yet), attempts are retried as for web sources.",
  "Si el archivo aún no está (p. ej. todavía no entregado), se repiten los intentos como en el caso web."
 ],
 "Metodo HTTP": [
  "HTTP method",
  "Método HTTP"
 ],
 "Timeout (ms)": [
  "Timeout (ms)",
  "Tiempo de espera (ms)"
 ],
 "Tipo corpo (Content-Type)": [
  "Body type (Content-Type)",
  "Tipo de cuerpo (Content-Type)"
 ],
 "JSON (application/json)": [
  "JSON (application/json)",
  "JSON (application/json)"
 ],
 "Testo semplice (text/plain)": [
  "Plain text (text/plain)",
  "Texto simple (text/plain)"
 ],
 "Corpo della richiesta (supporta placeholder dinamici)": [
  "Request body (supports dynamic placeholders)",
  "Cuerpo de la solicitud (admite marcadores dinámicos)"
 ],
 "Il server richiede autenticazione (utente/password)": [
  "The server requires authentication (user/password)",
  "El servidor requiere autenticación (usuario/contraseña)"
 ],
 "Utente": [
  "User",
  "Usuario"
 ],
 "Password": [
  "Password",
  "Contraseña"
 ],
 "Tentativi in caso di errore": [
  "Retries on error",
  "Reintentos en caso de error"
 ],
 "Attesa tra un tentativo e l'altro (ms)": [
  "Wait between attempts (ms)",
  "Espera entre intentos (ms)"
 ],
 "Avvisa via email/Telegram se il download fallisce dopo tutti i tentativi": [
  "Alert by email/Telegram if the download fails after all attempts",
  "Avisar por correo/Telegram si la descarga falla tras todos los intentos"
 ],
 "Pulizia della cartella di destinazione": [
  "Destination folder cleanup",
  "Limpieza de la carpeta de destino"
 ],
 "Non fare nulla": [
  "Do nothing",
  "No hacer nada"
 ],
 "Elimina file": [
  "Delete files",
  "Eliminar archivos"
 ],
 "Sposta altrove i file": [
  "Move the files elsewhere",
  "Mover los archivos a otro sitio"
 ],
 "A quali file si applica": [
  "Which files it applies to",
  "A qué archivos se aplica"
 ],
 "Tutto il contenuto della cartella": [
  "Everything in the folder",
  "Todo el contenido de la carpeta"
 ],
 "Solo il file con lo stesso nome di questo download": [
  "Only the file with the same name as this download",
  "Solo el archivo con el mismo nombre que esta descarga"
 ],
 "Solo i file che corrispondono a un modello (es. report_*.mp3)": [
  "Only files matching a pattern (e.g. report_*.mp3)",
  "Solo los archivos que coinciden con un patrón (p. ej. report_*.mp3)"
 ],
 "Solo i file più vecchi di…": [
  "Only files older than…",
  "Solo los archivos más antiguos de…"
 ],
 "Tutti tranne gli ultimi N file più recenti": [
  "All except the N most recent files",
  "Todos excepto los N archivos más recientes"
 ],
 "Età minima": [
  "Minimum age",
  "Antigüedad mínima"
 ],
 "Unità": [
  "Unit",
  "Unidad"
 ],
 "Ore": [
  "Hours",
  "Horas"
 ],
 "Quanti file più recenti tenere": [
  "How many recent files to keep",
  "Cuántos archivos recientes conservar"
 ],
 "Includi anche le sottocartelle (se spento tocca solo i file)": [
  "Include subfolders too (when off, only files are touched)",
  "Incluir también las subcarpetas (si está apagado solo se tocan los archivos)"
 ],
 "Come eliminare": [
  "How to delete",
  "Cómo eliminar"
 ],
 "Definitivamente": [
  "Permanently",
  "Definitivamente"
 ],
 "Nel cestino (non funziona sulle cartelle di rete)": [
  "To the trash (doesn't work on network folders)",
  "A la papelera (no funciona en carpetas de red)"
 ],
 "Cartella dove spostare i file": [
  "Folder to move the files to",
  "Carpeta a la que mover los archivos"
 ],
 "Quando eseguire la pulizia": [
  "When to run the cleanup",
  "Cuándo ejecutar la limpieza"
 ],
 "Prima di scaricare": [
  "Before downloading",
  "Antes de descargar"
 ],
 "Solo dopo un download riuscito (il file appena salvato non viene toccato)": [
  "Only after a successful download (the file just saved is not touched)",
  "Solo tras una descarga correcta (el archivo recién guardado no se toca)"
 ],
 "Attenzione: verranno eliminati TUTTI i file della cartella, anche quelli non scaricati da questo task (per esempio file .txt di configurazione di altri programmi). Se la cartella è condivisa con altri task o programmi scegli \"Solo il file con lo stesso nome\" o un modello.": [
  "Warning: ALL files in the folder will be deleted, even those not downloaded by this task (for example .txt configuration files of other programs). If the folder is shared with other tasks or programs, choose \"Only the file with the same name\" or a pattern.",
  "Atención: se eliminarán TODOS los archivos de la carpeta, incluso los no descargados por esta tarea (por ejemplo archivos .txt de configuración de otros programas). Si la carpeta se comparte con otras tareas o programas, elige \"Solo el archivo con el mismo nombre\" o un patrón."
 ],
 "Con \"Prima di scaricare\", se il download poi fallisce i file eliminati non tornano: per cancellare solo a download riuscito scegli \"Solo dopo un download riuscito\".": [
  "With \"Before downloading\", if the download then fails the deleted files do not come back: to delete only after a successful download choose \"Only after a successful download\".",
  "Con \"Antes de descargar\", si la descarga falla después, los archivos eliminados no vuelven: para borrar solo tras una descarga correcta elige \"Solo tras una descarga correcta\"."
 ],
 "Se nella cartella esiste già un file con lo stesso nome": [
  "If a file with the same name already exists in the folder",
  "Si en la carpeta ya existe un archivo con el mismo nombre"
 ],
 "Conserva il vecchio rinominandolo (.old-data-ora)": [
  "Keep the old one by renaming it (.old-date-time)",
  "Conservar el antiguo renombrándolo (.old-fecha-hora)"
 ],
 "Sovrascrivi (nessuna copia: utile per cartelle di scambio)": [
  "Overwrite (no copy: useful for exchange folders)",
  "Sobrescribir (sin copia: útil para carpetas de intercambio)"
 ],
 "Checksum SHA-256 atteso (facoltativo: se il file scaricato non coincide, il download fallisce)": [
  "Expected SHA-256 checksum (optional: if the downloaded file doesn't match, the download fails)",
  "Suma SHA-256 esperada (opcional: si el archivo descargado no coincide, la descarga falla)"
 ],
 "Nome del file": [
  "File name",
  "Nombre del archivo"
 ],
 "Nome fisso": [
  "Fixed name",
  "Nombre fijo"
 ],
 "Come nell'URL": [
  "As in the URL",
  "Como en la URL"
 ],
 "Modello con placeholder (data, contatore, ...)": [
  "Template with placeholders (date, counter, ...)",
  "Plantilla con marcadores (fecha, contador, ...)"
 ],
 "Chiedi dove salvare e come nominare a fine download": [
  "Ask where to save and what to name it when the download ends",
  "Preguntar dónde guardar y cómo nombrar al terminar la descarga"
 ],
 "Nome file": [
  "File name",
  "Nombre de archivo"
 ],
 "Modello nome file": [
  "File name template",
  "Plantilla del nombre de archivo"
 ],
 "Al termine del download si aprirà la finestra \"Salva con nome\" per scegliere nome e cartella finali.": [
  "When the download ends, a \"Save as\" window will open to choose the final name and folder.",
  "Al terminar la descarga se abrirá la ventana \"Guardar como\" para elegir el nombre y la carpeta finales."
 ],
 "⤓ Esporta task": [
  "⤓ Export task",
  "⤓ Exportar tarea"
 ],
 "Impostazioni": [
  "Settings",
  "Ajustes"
 ],
 "Tema interfaccia": [
  "Interface theme",
  "Tema de la interfaz"
 ],
 "Scuro": [
  "Dark",
  "Oscuro"
 ],
 "Chiaro": [
  "Light",
  "Claro"
 ],
 "Lingua guida/istruzioni": [
  "Interface / guide language",
  "Idioma de la interfaz / guía"
 ],
 "Icona barra menù": [
  "Menu bar icon",
  "Icono de la barra de menús"
 ],
 "Bianca (MacOs like)": [
  "White (macOS style)",
  "Blanco (estilo macOS)"
 ],
 "Blu (colore del brand)": [
  "Blue (brand colour)",
  "Azul (color de la marca)"
 ],
 "Formato data e ora": [
  "Date and time format",
  "Formato de fecha y hora"
 ],
 "Automatico (secondo la lingua: it/es 24 ore GG/MM/AAAA, en AM/PM MM/GG/AAAA)": [
  "Automatic (by language: it/es 24h DD/MM/YYYY, en AM/PM MM/DD/YYYY)",
  "Automático (según el idioma: it/es 24 h DD/MM/AAAA, en AM/PM MM/DD/AAAA)"
 ],
 "Vale per tutta l'interfaccia. I campi orario/data dell'editor delle pianificazioni cambiano dopo il riavvio dell'app.": [
  "Applies to the whole interface. The time/date fields of the schedule editor change after restarting the app.",
  "Se aplica a toda la interfaz. Los campos de hora/fecha del editor de programaciones cambian tras reiniciar la app."
 ],
 "Avvia G-Downloader all'accensione del computer": [
  "Start G-Downloader when the computer starts",
  "Iniciar G-Downloader al encender el ordenador"
 ],
 "Avvia ridotto a icona (nella tray)": [
  "Start minimized (in the tray)",
  "Iniciar minimizado (en la bandeja)"
 ],
 "Notifica quando un download va a buon fine": [
  "Notify when a download succeeds",
  "Notificar cuando una descarga tiene éxito"
 ],
 "Notifica in caso di errore": [
  "Notify on error",
  "Notificar en caso de error"
 ],
 "Cliccando la notifica di successo, apri la cartella del file scaricato": [
  "Clicking the success notification opens the downloaded file's folder",
  "Al hacer clic en la notificación de éxito, abrir la carpeta del archivo descargado"
 ],
 "Cartella di destinazione predefinita": [
  "Default destination folder",
  "Carpeta de destino predeterminada"
 ],
 "Tentativi di default per i nuovi task": [
  "Default retries for new tasks",
  "Reintentos predeterminados para las tareas nuevas"
 ],
 "Attesa di default tra tentativi (ms)": [
  "Default wait between attempts (ms)",
  "Espera predeterminada entre intentos (ms)"
 ],
 "Valgono solo per i nuovi task creati da qui in poi; i task esistenti mantengono il proprio valore, modificabile nella scheda \"Sorgente\".": [
  "They only apply to new tasks created from now on; existing tasks keep their own value, editable in the \"Source\" section.",
  "Solo valen para las tareas nuevas creadas a partir de ahora; las existentes mantienen su valor, editable en la sección \"Origen\"."
 ],
 "Affidabilità": [
  "Reliability",
  "Fiabilidad"
 ],
 "Verifica che il file scaricato non sia troppo piccolo (tratta come errore e riprova)": [
  "Check that the downloaded file isn't too small (treated as an error and retried)",
  "Comprobar que el archivo descargado no sea demasiado pequeño (se trata como error y se reintenta)"
 ],
 "Dimensione minima accettata (KB)": [
  "Minimum accepted size (KB)",
  "Tamaño mínimo aceptado (KB)"
 ],
 "Avvisa se il file scaricato è identico all'ultimo (possibile contenuto non aggiornato alla fonte)": [
  "Warn if the downloaded file is identical to the last one (source content may be stale)",
  "Avisar si el archivo descargado es idéntico al anterior (posible contenido sin actualizar en el origen)"
 ],
 "Avvisa all'avvio se sono state saltate pianificazioni (app non attiva all'orario previsto)": [
  "Warn at startup if schedules were missed (app not running at the scheduled time)",
  "Avisar al iniciar si se omitieron programaciones (app no activa a la hora prevista)"
 ],
 "Prestazioni e controlli": [
  "Performance and checks",
  "Rendimiento y controles"
 ],
 "Download contemporanei al massimo (0 = nessun limite, 1 = uno alla volta)": [
  "Maximum simultaneous downloads (0 = no limit, 1 = one at a time)",
  "Máximo de descargas simultáneas (0 = sin límite, 1 = una a la vez)"
 ],
 "Avvisa se la fonte risulta ferma dopo N download identici di fila (0 = disattivato)": [
  "Warn if the source looks stuck after N identical downloads in a row (0 = off)",
  "Avisar si el origen parece detenido tras N descargas idénticas seguidas (0 = desactivado)"
 ],
 "L'avviso \"fonte ferma\" usa email/Telegram se attivi. I download in eccesso restano in attesa e partono appena se ne libera uno.": [
  "The \"stuck source\" alert uses email/Telegram if enabled. Extra downloads wait and start as soon as one finishes.",
  "El aviso de \"origen detenido\" usa correo/Telegram si están activos. Las descargas sobrantes esperan y arrancan en cuanto se libera una."
 ],
 "Aggiornamenti": [
  "Updates",
  "Actualizaciones"
 ],
 "Controlla automaticamente se esiste una nuova versione (solo avviso, nessuna installazione automatica)": [
  "Automatically check for a new version (notice only, nothing is installed automatically)",
  "Comprobar automáticamente si hay una versión nueva (solo aviso, sin instalación automática)"
 ],
 "Controlla aggiornamenti": [
  "Check for updates",
  "Buscar actualizaciones"
 ],
 "Apri pagina di download": [
  "Open download page",
  "Abrir página de descarga"
 ],
 "Report e log": [
  "Reports and logs",
  "Informes y registros"
 ],
 "Report riepilogativo via email": [
  "Summary report by email",
  "Informe resumen por correo"
 ],
 "Disattivato": [
  "Off",
  "Desactivado"
 ],
 "Giornaliero": [
  "Daily",
  "Diario"
 ],
 "Settimanale (lunedì)": [
  "Weekly (Monday)",
  "Semanal (lunes)"
 ],
 "Ora di invio": [
  "Send time",
  "Hora de envío"
 ],
 "Usa la configurazione email qui sotto. Riepiloga i download completati/falliti nel periodo, con dettaglio errori.": [
  "Uses the email configuration below. Summarises completed/failed downloads in the period, with error details.",
  "Usa la configuración de correo de abajo. Resume las descargas completadas/fallidas del periodo, con el detalle de los errores."
 ],
 "Log su file": [
  "Log to file",
  "Registro en archivo"
 ],
 "Apri cartella log": [
  "Open log folder",
  "Abrir carpeta de registros"
 ],
 "Un file al giorno, conservato 30 giorni, oltre alla cronologia mostrata nell'app.": [
  "One file per day, kept for 30 days, in addition to the history shown in the app.",
  "Un archivo al día, conservado 30 días, además del historial mostrado en la app."
 ],
 "Categorie e colori": [
  "Categories and colours",
  "Categorías y colores"
 ],
 "Ogni categoria ha un colore assegnato in automatico, usato nell'elenco dei task, nel Palinsesto e nelle etichette. Cliccalo per sceglierne un altro, ↺ ripristina quello automatico.": [
  "Each category gets an automatic colour, used in the task list, the Schedule and the labels. Click it to pick another; ↺ restores the automatic one.",
  "Cada categoría tiene un color automático, usado en la lista de tareas, la Programación y las etiquetas. Haz clic para elegir otro; ↺ restaura el automático."
 ],
 "Nessuna categoria: assegnane una ai task dal campo \"Categoria\".": [
  "No categories: assign one to your tasks from the \"Category\" field.",
  "Ninguna categoría: asigna una a las tareas desde el campo \"Categoría\"."
 ],
 "Notifica via email (download falliti)": [
  "Email notification (failed downloads)",
  "Notificación por correo (descargas fallidas)"
 ],
 "Abilita notifiche email": [
  "Enable email notifications",
  "Activar notificaciones por correo"
 ],
 "Server SMTP": [
  "SMTP server",
  "Servidor SMTP"
 ],
 "Porta": [
  "Port",
  "Puerto"
 ],
 "Connessione sicura (SSL/TLS)": [
  "Secure connection (SSL/TLS)",
  "Conexión segura (SSL/TLS)"
 ],
 "Utente SMTP": [
  "SMTP user",
  "Usuario SMTP"
 ],
 "Password SMTP": [
  "SMTP password",
  "Contraseña SMTP"
 ],
 "Mittente": [
  "Sender",
  "Remitente"
 ],
 "Destinatari (separati da virgola)": [
  "Recipients (comma separated)",
  "Destinatarios (separados por comas)"
 ],
 "Invia email di prova": [
  "Send test email",
  "Enviar correo de prueba"
 ],
 "Notifica via Telegram (download falliti)": [
  "Telegram notification (failed downloads)",
  "Notificación por Telegram (descargas fallidas)"
 ],
 "Abilita notifiche Telegram": [
  "Enable Telegram notifications",
  "Activar notificaciones de Telegram"
 ],
 "Bot Token": [
  "Bot Token",
  "Bot Token"
 ],
 "Destinatari": [
  "Recipients",
  "Destinatarios"
 ],
 "+ Aggiungi destinatario": [
  "+ Add recipient",
  "+ Añadir destinatario"
 ],
 "Come trovo il Bot Token e i Chat ID?": [
  "How do I find the Bot Token and the Chat IDs?",
  "¿Cómo encuentro el Bot Token y los Chat ID?"
 ],
 "(uguale per tutti i destinatari)": [
  "(the same for all recipients)",
  "(igual para todos los destinatarios)"
 ],
 "Su Telegram apri": [
  "On Telegram open",
  "En Telegram abre"
 ],
 "e scrivi": [
  "and type",
  "y escribe"
 ],
 "; scegli un nome e un username che finisce con \"bot\".": [
  "; choose a name and a username ending in \"bot\".",
  "; elige un nombre y un usuario que termine en \"bot\"."
 ],
 "BotFather risponde con il token, del tipo": [
  "BotFather replies with the token, like",
  "BotFather responde con el token, del tipo"
 ],
 ": copialo qui. Se usi già un bot, dal suo menu in BotFather (": [
  ": copy it here. If you already use a bot, you can see it again from its menu in BotFather (",
  ": cópialo aquí. Si ya usas un bot, puedes volver a verlo desde su menú en BotFather ("
 ],
 "→ il bot → API Token) lo rivedi.": [
  "→ your bot → API Token).",
  "→ tu bot → API Token)."
 ],
 "Il token è come una password: non pubblicarlo. Se finisce in mani sbagliate,": [
  "The token is like a password: don't publish it. If it falls into the wrong hands,",
  "El token es como una contraseña: no lo publiques. Si cae en malas manos,"
 ],
 "in BotFather ne crea uno nuovo (poi aggiornalo ovunque il bot sia usato).": [
  "in BotFather creates a new one (then update it wherever the bot is used).",
  "en BotFather crea uno nuevo (luego actualízalo allí donde se use el bot)."
 ],
 "Chat ID di una persona": [
  "Chat ID of a person",
  "Chat ID de una persona"
 ],
 "La persona apre il bot e preme": [
  "The person opens the bot and presses",
  "La persona abre el bot y pulsa"
 ],
 "Avvia": [
  "Start",
  "Iniciar"
 ],
 "): senza questo passaggio il bot non può scriverle.": [
  "): without this step the bot cannot write to them.",
  "): sin este paso el bot no puede escribirle."
 ],
 "Poi scrive a": [
  "Then they write to",
  "Luego escribe a"
 ],
 "(o @getidsbot): risponde con il suo": [
  "(or @getidsbot): it replies with their",
  "(o @getidsbot): responde con su"
 ],
 ", un numero come": [
  ", a number like",
  ", un número como"
 ],
 ". Quello è il Chat ID.": [
  ". That is the Chat ID.",
  ". Ese es el Chat ID."
 ],
 "Chat ID di un gruppo o di un canale": [
  "Chat ID of a group or channel",
  "Chat ID de un grupo o canal"
 ],
 "Aggiungi il bot al gruppo (per un canale, come amministratore) e scrivi un messaggio.": [
  "Add the bot to the group (for a channel, as administrator) and post a message.",
  "Añade el bot al grupo (en un canal, como administrador) y escribe un mensaje."
 ],
 "Il Chat ID inizia con": [
  "The Chat ID starts with",
  "El Chat ID empieza por"
 ],
 "): inseriscilo con il segno meno. Per leggerlo puoi aggiungere temporaneamente @getidsbot al gruppo.": [
  "): enter it with the minus sign. To read it you can temporarily add @getidsbot to the group.",
  "): introdúcelo con el signo menos. Para leerlo puedes añadir temporalmente @getidsbot al grupo."
 ],
 "Se il bot è già usato da altri programmi (es. Home Assistant)": [
  "If the bot is already used by other programs (e.g. Home Assistant)",
  "Si el bot ya lo usan otros programas (p. ej. Home Assistant)"
 ],
 ": hanno il loro webhook e la ricerca degli update da browser non funziona (errore 409). Non toglierlo: usa @userinfobot per i Chat ID. G-Downloader invia soltanto e non disturba gli altri programmi.": [
  ": they have their own webhook and looking up updates from a browser doesn't work (error 409). Don't remove it: use @userinfobot for the Chat IDs. G-Downloader only sends and doesn't disturb the other programs.",
  ": tienen su propio webhook y consultar las actualizaciones desde el navegador no funciona (error 409). No lo quites: usa @userinfobot para los Chat ID. G-Downloader solo envía y no molesta a los demás programas."
 ],
 "Ogni destinatario riceve gli avvisi. Usa la nota per ricordare chi è.": [
  "Every recipient gets the alerts. Use the note to remember who it is.",
  "Cada destinatario recibe los avisos. Usa la nota para recordar quién es."
 ],
 "Invia messaggio di prova": [
  "Send test message",
  "Enviar mensaje de prueba"
 ],
 "Backup / Trasferimento su un altro PC": [
  "Backup / Transfer to another PC",
  "Copia de seguridad / Traslado a otro PC"
 ],
 "Esporta task e impostazioni in un file, da riportare identico su un altro computer con Importa configurazione. Il file contiene anche eventuali password SMTP e token Telegram salvati: conservalo in un posto sicuro.": [
  "Export tasks and settings to a file, to restore identically on another computer with Import configuration. The file also contains any saved SMTP passwords and Telegram tokens: keep it somewhere safe.",
  "Exporta tareas y ajustes a un archivo, para restaurarlos idénticos en otro ordenador con Importar configuración. El archivo contiene también las contraseñas SMTP y los tokens de Telegram guardados: consérvalo en un lugar seguro."
 ],
 "Esporta configurazione": [
  "Export configuration",
  "Exportar configuración"
 ],
 "Importa configurazione": [
  "Import configuration",
  "Importar configuración"
 ],
 "Info e Guida": [
  "Info & Guide",
  "Info y Guía"
 ],
 "Sviluppatore": [
  "Developer",
  "Desarrollador"
 ],
 "Calcolo in corso…": [
  "Calculating…",
  "Calculando…"
 ],
 "Prossime occorrenze:": [
  "Next occurrences:",
  "Próximas ocurrencias:"
 ],
 "Nessuna occorrenza futura trovata (controlla i campi della pianificazione).": [
  "No future occurrences found (check the schedule fields).",
  "No se encontraron ocurrencias futuras (revisa los campos de la programación)."
 ],
 "Esegui edizione…": [
  "Run edition…",
  "Ejecutar edición…"
 ],
 "Task": [
  "Tasks",
  "Tareas"
 ],
 "Tutti i passaggi": [
  "All runs",
  "Todas las ejecuciones"
 ],
 "+ Nuovo task": [
  "+ New task",
  "+ Nueva tarea"
 ],
 "⤒ Importa task da file": [
  "⤒ Import task from file",
  "⤒ Importar tarea desde archivo"
 ],
 "Prossime 24 ore": [
  "Next 24 hours",
  "Próximas 24 horas"
 ],
 "Prossimi 7 giorni": [
  "Next 7 days",
  "Próximos 7 días"
 ],
 "Nessun passaggio previsto nel periodo.": [
  "No runs scheduled in this period.",
  "Ninguna ejecución prevista en el periodo."
 ],
 "⏳ In corso": [
  "⏳ Running",
  "⏳ En curso"
 ],
 "Attivo": [
  "Active",
  "Activo"
 ],
 "Nessuna pianificazione attiva": [
  "No active schedule",
  "Sin programación activa"
 ],
 "Ultimo download": [
  "Last download",
  "Última descarga"
 ],
 "Ultimo errore": [
  "Last error",
  "Último error"
 ],
 "Sorgente": [
  "Source",
  "Origen"
 ],
 "Destinazione": [
  "Destination",
  "Destino"
 ],
 "▶ Esegui ora": [
  "▶ Run now",
  "▶ Ejecutar ahora"
 ],
 "📂 File": [
  "📂 File",
  "📂 Archivo"
 ],
 "Modifica": [
  "Edit",
  "Editar"
 ],
 "Rimuovi orario": [
  "Remove time",
  "Quitar hora"
 ],
 "Aiuto sintassi cron": [
  "Cron syntax help",
  "Ayuda de sintaxis cron"
 ],
 "Duplica questa pianificazione +1 ora": [
  "Duplicate this schedule +1 hour",
  "Duplicar esta programación +1 hora"
 ],
 "Mostra le prossime occorrenze": [
  "Show the next occurrences",
  "Mostrar las próximas ocurrencias"
 ],
 "Rimuovi": [
  "Remove",
  "Quitar"
 ],
 "Nasconde l'attività registrata finora (lo storico dei task resta)": [
  "Hides the activity recorded so far (task history is kept)",
  "Oculta la actividad registrada hasta ahora (el historial de las tareas se conserva)"
 ],
 "Azzera il conteggio errori da adesso (lo storico dei task resta)": [
  "Resets the error count from now on (task history is kept)",
  "Pone a cero el recuento de errores desde ahora (el historial de las tareas se conserva)"
 ],
 "Se attivo, avvia subito un download di prova ogni volta che salvi": [
  "When on, starts a test download right away every time you save",
  "Si está activo, inicia enseguida una descarga de prueba cada vez que guardas"
 ],
 "Apre la cartella con il file selezionato (o la cartella, se il file è stato spostato)": [
  "Opens the folder with the file selected (or the folder, if the file was moved)",
  "Abre la carpeta con el archivo seleccionado (o la carpeta, si el archivo se movió)"
 ],
 "Mostra/nascondi password": [
  "Show/hide password",
  "Mostrar/ocultar contraseña"
 ],
 "Salva questo task in un file, per condividerlo o duplicarlo su un altro PC": [
  "Save this task to a file, to share it or duplicate it on another PC",
  "Guarda esta tarea en un archivo, para compartirla o duplicarla en otro PC"
 ],
 "Cambia colore": [
  "Change colour",
  "Cambiar color"
 ],
 "Ripristina il colore automatico": [
  "Restore the automatic colour",
  "Restaurar el color automático"
 ],
 "Mostra l'ultimo file scaricato": [
  "Show the last downloaded file",
  "Mostrar el último archivo descargado"
 ],
 "Chiudi": [
  "Close",
  "Cerrar"
 ],
 "Etichetta (opzionale)": [
  "Label (optional)",
  "Etiqueta (opcional)"
 ],
 "Se vuoto usa l'URL del task — utile quando lo stesso prodotto ha un file diverso a seconda dell'orario o del giorno": [
  "If empty, uses the task URL — useful when the same product has a different file depending on the time or day",
  "Si está vacío usa la URL de la tarea — útil cuando el mismo producto tiene un archivo distinto según la hora o el día"
 ],
 "es. python o C:\\Script\\avvia.bat": [
  "e.g. python or C:\\Script\\start.bat",
  "p. ej. python o C:\\Script\\inicio.bat"
 ],
 "es. D:\\Archivio\\{date:yyyy}": [
  "e.g. D:\\Archive\\{date:yyyy}",
  "p. ej. D:\\Archivo\\{date:yyyy}"
 ],
 "es. D:\\Archivio\\{date:yyyy-MM-dd}": [
  "e.g. D:\\Archive\\{date:yyyy-MM-dd}",
  "p. ej. D:\\Archivo\\{date:yyyy-MM-dd}"
 ],
 "Download completato: {filename}": [
  "Download completed: {filename}",
  "Descarga completada: {filename}"
 ],
 "https://esempio.com/report_{date:yyyyMMdd}.zip": [
  "https://example.com/report_{date:yyyyMMdd}.zip",
  "https://example.com/report_{date:yyyyMMdd}.zip"
 ],
 "\\\\server\\audio\\clip_{date:yyyyMMdd}.mp3": [
  "\\\\server\\audio\\clip_{date:yyyyMMdd}.mp3",
  "\\\\server\\audio\\clip_{date:yyyyMMdd}.mp3"
 ],
 "Lascia vuoto per usare la cartella predefinita": [
  "Leave empty to use the default folder",
  "Déjalo vacío para usar la carpeta predeterminada"
 ],
 "es. report_*.mp3; *.tmp — * = qualsiasi testo, ? = un carattere, più modelli separati da ;": [
  "e.g. report_*.mp3; *.tmp — * = any text, ? = one character, several patterns separated by ;",
  "p. ej. report_*.mp3; *.tmp — * = cualquier texto, ? = un carácter, varios patrones separados por ;"
 ],
 "es. 9f86d081884c7d659a2feaa0c55ad015…": [
  "e.g. 9f86d081884c7d659a2feaa0c55ad015…",
  "p. ej. 9f86d081884c7d659a2feaa0c55ad015…"
 ],
 "smtp.esempio.com": [
  "smtp.example.com",
  "smtp.example.com"
 ],
 "downloader@tuodominio.it": [
  "downloader@yourdomain.com",
  "downloader@tudominio.com"
 ],
 "anna@example.com, mario@example.com": [
  "anna@example.com, mario@example.com",
  "anna@example.com, mario@example.com"
 ],
 "Chat ID (es. 123456789 o -1001234567890)": [
  "Chat ID (e.g. 123456789 or -1001234567890)",
  "Chat ID (p. ej. 123456789 o -1001234567890)"
 ],
 "Nota: chi è (es. Anna, Regia)": [
  "Note: who it is (e.g. Anna, Control room)",
  "Nota: quién es (p. ej. Ana, Control)"
 ],
 "Data odierna, es. 20260921": [
  "Today's date, e.g. 20260921",
  "Fecha de hoy, p. ej. 20260921"
 ],
 "Data ISO": [
  "ISO date",
  "Fecha ISO"
 ],
 "Ora corrente": [
  "Current time",
  "Hora actual"
 ],
 "Ora successiva (es. 7 alle 6:57); anche -1d, +30m ...": [
  "Next hour (e.g. 7 at 6:57); also -1d, +30m ...",
  "Hora siguiente (p. ej. 7 a las 6:57); también -1d, +30m ..."
 ],
 "Contatore progressivo (0001, 0002, ...)": [
  "Running counter (0001, 0002, ...)",
  "Contador progresivo (0001, 0002, ...)"
 ],
 "Stringa casuale": [
  "Random string",
  "Cadena aleatoria"
 ],
 "Foglio di calcolo": [
  "Spreadsheet",
  "Hoja de cálculo"
 ],
 "Archivio": [
  "Archive",
  "Archivo comprimido"
 ],
 "Documento": [
  "Document",
  "Documento"
 ],
 "Immagine": [
  "Image",
  "Imagen"
 ],
 "Dati": [
  "Data",
  "Datos"
 ],
 "Programma": [
  "Program",
  "Programa"
 ],
 "Notifica di sistema": [
  "System notification",
  "Notificación del sistema"
 ],
 "Esegui programma/script": [
  "Run program/script",
  "Ejecutar programa/script"
 ],
 "Sposta file": [
  "Move file",
  "Mover archivo"
 ],
 "Apri file/cartella": [
  "Open file/folder",
  "Abrir archivo/carpeta"
 ],
 "24 ore, GG/MM/AAAA (Italia, Spagna)": [
  "24h, DD/MM/YYYY (Italy, Spain)",
  "24 h, DD/MM/AAAA (Italia, España)"
 ],
 "AM/PM, MM/GG/AAAA (USA, Regno Unito anglosassone)": [
  "AM/PM, MM/DD/YYYY (USA)",
  "AM/PM, MM/DD/AAAA (EE. UU.)"
 ],
 "24 ore, GG/MM/AAAA (Regno Unito)": [
  "24h, DD/MM/YYYY (United Kingdom)",
  "24 h, DD/MM/AAAA (Reino Unido)"
 ],
 "24 ore, AAAA-MM-GG (internazionale ISO)": [
  "24h, YYYY-MM-DD (ISO, international)",
  "24 h, AAAA-MM-DD (ISO, internacional)"
 ],
 "AM/PM, GG/MM/AAAA": [
  "AM/PM, DD/MM/YYYY",
  "AM/PM, DD/MM/AAAA"
 ],
 "Nuova versione {latest} disponibile (installata: {current}).": [
  "New version {latest} available (installed: {current}).",
  "Nueva versión {latest} disponible (instalada: {current})."
 ],
 "Scarica": [
  "Download",
  "Descargar"
 ],
 "file locale/rete": [
  "local/network file",
  "archivo local/de red"
 ],
 "Una volta:": [
  "Once:",
  "Una vez:"
 ],
 "Ogni {n} min": [
  "Every {n} min",
  "Cada {n} min"
 ],
 "Secondi": [
  "Seconds",
  "Segundos"
 ],
 "Minuti": [
  "Minutes",
  "Minutos"
 ],
 "Attività ultimi {n} giorni": [
  "Activity, last {n} days",
  "Actividad, últimos {n} días"
 ],
 "ultimi {n} giorni": [
  "last {n} days",
  "últimos {n} días"
 ],
 "Elenco pulito il {d}": [
  "List cleared on {d}",
  "Lista limpiada el {d}"
 ],
 "Conteggio azzerato il {d}": [
  "Count reset on {d}",
  "Recuento a cero el {d}"
 ],
 "(opzionale: se vuoto vale per tutti i file)": [
  "(optional: if empty it applies to all files)",
  "(opcional: si está vacío vale para todos los archivos)"
 ],
 "task": [
  "tasks",
  "tareas"
 ],
 "Salvato ✓": [
  "Saved ✓",
  "Guardado ✓"
 ],
 "Eliminare definitivamente il task \"{name}\"?": [
  "Permanently delete the task \"{name}\"?",
  "¿Eliminar definitivamente la tarea \"{name}\"?"
 ],
 "Errore ✕": [
  "Error ✕",
  "Error ✕"
 ],
 "Fatto ✓": [
  "Done ✓",
  "Hecho ✓"
 ],
 "Scarica una edizione precedente (usa la sua data e ora nel nome del file)": [
  "Download a previous edition (uses its date and time in the file name)",
  "Descargar una edición anterior (usa su fecha y hora en el nombre del archivo)"
 ],
 "File non più presente: aperta la cartella.": [
  "File no longer there: the folder was opened.",
  "El archivo ya no está: se abrió la carpeta."
 ],
 "Controllo in corso…": [
  "Checking…",
  "Comprobando…"
 ],
 "Controllo non riuscito: ": [
  "Check failed: ",
  "Comprobación fallida: "
 ],
 "Disponibile la versione {latest} (installata: {current}).": [
  "Version {latest} is available (installed: {current}).",
  "Versión {latest} disponible (instalada: {current})."
 ],
 "Invio in corso…": [
  "Sending…",
  "Enviando…"
 ],
 "✓ Email inviata": [
  "✓ Email sent",
  "✓ Correo enviado"
 ],
 "✓ Messaggio inviato a tutti i destinatari": [
  "✓ Message sent to all recipients",
  "✓ Mensaje enviado a todos los destinatarios"
 ],
 "✓ Salvato in {path}": [
  "✓ Saved to {path}",
  "✓ Guardado en {path}"
 ],
 "✓ Importati {n} task e impostazioni": [
  "✓ Imported {n} tasks and settings",
  "✓ Importadas {n} tareas y ajustes"
 ],
 "Versione": [
  "Version",
  "Versión"
 ],
 "Import fallito: {error}": [
  "Import failed: {error}",
  "Importación fallida: {error}"
 ],
 "Importati {n} task.": [
  "Imported {n} tasks.",
  "Importadas {n} tareas."
 ],
 "adesso": [
  "now",
  "ahora"
 ],
 "tra {t}": [
  "in {t}",
  "en {t}"
 ],
 "{n} download insieme: {names}": [
  "{n} downloads together: {names}",
  "{n} descargas juntas: {names}"
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
 "Ogni giorno": [
  "Every day",
  "Todos los días"
 ],
 "Giorni alterni": [
  "Every other day",
  "Días alternos"
 ],
 "Ogni {n} {u}": [
  "Every {n} {u}",
  "Cada {n} {u}"
 ],
 "da {d}": [
  "from {d}",
  "desde {d}"
 ],
 "fino a {d}": [
  "until {d}",
  "hasta {d}"
 ],
 "Ogni {day} (settimanale)": [
  "Every {day} (weekly)",
  "Cada {day} (semanal)"
 ],
 "Oggi": [
  "Today",
  "Hoy"
 ],
 "Domani": [
  "Tomorrow",
  "Mañana"
 ],
 "{n} task · {a} attivi": [
  "{n} tasks · {a} active",
  "{n} tareas · {a} activas"
 ],
 "{n} passaggi previsti nei prossimi 7 giorni": [
  "{n} runs scheduled in the next 7 days",
  "{n} ejecuciones previstas en los próximos 7 días"
 ],
 "{n} passaggi previsti nelle prossime 24 ore": [
  "{n} runs scheduled in the next 24 hours",
  "{n} ejecuciones previstas en las próximas 24 horas"
 ],
 "Nessuna pianificazione": [
  "No schedule",
  "Sin programación"
 ],
 "Task disattivato": [
  "Task disabled",
  "Tarea desactivada"
 ],
 "Pianificazione": [
  "Schedule",
  "Programación"
 ],
 "Esito (ultimi {n})": [
  "Result (last {n})",
  "Resultado (últimos {n})"
 ],
 "Cartella predefinita": [
  "Default folder",
  "Carpeta predeterminada"
 ],
 "⏸ Disattiva": [
  "⏸ Disable",
  "⏸ Desactivar"
 ],
 "▶ Attiva": [
  "▶ Enable",
  "▶ Activar"
 ],
 "Nuovo task": [
  "New task",
  "Nueva tarea"
 ],
 "Importa task da file": [
  "Import task from file",
  "Importar tarea desde archivo"
 ],
 "Trascina per ridimensionare": [
  "Drag to resize",
  "Arrastra para cambiar el tamaño"
 ],
 "{n}g": [
  "{n}d",
  "{n}d"
 ],
 "Controlla automaticamente se esiste una nuova versione (avviso e download su richiesta, nessuna installazione automatica)": [
  "Automatically check for a new version (notice and download on request, nothing installs by itself)",
  "Comprobar automáticamente si hay una versión nueva (aviso y descarga bajo petición, sin instalación automática)"
 ],
 "il file scaricato non corrisponde al checksum della release ed è stato eliminato": [
  "the downloaded file does not match the release checksum and was deleted",
  "el archivo descargado no coincide con la suma de verificación de la versión y se ha eliminado"
 ],
 "nella release non c'è un installer per questo sistema": [
  "the release has no installer for this system",
  "la versión no incluye un instalador para este sistema"
 ],
 "nella release manca il checksum SHA-256 dell'installer": [
  "the release is missing the installer's SHA-256 checksum",
  "a la versión le falta la suma SHA-256 del instalador"
 ],
 "nessun aggiornamento disponibile": [
  "no update available",
  "no hay ninguna actualización disponible"
 ],
 "un download è in corso: riprova quando è finito": [
  "a download is running: try again when it has finished",
  "hay una descarga en curso: vuelve a intentarlo cuando termine"
 ],
 "Chiudi e installa": [
  "Close and install",
  "Cerrar e instalar"
 ],
 "Apri installer": [
  "Open installer",
  "Abrir instalador"
 ],
 "Scarica e installa": [
  "Download and install",
  "Descargar e instalar"
 ],
 "Nascondi": [
  "Hide",
  "Ocultar"
 ],
 "Download della versione {v}…": [
  "Downloading version {v}…",
  "Descargando la versión {v}…"
 ],
 "Versione {v} scaricata e verificata. \"Chiudi e installa\" chiude G-Downloader (i download pianificati si fermano) e avvia l'installazione; al termine l'app si riapre.": [
  "Version {v} downloaded and verified. \"Close and install\" closes G-Downloader (scheduled downloads stop) and starts the installation; the app reopens when it is done.",
  "Versión {v} descargada y verificada. \"Cerrar e instalar\" cierra G-Downloader (las descargas programadas se detienen) e inicia la instalación; al terminar la app se vuelve a abrir."
 ],
 "Versione {v} scaricata e verificata. \"Apri installer\" apre il file .dmg: chiudi G-Downloader con \"Esci\" dall'icona nella barra dei menu e trascina la nuova versione in Applicazioni.": [
  "Version {v} downloaded and verified. \"Open installer\" opens the .dmg file: quit G-Downloader with \"Quit\" from the menu-bar icon and drag the new version into Applications.",
  "Versión {v} descargada y verificada. \"Abrir instalador\" abre el archivo .dmg: cierra G-Downloader con \"Salir\" desde el icono de la barra de menús y arrastra la nueva versión a Aplicaciones."
 ],
 "Versione {v} scaricata e verificata. \"Apri installer\" mostra il file AppImage nella cartella: chiudi G-Downloader con \"Esci\" e avvia il nuovo file.": [
  "Version {v} downloaded and verified. \"Open installer\" shows the AppImage file in its folder: quit G-Downloader with \"Quit\" and start the new file.",
  "Versión {v} descargada y verificada. \"Abrir instalador\" muestra el archivo AppImage en su carpeta: cierra G-Downloader con \"Salir\" e inicia el archivo nuevo."
 ],
 "Download dell'aggiornamento non riuscito: {error}": [
  "Update download failed: {error}",
  "Falló la descarga de la actualización: {error}"
 ],
 "Installazione non avviata: {error}": [
  "Installation not started: {error}",
  "Instalación no iniciada: {error}"
 ],
 "Sei aggiornato (versione {current}) ✓": [
  "You are up to date (version {current}) ✓",
  "Estás al día (versión {current}) ✓"
 ],
 "Scarica il file ed esegue le azioni successive": [
  "Downloads the file and runs the actions that follow",
  "Descarga el archivo y ejecuta las acciones posteriores"
 ],
 "Scarica il file senza eseguire le azioni successive": [
  "Downloads the file without running the actions that follow",
  "Descarga el archivo sin ejecutar las acciones posteriores"
 ],
 "⬇ Solo download": [
  "⬇ Download only",
  "⬇ Solo descarga"
 ],
 "Esegue solo le azioni successive sul file già presente, senza scaricare": [
  "Runs only the post-download actions on the file already there, without downloading",
  "Ejecuta solo las acciones posteriores sobre el archivo ya presente, sin descargar"
 ],
 "⚙ Solo azioni": [
  "⚙ Actions only",
  "⚙ Solo acciones"
 ],
 "Esegui solo questa azione sul file già presente (anche se è disattivata)": [
  "Run only this action on the file already there (even if it is switched off)",
  "Ejecuta solo esta acción sobre el archivo ya presente (aunque esté desactivada)"
 ],
 "▶ Esegui": [
  "▶ Run",
  "▶ Ejecutar"
 ],
 "Nessun file trovato per questo task. Vuoi scegliere il file su cui eseguire le azioni?": [
  "No file found for this task. Do you want to pick the file to run the actions on?",
  "No se ha encontrado ningún archivo para esta tarea. ¿Quieres elegir el archivo sobre el que ejecutar las acciones?"
 ],
 "Dopo il download": [
  "After the download",
  "Después de la descarga"
 ],
 "Esegui le azioni successive": [
  "Run the following actions",
  "Ejecutar las acciones posteriores"
 ],
 "Solo download: non eseguire le azioni": [
  "Download only: do not run the actions",
  "Solo descarga: no ejecutar las acciones"
 ],
 "Aspetta la mia conferma e avvisami (email/Telegram)": [
  "Wait for my confirmation and notify me (email/Telegram)",
  "Esperar mi confirmación y avisarme (correo/Telegram)"
 ],
 "Sceglie un file qualsiasi ed esegue le azioni su quello, senza scaricare": [
  "Picks any file and runs the actions on it, without downloading",
  "Elige un archivo cualquiera y ejecuta las acciones sobre él, sin descargar"
 ],
 "📂 Azioni su un altro file…": [
  "📂 Actions on another file…",
  "📂 Acciones sobre otro archivo…"
 ],
 "⏸ Azioni in attesa di conferma": [
  "⏸ Actions waiting for confirmation",
  "⏸ Acciones a la espera de confirmación"
 ],
 "▶ Esegui azioni ora": [
  "▶ Run actions now",
  "▶ Ejecutar acciones ahora"
 ],
 "Mostra i comandi con i segnaposto già sostituiti, senza eseguirli": [
  "Shows the commands with the placeholders already filled in, without running them",
  "Muestra los comandos con los marcadores ya sustituidos, sin ejecutarlos"
 ],
 "File: {file}": [
  "File: {file}",
  "Archivo: {file}"
 ],
 "Nessun file trovato: vengono mostrati i segnaposto.": [
  "No file found: the placeholders are shown as they are.",
  "No se ha encontrado ningún archivo: se muestran los marcadores tal cual."
 ],
 "in attesa": [
  "waiting",
  "en espera"
 ],
 "file del task": [
  "task file",
  "archivo de la tarea"
 ],
 "ultimo scaricato": [
  "last downloaded",
  "último descargado"
 ],
 "file presente": [
  "file present",
  "archivo presente"
 ],
 "nessun file: verrà chiesto": [
  "no file: you will be asked",
  "ningún archivo: se te preguntará"
 ],
 "⏸ Azioni in attesa": [
  "⏸ Actions waiting",
  "⏸ Acciones en espera"
 ],
 "Azioni": [
  "Actions",
  "Acciones"
 ],
 "Tutti": [
  "All",
  "Todos"
 ],
 "Attivi": [
  "Active",
  "Activos"
 ],
 "Disattivati": [
  "Disabled",
  "Desactivados"
 ],
 "Con errori": [
  "With errors",
  "Con errores"
 ],
 "Azioni in attesa": [
  "Actions waiting",
  "Acciones en espera"
 ],
 "Per categoria": [
  "By category",
  "Por categoría"
 ],
 "A → Z": [
  "A → Z",
  "A → Z"
 ],
 "Per orario": [
  "By time",
  "Por hora"
 ],
 "Per stato": [
  "By status",
  "Por estado"
 ],
 "Cerca task…": [
  "Search tasks…",
  "Buscar tareas…"
 ],
 "Ordinamento": [
  "Sort order",
  "Orden"
 ],
 "Filtro": [
  "Filter",
  "Filtro"
 ],
 "Mostra tutti i task": [
  "Show all tasks",
  "Mostrar todas las tareas"
 ],
 "Nessun task corrisponde ai filtri.": [
  "No task matches the filters.",
  "Ninguna tarea coincide con los filtros."
 ],
 "In una sottocartella _cestino che si svuota da sola (anche in rete)": [
  "In a _cestino subfolder that empties itself (works on network folders too)",
  "En una subcarpeta _cestino que se vacía sola (también en red)"
 ],
 "Giorni prima di eliminarli per sempre": [
  "Days before deleting them for good",
  "Días antes de eliminarlos para siempre"
 ],
 "A prova di errore: metti i file da parte e, se il download fallisce, rimettili al loro posto": [
  "Fail-safe: set the files aside and, if the download fails, put them back",
  "A prueba de errores: aparta los archivos y, si la descarga falla, devuélvelos a su sitio"
 ],
 "Copie vecchie (.old-…): tieni al massimo (0 = tutte)": [
  "Old copies (.old-…): keep at most (0 = all)",
  "Copias antiguas (.old-…): conservar como máximo (0 = todas)"
 ],
 "…ed elimina quelle più vecchie di N giorni (0 = mai)": [
  "…and delete those older than N days (0 = never)",
  "…y eliminar las de más de N días (0 = nunca)"
 ],
 "Limite di spazio della cartella in GB (0 = nessun limite): se superato, elimina i file più vecchi": [
  "Folder size limit in GB (0 = no limit): when exceeded, the oldest files are deleted",
  "Límite de espacio de la carpeta en GB (0 = sin límite): si se supera, se eliminan los archivos más antiguos"
 ],
 "Mostra che cosa verrebbe spostato o eliminato adesso, senza toccare nulla": [
  "Shows what would be moved or deleted right now, without touching anything",
  "Muestra qué se movería o eliminaría ahora, sin tocar nada"
 ],
 "👁 Anteprima pulizia": [
  "👁 Cleanup preview",
  "👁 Vista previa de la limpieza"
 ],
 "Esegue solo la pulizia della cartella, senza scaricare": [
  "Runs only the folder cleanup, without downloading",
  "Ejecuta solo la limpieza de la carpeta, sin descargar"
 ],
 "🧹 Pulisci ora": [
  "🧹 Clean now",
  "🧹 Limpiar ahora"
 ],
 "Avvisami anche via email/Telegram quando esce una nuova versione (una sola volta per versione)": [
  "Also notify me by email/Telegram when a new version is out (once per version)",
  "Avisarme también por correo/Telegram cuando salga una versión nueva (una sola vez por versión)"
 ],
 "Cartella: {folder}": [
  "Folder: {folder}",
  "Carpeta: {folder}"
 ],
 "Verranno spostati in {target}:": [
  "Will be moved to {target}:",
  "Se moverán a {target}:"
 ],
 "Andranno nel cestino del sistema:": [
  "Will go to the system recycle bin:",
  "Irán a la papelera del sistema:"
 ],
 "Andranno nella cartella _cestino:": [
  "Will go to the _cestino folder:",
  "Irán a la carpeta _cestino:"
 ],
 "Verranno eliminati per sempre:": [
  "Will be deleted for good:",
  "Se eliminarán para siempre:"
 ],
 "Copie vecchie da eliminare:": [
  "Old copies to delete:",
  "Copias antiguas por eliminar:"
 ],
 "Limite di spazio ({limit} GB, ora {now} MB): eliminati per sempre i più vecchi:": [
  "Size limit ({limit} GB, now {now} MB): the oldest are deleted for good:",
  "Límite de espacio ({limit} GB, ahora {now} MB): se eliminan para siempre los más antiguos:"
 ],
 "Cartelle scadute nel _cestino da svuotare:": [
  "Expired folders in _cestino to empty:",
  "Carpetas caducadas en _cestino por vaciar:"
 ],
 "Niente da fare: la cartella è già a posto.": [
  "Nothing to do: the folder is already in order.",
  "Nada que hacer: la carpeta ya está en orden."
 ],
 "Eseguire questa pulizia adesso?": [
  "Run this cleanup now?",
  "¿Ejecutar esta limpieza ahora?"
 ],
 "Mostra o nascondi la ricerca e i filtri": [
  "Show or hide the search and filters",
  "Mostrar u ocultar la búsqueda y los filtros"
 ]
};

function L(it, params) {
  const lang = (typeof state !== 'undefined' && state.settings && state.settings.language) || 'it';
  const idx = lang === 'en' ? 0 : lang === 'es' ? 1 : -1;
  let out = idx >= 0 && UI_TEXT[it] ? UI_TEXT[it][idx] : it;
  if (params) for (const [k, v] of Object.entries(params)) out = out.split('{' + k + '}').join(String(v));
  return out;
}
