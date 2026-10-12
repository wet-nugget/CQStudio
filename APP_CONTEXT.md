# App Context: Offline Class & Quiz Studio

## 1. Overview

### What the app does

Offline Class & Quiz Studio / CQStudio is a browser-only study management app. It lets users manage classes through a focused overlay, customize class icons, add notes/materials, upload Markdown quiz files, preview generated quizzes, take quizzes, and view results.

The app works offline when served locally or from static hosting. It uses one classic script (`app.js`), so opening `index.html` directly is supported where the browser permits local file APIs. A local HTTP server is recommended for testing; `python -m http.server 8000` continues until stopped with `Ctrl+C`. Data is stored locally in browser `localStorage`.

### Who it is for

- Students who want a simple offline study organizer
- Teachers or tutors who want to prepare local class materials and quizzes
- Developers or AI assistants maintaining a small vanilla HTML/CSS/JS app

### Main use cases

- Create, edit, and delete classes from a focused overlay
- Customize class icons with tabbed Presets, Hex, and RGB color controls, styles, shapes, emoji, or small image uploads
- Add typed notes/materials to a class
- Attach local material files to a class
- Upload `.md` quiz files using the supported custom Markdown quiz format
- Preview parsed quizzes before saving
- Save generated quizzes to a class
- Configure quiz attempts before starting: shuffle, original order, pagination, one-question mode, whole-quiz timers, and one-question per-question timers
- Take quizzes in the browser
- Review quiz score and per-question results
- Keep per-quiz attempt history with dates, score, mode, shuffle/timer settings, and elapsed time
- Autosave and restore/discard manual builder drafts
- Print or download completed results as Markdown
- Retry quizzes without deleting saved quiz data
- Toggle light/dark mode
- Load sample data and download a sample Markdown quiz
- Export all local app data to a JSON backup
- Import a CQStudio JSON backup with validation and confirmation
- Reset local app data with strong confirmation while keeping theme preference

## 2. Tech Stack

### Languages

- HTML: `index.html`
- CSS: `styles.css`
- JavaScript: `app.js` (single classic script; incomplete `js/` module experiment is not loaded)
- Markdown sample quiz: `sample-biology-quiz.md`

### Frameworks and libraries

- No frameworks
- No external libraries
- Vanilla JavaScript only

### Runtime requirements

- A modern browser with support for:
  - `localStorage`
  - `FileReader`
  - `Blob`
  - `URL.createObjectURL`
  - `document.querySelector`
  - Template literals
  - Optional chaining
  - `globalThis.crypto.randomUUID` if available; fallback ID generation is implemented

### Package managers or tooling

- No package manager is used.
- No build step is required.
- Syntax can be checked manually with Node.js using:

```bash
node --check app.js
```

Node.js is not required to run the app in the browser.

## 3. Project Structure

```text
CQStudio/
├── index.html
├── styles.css
├── app.js
├── archive/
│   └── failed-module-refactor/ (unused incomplete module experiment)
├── sample-biology-quiz.md
├── GUIDE.md
├── README.md
├── DEPLOYMENT.md
└── APP_CONTEXT.md
```

### Key files

- `index.html`
  - Defines the app shell and UI sections.
  - Contains dashboard, class detail, material upload, quiz upload, quiz preview, quiz-taking, and result containers.
  - Loads `styles.css` and the classic `app.js` script.

- `styles.css`
  - Contains all visual styling.
  - Defines light and dark theme CSS variables.
  - Handles responsive layout, panels, cards, forms, quiz options, transitions, and mobile styling.

- `app.js`
  - Contains the complete application logic and runs without imports. The partial `js/` extraction is incomplete and intentionally not loaded; modularization is deferred until a separately verified refactor.
  - Handles class CRUD, material creation/upload, Markdown quiz parsing, quiz preview, quiz-taking, scoring, theme persistence, sample data, and rendering.

- `sample-biology-quiz.md`
  - Example Markdown quiz file that users can upload.

- `APP_CONTEXT.md`
  - Developer-facing documentation for this app.

## 4. Architecture

### High-level architecture

This is a single-page offline app with three main UI views:

1. Dashboard
2. Class detail
3. Quiz view

There is no backend, API server, database, routing library, or build system.

### Main modules / responsibilities in `app.js`

- State, persistence, backup, and migration
  - `DATA_VERSION = 1`
  - `loadState()`
  - `saveState()`
  - `migrateState(rawState)`
  - `sanitizeClass(classItem)`
  - `sanitizeQuiz(quiz)`
  - `sanitizeQuestion(question)`
  - `exportAllData()`
  - `importDataFile(file)`
  - `resetAllData()`
  - `currentClass()`

- Sample content
  - `sampleQuiz`
  - `sampleClass()`
  - `sampleClasses()`

- View rendering
  - `render()`
  - `renderDashboard()`
  - `renderClassDetail()`
  - `renderMaterial()`
  - `renderQuizPreview()`
  - `buildQuizForm()`
  - `questionInput()`

- Quiz parsing
  - `parseQuizMarkdown(md)`
  - `detectQuestionType(section)`
  - `readAnswerList(section)`
  - `parseQuestion(section, number, errors)`

- Quiz grading
  - `normalize(s)`
  - `gradeQuiz(quiz, form)`

- Materials/files
  - `readMaterialFile(file)`
  - `setMaterialStatus(message, type)`

- Theme handling
  - `applyTheme(theme)`
  - `initTheme()`

- Class overlay and icon form handling
  - `setClassStatus(message, type)`
  - `showClassForm(editing)`
  - `hideClassForm()`
  - `renderColorPalette()`
  - `syncColorControls(color, source)`
  - `updateClassIconPreview()`

- Quiz builder guidance
  - `renderBuilderHelp()`
  - `setBuilderHelpMode(mode)`

- Initialization
  - `initApp()`
  - Runs after `DOMContentLoaded` if needed.

### Data flow

1. User interacts with the UI.
2. Event listener updates the in-memory `state` object.
3. `render()` or a targeted render helper updates the DOM.
4. `saveState()` persists data to `localStorage` under `offlineClassQuizStudio.v1`.

### State management

State is stored in a single JavaScript object with a schema version:

```js
let state = {
  version: 1,
  classes: []
};
```

Older saved data shaped as `{ classes: [...] }` is treated as unversioned data and migrated/sanitized by `migrateState(rawState)` when loaded. `saveState()` writes the current version.

The current selected class is tracked separately:

```js
let selectedClassId = state.classes[0]?.id || null;
```

A parsed-but-not-yet-saved quiz is tracked with:

```js
let pendingQuiz = null;
```

### Backend/frontend boundaries

- Frontend only.
- No backend exists.
- No server endpoints exist.
- No authentication exists.

## 5. Setup & Development

### Installation steps

No installation is required.

### How to run locally

Open this file in a browser:

```text
C:\Users\tamlc\Desktop\Pi Dev\CQStudio\index.html
```

The app should work offline without an internet connection.

### Environment variables

Unknown / not found in repository.

### How to build

No build step exists.

### How to test

No automated test suite is present.

Manual checks:

- Open `index.html` in a browser.
- Create a class.
- Add manual material notes.
- Upload a `.txt` or `.md` material file.
- Upload `sample-biology-quiz.md` as a quiz.
- Preview and save the quiz.
- Take the quiz and verify results.
- Use “Try Again” after submitting.
- Toggle dark mode and refresh to confirm persistence.
- Load sample data and confirm it appears on the dashboard.

Optional JavaScript syntax check:

```bash
cd "C:\Users\tamlc\Desktop\Pi Dev\CQStudio"
node --check app.js
```

### How to lint

Unknown / not found in repository.

## 6. Core Features

### Class management

- Create classes from a hidden create/edit form.
- Edit the selected class.
- Delete a selected class and all its local data.
- Render class cards on the dashboard.
- Save changes to `localStorage`.

### Materials and notes

- Add manual notes/materials with title and description/body text.
- Attach a material file.
- Supports file selection for `.txt`, `.md`, `.pdf`, and `.docx`.
- Small `.txt` and `.md` files are read with `FileReader` and stored/displayed as text.
- Large text files and unsupported binary/document formats are stored as metadata only.
- Stored material metadata can include:
  - `title`
  - `body`
  - `fileName`
  - `fileType`
  - `uploadedDate`
  - `fileContent`
  - `fileNote`
  - `created`

### Quiz upload and parser

- Uploads Markdown quiz files with `FileReader`.
- Parses quiz title, class name, time limit, optional points, and questions.
- Supports these question types:
  - Multiple Choice with options A-Z
  - Multiple Responses / Checkbox with options A-Z
  - Matching pairs
  - True or False
  - Identification
  - Fill in the Blank
  - Enumeration
- Supports flexible question headings such as:
  - `## Multiple Choice`
  - `## I. Multiple Choice`
  - `## Section A - True or False`
  - `## II. Identification`
- Allows optional non-question section headers separated by `---`.
- Supports `Answer:` and `Answers:` formats.
- Supports multiple accepted bullet answers for written question types.

### Quiz preview

- Shows parsed quiz details before saving.
- Displays questions, options, and correct answers.
- Shows parser errors if the Markdown format is invalid.

### Quiz-taking

- Dynamically renders quiz questions.
- Multiple choice and true/false questions use aligned radio inputs.
- Multiple response questions use checkboxes.
- Matching questions use dropdowns beside each prompt.
- Written questions use text inputs or textareas.
- Submitting shows score and per-question result details.
- “Try Again” resets the quiz-taking form without deleting the saved quiz.

### Dark mode

- Theme toggle changes between light and dark mode.
- Theme preference is saved in `localStorage` under `offlineClassQuizStudio.theme`.
- Saved theme is applied on app load.
- If no saved theme exists, the app uses the browser’s `prefers-color-scheme` preference.

### Sample data

- “Load sample data” replaces existing local data after confirmation.
- Sample data includes classes, materials, and at least one saved quiz.
- “Download sample .md” downloads a Markdown quiz file generated from the built-in `sampleQuiz` string.

## 7. APIs / Integrations

### External services

None.

### Internal endpoints

None.

### Browser APIs used

- `localStorage`
  - Stores app data and theme preference.
- `FileReader`
  - Reads uploaded quiz files and small text/Markdown material files.
- `Blob`
  - Creates downloadable sample quiz content.
- `URL.createObjectURL`
  - Generates temporary download URL for the sample Markdown quiz.
- `confirm`
  - Confirms destructive/replace actions.
- `window.matchMedia`
  - Reads system color scheme preference.

### Authentication / authorization

Unknown / not found in repository. The app has no login, accounts, roles, or permissions.

## 8. Data Model

### `localStorage` keys

- `offlineClassQuizStudio.v1`
  - Stores the main app state.
- `offlineClassQuizStudio.theme`
  - Stores `light` or `dark`.
- `offlineClassQuizStudio.builderDraft.v1`
  - Stores one debounced local quiz-builder draft; independent of the main backup/reset state.

### Main state shape

```js
{
  classes: [Class]
}
```

### Class object

```js
{
  id: string,
  name: string,
  teacher: string,
  description: string,
  materials: [Material],
  quizzes: [Quiz]
}
```

### Material object

```js
{
  id: string,
  title: string,
  body: string,
  created: string,
  fileName?: string,
  fileType?: string,
  uploadedDate?: string,
  fileContent?: string,
  fileNote?: string
}
```

Notes:

- `fileContent` is stored only for small text-based files.
- PDF, DOCX, large files, and unsupported formats are metadata-only.
- Full binary file storage is not implemented.

### Quiz object

```js
{
  id: string,
  title: string,
  className: string,
  timeLimit: number,
  points: number,
  questions: [Question],
  created: string
}
```

### Question object

```js
{
  id: string,
  type: string,
  prompt: string,
  options: [{ key: string, text: string }],
  pairs: [{ left: string, right: string }],
  answer: string,
  answers: [string]
}
```

Type-specific notes:

- Multiple Choice:
  - `options` contains A-Z style answer choices.
  - `answer` is the correct letter.
  - `answers` contains the correct letter as an array.
- Multiple Responses:
  - `options` contains A-Z style answer choices.
  - `answers` contains every correct letter.
  - Grading requires the exact selected set.
- Matching:
  - `pairs` contains `{ left, right }` prompt/match pairs.
  - Grading compares dropdown selections to each pair's `right` value.
- True or False:
  - `answer` is usually `True` or `False`.
- Identification / Fill in the Blank:
  - `answer` stores the first accepted answer.
  - `answers` stores all accepted answers when `Answers:` bullet format is used.
- Enumeration:
  - `answers` stores required listed answers.

## 9. Configuration

### Config files

Unknown / not found in repository.

### CSS theme configuration

Theme values are defined as CSS custom properties in `styles.css`:

- `:root` defines the light theme.
- `[data-theme="dark"]` defines the dark theme.

The JavaScript sets the theme with:

```js
document.documentElement.dataset.theme = theme;
```

### Feature flags

Unknown / not found in repository.

### Deployment settings

Unknown / not found in repository.

The app is intended to be distributed as static files and opened directly in a browser.

## 10. Known Constraints

### Technical constraints

- Data is browser-local only.
- Data does not sync across devices or browsers.
- Clearing browser storage deletes saved app data.
- `localStorage` has size limits that vary by browser.
- Large files are not stored fully.
- PDF and DOCX files are not parsed; only metadata is stored.
- Markdown rendering for uploaded materials is plain text, not rich rendered HTML.
- Quiz Markdown parsing is custom and regex-based, not a full Markdown parser.
- Timer enforcement exists only inside configured quiz attempts; it is client-side and can be interrupted by closing the browser.
- Export/import is available as replace-only JSON backup/restore; merge import is not implemented.
- There are no automated tests.

### Technical debt / limitations

- Most app logic is in a single `app.js` file.
- Several UI elements are generated with template strings.
- Some actions are exposed on `window` for inline `onclick` handlers.
- A simple version/migration/sanitization layer exists, but it is intentionally lightweight and not a full schema validator.
- No accessibility audit has been performed.

### Assumptions

- The user runs the app in a modern browser.
- The app is used by one person on one browser profile.
- Uploaded quiz files follow the documented custom Markdown format.
- Material file attachments do not need to preserve binary content.

## 11. Developer Notes

### Refactor safety

Before any future architecture refactor:

1. Export app data using Guide / Help → Data / Backup.
2. Copy the whole project folder or make a Git commit.
3. Change one layer at a time.
4. Verify in a browser after each stage.
5. Do not switch to ES modules unless serving over HTTP is acceptable.

The earlier module refactor was deferred after breaking startup; its unused files are archived under `archive/failed-module-refactor/`.

### Coding conventions

- Use plain JavaScript only.
- Keep all app data serializable to JSON for `localStorage`.
- Keep UI rendering in explicit render functions.
- Call `render()` after changing `state` so UI and `localStorage` stay in sync.
- Use `escapeHtml()` before inserting user-controlled text into HTML strings.
- Preserve offline behavior; do not add external CDNs or network dependencies.

### Common pitfalls

- `localStorage` can fail or exceed quota if too much file content is stored.
- `readMaterialFile(file)` intentionally stores only small text file contents.
- `parseQuizMarkdown(md)` depends on `---` separators between sections.
- Question type detection checks `##` headings and looks for supported type names inside the heading text.
- Optional section headers can be separated by `---`, but actual questions still need a supported `##` heading and `Q:` line.
- The app uses inline `onclick` strings for some dynamically rendered buttons; the corresponding functions must remain available on `window`.
- Dark mode depends on `data-theme` on the root `<html>` element.

### Areas to be careful with

- Do not break the Markdown quiz parser while changing quiz UI.
- Be careful when changing the `state` shape because old data may already exist in `localStorage`.
- Avoid storing large file contents in `localStorage`.
- Keep `initApp()` running after DOM readiness.
- Keep `index.html`, `styles.css`, and `app.js` usable without a build step.

## Markdown Quiz Format Reference

### Basic example

```md
# Quiz: Introduction to Biology
Class: Biology 101
Time Limit: 20
Points: 50

---

## Multiple Choice
Q: What is the basic unit of life?
A. Atom
B. Cell
C. Tissue
D. Organ
Answer: B

---

## Multiple Responses
Q: Which are states of matter?
A. Solid
B. Liquid
C. Photosynthesis
D. Gas
Answers:
- A
- B
- D

---

## Matching
Q: Match each organelle to its function.
Pairs:
- Mitochondria = Produces energy
- Ribosome = Builds proteins
- Nucleus = Stores DNA
```

### Flexible headings

Supported examples include:

```md
## Multiple Choice
## I. Multiple Choice
## Section A - True or False
## II. Identification
```

### Multiple accepted written answers

```md
## Identification
Q: What organelle is known as the powerhouse of the cell?
Answers:
- mitochondria
- Mitochondria
- the mitochondria
```

Matching and written-answer grading are case-insensitive and trim surrounding whitespace where practical.

## Recent Behavior Update: Focused Class Overlay, Icon Colors, Builder Help

Current CQStudio behavior includes these refinements:

- Class create/edit is handled in a focused `#classModal` overlay instead of the former side panel.
- The Dashboard contains the primary `#showClassFormBtn` Create Class button.
- The old side quick-guide content was removed; guidance remains available from the Guide / Help modal.
- Class icon color customization supports:
  - preset swatches from `ICON_COLORS`
  - native color picker `#classIconColor`
  - hex input `#classIconHex`
  - RGB sliders and numeric inputs (`#classIconRed`, `#classIconGreen`, `#classIconBlue`, plus number fields)
  - live preview via `updateClassIconPreview()`
  - synchronized color state via `syncColorControls(color, source)`
- Existing class icon data remains compatible. `normalizeClassIcon(icon={})` still supplies defaults for older saved classes.
- The quiz builder has a type-aware help panel with `Guide` and `Examples` tabs. `renderBuilderHelp()` updates content based on `#builderType` and `activeBuilderHelpMode`.
- Modal behavior is centralized through `openModal(id)`, `closeModal(id)`, `setOverlayMode(on)`, and `trapModalFocus(e, modal)` so focused overlays prevent background scroll/interaction and keep keyboard focus inside the active modal.

## Recent Behavior Update: Data Safety, Backup, and Migration

Current CQStudio behavior now includes these data-safety refinements:

- `DATA_VERSION = 1` and `BACKUP_VERSION = 1` are defined in `app.js`.
- `saveState()` writes a versioned state object under `offlineClassQuizStudio.v1`.
- `loadState()` accepts older unversioned data and corrupted/invalid data does not crash the app.
- `migrateState(rawState)`, `sanitizeClass(classItem)`, `sanitizeMaterial(material)`, `sanitizeQuiz(quiz)`, and `sanitizeQuestion(question)` fill missing fields, preserve safe unknown fields, normalize question types such as `Checkbox` to `Multiple Responses`, ensure arrays exist, and add default class icons.
- The Guide / Help modal includes a `Data / Backup` tab.
- `exportAllData()` downloads a readable `cqstudio-backup-YYYY-MM-DD.json` backup including `app`, `backupVersion`, `exportedAt`, `storeKey`, `dataVersion`, `state`, and `theme`.
- `importDataFile(file)` supports CQStudio backup JSON and plain state-shaped JSON, validates/migrates it, and asks for confirmation before replacing current data. Merge import is intentionally not implemented yet.
- `resetAllData()` asks for two confirmations, clears app data from `offlineClassQuizStudio.v1`, resets in-memory state to `{ version: 1, classes: [] }`, refreshes the UI, and keeps `offlineClassQuizStudio.theme`.
- The downloadable quick guide and data backup guide document export/import/reset behavior.

## Recent Behavior Update: Quiz Attempt Setup, Timers, and Color Tabs

Current CQStudio behavior now includes these refinements:

- Class icon color controls are separated into accessible tabs: `Presets`, `Hex`, and `RGB`.
- The shared color state is synchronized by `syncColorControls(color, source)` so presets, color input, hex input, RGB sliders/numbers, and the live icon preview stay aligned.
- `setColorMode(mode)` controls the visible color panel and updates `aria-selected` on `[data-color-mode]` tabs.
- Clicking `Take quiz` opens `#quizSetupModal` instead of immediately opening the quiz overlay.
- Quiz setup supports attempt-only shuffle, a reset/original-order button, paginated mode with `#setupQuestionsPerPage`, one-question mode, optional whole-quiz timer, and optional default per-question timer for one-question mode.
- Shuffle is implemented with cloned attempt questions from `prepareAttemptQuestions(quiz, shuffle)` so saved quiz order is not changed; preview and edit remain in saved/original order.
- `activeQuiz` now tracks attempt config, cloned question order, page index, answer cache, timer deadlines, and submitted state.
- Answers are cached by question id in `activeQuiz.answers` via `collectAttemptAnswers()` before navigation and submission.
- `renderAttemptPage()` renders only the active page/question and restores cached answers.
- Whole-quiz timers auto-submit through `submitActiveQuiz()` when expired.
- Per-question timers are available in one-question mode; this implementation uses a single default seconds value for each question rather than per-question builder overrides. On expiry it advances to the next question or submits on the final question.
- `clearAttemptTimers()` is called when attempts close or finish to avoid stray intervals.
