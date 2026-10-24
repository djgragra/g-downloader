# Changelog

Versions use `YY.M.N`. Newest first.

## 26.10.4 — 2026-10-24
- **The macOS app now opens on Apple Silicon Macs.** The app used to leave the build with a signature that the build's own changes had invalidated, and an Apple Silicon Mac said "G-Downloader is damaged". It is now signed ad hoc (no Apple account involved) and every release checks the signature of both disk images before publishing. The first launch still shows "unidentified developer": open *System Settings → Privacy & Security* and click *Open Anyway* (right-click → Open no longer exists on macOS 15 and later). If you already installed an earlier version that says "damaged", run `xattr -cr /Applications/G-Downloader.app && codesign --force --deep -s - /Applications/G-Downloader.app` once. Thanks to Rob, who reported the problem on a Mac with Apple Silicon.
- The updates repository check now rejects names made of dots (`../x`) in the update module as well, not only in the settings.

## 26.10.3 — 2026-10-17
- **Email alerts no longer reach the sender's own mailbox.** The message went to the sender address in `To` with the real recipients in Bcc, so the mailbox used to send alerts received a copy of each one. Now `To` is `undisclosed-recipients:;` and only the recipients you listed receive the message.
- **Tip card** in Help & About: the tip jar from the website, one line and a button that opens the website's support page in the app's language. No pop-ups, no reminders.
- Dependencies updated: Electron 44.9.0, electron-store 12 (a settings file written by the previous version reads back unchanged), nodemailer 10.1.2, basic-ftp 6.2.3, cron-parser 5.10.2.

## 26.10.2 — 2026-10-14
- **Wait for a file that is published late.** Each task can now keep trying every N minutes for at most M minutes (for example from 19:55 to 20:15) instead of failing at the first error. Every attempt checks the file: too small, empty, or a web page instead of the file counts as "not arrived yet"; a local file is awaited until its size stops changing. A wrong password (401) stops the wait at once.
- **Calendar exceptions.** Per task, days or ranges of days on which the schedules do not run as usual: **Skip** (production stopped, a holiday) or **Treat as another weekday** (an agency applies its Sunday timetable on a Wednesday holiday: the "Mon–Fri" schedules stay quiet and the weekend ones run). One exception can be added to several tasks at once, picked one by one or by category. Skipped days show as "skipped (exception)" in the history, with no alert and no failure in the statistics or the report; manual runs are not affected.
- **Guided update, completed.** *Remind me later* (24 hours) and *Skip this version*; the first lines of the release notes in the banner; a *Cancel* button while downloading; the last check and *Check now* in Settings → Updates; a safety copy of the data file before installing (the last 3 in `backups/`); a **What's new** window and an *Updated to X* notice at the first start after an update; "Close and install" is refused, with the reason, while downloads are running. A download that is interrupted, cancelled or stalled no longer leaves a `.part` file behind (updater module version 2).
- **Alerts, same as the other OnAir Garage apps.** One email to all recipients in Bcc, a single recipients field, an encrypted connection required when a user name is set, timeouts of 15/15/20 seconds, three tries per channel (right away, after 10 s, after 60 s), the Telegram token and the SMTP password masked in every error and log, every alert starting with `[G-Downloader · installation name]`. The new-version notice goes out once per version and per channel (desktop, Telegram, email) and is remembered in its own file, `alert-state.json`.
- **Backup that opens on another PC.** Settings → Backup: *Include passwords and tokens* (off by default, with a red warning); without it the file holds no secret and, after the import, the app lists what must be typed again. Replace everything or add only the missing tasks (switched off); a password the file does not carry stays the one of this PC, only for the same server and user; the file is checked (`app`), and you are asked before importing programs. Run history and logs are never in the backup. The backup file of one task carries no passwords either.
- **Categories**: *Rename* (merges when the name exists, keeps the colour) and *Delete* (asks where the tasks go) in Settings → Categories.
- **Signature**: Settings tabs in the common order (General, Reliability, Alerts, Categories, Updates, Backup, Help & About); **Help & About** with version, licence, links, privacy, *Copy support info* and *Open logs folder*; *Name of this installation* shown in alerts; the show-password button also on the Telegram token; an option to keep the computer awake; the tray notice appears only once; logs of 5 MB at most per file, the last 7 days, with credentials written inside addresses hidden.
- Passwords written inside an address (`ftp://user:password@host/…`) and the values of headers that carry a key or a token are now encrypted at rest like the other secrets.
- The updates repository setting now also rejects names with `..` parts.
- A `CLAUDE.md` pointer and the tests (`npm test`, also run by the release workflow before building).

## 26.10.1 — 2026-10-09
(The version number jumps from 26.9.16: 26.9.16 was published on 2026-10-07 with the wrong month.)
- **Folder cleanup, safer and tidier.** *Fail-safe*: files are set aside and put back if the download fails (also after a crash). A `_cestino` bin that empties itself after N days, also on network folders. A cap on the `.old-…` copies (keep N / delete after N days). A folder **size limit** that deletes the oldest files. A **Cleanup preview** and a **Clean now** button (cleanup without downloading).
- **Search, filter and sort the tasks** in the sidebar and in the Schedule: search words, sort by category / A → Z / next run time / status, filter active / disabled / with errors / actions waiting. The last sort and filter are remembered, and the search bar can be folded away with the 🔍 button to leave more room for the list.
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
