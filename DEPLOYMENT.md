# CQStudio Deployment Guide

CQStudio is a static, browser-only study app. It uses root-level `index.html`, `styles.css`, and a single classic `app.js`; no backend, npm dependencies, build step, or runtime internet access is required. Deployment provides a URL but does not provide cloud storage or cross-device syncing. The archived failed module experiment is not used; exclude `archive/failed-module-refactor/` from deployment if desired.

## Pre-Deployment Checklist

- [ ] Start `python -m http.server 8000`, open `http://localhost:8000`, and confirm the app loads.
- [ ] Run the JavaScript syntax check:

  ```bash
  cd "path/to/CQStudio"
  node --check app.js
  ```

- [ ] Upload and save `sample-biology-quiz.md`.
- [ ] Preview a saved quiz without starting an attempt.
- [ ] Take a quiz with the desired setup options.
- [ ] Test Guide / Help downloads.
- [ ] Export Data and confirm the backup JSON contains version metadata and classes.
- [ ] Import an exported backup and confirm the replace warning appears.
- [ ] Reset All Data and confirm app data clears while theme preference remains.
- [ ] Test at common mobile widths or on a phone through LAN testing.

## Deploy as Static Files

Upload the project together at the web root, including the root `app.js`:

```text
index.html
styles.css
app.js
GUIDE.md
APP_CONTEXT.md
sample-biology-quiz.md
README.md
DEPLOYMENT.md
```

No build command, install command, backend, database, or environment variables are required.

## Vercel Static Deployment

1. Push the project to a GitHub repository (include `index.html`, `styles.css`, and `app.js` at its root).
2. In Vercel, import that repository.
3. Choose framework preset **Other** / static.
4. Leave build and install commands empty; set output directory to `.` (project root).
5. Deploy, open the resulting URL, and repeat the app/data checks.

Do not deploy the unused archive folder unless you specifically want to retain it in the published files.

## Local Server Test

You can open `index.html` directly on desktop, or serve the project locally for HTTP/mobile testing:

```bash
cd "path/to/CQStudio"
python -m http.server 8000
```

The server stays running until stopped with `Ctrl+C`.

Open:

```text
http://localhost:8000
```

For mobile LAN testing, open `http://YOUR-LAN-IP:8000` from a device on the same Wi-Fi network. The app can also be used on a phone from its deployed link; use the browser's Add to Home Screen option if desired. To move desktop data, export a JSON backup on desktop and import that file on the phone. Local HTTP access may require allowing Python through the computer firewall.

## Troubleshooting

- **Blank page:** check browser developer console for startup errors and confirm `app.js` is present at the project root.
- **CSS/JS not loading:** verify the root-relative references in `index.html` (`styles.css`, `app.js`), filename case, and that all three files are deployed together.
- **Data missing on phone:** `localStorage` is isolated by browser, device, and site origin. Import a desktop backup; data does not sync automatically.
- **Server appears to hang:** this is normal; `python -m http.server 8000` stays running while serving requests. Stop it with `Ctrl+C`.

## Data and Privacy Notes

- Saved classes, materials, quizzes, icons, and scores are stored in each browser's `localStorage`.
- Theme preference is stored separately and is kept when Reset All Data is used.
- A deployed site does not create shared accounts or shared cloud storage.
- Use Guide / Help → Data / Backup → Export Data to create a `cqstudio-backup-YYYY-MM-DD.json` file before imports, resets, or major refactors.
- Import is replace-only in this version; merge import is not implemented.
- Quiz attempt history is included in quiz data exports. Builder drafts use a separate localStorage key and are not included in backup/reset.
- Export data before clearing browser storage, resetting, or switching devices. Users should not treat `localStorage` as a permanent backup.
