# G-Downloader

Free desktop app (Windows / macOS / Linux) for **scheduled downloads**, always running in the system tray. Built for radio and broadcast workflows (e.g. fetching daily programme files from web, FTP or network sources), but useful for any recurring download.

By Graziano Melzi · [OnAir Garage](https://onairgarage.com) — contact: hello@onairgarage.com

## Features

- **Dynamic URLs and filenames**: `{date:yyyyMMdd}`, `{time:HHmmss}`, `{seq:4}`, `{rand:6}`, `{env:NAME}`, with date offsets.
- **Sources**: HTTP(S) (with basic auth and POST body), FTP/FTPS, local or network files.
- **Flexible schedules**: several independent schedules per task (weekdays + times, one-off, every N minutes/hours, cron expression), with optional start/end.
- **Post-download actions**: run a program, move the file, open it, system notification; placeholders `{filepath}` `{filename}` `{folder}` `{taskName}`. Download and actions can also be run **separately and by hand** (*Download only*, *Actions only*, *Actions on another file…*, or a single action, with a *Preview* of the resolved commands), e.g. when a file arrived by email. Each schedule can also stop after the download, or wait for your confirmation (with an email/Telegram notice) before running the actions.
- **Folder housekeeping**: fail-safe cleanup (files set aside and restored if the download fails), `_cestino` bin with expiry, cap on `.old-…` copies, folder size limit, a preview and a *Clean now* button.
- **Search, filter and sort** the task lists (remembered between sessions). On unattended machines, a **new-version notice by email/Telegram** (once per version).
- **Waiting for a late file**: a task keeps trying every N minutes for at most M minutes (for example 19:55 → 20:15); an empty file, one that is too small or a web page instead of the file counts as "not arrived yet"; a wrong password stops the wait at once.
- **Calendar exceptions** per task (or several tasks, or a whole category at once): *skip* a day or a range of days, or *treat as another weekday* (an agency applies its Sunday timetable on a Wednesday holiday).
- **Pre-download folder action** and duplicate protection (existing files are renamed, never overwritten).
- **Retries** (global and per task) with email / Telegram alerts on failure: one email to all recipients in Bcc, an encrypted connection when a user name is set, three tries per channel, token and password masked in logs, every alert starting with `[G-Downloader · installation name]`.
- **Dashboard**, categories (rename, merge, delete), download history, daily statistics, light/dark theme.
- **Backup** of tasks, settings, categories and colours: passwords and tokens stay out of the file unless you tick *Include passwords and tokens*; after an import the app lists what must be typed again.
- **UI languages**: Italiano, English, Español.
- **Guided updates**: when a new release is out, the app shows its release notes, downloads the right installer for your system (progress bar, *Cancel*), verifies it against `SHA256SUMS.txt` and starts it only when you ask; *Remind me later*, *Skip this version*, a safety copy of the data before installing and a *What's new* window after the update.
- **Help & About** with *Copy support info* (never settings, addresses, passwords or file names), a logs folder (one file per day, 5 MB at most, 7 days) and a name for each installation, shown in every alert.

## Install

Download the installer for your system from the [Releases](https://github.com/djgragra/g-downloader/releases) page and verify it against `SHA256SUMS.txt`.

The app is free and **not code-signed**, so the first launch may show a warning:

- **macOS**: if you see "app is damaged" or "cannot be opened", right-click the app → *Open*, or run:
  ```bash
  xattr -dr com.apple.quarantine /Applications/G-Downloader.app
  ```
- **Windows**: if SmartScreen appears, click *More info* → *Run anyway*.
- **Linux**: `chmod +x G-Downloader-*.AppImage`, then run it.

### Updating

When a newer version is published, G-Downloader shows a notice (also in *Settings → Updates*). **Download and install** fetches the installer for your system and processor into the Downloads folder and checks its SHA-256; a file that does not match is deleted. Then:

- **Windows**: *Close and install* closes the app (scheduled downloads stop meanwhile), runs the installer and reopens the app.
- **macOS**: *Open installer* opens the `.dmg`; quit G-Downloader from the menu-bar icon and drag the new version into Applications.
- **Linux**: *Open installer* shows the new AppImage in its folder; quit the app and start the new file.

Nothing is installed automatically. If the download fails, *Open download page* leads to the release page.

Data (tasks, settings, history) is stored in the OS user-data folder (`%APPDATA%\g-downloader` on Windows, `~/Library/Application Support/g-downloader` on macOS, `~/.config/g-downloader` on Linux). The app keeps running in the tray when the window is closed; quit from the tray menu.

## Development

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm start
```

Tests (no Electron needed: the unit tests run on plain Node, the integration tests on a stand-in for Electron):

```bash
npm test
```

Build installers (output in `release/`):

```bash
npm run dist:win     # NSIS installer
npm run dist:mac     # dmg
npm run dist:linux   # AppImage
```

Releases are built by GitHub Actions when a `v*` tag is pushed, or when the workflow is started by hand with a version; the tests run first.

## Italiano

App gratuita per download pianificati, sempre attiva nella tray. Scarica l'installer dalla pagina [Releases](https://github.com/djgragra/g-downloader/releases). L'app non è firmata: su macOS usa clic destro → Apri (o il comando `xattr` sopra); su Windows SmartScreen → "Ulteriori informazioni" → "Esegui comunque". Novità della 26.10.3: gli avvisi email non arrivano più alla casella del mittente (solo ai destinatari indicati) e in Aiuto e informazioni c'è il riquadro per lasciare una mancia. Novità della 26.10.2: **attesa del file** pubblicato in ritardo (riprova ogni N minuti per M minuti), **eccezioni di calendario** per task (salta un giorno, o "tratta come" un altro giorno della settimana, per più task o una categoria intera), avvisi email in Bcc con tre tentativi, **backup** senza password (a meno che tu lo chieda), rinomina/elimina categorie, aggiornamento guidato completo e pagina Aiuto e informazioni. Quando esce una nuova versione, l'app la segnala: "Scarica e installa" scarica l'installer giusto, ne verifica lo SHA-256 e lo avvia solo quando lo chiedi tu.

## License

[MIT](LICENSE) © 2026 Graziano Melzi
