# Offline Class & Quiz Studio Guide

## Overview

Offline Class & Quiz Studio / CQStudio is a browser-based, local-first study app for classes, materials, lessons, and quizzes. It uses `index.html`, `styles.css`, and a single classic JavaScript file (`app.js`). Open it locally or host it as a static website, including on Vercel. No backend, database, account, or external dependency is required. A hosted site may need internet for initial loading; local browser processing and localStorage data work without a server after the page is loaded.

## Main Workflow

1. Use **Create Class** on the Dashboard to open the focused class overlay.
2. Add a class name, teacher/subject, description, and optional custom icon.
3. Open a class. Class Detail is organized into **Lessons**, **Materials / Notes**, and **Quizzes** sub-tabs; switch to the relevant area instead of scrolling through all resource forms at once.
4. Preview saved quizzes without starting an attempt.
5. Configure defaults in the Quiz Builder's **Quiz Attempt Settings**, then use **Take quiz** to confirm start.
6. Submit the quiz or let an enabled timer submit automatically.
7. Use **Guide / Help** for Quick Guide, Sample Data, AI Quiz Context, AI Lesson Context, and Data / Backup.

## Lesson Reviewer and Progress

Open a class and choose **Lessons**. Lessons are structured Markdown study content with status, confidence, and reflection tracking; import a `.md` / `.markdown` file or paste/edit content, preview it, then save. Open a saved lesson to update its progress and reflection. **Materials / Notes** is for quick notes, links, attachments, and references without lesson progress. **Quizzes** contains uploaded or manually created assessments, with preview/edit/take actions.

The lesson renderer formats headings (`#` through `######`), paragraphs, **bold**, *italic*, inline code, simple bulleted and numbered lists, blockquotes, and fenced code blocks. Tables, links, images, nested lists, raw HTML, and advanced Markdown syntax are not supported. Raw HTML is escaped and displayed as text. Lesson status, confidence, and reflection are stored with that class and included in JSON backups.

## Class Overlay and Icon Colors

Class creation and editing happen in the same overlay/modal. Cancel or close does not save changes.

The icon color picker is organized into accessible color-mode tabs:

- **Presets** — tap a saved color swatch.
- **Hex** — use the visual picker or type a 6-digit hex value such as `#4f46e5`.
- **RGB** — adjust red, green, and blue sliders or number inputs.

All color modes stay synchronized. Switching tabs preserves the current color, and the live icon preview updates immediately. Invalid hex values are rejected by the input and do not overwrite the current saved color.

Other icon controls are preserved: style, shape, emoji, uploaded image, and reset. Uploaded image icons must be image files under 200 KB and are stored locally as Data URLs.

## Quiz Attempt Settings

Configure saved defaults in the Quiz Builder's **Quiz Attempt Settings**. Options include original/shuffled question order, multiple questions per page or one question at a time, questions per page, optional whole-quiz time limit, and optional default per-question timer (one-question mode). Existing quizzes receive safe defaults when loaded. Clicking **Take quiz** shows a simple start/cancel confirmation, not a second settings form. Shuffle operates on a cloned attempt and never mutates saved question order. Timer expiry submits automatically for whole-quiz timers; per-question expiry advances or submits on the final question. Answers are preserved while navigating. Completed attempts are added to that quiz's local history; cards retain the latest score and show attempt count. Open History to review dates, scores, settings, and duration, or clear history with confirmation.

A single floating **Submit quiz** button is grouped with the close control and remains accessible while scrolling; Previous / Next navigation contains no Submit button. The shared submit handler confirms once, guards against duplicate submission, and timer expiry submits automatically. Long imported and saved quiz previews keep all questions in a keyboard-focusable bounded scrollbox; scroll it to review questions while the title/actions remain accessible outside. The report includes the class, score, attempt settings, and per-question submitted/correct answers.

The manual builder autosaves locally after a short debounce. If you reopen a builder while a draft exists, choose to restore it or start fresh. Use Restore draft / Discard draft controls in the builder; saving a quiz removes the draft. Closing with unsaved work warns that the draft remains available.

## Guide / Help Modal

The Guide / Help modal has five independent tabs:

- **Quick Guide** — compact usage notes.
- **Sample Data** — switch between quiz and lesson Markdown samples, preview either, and download the selected `.md` file. Loading sample data replaces current app data after confirmation and now includes a sample lesson alongside sample classes, materials, and quizzes. To import only the lesson elsewhere, download Lesson Sample and use the class's Lessons tab.
- **AI Quiz Context** — downloadable `quiz-ai-context.md` for AI assistants creating supported quiz files.
- **AI Lesson Context** — downloadable `lesson-ai-context.md`, an authoring guide that explains the lesson renderer's safe Markdown subset and provides a complete example. Use it as context when asking another AI to draft importable lessons; the AI must not add unsupported Markdown or invent CQStudio behavior.
- **Data / Backup** — export/import/reset controls and a downloadable data backup guide.

## Data / Backup

CQStudio stores data in this browser's `localStorage` under `offlineClassQuizStudio.v1`. It can run locally or as a static hosted website, including Vercel; hosting does not provide cloud sync. Data is separate per browser, device, and profile. Quiz and lesson processing occurs in-browser. Use Export Data / Import Data to move data between devices.

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

- Keep the app browser-local-first and dependency-free; a hosted static copy may require internet to initially load.
- Preserve localStorage compatibility under `offlineClassQuizStudio.v1`.
- Keep export/import/reset safeguards working before major refactors.
- Update migration/sanitization helpers when changing the saved data shape.
- Update this guide, `APP_CONTEXT.md`, and the JavaScript downloadable guide/context strings when changing supported syntax or workflow.
- Run `node --check app.js` after editing JavaScript. The unused `js/` module experiment is incomplete and is not loaded.
