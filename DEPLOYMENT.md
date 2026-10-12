# CQStudio Deployment Guide

CQStudio is a static, offline-first app. Deployment is optional. It uses a single classic script (`app.js`), so no build step or internet access is required. Direct `index.html` opening is supported where the browser permits local file APIs; a local HTTP server is recommended for testing.

## Pre-Deployment Checklist

- [ ] Start `python -m http.server 8000`, open `http://localhost:8000`, and confirm the app loads.
- [ ] Run the JavaScript syntax check:

  ```bash
  cd "C:/Users/tamlc/Desktop/Pi Dev/CQStudio"
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

Recommended project settings:

- Framework preset: Other / static
- Build command: empty
- Install command: empty
- Output directory: `.` / project root

After deployment, open the site URL and complete the pre-deployment checklist again.

## Local Server Test

```bash
cd "C:/Users/tamlc/Desktop/Pi Dev/CQStudio"
python -m http.server 8000
```

The server stays running until stopped with `Ctrl+C`.

Open:

```text
http://localhost:8000
```

For mobile LAN testing, open `http://YOUR-LAN-IP:8000` from a device on the same Wi-Fi network.

## Data and Privacy Notes

- Saved classes, materials, quizzes, icons, and scores are stored in each browser's `localStorage`.
- Theme preference is stored separately and is kept when Reset All Data is used.
- A deployed site does not create shared accounts or shared cloud storage.
- Use Guide / Help → Data / Backup → Export Data to create a `cqstudio-backup-YYYY-MM-DD.json` file before imports, resets, or major refactors.
- Import is replace-only in this version; merge import is not implemented.
- Users should not treat `localStorage` as a permanent backup.
