# Offline Class & Quiz Studio (CQStudio)

Offline Class & Quiz Studio / CQStudio is a browser-based, local-first study app for classes, lessons, materials, and quizzes. It can be opened locally or hosted as a static website, including on Vercel. It uses a single classic JavaScript file; no backend, account, or external dependency is required. A hosted copy may need internet for initial loading, but app processing and data storage are local to the browser.

## Screenshot

_Add an optional screenshot here, for example `docs/screenshot.png`._

## Features

- Class dashboard with create, edit, delete, and class-detail views.
- Custom class icons with presets, hex, RGB controls, emoji, shape/style options, and small image uploads.
- Material and note manager for typed notes plus local attachment metadata.
- Markdown quiz upload, parsing, preview, and save flow.
- Manual quiz builder with type-aware guidance and examples.
- Supported quiz types:
  - Multiple Choice A-Z
  - Multiple Responses / Checkbox
  - Matching
  - True or False
  - Identification
  - Fill in the Blank
  - Enumeration
- Saved quiz preview that does not start or modify an attempt.
- Quiz Builder stores default attempt settings: original/shuffled order, paged or one-question display, page size, whole-quiz timer, and optional per-question timer.
- Quiz-taking overlay with answer preservation across pages/questions and local scoring.
- Per-quiz attempt history with score, date, mode, shuffle/timer settings, and time spent; history can be cleared with confirmation.
- Debounced local autosave for manual quiz builder drafts, with restore/discard controls.
- Completed results can be printed or downloaded as Markdown.
- Guide / Help modal with switchable quiz/lesson sample Markdown, AI context guides, and Data / Backup tools.
- Export/import JSON backups and reset app data safely with confirmation.
- Simple data version and migration/sanitization layer for safer future refactors.
- Light/dark theme persistence.
- Mobile-friendly and accessible modal/tab controls where practical.



- Import `.md` / `.markdown` lesson files or paste Markdown, preview formatted content, and track class lesson progress.
- Class Detail uses Lessons, Materials / Notes, and Quizzes sub-tabs so only one main study area is shown at a time.
- Long quiz previews use a bounded, keyboard-focusable question scroll region; title and actions stay outside it.
- One floating Submit Quiz action is grouped with close, remains available while scrolling, and shares the timer-expiry submission path; no bottom Submit is shown.
- Guide / Help has an independent AI Lesson Context tab with downloadable `lesson-ai-context.md`.

## Tech Stack

- Vanilla HTML: `index.html`
- Vanilla CSS: `styles.css`
- Vanilla JavaScript: `app.js` (single classic script; the incomplete `js/` module experiment is not loaded)
- Browser APIs only: `localStorage`, `FileReader`, `Blob`, `URL.createObjectURL`, `crypto.randomUUID`, `matchMedia`, and standard DOM APIs.

No backend, database, package manager, CDN, external dependency, build step, React, Next.js, Vite, or server framework is required. No build step is required. Direct `index.html` opening is supported where the browser permits local file APIs; a local HTTP server is recommended for testing and required for mobile LAN access.

## Local-First Data Storage

CQStudio stores app data in the current browser profile using `localStorage`:

- Main app data: `offlineClassQuizStudio.v1`
- Theme preference: `offlineClassQuizStudio.theme`
- Quiz builder draft: `offlineClassQuizStudio.builderDraft.v1` (separate localStorage key; discard it from the builder when no longer needed).

Important behavior and limitations:

- Data stays in the current browser profile/device only unless exported and imported manually. Hosting does not create cloud sync.
- Use **Guide / Help → Data / Backup → Export Data** to download a readable `cqstudio-backup-YYYY-MM-DD.json` file.
- Import validates a CQStudio backup and replaces current app data only after confirmation. Merge import is not implemented.
- Reset All Data clears app data from `offlineClassQuizStudio.v1` after strong confirmation and keeps the theme preference. Export a backup before clearing browser storage or moving devices.
- Clearing browser storage deletes saved classes, materials, quizzes, icons, and scores.
- `localStorage` size limits vary by browser.
- Small text/Markdown material files may be stored as text; large files, PDF, and DOCX attachments are metadata-only.
- Saved data uses a simple versioned shape: `{ version: 1, classes: [...] }`. Older unversioned data is migrated/sanitized when loaded. Older quizzes receive an empty `attempts` array; existing latest scores remain intact.

## Run Locally

### Local use and hosting

Open `index.html` directly where supported, or serve locally with `python -m http.server 8000`. CQStudio may also be hosted as a static website such as Vercel. A hosted page may need internet for initial loading; there is no backend or cloud synchronization.

### Local server

From the project folder:

```bash
cd "path/to/CQStudio"
python -m http.server 8000
```

The server keeps running until you stop it with `Ctrl+C`.

Then open:

```text
http://localhost:8000
```

A local server is optional for desktop use and useful for mobile LAN access.

## Mobile LAN Testing

1. Connect the computer and phone/tablet to the same Wi-Fi network.
2. Start the local server:

   ```bash
   cd "path/to/CQStudio"
   python -m http.server 8000
   ```

3. Find the computer's LAN IP address.
4. On the mobile device, open:

   ```text
   http://YOUR-LAN-IP:8000
   ```

If the page does not load, check firewall permissions for Python and confirm both devices are on the same network.

## Static Deployment

CQStudio is static-site compatible. Deploy the project folder contents as-is:

- `index.html`
- `styles.css`
- `app.js`
- `GUIDE.md`
- `APP_CONTEXT.md`
- `sample-biology-quiz.md`
- `README.md`
- `DEPLOYMENT.md` (deployment reference)

Only the root app files are required at runtime. The failed module experiment in `archive/failed-module-refactor/` is unused; exclude it from deployment if desired.

### Vercel

1. Push the project to GitHub and import that repository into Vercel.
2. Select framework preset **Other** / static.
3. Leave build and install commands empty.
4. Set output directory to the project root (`.`).

No build step is needed. Users on phones can open the deployed link and optionally add it to their home screen. To transfer desktop data, export a JSON backup and import it on the phone; storage does not sync. See `DEPLOYMENT.md` for details.

Because the app stores data in each user's browser `localStorage`, deployed users do not share data with each other.

See `DEPLOYMENT.md` for a focused deployment checklist.

## File Structure

```text
CQStudio/
├── index.html              # App shell, modals, tabs, forms, script/style links
├── styles.css              # All layout, theme, modal, mobile, and quiz styles
├── app.js                  # Complete app logic (single classic script)
├── archive/
│   └── failed-module-refactor/ # Archived, unused incomplete module experiment
├── GUIDE.md                # User guide and quiz-format reference
├── APP_CONTEXT.md          # Maintainer/developer context
├── sample-biology-quiz.md  # Sample Markdown quiz for upload/testing
├── README.md               # Project overview and maintenance/deployment notes
└── DEPLOYMENT.md           # Static deployment checklist
```

## Documentation

- `GUIDE.md` — user-facing workflow and Markdown quiz syntax.
- `APP_CONTEXT.md` — app architecture, data model, constraints, and developer context.
- Guide / Help modal — in-app quick guide, sample data tools, AI quiz context download, and Data / Backup tools.
- `sample-biology-quiz.md` — working quiz upload example.

## Verification

Run a JavaScript syntax check after editing `app.js`:

```bash
cd "path/to/CQStudio"
node --check app.js
```

Recommended manual checks before sharing or deploying:

1. Run `python -m http.server 8000` and open `http://localhost:8000`.
2. Create/edit/delete a class.
3. Add a material note and a small text/Markdown material file.
4. Upload `sample-biology-quiz.md`, preview it, and save it.
5. Create/edit a manual quiz.
6. Preview a saved quiz from the quiz tab.
7. Configure shuffle, display, pagination, and timer defaults in Quiz Builder, then take a quiz and verify those saved settings.
8. Export data and confirm the JSON contains `dataVersion`, `state.version`, and `state.classes`.
9. Confirm invalid import JSON is rejected and valid backup import asks for confirmation before replacing data.
10. Confirm Reset All Data asks for confirmation, clears app data, and keeps the theme.
11. Confirm light/dark theme and Guide / Help downloads still work.
12. Test mobile widths such as 320px, 375px, 414px, and tablet width around 768px.

## Future Architecture Recommendation

Keep the app vanilla and static, but gradually split by responsibility once backup/export is available. A practical future structure would be:

```text
src/
├── main.js                 # Startup and event binding
├── state.js                # loadState/saveState, migration helpers
├── storage.js              # localStorage keys and backup/import/export
├── classes.js              # class CRUD and icon helpers
├── materials.js            # material creation and file reading
├── quiz-parser.js          # Markdown parser and validation
├── quiz-builder.js         # manual quiz builder state/UI
├── quiz-attempt.js         # setup, navigation, timers, grading
├── guide-content.js        # downloadable guide/context strings
└── dom.js                  # shared DOM, modal, focus, escape helpers
```

CSS can later be split into focused files such as `base.css`, `layout.css`, `components.css`, `modals.css`, `quiz.css`, and `responsive.css`. If that is done, keep static deployment simple by either linking each file directly or using a tiny no-dependency concatenation script.

## Refactor Roadmap

1. Add README and verify the current app.
2. Add export/import backup before major refactors. ✅ Implemented with replace-only import and reset safeguards.
3. Split `app.js` into modules. Deferred: the initial partial extraction broke startup; the stable single-script app is restored first.
4. Split `styles.css` into focused CSS files (deferred to avoid risky cascade changes).
5. Extend the existing data migration layer for future `localStorage` schema changes.
6. Add future features only after the structure is stable.

## Refactor Safety Note

Before any future architecture refactor:

1. Export app data using Guide / Help → Data / Backup.
2. Copy the whole project folder or make a Git commit.
3. Change one layer at a time.
4. Verify in a browser after each stage.
5. Do not switch to ES modules unless serving over HTTP is acceptable.

The initial module refactor was deferred after breaking startup; its unused files are archived under `archive/failed-module-refactor/`.

## Developer Notes

- Preserve local-first browser behavior and static deployment compatibility; hosting does not add cloud sync.
- Avoid external CDNs, dependencies, package installs, and build-only workflows.
- Preserve `localStorage` compatibility where practical.
- Keep user-generated text escaped before inserting into HTML.
- Update `GUIDE.md`, `APP_CONTEXT.md`, and in-app downloadable guide/context strings when quiz syntax or workflows change.
- Run `node --check app.js` after JavaScript edits. The incomplete `js/` experiment is not used by the app.
