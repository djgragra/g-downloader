# G-Downloader

Free desktop app (Windows / macOS / Linux) for **scheduled downloads**, always running in the system tray. Built for radio and broadcast workflows (e.g. fetching daily programme files from web, FTP or network sources), but useful for any recurring download.

By Graziano Melzi · [OnAir Garage](https://onairgarage.com) — contact: hello@onairgarage.com

## Features

- **Dynamic URLs and filenames**: `{date:yyyyMMdd}`, `{time:HHmmss}`, `{seq:4}`, `{rand:6}`, `{env:NAME}`, with date offsets.
- **Sources**: HTTP(S) (with basic auth and POST body), FTP/FTPS, local or network files.
- **Flexible schedules**: several independent schedules per task (weekdays + times, one-off, every N minutes/hours, cron expression), with optional start/end.
- **Post-download actions**: run a program, move the file, open it, system notification; placeholders `{filepath}` `{filename}` `{folder}` `{taskName}`.
- **Pre-download folder action** and duplicate protection (existing files are renamed, never overwritten).
- **Retries** (global and per task) with email / Telegram alerts on failure.
- **Dashboard**, categories, download history, daily statistics, light/dark theme.
- **UI languages**: Italiano, English, Español. Update notice via GitHub Releases.

## Install

Download the installer for your system from the [Releases](https://github.com/djgragra/g-downloader/releases) page and verify it against `SHA256SUMS.txt`.

The app is free and **not code-signed**, so the first launch may show a warning:

- **macOS**: if you see "app is damaged" or "cannot be opened", right-click the app → *Open*, or run:
  ```bash
  xattr -dr com.apple.quarantine /Applications/G-Downloader.app
  ```
- **Windows**: if SmartScreen appears, click *More info* → *Run anyway*.
- **Linux**: `chmod +x G-Downloader-*.AppImage`, then run it.

Data (tasks, settings, history) is stored in the OS user-data folder (`%APPDATA%\g-downloader` on Windows, `~/Library/Application Support/g-downloader` on macOS, `~/.config/g-downloader` on Linux). The app keeps running in the tray when the window is closed; quit from the tray menu.

## Development

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm start
```

Build installers (output in `release/`):

```bash
npm run dist:win     # NSIS installer
npm run dist:mac     # dmg
npm run dist:linux   # AppImage
```

Releases are built by GitHub Actions when a `v*` tag is pushed.

## Italiano

App gratuita per download pianificati, sempre attiva nella tray. Scarica l'installer dalla pagina [Releases](https://github.com/djgragra/g-downloader/releases). L'app non è firmata: su macOS usa clic destro → Apri (o il comando `xattr` sopra); su Windows SmartScreen → "Ulteriori informazioni" → "Esegui comunque".

## License

[MIT](LICENSE) © 2026 Graziano Melzi
