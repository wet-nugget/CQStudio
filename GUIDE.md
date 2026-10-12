# Offline Class & Quiz Studio Guide

## Overview

Offline Class & Quiz Studio / CQStudio is a local, offline browser app for managing classes, materials, and quizzes. It uses `index.html`, `styles.css`, and a single classic JavaScript file (`app.js`); there is no backend, database, account system, CDN, or external dependency. You can open `index.html` directly or optionally serve the folder with `python -m http.server 8000` at `http://localhost:8000`. The server continues running until stopped with `Ctrl+C`. A local server is recommended for testing. No internet connection is needed.

## Main Workflow

1. Use **Create Class** on the Dashboard to open the focused class overlay.
2. Add a class name, teacher/subject, description, and optional custom icon.
3. Open a class to add materials, upload Markdown quizzes, or create quizzes manually.
4. Preview saved quizzes without starting an attempt.
5. Choose quiz attempt settings, then start the focused quiz overlay.
6. Submit the quiz or let an enabled timer submit automatically.
7. Use **Guide / Help** for downloadable Quick Guide, Sample Data, AI Quiz Context, and Data / Backup tools.

## Class Overlay and Icon Colors

Class creation and editing happen in the same overlay/modal. Cancel or close does not save changes.

The icon color picker is organized into accessible color-mode tabs:

- **Presets** — tap a saved color swatch.
- **Hex** — use the visual picker or type a 6-digit hex value such as `#4f46e5`.
- **RGB** — adjust red, green, and blue sliders or number inputs.

All color modes stay synchronized. Switching tabs preserves the current color, and the live icon preview updates immediately. Invalid hex values are rejected by the input and do not overwrite the current saved color.

Other icon controls are preserved: style, shape, emoji, uploaded image, and reset. Uploaded image icons must be image files under 200 KB and are stored locally as Data URLs.

## Quiz Start Setup

Clicking **Take quiz** opens a setup modal before the quiz overlay. Configure:

- **Shuffle questions** — applies only to the current attempt and never changes the saved quiz.
- **Use original order** — clears shuffle before starting.
- **Display mode**:
  - **Multiple questions at once** with a questions-per-page setting.
  - **One question at a time** with Previous / Next navigation and progress text.
- **Whole-quiz timer**:
  - No timer, or custom minutes.
  - When time expires, the attempt submits automatically.
- **Per-question timer**:
  - Available only in one-question mode.
  - This version supports one default number of seconds for every question.
  - When a question timer expires, the app moves to the next question or submits on the last question.
  - The timer follows the displayed question even when shuffle is enabled.

Answers are preserved when moving between pages/questions. Completed attempts are added to that quiz's local history; cards retain the latest score and show attempt count. Open History to review dates, scores, settings, and duration, or clear history with confirmation.

Completed results include **Print Results** and **Download Results as Markdown**. The report includes the class, score, attempt settings, and per-question submitted/correct answers.

The manual builder autosaves locally after a short debounce. If you reopen a builder while a draft exists, choose to restore it or start fresh. Use Restore draft / Discard draft controls in the builder; saving a quiz removes the draft. Closing with unsaved work warns that the draft remains available.

## Guide / Help Modal

The Guide / Help modal has four independent tabs:

- **Quick Guide** — compact usage notes.
- **Sample Data** — sample-data preview, sample-data loader, and sample quiz download.
- **AI Quiz Context** — downloadable `quiz-ai-context.md` for AI assistants.
- **Data / Backup** — export/import/reset controls and a downloadable data backup guide.

## Data / Backup

CQStudio stores data locally in this browser under `offlineClassQuizStudio.v1`. Deployed copies of the app do not sync data between devices or users.

Use **Export Data** to download a readable JSON backup named like `cqstudio-backup-YYYY-MM-DD.json`. The backup includes version metadata, classes, materials, quizzes, latest quiz scores, and class icon settings.

Use **Import Data** to restore a CQStudio JSON backup. Import is replace-only in this version, validates the file shape, and asks for confirmation before replacing current app data. Export current data first if you may need it later.

Use **Reset All Data** only when you want to clear local app data from this browser. Reset asks for strong confirmation, clears classes/materials/quizzes/icons/scores, refreshes the UI, and keeps the theme preference. Builder drafts use a separate localStorage key and may be discarded from the builder.

Stored data now includes a simple `version: 1` schema marker. Older unversioned data is migrated and sanitized when loaded so missing arrays, class icon defaults, quiz questions, and latest result fields are repaired where practical.

## Quiz Builder Help

The quiz builder includes a compact help panel with two modes:

- **Guide** explains purpose, answer entry, grading, and common mistakes.
- **Examples** shows valid syntax for the selected question type.

Supported builder question types are Multiple Choice, Multiple Responses, Matching, True or False, Identification, Fill in the Blank, and Enumeration.

## Markdown Quiz Format

Start each quiz with metadata:

```md
# Quiz: Cell Biology Review
Class: Biology 101
Time Limit: 20
Points: 50
```

Separate each question with `---`.

### Multiple Choice A-Z

```md
## Multiple Choice
Q: Which letter is correct?
A. First option
B. Second option
C. Third option
Answer: B
```

### Multiple Responses / Checkbox

```md
## Multiple Responses
Q: Which are mammals?
A. Whale
B. Frog
C. Bat
D. Salmon
Answers:
- A
- C
```

Multiple responses are graded as an exact set.

### Matching

```md
## Matching
Q: Match each organelle to its function.
Pairs:
- Mitochondria = Produces energy
- Ribosome = Builds proteins
- Nucleus = Stores DNA
```

Accepted pair separators are `=`, `->`, `=>`, and `:`.

### True or False

```md
## True or False
Q: Plants perform photosynthesis.
Answer: True
```

### Identification

```md
## Identification
Q: What organelle is known as the powerhouse of the cell?
Answers:
- Mitochondria
- the mitochondria
```

### Fill in the Blank

```md
## Fill in the Blank
Q: The process by which plants make food is called ____.
Answer: photosynthesis
```

### Enumeration

```md
## Enumeration
Q: List three states of matter.
Answers:
- Solid
- Liquid
- Gas
```

## Common Mistakes

- Missing `---` separators.
- Missing `Q:` prompts.
- Using unsupported question headings.
- Using a multiple choice answer letter that does not exist.
- Forgetting all correct letters for Multiple Responses.
- Writing Matching pairs without a supported separator.
- Expecting shuffle to change saved quiz order; shuffle is attempt-only.

## Mobile and Accessibility Notes

- Major layouts stack on narrow screens.
- Modals and overlays scroll internally.
- Color modes, guide modes, and app sections use tab-style semantics where practical.
- Buttons, tabs, inputs, sliders, presets, quiz choices, and navigation controls are touch-friendly.
- The class overlay and quiz overlay prevent background scrolling and background interaction while open.
- Modal focus is kept inside the active modal when using Tab.

## Developer Notes

- Keep the app offline and dependency-free.
- Preserve localStorage compatibility under `offlineClassQuizStudio.v1`.
- Keep export/import/reset safeguards working before major refactors.
- Update migration/sanitization helpers when changing the saved data shape.
- Update this guide, `APP_CONTEXT.md`, and the JavaScript downloadable guide/context strings when changing supported syntax or workflow.
- Run `node --check app.js` after editing JavaScript. The unused `js/` module experiment is incomplete and is not loaded.
