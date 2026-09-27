EN = dict(manual="User manual", version="Version", license="MIT License © 2026 Graziano Melzi", toc="Contents", sections=[
("Introduction", """
<p>G-Downloader is a free application for Windows, macOS and Linux that runs <b>scheduled downloads</b> and stays active in the background (system tray icon). It was designed for broadcast use — for example to fetch audio files, schedules or news bulletins every day from web servers, FTP or network folders — but it works for any other use case where a file has to be downloaded at precise times.</p>
<h3>What it can do</h3>
<ul>
<li><b>Web</b> sources (HTTP/HTTPS, with username and password, GET or POST requests), <b>FTP/FTPS</b> and <b>local or network files</b>.</li>
<li><b>Dynamic</b> URLs and file names: date, time, counter, random values, offsets (e.g. "the next hour").</li>
<li>Several <b>schedules</b> per task: weekdays and times, one-off, every N seconds/minutes/hours/days, or a cron expression.</li>
<li><b>Actions</b> before and after the download: folder cleanup, renaming of existing files, running programs or scripts, moving, opening, notifications.</li>
<li><b>Automatic retries</b> on error and alerts by <b>email</b> and <b>Telegram</b>; periodic summary report.</li>
<li><b>Dashboard</b> with statistics and charts, colour-coded categories, history, log files.</li>
<li>Interface in <b>Italian, English and Spanish</b>, light and dark theme, customisable date and time formats.</li>
<li><b>Guided updates</b>: the app flags new versions and downloads and verifies the right installer, without installing anything without your say-so.</li>
</ul>
<div class="note">The app is not code-signed: on first launch Windows and macOS may show a warning. Chapter 3 explains what to do.</div>
""", False),
("Requirements", """
<table><tr><th>System</th><th>What you need</th></tr>
<tr><td>Windows</td><td>Installer <code>G-Downloader-Setup-{v}.exe</code> (64-bit). No extra requirements.</td></tr>
<tr><td>macOS</td><td>A <code>.dmg</code> file: the one without suffix for Intel Macs, the one ending in <code>-arm64</code> for Apple Silicon Macs (M1 and later).</td></tr>
<tr><td>Linux</td><td><code>G-Downloader-{v}.AppImage</code> (64-bit), on a distribution with a graphical desktop.</td></tr></table>
<p>Minimum operating-system versions have not been formally verified: use up-to-date systems.</p>
<p>An Internet connection (or access to the local network) for the sources. Email notifications need an SMTP account; Telegram notifications need a Telegram bot.</p>
""", False),
("Installation", """
<p>The installers are on the releases page: <code>github.com/djgragra/g-downloader/releases</code>. Next to them there is <code>SHA256SUMS.txt</code> with the checksums to verify their integrity.</p>
<h3>3.1 Windows</h3>
<ol><li>Download and run <code>G-Downloader-Setup-{v}.exe</code>.</li>
<li>If the blue <i>"Windows protected your PC"</i> screen (SmartScreen) appears, click <b>More info</b> and then <b>Run anyway</b>: this happens because the app is not signed.</li>
<li>Choose the installation folder (or keep the default) and confirm. Desktop and Start-menu shortcuts are created.</li>
<li>When it finishes, the app starts automatically.</li></ol>
<p><b>Uninstalling:</b> Settings → Apps → G-Downloader → Uninstall. Your tasks and settings stay in the data folder (chapter 17) until you delete them by hand.</p>
<h3>3.2 macOS</h3>
<ol><li>Open the right <code>.dmg</code> for your Mac and drag <b>G-Downloader</b> into the <b>Applications</b> folder.</li>
<li>Start the app from Applications. If macOS says the app is <i>"damaged"</i> or <i>"cannot be opened"</i>, it is not damaged: it is not signed. You have two options:
<ul><li>right-click (or Ctrl+click) the app → <b>Open</b> → <b>Open</b>;</li>
<li>or from Terminal:<pre><code>xattr -dr com.apple.quarantine /Applications/G-Downloader.app</code></pre></li></ul></li>
<li>The icon appears in the menu bar at the top. Closing the window does not stop the app.</li></ol>
<p><b>Uninstalling:</b> drag the app to the Trash; data stays in <code>~/Library/Application Support/g-downloader</code>.</p>
<h3>3.3 Linux</h3>
<ol><li>Make the file executable and run it:<pre><code>chmod +x G-Downloader-{v}.AppImage
./G-Downloader-{v}.AppImage</code></pre></li>
<li>If your distribution needs FUSE for AppImages, install it with the package manager (e.g. <code>libfuse2</code>).</li>
<li>The icon appears in the system tray (if your desktop supports it).</li></ol>
<p><b>Uninstalling:</b> delete the AppImage file; data stays in <code>~/.config/g-downloader</code>.</p>
""", True),
("First launch and overview", """
<p>On launch the main window appears, divided into these areas:</p>
<ul>
<li><b>Sidebar (left):</b> logo, <i>Dashboard</i> and <i>Schedule</i> buttons, the list of <b>upcoming downloads</b>, the <i>+ Task</i> and <i>Import</i> buttons, the task list grouped by category, and <i>Settings</i> and <i>Info &amp; Guide</i> at the bottom.</li>
<li><b>Top bar:</b> a large <b>clock</b>, the <b>next download</b> with a highlighted countdown and, while a download is running, its progress bar. Any update notice also appears here (chapter 16).</li>
<li><b>Central area:</b> shows the dashboard, the schedule, a task editor, the settings or the info page, depending on the section.</li>
<li><b>Console (bottom):</b> closed by default; open it with the arrow and resize it by dragging its edge. It shows in real time what the app is doing.</li>
</ul>
<h3>The app keeps running in the background</h3>
<p>Closing the window does <b>not</b> stop the app: it keeps running the schedules, with its icon in the system tray. To really quit, use the icon menu → <b>Quit</b>. Schedules only fire while the app is running (see also "Start G-Downloader when the computer starts" in chapter 14).</p>
<h3>Language</h3>
<p>Choose the language in <b>Settings → Language</b>: it changes the whole interface, the messages, the guide and the names of days and months.</p>
""", False),
("Creating your first task", """
<p>A <b>task</b> describes what to download, where to save it, what to call it and when. To create one:</p>
<ol>
<li>Click <b>+ Task</b> in the sidebar (or <i>+ New task</i> in the Schedule).</li>
<li>Give the task a <b>name</b> and, if you like, a <b>category</b>.</li>
<li>In the <b>Source</b> card choose the type (Web or local/network file) and enter the URL or path.</li>
<li>In the <b>Destination and filename</b> card choose the folder (with <i>Browse…</i>) and how to name the file.</li>
<li>In the <b>Schedules</b> card add at least one time.</li>
<li>Click <b>Save</b>. To try it right away use <b>▶ Run now</b>.</li>
</ol>
<div class="note"><b>Note:</b> the "Run immediately after saving" switch is off by default. Saving a task does <b>not</b> start a download and does not trigger past times: schedules apply from that moment on.</div>
<p>To temporarily disable a task without deleting it use the switch next to its name, or the <i>Disable</i> button in the Schedule.</p>
""", True),
("Sources", """
<h3>6.1 Web (HTTP/HTTPS)</h3>
<p>Enter the full URL. It may contain <b>dynamic placeholders</b> (chapter 7). Options:</p>
<table><tr><th>Option</th><th>Meaning</th></tr>
<tr><td>HTTP method</td><td><b>GET</b> (default) requests the file; <b>POST</b> also sends a body (JSON or plain text, with placeholders) to servers that require it.</td></tr>
<tr><td>Timeout</td><td>Maximum wait in milliseconds (default 30000).</td></tr>
<tr><td>The server requires authentication</td><td>Enables username and password for HTTP authentication. The password is stored encrypted with the computer's protection system (Windows DPAPI, macOS Keychain, libsecret on Linux).</td></tr></table>
<h3>6.2 FTP / FTPS</h3>
<p>Use a URL like <code>ftp://server/folder/file.mp3</code> or <code>ftps://…</code>, with username and password in the authentication card. Note: <code>ftp://server/dir/file</code> is relative to the login folder; for an absolute path use a double slash <code>ftp://server//dir/file</code>. If the file is not found, the log tells you which folder the app is looking in and which files it sees, so you can immediately tell whether the name or the folder is wrong.</p>
<h3>6.3 Local or network file</h3>
<p>Choose <i>Local / network file</i> and enter the path (e.g. <code>D:\\Audio\\show.mp3</code> or <code>\\\\server\\audio\\clip.mp3</code>). The file is copied to the destination folder. If it is not there yet, attempts are retried just as for web sources.</p>
<h3>6.4 Retries on error</h3>
<p>For each task you can set how many <b>attempts</b> to make (default 3) and how long to <b>wait</b> between them (default 15 seconds). The defaults for new tasks are changed in Settings. If the last attempt fails too, the task is marked as failed and, if enabled, the email/Telegram alert is sent.</p>
""", False),
("Dynamic placeholders", """
<p>In the URL, the file path, the file name and the actions you can use placeholders that are replaced on every run. Below the fields there are buttons that insert them at the cursor.</p>
<table><tr><th>Placeholder</th><th>Result</th></tr>
<tr><td><code>{date:yyyyMMdd}</code></td><td>today's date, e.g. <code>20260926</code></td></tr>
<tr><td><code>{date:yyyy-MM-dd}</code></td><td>ISO date, e.g. <code>2026-09-26</code></td></tr>
<tr><td><code>{time:HHmmss}</code></td><td>current time, e.g. <code>084500</code></td></tr>
<tr><td><code>{date+1h:H}</code></td><td><b>shifted</b> date/time: here the next hour (e.g. 7 at 6:57). Also <code>-1d</code>, <code>+30m</code>, etc.</td></tr>
<tr><td><code>{seq:4}</code></td><td>running counter per task (<code>0001</code>, <code>0002</code>, …)</td></tr>
<tr><td><code>{rand:6}</code></td><td>random string of 6 characters</td></tr>
<tr><td><code>{env:NAME}</code></td><td>value of an environment variable</td></tr></table>
<p>The format after the colon uses the standard letters: <code>yyyy</code> year, <code>MM</code> month, <code>dd</code> day, <code>HH</code> hours (00–23), <code>mm</code> minutes, <code>ss</code> seconds.</p>
<p><b>Example:</b> <code>https://example.com/audio/show_{date:yyyyMMdd}_{date+1h:HH}.mp3</code> downloads the next hour's file every hour.</p>
<p>For tasks whose URL depends on date and time, a <b>"Run edition…"</b> menu appears: it lists the latest scheduled occurrences and lets you download a missed edition by hand, using its date and time in the file name.</p>
""", False),
("Schedules", """
<p>Each task can have <b>several independent schedules</b>, even very different from each other. In the <i>Schedules</i> card click <b>+ Add schedule</b> and choose the type.</p>
<h3>8.1 Weekdays + time</h3>
<p>Tick the days (or use the <i>Mon-Fri</i>, <i>Sat-Sun</i>, <i>Every day</i> buttons) and add one or more times. For a single day tick just one box. <i>+ Add time</i> proposes the hour after the last one: handy for an hourly bulletin or for fixed but irregular times (for example every hour from 6 to 20 except 13 and 17).</p>
<h3>8.2 Advanced cron expression</h3>
<p>For special cases you can write a 5-field cron expression (<code>minute hour day month weekday</code>). The <b>? Help</b> button opens a quick reference with examples.</p>
<table><tr><th>Expression</th><th>Meaning</th></tr>
<tr><td><code>0 9 * * *</code></td><td>every day at 9:00</td></tr>
<tr><td><code>*/15 * * * *</code></td><td>every 15 minutes</td></tr>
<tr><td><code>30 8 * * 1-5</code></td><td>at 8:30, Monday to Friday</td></tr>
<tr><td><code>0 9 * * 0,6</code></td><td>at 9:00 on weekends</td></tr></table>
<h3>8.3 One-off</h3>
<p>A precise date and time; the task fires only once.</p>
<h3>8.4 Repeat at an interval</h3>
<p>Repeats every N <b>seconds, minutes, hours or days</b>. You can set a <b>start</b> (<i>Starting from</i>: the first run happens at that time and then repeats at every interval) and a limit (<i>Repeat until</i>). If the start field is empty, it starts right away.</p>
<h3>8.5 Options common to all schedules</h3>
<ul>
<li><b>Label</b>: a name to recognise the schedule in the list and in the log.</li>
<li><b>URL for this schedule only</b>: if the file changes depending on the time or day, you can give a different URL to a single schedule. If empty, the task URL is used.</li>
<li><b>👁 Preview</b>: shows the next computed occurrences.</li>
<li><b>+1h</b>: duplicates the schedule shifted forward by one hour.</li>
<li>The <b>Enabled</b> switch suspends a single schedule.</li>
</ul>
<div class="note">Schedules do not catch up on past times: if the app is off at the scheduled time, that download is not run. Turn on <b>"Warn at startup if schedules were missed"</b> (Settings → Reliability) to be told about it.</div>
""", True),
("Destination and file name", """
<h3>9.1 Destination folder</h3>
<p>Enter the folder (with <i>Browse…</i>). If empty, the default folder from Settings is used.</p>
<h3>9.2 File name</h3>
<table><tr><th>Mode</th><th>Behaviour</th></tr>
<tr><td>Fixed name</td><td>the file always gets the same name</td></tr>
<tr><td>As in the URL</td><td>uses the name at the end of the URL</td></tr>
<tr><td>Template with placeholders</td><td>e.g. <code>show_{date:yyyy-MM-dd}.mp3</code></td></tr>
<tr><td>Ask where to save</td><td>a "Save as" window opens when the download ends</td></tr></table>
<h3>9.3 If a file with the same name already exists</h3>
<ul><li><b>Keep the old one by renaming it</b> (default): the existing file becomes <code>name.old-date-time</code>; the clean name is always reserved for the most recently downloaded file.</li>
<li><b>Overwrite</b>: no copy, useful for exchange folders.</li></ul>
<h3>9.4 Destination folder cleanup</h3>
<p>Before (or after) the download the app can clean the folder:</p>
<table><tr><th>Setting</th><th>Choices</th></tr>
<tr><td>Action</td><td>Do nothing · Delete files · Move the files elsewhere</td></tr>
<tr><td>Which files</td><td>everything in the folder · only the file with the same name · only files matching a pattern (e.g. <code>report_*.mp3; *.tmp</code>) · only files older than N days/hours · all except the N most recent</td></tr>
<tr><td>Subfolders</td><td>include them, or touch only files</td></tr>
<tr><td>How to delete</td><td>permanently or to the trash (does not work on network folders)</td></tr>
<tr><td>When</td><td>before downloading · or only after a successful download</td></tr></table>
<div class="warn"><b>Warning:</b> with "Delete files" and "Everything in the folder", <b>all</b> files in the folder are deleted, even those not downloaded by this task. If the folder is shared with other tasks or programs choose "only the file with the same name" or a pattern. With "Before downloading", if the download then fails the deleted files do not come back: to delete only after a successful download choose "Only after a successful download". The app refuses in any case to empty the root of a drive.</div>
<h3>9.5 Integrity check</h3>
<p>In the <b>Expected SHA-256 checksum</b> field you can enter the checksum the file must have: if the downloaded file does not match, the download counts as failed.</p>
""", False),
("Actions after the download", """
<p>In the <i>Post-download actions</i> card you can add one or more actions, run <b>in order</b> and only if the download succeeded. Their fields accept the placeholders <code>{filepath}</code> (full path), <code>{filename}</code>, <code>{folder}</code>, <code>{taskName}</code> and dates/times.</p>
<table><tr><th>Action</th><th>What it does</th></tr>
<tr><td>Run program/script</td><td>launches a program with arguments (one per line), or a <b>full command line</b> (one per line, pasted as it is: Start, pipes, redirects and quotes work as at the command prompt).</td></tr>
<tr><td>Move file</td><td>moves the downloaded file to another folder (with placeholders, e.g. <code>D:\\Archive\\{date:yyyy}</code>).</td></tr>
<tr><td>Open file/folder</td><td>opens the downloaded file or the destination folder.</td></tr>
<tr><td>System notification</td><td>shows a notification with the title and message of your choice.</td></tr></table>
<h3>Pauses and delays in commands</h3>
<ul><li><b>Initial wait</b>: seconds to wait after the download, before the first line (once only).</li>
<li><b>Pause between one line and the next</b>: seconds to wait between two commands of the same field (not between different actions: each has its own initial wait).</li>
<li>A line such as <code>timeout /t 5</code>, <code>wait 5</code> or <code>sleep 5</code> is interpreted as a 5-second pause.</li>
<li>Empty lines and lines starting with <code>::</code> or <code>REM</code> are ignored.</li></ul>
<p>The <b>"If the command fails, mark the task as failed"</b> switch decides whether a failed command stops the sequence and counts as an error.</p>
<div class="warn">Actions run commands on your computer. Only import task files you trust: the app warns you when an imported file contains commands to be run.</div>
""", True),
("Dashboard and schedule", """
<h3>11.1 Dashboard</h3>
<p>The dashboard summarises the activity:</p>
<ul><li>cards with total and active tasks, queued in the next 24 hours, completed and failed today, success rate (last 30 days), data downloaded and average duration;</li>
<li>chart of activity over the last 7, 14 or 30 days (completed and failed) and of downloads by hour of day;</li>
<li>list of the next 24 hours, recent activity and tasks with the most errors;</li>
<li>tasks by <b>category</b>.</li></ul>
<p>Almost everything is <b>clickable</b>: click a task to open its editor, click a category to filter the list in the sidebar. The <b>🧹 Clear</b> buttons reset the view of recent activity or of the error count (task history is kept).</p>
<h3>11.2 Schedule</h3>
<p>Shows all tasks as cards: next time with countdown, schedules, last download, result of the latest attempts, source and destination. From each card you can <b>▶ Run now</b>, open the last file, enable/disable or edit the task. The <b>All runs</b> view lists chronologically every run planned in the next 24 hours or 7 days.</p>
<h3>11.3 Categories</h3>
<p>Each task can have a category (free text). Each category gets an automatically assigned <b>colour</b>, used in the list, the schedule and the labels; you can change it in <i>Settings → Categories and colours</i> and restore the automatic one.</p>
""", False),
("Notifications: email and Telegram", """
<p>For downloads that fail after all attempts (and for "stuck source" or missed-schedule alerts) the app can send messages. They are configured in <b>Settings</b>; for each task sending is switched on or off with "Alert by email/Telegram if the download fails…".</p>
<h3>12.1 Email</h3>
<p>Turn on "Enable email notifications" and fill in SMTP server, port, secure connection (SSL/TLS), user, password, sender and recipients (comma separated). The <b>Send test email</b> button checks the configuration.</p>
<h3>12.2 Telegram</h3>
<ol><li>On Telegram open <b>@BotFather</b>, type <code>/newbot</code> and choose a name and a username ending in "bot".</li>
<li>BotFather replies with the <b>token</b> (like <code>123456789:AAF…</code>): copy it into "Bot Token". The token is like a password: do not publish it. If it falls into the wrong hands, <code>/revoke</code> in BotFather creates a new one.</li>
<li>Each recipient needs a <b>Chat ID</b>. <b>Person:</b> they open the bot and press <i>Start</i> (<code>/start</code>), then write to <b>@userinfobot</b>, which replies with their Id (a number). <b>Group or channel:</b> add the bot (for a channel, as administrator) and post a message; the Chat ID starts with <code>-</code> (e.g. <code>-1001234567890</code>) and must be entered with the minus sign.</li>
<li>In "Recipients" add one row for each, with a note to remember who it is. <b>Send test message</b> checks that it reaches everybody.</li></ol>
<p>If the bot is already used by other programs (for example Home Assistant) you can use it anyway: G-Downloader only sends messages and does not disturb the others.</p>
<h3>12.3 Summary report</h3>
<p>In <i>Settings → Reports and logs</i> you can get a <b>daily</b> (last 24 hours) or <b>weekly</b> (Monday) email summary at the chosen time, with completed/failed downloads and error details. It uses the email configuration.</p>
""", False),
("Reliability and checks", """
<p>In <i>Settings → Reliability</i> and <i>Performance and checks</i>:</p>
<ul>
<li><b>File too small:</b> treats as an error (and retries) a downloaded file smaller than the minimum size in KB, useful against error pages downloaded instead of the file.</li>
<li><b>File identical to the last one:</b> warns if the downloaded file equals the previous one (content possibly not updated at the source).</li>
<li><b>"Stuck source" alert:</b> after N identical downloads in a row sends an email/Telegram alert (0 = off).</li>
<li><b>Missed schedules:</b> at startup reports the times missed because the app was off.</li>
<li><b>Simultaneous downloads:</b> maximum limit (0 = no limit, 1 = one at a time); extra downloads wait.</li>
</ul>
""", False),
("Settings", """
<table><tr><th>Section</th><th>Content</th></tr>
<tr><td>General</td><td>light/dark theme · language · menu-bar icon (white or blue) · date and time format · start when the computer starts · start minimized · success and error notifications · open the folder when clicking the notification · default destination folder · default retries and wait</td></tr>
<tr><td>Reliability / Performance</td><td>see chapter 13</td></tr>
<tr><td>Updates</td><td>see chapter 16</td></tr>
<tr><td>Reports and logs</td><td>email report · open the log folder</td></tr>
<tr><td>Categories and colours</td><td>category colours</td></tr>
<tr><td>Email / Telegram</td><td>see chapter 12</td></tr>
<tr><td>Backup</td><td>see chapter 15</td></tr></table>
<h3>Date and time format</h3>
<p>The numeric format (day/month order, 24-hour or AM/PM) is chosen separately from the language: Automatic, or 24h DD/MM/YYYY, AM/PM MM/DD/YYYY, ISO 24h YYYY-MM-DD, etc. The <b>names</b> of days and months follow the interface language instead. The time fields of the schedule editor change format after restarting the app.</p>
""", True),
("Backup, transfer and upgrading", """
<h3>15.1 Export and import</h3>
<ul><li><b>Backup / Transfer:</b> <i>Settings → Export configuration</i> saves tasks and settings to a file; <i>Import configuration</i> restores them identically on another computer.</li>
<li><b>Single task:</b> <i>⤓ Export task</i> (in the editor) and <i>⤒ Import</i> (sidebar) share or duplicate a single task.</li></ul>
<div class="warn">The configuration file also contains any saved SMTP passwords and Telegram tokens: keep it somewhere safe.</div>
<h3>15.2 Upgrading from a previous version</h3>
<ol><li>Export the configuration from the current version (to be safe).</li>
<li><b>Close the current version with "Quit"</b> from the tray icon menu; if it stays active, with the new one open downloads would run twice.</li>
<li>Install the new version as described in chapter 3, or use the guided flow in chapter 16.</li>
<li>Start it and check that tasks and settings are there. If they are missing, use <i>Import configuration</i> with the file saved in step 1.</li>
<li>Once you have seen a download run correctly, uninstall the old version.</li></ol>
<div class="note">Because the app identifier changed (<code>com.onairgarage.gdownloader</code>), on Windows the installer may not replace the old installation but install next to it: in that case uninstall the old one after checking the new one.</div>
""", False),
("Updates", """
<p>G-Downloader periodically checks GitHub for a newer version (15 seconds after launch, then every 24 hours) and shows a notice in the top bar; the same notice is available in <i>Settings → Updates</i>, which also has a <b>Check for updates</b> button for a manual check.</p>
<h3>16.1 Downloading and verifying</h3>
<p>Clicking <b>Download and install</b> makes the app work out the right installer for your system and processor (Intel or Apple Silicon on Mac) by itself and download it to the <b>Downloads</b> folder, showing the percentage and megabytes received. When it finishes it compares the file against the <b>SHA-256</b> published in the release (<code>SHA256SUMS.txt</code>): if it does not match, the file is <b>deleted</b> and a clear error message appears, with the <i>Open download page</i> button as a fallback.</p>
<p>The download's state (available, in progress, ready, error) is <b>the same</b> in the bar and in Settings: you can start it from one place and follow it from the other. While a download is running, the <i>Check for updates</i> button stays disabled.</p>
<h3>16.2 Finishing the installation</h3>
<p>Once verified, a green button appears, different per system:</p>
<table><tr><th>System</th><th>Button</th><th>What happens</th></tr>
<tr><td>Windows</td><td>Close and install</td><td>the app closes itself (scheduled downloads stop) and starts the installer; it reopens by itself when done.</td></tr>
<tr><td>macOS</td><td>Open installer</td><td>opens the downloaded <code>.dmg</code> file. Quit G-Downloader with "Quit" from the menu-bar icon and drag the new version into Applications, just like on first launch.</td></tr>
<tr><td>Linux</td><td>Open installer</td><td>shows the downloaded <code>.AppImage</code> file in its folder. Quit G-Downloader with "Quit" and start the new file.</td></tr></table>
<div class="note">Nothing installs by itself: the green button always has to be pressed on purpose. On macOS and Linux the app cannot replace itself: the manual step above is still needed, just as for a first installation.</div>
""", False),
("Logs and history", """
<ul><li><b>Console:</b> real time, at the bottom of the window (cleared on restart).</li>
<li><b>Task history:</b> the last 50 attempts of each task, visible on the cards and in the dashboard.</li>
<li><b>Daily statistics:</b> permanent counters (about 13 months) for the charts.</li>
<li><b>Log files:</b> one file per day, kept for 30 days, in the <code>logs</code> folder of the app data (<i>Open log folder</i> button in Settings). Each line carries date, level, task and message.</li></ul>
""", False),
("Where the data is", """
<table><tr><th>System</th><th>Folder</th></tr>
<tr><td>Windows</td><td><code>%APPDATA%\\g-downloader</code></td></tr>
<tr><td>macOS</td><td><code>~/Library/Application Support/g-downloader</code></td></tr>
<tr><td>Linux</td><td><code>~/.config/g-downloader</code></td></tr></table>
<p>It holds the tasks and settings file and the <code>logs</code> folder. Passwords and tokens are stored encrypted with the computer's and user's protection system: they cannot be read if you copy the data to another PC (in that case they must be entered again).</p>
""", False),
("Troubleshooting", """
<table><tr><th>Problem</th><th>What to do</th></tr>
<tr><td>macOS: "the app is damaged / cannot be opened"</td><td>The app is not signed: right-click → Open, or <code>xattr -dr com.apple.quarantine /Applications/G-Downloader.app</code>.</td></tr>
<tr><td>Windows: "Windows protected your PC"</td><td>More info → Run anyway.</td></tr>
<tr><td>Linux: the AppImage does not start</td><td>Make it executable (<code>chmod +x</code>) and install FUSE (<code>libfuse2</code>) if required.</td></tr>
<tr><td>The download does not start at the scheduled time</td><td>Check that the app is running (tray icon), that the task and schedule are enabled, and look at <i>Preview</i> and the console. Turn on the missed-schedules alert.</td></tr>
<tr><td>401/403 error from the server</td><td>Check the username and password in the Source card.</td></tr>
<tr><td>FTP: "550 file not found"</td><td>Read the message: it shows the login folder and the files present; fix the path or wait for the file to be published. Remember the double slash for absolute paths.</td></tr>
<tr><td>The downloaded file is an error page</td><td>Turn on "Check that the downloaded file isn't too small" and set the minimum size.</td></tr>
<tr><td>Passwords disappeared after a transfer</td><td>They are tied to the user and the computer: enter them again.</td></tr>
<tr><td>Email/Telegram not arriving</td><td>Use the test buttons in Settings and check the error message.</td></tr>
<tr><td>Downloads running twice</td><td>Two copies of the app are probably open (old and new): close the one you do not need with "Quit".</td></tr>
<tr><td>"Update download failed: checksum mismatch"</td><td>The downloaded file was automatically deleted. Try again (maybe on another connection), or download the installer by hand from the releases page.</td></tr></table>
<h3>Contacts and information</h3>
<p>Graziano Melzi · OnAir Garage — <code>https://onairgarage.com</code> — <code>hello@onairgarage.com</code><br>Source code and releases: <code>https://github.com/djgragra/g-downloader</code><br>License: MIT © 2026 Graziano Melzi.</p>
""", False),
])
