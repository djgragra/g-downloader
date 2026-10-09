# Changelog

Versions use `YY.M.N`. Newest first.

## 26.10.1 — 2026-10-09
(The version number jumps from 26.9.16: 26.9.16 was published on 2026-10-07 with the wrong month.)
- **Folder cleanup, safer and tidier.** *Fail-safe*: files are set aside and put back if the download fails (also after a crash). A `_cestino` bin that empties itself after N days, also on network folders. A cap on the `.old-…` copies (keep N / delete after N days). A folder **size limit** that deletes the oldest files. A **Cleanup preview** and a **Clean now** button (cleanup without downloading).
- **Search, filter and sort the tasks** in the sidebar and in the Schedule: search words, sort by category / A → Z / next run time / status, filter active / disabled / with errors / actions waiting. The last sort and filter are remembered.
- **New-version notice by email/Telegram**, once per version, for machines nobody looks at (option in Settings → Updates).
- Cleanup-only runs show in the console and history but do not count as downloads in the statistics.

## 26.9.16 — 2026-10-07
- **Run a task in parts.** *Download only*, *Actions only* (on the file already in the folder, or on any file you pick with *Actions on another file…*) and a **▶ Run** button on each single action, even if it is switched off.
- **Preview of an action**: the commands with every placeholder already filled in, without running them.
- **"File present" status** next to the buttons and on the Schedule cards (which file the actions would use and where it comes from).
- **After the download** (per schedule): run the actions (default), download only, or **wait for my confirmation** — a notice goes out by system notification, email and Telegram, the task shows "Actions waiting" and **▶ Run actions now**.
- Actions-only runs show in the console and history but do not count as downloads in the statistics.

## 26.9.15 — 2026-09-27
- "You are up to date" in Settings is now green with a check mark; a failed check is red.
- Closing the window now shows a notice that the app keeps running in the system tray.

## 26.9.14 — 2026-09-27
- **Guided updates**: *Download and install* picks the right installer for your system and processor, downloads it with progress, verifies its SHA-256 against `SHA256SUMS.txt` (a mismatch deletes the file) and only then offers *Close and install* (Windows) or *Open installer* (macOS, Linux). Same state in the top bar and in Settings.
- Release workflow refuses a tag that does not match `package.json` or is not newer than the latest release.
- Manual rewritten (Italian and English) and its sources added to the repository.

## 26.9.13 — 2026-09-27
- The saved updates repository is reset when it is empty, invalid or the retired one.

## 26.9.12 — 2026-09-26
- First public release: scheduled downloads from web, FTP and local sources, dynamic file names, flexible schedules, post-download actions, retries, email/Telegram alerts, dashboard, categories, IT/EN/ES interface, light and dark themes.
