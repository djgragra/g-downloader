IT = dict(manual="Manuale d'uso", version="Versione", license="Licenza MIT © 2026 Graziano Melzi", toc="Indice", sections=[
("Introduzione", """
<p>G-Downloader è un'applicazione gratuita per Windows, macOS e Linux che esegue <b>download pianificati</b> e resta sempre attiva in background (icona nella barra di sistema). È pensata per l'uso broadcast — per esempio per recuperare ogni giorno file audio, palinsesti o notiziari da server web, FTP o cartelle di rete — ma funziona per qualsiasi altro caso d'uso in cui un file va scaricato a orari precisi.</p>
<h3>Cosa sa fare</h3>
<ul>
<li>Sorgenti <b>web</b> (HTTP/HTTPS, con utente e password e richieste GET o POST), <b>FTP/FTPS</b> e <b>file locali o di rete</b>.</li>
<li>URL e nomi file <b>dinamici</b>: data, ora, contatore, valori casuali, scostamenti (es. «l'ora successiva»).</li>
<li>Più <b>pianificazioni</b> per ogni task: giorni della settimana e orari, una tantum, ogni N secondi/minuti/ore/giorni, oppure espressione cron.</li>
<li><b>Azioni</b> prima e dopo il download: pulizia della cartella, rinomina dei file preesistenti, esecuzione di programmi o script, spostamento, apertura, notifiche.</li>
<li><b>Tentativi automatici</b> in caso di errore e avvisi via <b>email</b> e <b>Telegram</b>; report riepilogativo periodico.</li>
<li><b>Dashboard</b> con statistiche e grafici, categorie con colori, storico, log su file.</li>
<li>Interfaccia in <b>italiano, inglese e spagnolo</b>, tema chiaro e scuro, formati di data e ora personalizzabili.</li>
<li><b>Aggiornamenti guidati</b>: l'app segnala le nuove versioni e scarica e verifica l'installer giusto, senza installarlo senza il tuo consenso.</li>
</ul>
<div class="note">L'app non è firmata digitalmente: al primo avvio Windows e macOS possono mostrare un avviso. Il capitolo 3 spiega come procedere.</div>
""", False),
("Requisiti", """
<table><tr><th>Sistema</th><th>Cosa serve</th></tr>
<tr><td>Windows</td><td>Installer <code>G-Downloader-Setup-{v}.exe</code> (64 bit). Nessun requisito aggiuntivo.</td></tr>
<tr><td>macOS</td><td>File <code>.dmg</code>: quello senza suffisso per i Mac Intel, quello con <code>-arm64</code> per i Mac Apple Silicon (M1 e successivi).</td></tr>
<tr><td>Linux</td><td>File <code>G-Downloader-{v}.AppImage</code> (64 bit), su una distribuzione con ambiente grafico.</td></tr></table>
<p>Le versioni minime dei sistemi operativi non sono state verificate in modo formale: usa sistemi operativi aggiornati.</p>
<p>Connessione a Internet (o accesso alla rete locale) per le sorgenti da scaricare. Le notifiche email richiedono un account SMTP; quelle Telegram un bot Telegram.</p>
""", False),
("Installazione", """
<p>I file di installazione si trovano nella pagina delle release: <code>github.com/djgragra/g-downloader/releases</code>. Insieme ai file c'è <code>SHA256SUMS.txt</code>, con le impronte per verificarne l'integrità.</p>
<h3>3.1 Windows</h3>
<ol><li>Scarica ed esegui <code>G-Downloader-Setup-{v}.exe</code>.</li>
<li>Se compare la schermata blu <i>«Windows ha protetto il PC»</i> (SmartScreen), clicca <b>Ulteriori informazioni</b> e poi <b>Esegui comunque</b>: succede perché l'app non è firmata.</li>
<li>Scegli la cartella di installazione (o lascia quella proposta) e conferma. Verranno creati il collegamento sul desktop e nel menu Start.</li>
<li>Al termine l'app si avvia da sola.</li></ol>
<p><b>Disinstallazione:</b> Impostazioni → App → G-Downloader → Disinstalla. I tuoi task e le impostazioni restano nella cartella dati (vedi capitolo 17) finché non li elimini a mano.</p>
<h3>3.2 macOS</h3>
<ol><li>Apri il file <code>.dmg</code> giusto per il tuo Mac e trascina <b>G-Downloader</b> nella cartella <b>Applicazioni</b>.</li>
<li>Avvia l'app da Applicazioni. Se macOS dice che l'app è <i>«danneggiata»</i> o che <i>«non può essere aperta»</i>, non è danneggiata: non è firmata. Hai due strade:
<ul><li>clic destro (o Ctrl+clic) sull'app → <b>Apri</b> → <b>Apri</b>;</li>
<li>oppure da Terminale:<pre><code>xattr -dr com.apple.quarantine /Applications/G-Downloader.app</code></pre></li></ul></li>
<li>L'icona compare nella barra dei menu in alto. Chiudendo la finestra l'app continua a lavorare.</li></ol>
<p><b>Disinstallazione:</b> trascina l'app dal Cestino; i dati restano in <code>~/Library/Application Support/g-downloader</code>.</p>
<h3>3.3 Linux</h3>
<ol><li>Rendi eseguibile il file e avvialo:<pre><code>chmod +x G-Downloader-{v}.AppImage
./G-Downloader-{v}.AppImage</code></pre></li>
<li>Se la tua distribuzione richiede FUSE per gli AppImage, installalo con il gestore pacchetti (es. <code>libfuse2</code>).</li>
<li>L'icona compare nella barra di sistema (se l'ambiente grafico la supporta).</li></ol>
<p><b>Disinstallazione:</b> elimina il file AppImage; i dati restano in <code>~/.config/g-downloader</code>.</p>
""", True),
("Primo avvio e panoramica", """
<p>All'avvio compare la finestra principale, divisa in tre zone:</p>
<ul>
<li><b>Barra laterale (sinistra):</b> logo, pulsanti <i>Dashboard</i> e <i>Palinsesto</i>, l'elenco dei <b>prossimi download in coda</b>, i pulsanti <i>+ Task</i> e <i>Importa</i>, l'elenco dei task raggruppati per categoria, e in basso <i>Impostazioni</i> e <i>Info e Guida</i>.</li>
<li><b>Barra superiore:</b> un grande <b>orologio</b>, il <b>prossimo download</b> con il conto alla rovescia (evidenziato) e, quando un download è in corso, la sua barra di avanzamento. Qui compare anche l'eventuale avviso di aggiornamento (capitolo 16).</li>
<li><b>Area centrale:</b> mostra la dashboard, il palinsesto, l'editor di un task, le impostazioni o le informazioni, a seconda della sezione scelta.</li>
<li><b>Console (in basso):</b> chiusa di default; si apre con la freccia e si ridimensiona trascinando il bordo. Mostra in tempo reale che cosa fa l'app.</li>
</ul>
<h3>L'app resta attiva in background</h3>
<p>Chiudendo la finestra l'app <b>non si ferma</b>: continua a eseguire le pianificazioni, con l'icona nella barra di sistema. Per uscire davvero usa il menu dell'icona → <b>Esci</b>. Le pianificazioni scattano solo finché l'app è in esecuzione (vedi anche l'opzione «Avvia all'accensione del computer» nel capitolo 14).</p>
<h3>Lingua</h3>
<p>Alla prima apertura scegli la lingua in <b>Impostazioni → Lingua</b>: cambia l'intera interfaccia, i messaggi, la guida e i nomi dei giorni e dei mesi.</p>
""", False),
("Creare il primo task", """
<p>Un <b>task</b> descrive che cosa scaricare, dove salvarlo, con quale nome e quando. Per crearne uno:</p>
<ol>
<li>Clicca <b>+ Task</b> nella barra laterale (oppure <i>+ Nuovo task</i> nel Palinsesto).</li>
<li>Dai un <b>nome</b> al task e, se vuoi, una <b>categoria</b>.</li>
<li>Nella scheda <b>Sorgente</b> scegli il tipo (Web o file locale/di rete) e inserisci l'URL o il percorso.</li>
<li>Nella scheda <b>Destinazione e nome file</b> scegli la cartella (con <i>Sfoglia…</i>) e come nominare il file.</li>
<li>Nella scheda <b>Pianificazioni</b> aggiungi almeno un orario.</li>
<li>Clicca <b>Salva</b>. Per provarlo subito usa <b>▶ Esegui ora</b>.</li>
</ol>
<div class="note"><b>Nota:</b> l'interruttore «Esegui subito dopo il salvataggio» è spento di default. Salvare un task <b>non</b> fa partire un download né scatena orari già passati: le pianificazioni valgono da quel momento in avanti.</div>
<p>Per disattivare temporaneamente un task senza cancellarlo usa l'interruttore accanto al nome, oppure il pulsante <i>Disattiva</i> nel Palinsesto.</p>
""", True),
("Sorgenti", """
<h3>6.1 Web (HTTP/HTTPS)</h3>
<p>Inserisci l'URL completo. Può contenere <b>segnaposto dinamici</b> (capitolo 7). Le opzioni:</p>
<table><tr><th>Opzione</th><th>Significato</th></tr>
<tr><td>Metodo HTTP</td><td><b>GET</b> (predefinito) chiede il file; <b>POST</b> invia anche un corpo (JSON o testo semplice, con segnaposto) a chi lo richiede.</td></tr>
<tr><td>Timeout</td><td>Tempo massimo di attesa in millisecondi (predefinito 30000).</td></tr>
<tr><td>Il server richiede autenticazione</td><td>Attiva utente e password per l'autenticazione HTTP. La password è salvata cifrata con il sistema di protezione del computer (Windows DPAPI, Portachiavi di macOS, libsecret su Linux).</td></tr></table>
<h3>6.2 FTP / FTPS</h3>
<p>Usa un URL del tipo <code>ftp://server/cartella/file.mp3</code> o <code>ftps://…</code>, con utente e password nella scheda di autenticazione. Nota: <code>ftp://server/dir/file</code> è relativo alla cartella di accesso; per un percorso assoluto usa la doppia barra <code>ftp://server//dir/file</code>. Se il file non viene trovato, il log indica la cartella in cui l'app sta cercando e quali file vede, per capire subito se il nome o la cartella sono sbagliati.</p>
<h3>6.3 File locale o di rete</h3>
<p>Scegli <i>File locale / rete</i> e indica il percorso (es. <code>D:\\Audio\\programma.mp3</code> oppure <code>\\\\server\\audio\\clip.mp3</code>). Il file viene copiato nella cartella di destinazione. Se non è ancora presente, i tentativi vengono ripetuti come per il web.</p>
<h3>6.4 Tentativi in caso di errore</h3>
<p>Per ogni task puoi impostare quanti <b>tentativi</b> fare (predefinito 3) e quanto <b>attendere</b> tra uno e l'altro (predefinito 15 secondi). I valori predefiniti per i nuovi task si cambiano nelle Impostazioni. Se anche l'ultimo tentativo fallisce, il task risulta in errore e, se attivo, parte l'avviso via email/Telegram.</p>
""", False),
("Segnaposto dinamici", """
<p>Nell'URL, nel percorso del file, nel nome del file e nelle azioni puoi usare segnaposto che vengono sostituiti a ogni esecuzione. Sotto i campi trovi dei pulsanti che li inseriscono dove si trova il cursore.</p>
<table><tr><th>Segnaposto</th><th>Risultato</th></tr>
<tr><td><code>{date:yyyyMMdd}</code></td><td>data odierna, es. <code>20260926</code></td></tr>
<tr><td><code>{date:yyyy-MM-dd}</code></td><td>data ISO, es. <code>2026-09-26</code></td></tr>
<tr><td><code>{time:HHmmss}</code></td><td>ora corrente, es. <code>084500</code></td></tr>
<tr><td><code>{date+1h:H}</code></td><td>data/ora <b>spostata</b>: qui l'ora successiva (es. 7 alle 6:57). Sono possibili anche <code>-1d</code>, <code>+30m</code>, ecc.</td></tr>
<tr><td><code>{seq:4}</code></td><td>contatore progressivo per task (<code>0001</code>, <code>0002</code>, …)</td></tr>
<tr><td><code>{rand:6}</code></td><td>stringa casuale di 6 caratteri</td></tr>
<tr><td><code>{env:NOME}</code></td><td>valore di una variabile d'ambiente</td></tr></table>
<p>Il formato tra i due punti usa le lettere standard: <code>yyyy</code> anno, <code>MM</code> mese, <code>dd</code> giorno, <code>HH</code> ore (00–23), <code>mm</code> minuti, <code>ss</code> secondi.</p>
<p><b>Esempio:</b> <code>https://esempio.com/audio/programma_{date:yyyyMMdd}_{date+1h:HH}.mp3</code> scarica ogni ora il file dell'ora successiva.</p>
<p>Per i task il cui URL dipende da data e ora compare il menu <b>«Esegui edizione…»</b>: elenca le ultime occorrenze pianificate e permette di scaricare a mano una edizione saltata, usando la sua data e ora nel nome del file.</p>
""", False),
("Pianificazioni", """
<p>Ogni task può avere <b>più pianificazioni indipendenti</b>, anche molto diverse tra loro. Nella scheda <i>Pianificazioni</i> clicca <b>+ Aggiungi pianificazione</b> e scegli il tipo.</p>
<h3>8.1 Giorni della settimana + orario</h3>
<p>Seleziona i giorni con le caselle (o con i pulsanti <i>Lun-Ven</i>, <i>Sab-Dom</i>, <i>Tutti i giorni</i>) e aggiungi uno o più orari. Per un solo giorno seleziona una sola casella. <i>+ Aggiungi orario</i> propone l'ora dopo l'ultima: comodo per un bollettino orario o per orari fissi ma irregolari (per esempio ogni ora dalle 6 alle 20 tranne le 13 e le 17).</p>
<h3>8.2 Espressione cron avanzata</h3>
<p>Per casi particolari puoi scrivere un'espressione cron a 5 campi (<code>minuto ora giorno mese giorno-settimana</code>). Il pulsante <b>? Aiuto</b> apre un prontuario con esempi.</p>
<table><tr><th>Espressione</th><th>Significato</th></tr>
<tr><td><code>0 9 * * *</code></td><td>ogni giorno alle 9:00</td></tr>
<tr><td><code>*/15 * * * *</code></td><td>ogni 15 minuti</td></tr>
<tr><td><code>30 8 * * 1-5</code></td><td>alle 8:30 dal lunedì al venerdì</td></tr>
<tr><td><code>0 9 * * 0,6</code></td><td>alle 9:00 nel fine settimana</td></tr></table>
<h3>8.3 Una tantum</h3>
<p>Una data e un'ora precise; il task scatta una sola volta.</p>
<h3>8.4 Ripeti ogni intervallo</h3>
<p>Ripete ogni N <b>secondi, minuti, ore o giorni</b>. Puoi indicare un momento di <b>inizio</b> (<i>A partire da</i>: il primo tentativo avviene a quell'ora e poi si ripete a ogni intervallo) e un limite (<i>Ripeti fino a</i>). Se il campo di inizio è vuoto, parte subito.</p>
<h3>8.5 Opzioni comuni a tutte le pianificazioni</h3>
<ul>
<li><b>Etichetta</b>: un nome per riconoscere la pianificazione nell'elenco e nel log.</li>
<li><b>URL solo per questa pianificazione</b>: se il file cambia a seconda dell'orario o del giorno, puoi indicare un URL diverso per una singola pianificazione. Se è vuoto vale quello del task.</li>
<li><b>👁 Anteprima</b>: mostra le prossime occorrenze calcolate.</li>
<li><b>+1h</b>: duplica la pianificazione spostandola avanti di un'ora.</li>
<li>L'interruttore <b>Attiva</b> sospende una singola pianificazione.</li>
</ul>
<div class="note">Le pianificazioni non recuperano gli orari passati: se l'app è spenta all'ora prevista, quel download non viene eseguito. Attiva <b>«Avvisa all'avvio se sono state saltate pianificazioni»</b> (Impostazioni → Affidabilità) per essere avvisato.</div>
""", True),
("Destinazione e nome del file", """
<h3>9.1 Cartella di destinazione</h3>
<p>Indica la cartella (con <i>Sfoglia…</i>). Se la lasci vuota viene usata la cartella predefinita delle Impostazioni.</p>
<h3>9.2 Nome del file</h3>
<table><tr><th>Modalità</th><th>Comportamento</th></tr>
<tr><td>Nome fisso</td><td>il file si chiama sempre nello stesso modo</td></tr>
<tr><td>Come nell'URL</td><td>usa il nome che compare in fondo all'URL</td></tr>
<tr><td>Modello con segnaposto</td><td>es. <code>programma_{date:yyyy-MM-dd}.mp3</code></td></tr>
<tr><td>Chiedi dove salvare</td><td>a fine download si apre la finestra «Salva con nome»</td></tr></table>
<h3>9.3 Se esiste già un file con lo stesso nome</h3>
<ul><li><b>Conserva il vecchio rinominandolo</b> (predefinito): il file preesistente diventa <code>nome.old-data-ora</code>; il nome «pulito» resta sempre riservato all'ultimo file scaricato.</li>
<li><b>Sovrascrivi</b>: nessuna copia, utile per cartelle di scambio.</li></ul>
<h3>9.4 Pulizia della cartella di destinazione</h3>
<p>Prima (o dopo) il download l'app può ripulire la cartella:</p>
<table><tr><th>Impostazione</th><th>Scelte</th></tr>
<tr><td>Azione</td><td>Non fare nulla · Elimina file · Sposta altrove i file</td></tr>
<tr><td>A quali file</td><td>tutto il contenuto · solo il file con lo stesso nome · solo i file che corrispondono a un modello (es. <code>report_*.mp3; *.tmp</code>) · solo i file più vecchi di N giorni/ore · tutti tranne gli ultimi N più recenti</td></tr>
<tr><td>Sottocartelle</td><td>includerle oppure toccare solo i file</td></tr>
<tr><td>Come eliminare</td><td>definitivamente · nel cestino del sistema (non funziona sulle cartelle di rete) · in una sottocartella <code>_cestino</code> che si svuota da sola dopo N giorni (funziona anche in rete)</td></tr>
<tr><td>Quando</td><td>prima di scaricare · oppure solo dopo un download riuscito</td></tr></table>
<div class="warn"><b>Attenzione:</b> con «Elimina file» e «Tutto il contenuto» vengono cancellati <b>tutti</b> i file della cartella, anche quelli non scaricati da questo task. Se la cartella è condivisa con altri task o programmi scegli «solo il file con lo stesso nome» o un modello. Con «Prima di scaricare», se il download poi fallisce i file eliminati non tornano: per cancellare solo a download riuscito scegli «Solo dopo un download riuscito». L'app rifiuta comunque di svuotare la radice di un disco.</div>
<h3>9.5 Sicurezza e manutenzione della cartella</h3>
<ul>
<li><b>A prova di errore</b> (con «Prima di scaricare»): i file da eliminare o spostare vengono prima <i>messi da parte</i> in una cartella nascosta. Se il download riesce, la pulizia viene completata; se fallisce, i file tornano al loro posto. Se l'app si interrompe nel mezzo, al lancio successivo li rimette a posto da sola.</li>
<li><b>Cestino a scadenza</b>: con «In una sottocartella <code>_cestino</code>» i file eliminati finiscono in <code>_cestino/data-ora</code> dentro la cartella di destinazione e vengono cancellati per sempre dopo il numero di giorni scelto. La cartella <code>_cestino</code> non viene mai toccata dalla pulizia.</li>
<li><b>Copie vecchie</b> (<code>nome.old-data.ext</code>): quando un file nuovo sostituisce uno con lo stesso nome il vecchio viene conservato. Con <i>tieni al massimo N</i> e/o <i>elimina quelle più vecchie di N giorni</i> non si accumulano all'infinito (0 = nessun limite).</li>
<li><b>Limite di spazio</b>: indica una dimensione in GB; se la cartella la supera, dopo ogni download vengono eliminati <b>definitivamente</b> i file più vecchi finché rientra nel limite. Il file appena scaricato non viene mai toccato.</li>
<li><b>👁 Anteprima pulizia</b>: elenca che cosa verrebbe spostato o eliminato adesso (pulizia, copie vecchie, limite di spazio, cestino scaduto), senza toccare nulla.</li>
<li><b>🧹 Pulisci ora</b>: esegue solo la pulizia, senza scaricare, dopo aver mostrato l'elenco e chiesto conferma. Si trova nello stesso riquadro e vale anche come «Solo pulizia» del task.</li>
</ul>
<h3>9.6 Verifica dell'integrità</h3>
<p>Nel campo <b>Checksum SHA-256 atteso</b> puoi inserire l'impronta che il file deve avere: se il file scaricato non coincide, il download risulta fallito.</p>
""", False),
("Azioni dopo il download", """
<p>Nella scheda <i>Azioni post-download</i> puoi aggiungere una o più azioni, eseguite <b>in ordine</b> e solo se il download è riuscito. Nei loro campi valgono i segnaposto <code>{filepath}</code> (percorso completo), <code>{filename}</code>, <code>{folder}</code>, <code>{taskName}</code> e le date/ore.</p>
<table><tr><th>Azione</th><th>Che cosa fa</th></tr>
<tr><td>Esegui programma/script</td><td>lancia un programma con argomenti (uno per riga), oppure una <b>riga di comando completa</b> (una per riga, incollata così com'è: funzionano Start, pipe, redirect e virgolette come da prompt dei comandi).</td></tr>
<tr><td>Sposta file</td><td>sposta il file scaricato in un'altra cartella (con segnaposto, es. <code>D:\\Archivio\\{date:yyyy}</code>).</td></tr>
<tr><td>Apri file/cartella</td><td>apre il file scaricato o la cartella di destinazione.</td></tr>
<tr><td>Notifica di sistema</td><td>mostra una notifica con titolo e messaggio a scelta.</td></tr></table>
<h3>Pause e ritardi nei comandi</h3>
<ul><li><b>Attesa iniziale</b>: secondi da attendere dopo il download, prima della prima riga (una volta sola).</li>
<li><b>Pausa tra una riga e la successiva</b>: secondi di attesa tra due comandi dello stesso campo (non tra azioni diverse: ognuna ha la sua attesa iniziale).</li>
<li>Una riga come <code>timeout /t 5</code>, <code>wait 5</code> o <code>sleep 5</code> viene interpretata come pausa di 5 secondi.</li>
<li>Le righe vuote e quelle che iniziano con <code>::</code> o <code>REM</code> sono ignorate.</li></ul>
<p>Con l'interruttore <b>«Se il comando fallisce, segna il task come errore»</b> decidi se un comando fallito interrompe la sequenza e conta come errore.</p>
<h3>Eseguire solo una parte del task</h3>
<p>Nell'editor, accanto a <b>▶ Esegui ora</b> (che scarica ed esegue le azioni), trovi:</p>
<ul><li><b>⬇ Solo download</b>: scarica il file ma non lancia le azioni.</li>
<li><b>⚙ Solo azioni</b>: esegue le azioni sul file già presente, senza scaricare. Serve, per esempio, quando il file ti è arrivato per email o è stato copiato a mano nella cartella e vuoi solo far partire il montaggio. L'app usa il file che il task avrebbe scaricato (stesso nome e cartella); se non c'è, prova con l'ultimo file scaricato; se nemmeno quello esiste, ti chiede di scegliere il file.</li>
<li><b>▶ Esegui</b> su ogni azione: lancia quella sola azione, anche se è disattivata.</li></ul>
<ul><li><b>📂 Azioni su un altro file…</b>: scegli tu un file qualsiasi e le azioni vengono eseguite su quello, anche se il task avrebbe un suo file.</li>
<li><b>👁 Anteprima</b> su ogni azione: mostra i comandi con tutti i segnaposto già sostituiti (file, cartella, date), senza eseguirli. Utile per controllare di non lanciare il montaggio sul file sbagliato.</li></ul>
<p>Accanto ai pulsanti, e nelle schede del Palinsesto, compare lo stato <b>«file presente»</b> (con il nome del file e da dove viene: file del task, ultimo scaricato o in attesa) oppure «nessun file: verrà chiesto».</p>
<h3>Dopo il download: azioni, nessuna azione o conferma</h3>
<p>In ogni <b>pianificazione</b> c'è l'opzione <b>Dopo il download</b>:</p>
<table><tr><th>Scelta</th><th>Effetto</th></tr>
<tr><td>Esegui le azioni successive</td><td>comportamento di sempre (predefinito)</td></tr>
<tr><td>Solo download</td><td>scarica e basta; le azioni le lanci tu quando vuoi</td></tr>
<tr><td>Aspetta la mia conferma e avvisami</td><td>scarica, poi invia una notifica (sistema, email e Telegram, se attivi) e segna il task come <b>«Azioni in attesa»</b>. Premi <b>▶ Esegui azioni ora</b> nell'editor del task (o <b>⚙ Solo azioni</b> nel Palinsesto) per farle partire.</td></tr></table>
<p>L'opzione vale solo per i download avviati dalla pianificazione: «Esegui ora» esegue sempre tutto.</p>
<p>«Solo azioni» è disponibile anche sulle schede del Palinsesto. Le esecuzioni parziali compaiono nella console e nella cronologia, ma non contano come download nelle statistiche.</p>
<div class="warn">Le azioni eseguono comandi sul tuo computer. Importa solo file di task di cui ti fidi: l'app avvisa quando un file importato contiene comandi da eseguire.</div>
""", True),
("Dashboard e palinsesto", """
<h3>11.1 Dashboard</h3>
<p>La dashboard riassume l'attività:</p>
<ul><li>schede con task totali e attivi, in coda nelle prossime 24 ore, completati e falliti oggi, tasso di successo (ultimi 30 giorni), dati scaricati e durata media;</li>
<li>grafico dell'attività degli ultimi 7, 14 o 30 giorni (completati e falliti) e dei download per ora del giorno;</li>
<li>elenco delle prossime 24 ore, attività recente e task con più errori;</li>
<li>i task per <b>categoria</b>.</li></ul>
<p>Quasi tutto è <b>cliccabile</b>: cliccando un task si apre il suo editor, cliccando una categoria si filtra l'elenco nella barra laterale. I pulsanti <b>🧹 Pulisci</b> azzerano la vista dell'attività recente o del conteggio errori (lo storico dei task resta).</p>
<h3>11.2 Palinsesto</h3>
<p>Mostra tutti i task come schede: prossimo orario con conto alla rovescia, pianificazioni, ultimo download, esito degli ultimi tentativi, sorgente e destinazione. Da ogni scheda puoi <b>▶ Esegui ora</b>, aprire l'ultimo file, attivare/disattivare o modificare il task. La vista <b>Tutti i passaggi</b> elenca cronologicamente tutte le esecuzioni previste nelle prossime 24 ore o nei prossimi 7 giorni.</p>
<h3>11.3 Cercare, filtrare e ordinare i task</h3>
<p>Sopra l'elenco dei task (barra laterale) e in cima al Palinsesto c'è una <b>casella di ricerca</b> con due menu:</p>
<ul><li><b>Cerca</b>: trova le parole che scrivi (anche più di una) nel nome, nella categoria, nell'indirizzo o percorso sorgente, nella cartella di destinazione e nelle etichette delle pianificazioni.</li>
<li><b>Ordinamento</b>: per categoria (raggruppato, come prima), A → Z, per prossimo orario di esecuzione, per stato (prima gli errori, poi le azioni in attesa).</li>
<li><b>Filtro</b>: tutti, attivi, disattivati, con errori, con azioni in attesa.</li></ul>
<p>Ricerca e filtro valgono sia per la barra laterale sia per il Palinsesto; l'ordinamento si sceglie separatamente per ciascuno (predefiniti: per categoria nella barra laterale, per orario nel Palinsesto). L'ultimo ordinamento e filtro scelti vengono <b>ricordati</b> alla riapertura; il testo cercato no. La ✕ riporta alla vista completa. La barra laterale mostra «(3/12)» quando una vista nasconde dei task. Il pulsante <b>🔍</b> accanto a «Task» nasconde o mostra la barra di ricerca per recuperare spazio nell'elenco (la scelta viene ricordata; se una vista è attiva mentre la barra è nascosta il pulsante si colora). Per pochi task (fino a 4) la barra degli strumenti resta nascosta.</p>
<h3>11.4 Categorie</h3>
<p>Ogni task può avere una categoria (testo libero). Ogni categoria riceve un <b>colore</b> assegnato automaticamente, usato nell'elenco, nel palinsesto e nelle etichette; puoi cambiarlo in <i>Impostazioni → Categorie e colori</i> e ripristinare quello automatico.</p>
""", False),
("Notifiche: email e Telegram", """
<p>Per i download che falliscono dopo tutti i tentativi (e per gli avvisi di «fonte ferma» o di pianificazioni saltate) l'app può inviare messaggi. Si configurano in <b>Impostazioni</b>; per ogni task l'invio si attiva o disattiva con «Avvisa via email/Telegram se il download fallisce…».</p>
<h3>12.1 Email</h3>
<p>Attiva «Abilita notifiche email» e compila server SMTP, porta, connessione sicura (SSL/TLS), utente, password, mittente e destinatari (separati da virgola). Il pulsante <b>Invia email di prova</b> verifica la configurazione.</p>
<h3>12.2 Telegram</h3>
<ol><li>Su Telegram apri <b>@BotFather</b>, scrivi <code>/newbot</code> e scegli un nome e un username che termini con «bot».</li>
<li>BotFather risponde con il <b>token</b> (tipo <code>123456789:AAF…</code>): copialo in «Bot Token». Il token è come una password: non pubblicarlo. Se finisce in mani sbagliate, <code>/revoke</code> in BotFather ne crea uno nuovo.</li>
<li>Per ogni destinatario serve il <b>Chat ID</b>. <b>Persona:</b> apre il bot e preme <i>Avvia</i> (<code>/start</code>), poi scrive a <b>@userinfobot</b>, che risponde con il suo Id (un numero). <b>Gruppo o canale:</b> aggiungi il bot (per un canale, come amministratore), scrivi un messaggio; il Chat ID inizia con <code>-</code> (es. <code>-1001234567890</code>) e va inserito con il segno meno.</li>
<li>In «Destinatari» aggiungi una riga per ciascuno, con una nota per ricordare chi è. <b>Invia messaggio di prova</b> controlla che arrivi a tutti.</li></ol>
<p>Se il bot è già usato da altri programmi (per esempio Home Assistant) puoi usarlo lo stesso: G-Downloader si limita a inviare messaggi e non disturba gli altri.</p>
<h3>12.3 Report riepilogativo</h3>
<p>In <i>Impostazioni → Report e log</i> puoi ricevere via email un riepilogo <b>giornaliero</b> (ultime 24 ore) o <b>settimanale</b> (il lunedì), all'ora scelta, con i download completati/falliti e il dettaglio degli errori. Usa la configurazione email.</p>
""", False),
("Affidabilità e controlli", """
<p>In <i>Impostazioni → Affidabilità</i> e <i>Prestazioni e controlli</i>:</p>
<ul>
<li><b>File troppo piccolo:</b> tratta come errore (e ripete) un file scaricato più piccolo della dimensione minima indicata in KB, utile contro pagine di errore scaricate al posto del file.</li>
<li><b>File identico all'ultimo:</b> avvisa se il file scaricato è uguale al precedente (contenuto forse non aggiornato alla fonte).</li>
<li><b>Avviso «fonte ferma»:</b> dopo N download identici di fila invia un avviso via email/Telegram (0 = disattivato).</li>
<li><b>Pianificazioni saltate:</b> all'avvio segnala gli orari mancati perché l'app era spenta.</li>
<li><b>Download contemporanei:</b> limite massimo (0 = nessun limite, 1 = uno alla volta); i download in eccesso attendono.</li>
</ul>
""", False),
("Impostazioni", """
<table><tr><th>Sezione</th><th>Contenuto</th></tr>
<tr><td>Generali</td><td>tema chiaro/scuro · lingua · icona nella barra dei menu (bianca o blu) · formato di data e ora · avvio all'accensione del computer · avvio ridotto a icona · notifiche di successo e di errore · apertura della cartella cliccando la notifica · cartella di destinazione predefinita · tentativi e attesa predefiniti</td></tr>
<tr><td>Affidabilità / Prestazioni</td><td>vedi capitolo 13</td></tr>
<tr><td>Aggiornamenti</td><td>vedi capitolo 16 (compreso l'avviso via email/Telegram)</td></tr>
<tr><td>Report e log</td><td>report email · apertura della cartella dei log</td></tr>
<tr><td>Categorie e colori</td><td>colori delle categorie</td></tr>
<tr><td>Email / Telegram</td><td>vedi capitolo 12</td></tr>
<tr><td>Backup</td><td>vedi capitolo 15</td></tr></table>
<h3>Formato di data e ora</h3>
<p>Il formato numerico (ordine giorno/mese, 24 ore o AM/PM) si sceglie a parte dalla lingua: Automatico, oppure 24 ore GG/MM/AAAA, AM/PM MM/GG/AAAA, 24 ore ISO AAAA-MM-GG, ecc. I <b>nomi</b> dei giorni e dei mesi seguono invece la lingua dell'interfaccia. I campi orario dell'editor delle pianificazioni cambiano formato dopo il riavvio dell'app.</p>
""", True),
("Backup, trasferimento e aggiornamento", """
<h3>15.1 Esportare e importare</h3>
<ul><li><b>Backup / Trasferimento:</b> <i>Impostazioni → Esporta configurazione</i> salva task e impostazioni in un file; <i>Importa configurazione</i> li riporta identici su un altro computer.</li>
<li><b>Singolo task:</b> <i>⤓ Esporta task</i> (nell'editor) e <i>⤒ Importa</i> (barra laterale) condividono o duplicano un solo task.</li></ul>
<div class="warn">Il file di configurazione contiene anche le password SMTP e i token Telegram salvati: conservalo in un posto sicuro.</div>
<h3>15.2 Aggiornare da una versione precedente</h3>
<ol><li>Esporta la configurazione dalla versione attuale (per sicurezza).</li>
<li><b>Chiudi la versione attuale con «Esci»</b> dal menu dell'icona nella barra di sistema; se resta attiva, con la nuova aperta i download partirebbero due volte.</li>
<li>Installa la nuova versione come descritto nel capitolo 3, oppure usa il flusso guidato del capitolo 16.</li>
<li>Avviala e verifica che task e impostazioni siano presenti. Se mancano, usa <i>Importa configurazione</i> con il file salvato al punto 1.</li>
<li>Quando hai visto girare correttamente un download, disinstalla la vecchia versione.</li></ol>
<div class="note">Il cambio di identificativo dell'app (<code>com.onairgarage.gdownloader</code>) può far sì che su Windows l'installer non sostituisca la vecchia installazione ma si affianchi a essa: in quel caso disinstalla la vecchia dopo aver verificato la nuova.</div>
""", False),
("Aggiornamenti", """
<p>G-Downloader controlla periodicamente su GitHub se esiste una versione più recente (15 secondi dopo l'avvio, poi ogni 24 ore) e mostra un avviso nella barra in alto; lo stesso avviso è raggiungibile in <i>Impostazioni → Aggiornamenti</i>, dove è disponibile anche il pulsante <b>Controlla aggiornamenti</b> per un controllo manuale.</p>
<h3>16.1 Scaricare e verificare</h3>
<p>Cliccando <b>Scarica e installa</b> l'app individua da sola l'installer giusto per il tuo sistema e il tuo processore (Intel o Apple Silicon su Mac) e lo scarica nella cartella <b>Download</b>, mostrando percentuale e megabyte scaricati. Al termine confronta il file con lo <b>SHA-256</b> pubblicato nella release (<code>SHA256SUMS.txt</code>): se non corrisponde, il file viene <b>eliminato</b> e compare un messaggio d'errore chiaro, con il pulsante <i>Apri pagina di download</i> come ripiego.</p>
<p>Lo stato del download (disponibile, in corso, pronto, errore) è <b>lo stesso</b> sia nella barra sia in Impostazioni: puoi avviarlo da un punto e seguirlo dall'altro. Mentre un download è in corso il pulsante <i>Controlla aggiornamenti</i> resta disattivato.</p>
<h3>16.2 Avviso anche via email e Telegram</h3>
<p>Per le macchine lasciate da sole in sala server, quando un controllo automatico trova una versione nuova l'app manda <b>un solo messaggio per versione</b> sui canali già configurati per gli errori (email e/o Telegram), con il numero della versione e il link alla release. Funziona solo se almeno uno dei due canali è attivo; si disattiva in <i>Impostazioni → Aggiornamenti</i> («Avvisami anche via email/Telegram…»). Il controllo manuale non invia messaggi.</p>
<h3>16.3 Completare l'installazione</h3>
<p>A verifica riuscita compare un pulsante verde, diverso per sistema:</p>
<table><tr><th>Sistema</th><th>Pulsante</th><th>Che cosa succede</th></tr>
<tr><td>Windows</td><td>Chiudi e installa</td><td>l'app chiude sé stessa (i download pianificati si fermano) e avvia l'installer; al termine si riapre da sola.</td></tr>
<tr><td>macOS</td><td>Apri installer</td><td>apre il file <code>.dmg</code> scaricato. Chiudi G-Downloader con «Esci» dall'icona nella barra dei menu e trascina la nuova versione in Applicazioni, come al primo avvio.</td></tr>
<tr><td>Linux</td><td>Apri installer</td><td>mostra il file <code>.AppImage</code> scaricato nella sua cartella. Chiudi G-Downloader con «Esci» e avvia il nuovo file.</td></tr></table>
<div class="note">L'installazione non parte mai da sola: il pulsante verde va sempre premuto di proposito. Su macOS e Linux l'app non può sostituirsi da sola: serve comunque il passaggio manuale descritto sopra, come per una prima installazione.</div>
""", False),
("Log e cronologia", """
<ul><li><b>Console:</b> in tempo reale, in fondo alla finestra (si svuota al riavvio).</li>
<li><b>Cronologia dei task:</b> gli ultimi 50 tentativi di ciascun task, visibili nelle schede e nella dashboard.</li>
<li><b>Statistiche giornaliere:</b> contatori permanenti (circa 13 mesi) per i grafici.</li>
<li><b>Log su file:</b> un file al giorno, conservato 30 giorni, nella cartella <code>logs</code> dei dati dell'app (pulsante <i>Apri cartella log</i> nelle Impostazioni). Ogni riga riporta data, livello, task e messaggio.</li></ul>
""", False),
("Dove sono i dati", """
<table><tr><th>Sistema</th><th>Cartella</th></tr>
<tr><td>Windows</td><td><code>%APPDATA%\\g-downloader</code></td></tr>
<tr><td>macOS</td><td><code>~/Library/Application Support/g-downloader</code></td></tr>
<tr><td>Linux</td><td><code>~/.config/g-downloader</code></td></tr></table>
<p>Vi si trovano il file dei task e delle impostazioni e la cartella <code>logs</code>. Le password e i token sono salvati cifrati con il sistema di protezione del computer e utente: non si leggono se copi i dati su un altro PC (in quel caso vanno reinseriti).</p>
""", False),
("Risoluzione dei problemi", """
<table><tr><th>Problema</th><th>Cosa fare</th></tr>
<tr><td>macOS: «l'app è danneggiata / non può essere aperta»</td><td>L'app non è firmata: clic destro → Apri, oppure <code>xattr -dr com.apple.quarantine /Applications/G-Downloader.app</code>.</td></tr>
<tr><td>Windows: schermata «Windows ha protetto il PC»</td><td>Ulteriori informazioni → Esegui comunque.</td></tr>
<tr><td>Linux: l'AppImage non parte</td><td>Rendilo eseguibile (<code>chmod +x</code>) e installa FUSE (<code>libfuse2</code>) se richiesto.</td></tr>
<tr><td>Il download non parte all'ora prevista</td><td>Controlla che l'app sia in esecuzione (icona nella barra di sistema), che il task e la pianificazione siano attivi e guarda <i>Anteprima</i> e la console. Attiva l'avviso sulle pianificazioni saltate.</td></tr>
<tr><td>Errore 401/403 dal server</td><td>Controlla utente e password nella scheda Sorgente.</td></tr>
<tr><td>FTP: «550 file non trovato»</td><td>Leggi il messaggio: indica la cartella di accesso e i file presenti; correggi il percorso o attendi che il file sia pubblicato. Ricorda la doppia barra per i percorsi assoluti.</td></tr>
<tr><td>Il file scaricato è una pagina di errore</td><td>Attiva «Verifica che il file non sia troppo piccolo» e imposta la dimensione minima.</td></tr>
<tr><td>Le password sono sparite dopo il trasferimento</td><td>Sono legate all'utente e al computer: reinseriscile.</td></tr>
<tr><td>Non arrivano email/Telegram</td><td>Usa i pulsanti di prova nelle Impostazioni e controlla il messaggio d'errore.</td></tr>
<tr><td>Download doppi</td><td>Probabilmente sono aperte due copie dell'app (vecchia e nuova): chiudi quella che non serve con «Esci».</td></tr>
<tr><td>«Aggiornamento non riuscito: checksum non corrisponde»</td><td>Il file scaricato è stato eliminato in automatico. Riprova (magari con un'altra connessione), oppure scarica l'installer a mano dalla pagina delle release.</td></tr></table>
<h3>Contatti e informazioni</h3>
<p>Graziano Melzi · OnAir Garage — <code>https://onairgarage.com</code> — <code>hello@onairgarage.com</code><br>Codice sorgente e release: <code>https://github.com/djgragra/g-downloader</code><br>Licenza: MIT © 2026 Graziano Melzi.</p>
""", False),
])
