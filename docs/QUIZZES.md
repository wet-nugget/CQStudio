# Markdown quiz format

Use a UTF-8 `.md` file, at most 2 MiB. The first nonempty line is `# Quiz: Title` (maximum 200 characters). Each question starts with `## type | points`; points are optional (default 1), from 1–100. Types use the exact names below. Reserve `##` headings for questions; use `###` for headings inside prompts. Prompts are sanitized Markdown; raw HTML and remote images are omitted. The configured workspace question limit defaults to 200.

See [the seven-type sample](samples/quiz.md). Import replaces the builder's current list, so save existing work first. Errors include source line numbers; structural errors identify the question header. Unknown directives are rejected when used for an incompatible type.

| Type | Answer format |
| --- | --- |
| `multiple_choice` | `- [ ] Option` and exactly one `- [x] Correct option` |
| `multiple_response` | Same checkbox syntax; one or more checked options |
| `matching` | At least two `Pair: left => right` lines |
| `true_false` | `Answer: true` or `Answer: false` |
| `identification` | `Answer: accepted answer | alternate answer`; optional `Case-sensitive: false` |
| `fill_blank` | Prompt uses `{{1}}`, `{{2}}`, … once each, in order. One `Blank: answer | alternative` line per blank; optional `Case-sensitive: false` |
| `enumeration` | One `Item: answer` line per required item; optional `Order-matters: false` and `Case-sensitive: false` |

Options and individual answers are at most 2,000 characters. Identification accepts listed alternatives. Answers normalize Unicode (NFKC), trim outer whitespace, and collapse repeated whitespace; case is ignored unless requested. Multiple response requires the exact set, with no duplicates. Matching requires every pair. Fill-in-the-blank requires every blank. Enumeration requires all listed items and, if configured, their order. A question earns all of its points only when completely correct; there is no partial credit in v1.

Quiz question order may be shuffled. Draft answers, order, whole-quiz deadline, and first-visit per-question deadlines are saved to this user's local browser storage and cleared on successful submission or session cleanup. Timers continue while navigating or refreshing. Per-question time starts when a question first appears; in paged mode all questions on that page start together. Whole-quiz expiry submits the current answers. An expired individual question becomes read-only; single-question mode advances automatically. Preview never records an attempt.

Scores are calculated in the client for self-practice and can be manipulated by the person taking the quiz. They are not verified academic results. Published content and settings are immutable; editing creates a draft version. Attempts always reference the exact version used.
