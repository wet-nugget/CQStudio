# CQStudio UI guide

The project and product remain **CQStudio**. The interface uses Ink & Violet with a minimal presentation: plain page titles, four dashboard sections, thin separators instead of a grid of cards, fewer badges, and direct copy. No external fonts, raster artwork, icon package, component framework, analytics, or offline worker. Tailwind CSS and its Vite integration are pinned to 4.3.3. React and TypeScript remain unchanged.

## Running the interface

Run `npm ci --ignore-scripts` and `npm run dev`. Credentials may stay blank.

- `/preview`: labelled local mock dashboard. It never contacts Supabase. Sample content changes remain in memory across navigation and reset on reload; preview quiz answers, flags, appearance, and unsent chat drafts survive refresh.
- `/preview/classes`, `/preview/classes/biology`, and `/preview/classes/biology/notes`: class cards, two-step creation drawer, master/detail lessons, Markdown reader, notes, quiz list, linked files, and discussion.
- `/preview/vault`: searchable file metadata, folder navigation, nested folder creation, filters, Saved, CSV export, details drawer, local upload metadata, pinned pagination. Sample files contain no downloadable binaries. Actual uploads/downloads remain on the authenticated `/vault` route.
- `/preview/quizzes/cell-check`: settings and preview; `?take=1` opens the seven-type question experience. The shared practice component also serves real authenticated quizzes. Scores in the preview are never recorded as server attempts.
- `/preview/chat`: full-page chat, local message creation and draft restoration. Header chat button or `C` opens the docked panel outside quiz taking.
- `/preview/admin`: members, review drawer, usage, activity, and settings. Sample role/status/review mutations work in memory. Real invitations, limits, exports, and account actions retain their existing Edge Function and RLS paths. Preview invitation forms explicitly send no email.
- `/preview/settings/profile`, `/appearance`, `/security`, `/privacy-data`: profile form, geometric avatars, theme/density, and links to real account controls. Preview profile submissions validate the form without changing a real account.
- `/preview/progress`, `/preview/notifications`: sample private progress and notification state.
- `/design`: component states, token swatches, 30 avatars, phone/tablet/desktop canvas controls, modal and drawer demonstrations.

Existing authenticated routes remain available. The shared shell, theme, navigation, dashboard, class reader, class-creation dialog, settings tabs, vault cards/table/details/filter/upload drawers, chat layout, and quiz taking have been updated without changing SQL authorization. No production data is replaced by a mock fallback.

## Tokens and layout

`src/styles/tokens.css` contains the two palettes, type, spacing, shape, density, motion, and Tailwind `@theme` mappings. `src/styles/minimal.css` refines presentation without changing those color tokens. Dark is the default. System mode listens to `prefers-color-scheme`; the root `data-theme`, `color-scheme`, and theme-color metadata update together. The light success token is slightly darker than the supplied swatch (`#137333`), as is the light accent (`#A34908`), so small text also passes on sunken surfaces. `scripts/check-theme.mjs` verifies 34 text/background pairs for each palette at 4.5:1 or better.

The system sans stack is used throughout. No font requests. Content panels use 12px radii; controls retain 10px radii and dialogs keep the original 16px shape. Body text is 15px with 1.5 line height; reading text is capped at 70ch. Violet eyebrows are reserved for technical quiz/lesson metadata; page headers use plain titles. Spacing follows 4px increments. Controls are 36px in compact desktop mode, 44px on coarse pointers, with 48px answer options. Input text is at least 16px on touch. Neutral shadows appear on floating layers only. Reduced-motion disables transitions, pulses, and smooth scrolling. Source lint rejects `gradient(` in every source/CSS file.

Tailwind breakpoints are declared in the token file: sm 480, md 768, lg 1024, xl 1280, 2xl 1536px. Shared native media rules in `src/styles/ui.css` use those boundaries; feature components share `useMedia` rather than separate mobile pages. Container queries reveal lesson outlines and prioritize table columns based on the available pane width.

| Width | Navigation | Content |
| --- | --- | --- |
| 320–767 | Fixed top bar and Home/Classes/Vault/Chat/Me bottom tabs; navigation sheet | Single column, stacked dashboard sections; class detail full-screen sheet; vault cards and filter sheet |
| 768–1023 | Icon rail, top bar, no bottom tabs | Two-column dashboard sections, master/detail class, file table, docked chat |
| 1024–1279 | Expanded/collapsible sidebar and top bar | Two-column dashboard sections, master/detail, docked question palette |
| 1280+ | Expanded/collapsible sidebar and optional right pane | Four flat dashboard sections in two columns; dashboard fits 1366×768; content maximum 1440px |
| Landscape phone | Compact top bar and bottom navigation | Collapsed descriptions, two-column option layout, compact chat composer |

The shell is `100dvh`, bounded by `visualViewport.height` when a keyboard changes the usable viewport. Top/bottom navigation, actions, and legal footer do not scroll. The main content pane owns ordinary page scrolling. Class list/reader, file list, quiz question, and chat history have explicit `min-height:0` and their own designated scrolling region. Primary actions and quiz/chat footers remain outside those regions. Safe-area padding protects bars, readers, and sheets. The necessary-storage notice occupies a shell row and never overlays actions.

## Internal component kit

`src/components/ui/kit.tsx` provides Button, IconButton, labelled Input and Select, a native datalist Combobox, Tabs/SegmentedTabs, Badge, Progress, Ring, Skeleton, EmptyState, Dialog, Drawer, ResponsiveDialog, Menu, Toast, Tooltip, and CardList. `DataTable.tsx`, `CommandPalette.tsx`, `Avatar.tsx`, and `WorkspaceLayout.tsx` complete the kit. Heavy tables, search palette, Markdown, reader, avatar picker, and exports are imported dynamically. Both layouts use one set of route components.

Native modal dialogs provide focus containment and Escape handling; every sheet has a visible Close button. Menus use native buttons with normal Tab operation and Escape returns focus to their trigger. Timers, toasts, and chat have accessible status/log regions. Scrollable chat history is keyboard focusable. Correct/incorrect labels include icons and text. HTML quiz security remains isolated in the separate runner project.

`Ctrl/Cmd+K` searches routes, classes, lessons, quizzes, files, and create/upload/invite actions. Arrow keys and Enter select results. `?` opens shortcuts. `C` toggles chat except while taking a quiz, where the letter selects option C. In quiz questions, 1–9/A–I select options, F flags, and Enter advances; focused native controls retain their normal keyboard behavior. Matching uses selects. Answers, flags, order, and timer deadlines persist through navigation and reload. Result filters are All/Missed/Flagged, with answers collapsed initially.

## Data and storage boundaries

`src/features/workspace/api/model.ts` defines `WorkspaceAccess` and typed snapshot records. `mock.ts` implements that boundary for the preview only. Authenticated features continue to use the existing typed Supabase APIs, live Realtime subscriptions, and RLS. Mock records never enter the authenticated query cache or Supabase.

Per-user `cqstudio.user.<id>.ui` stores theme, density, collapsed sidebar, last class and tab. Preview uses the reserved user name `preview`. The canonical storage inventory is `src/lib/storage.ts`, rendered on `/storage`, and mirrored in `docs/STORAGE.md`. All UI/draft keys share the existing sign-out/account-switch cleanup prefix. No service worker or optional storage has been added.

## Acceptance record

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `PLAYWRIGHT_BROWSERS_PATH=/tmp/cqstudio-browsers npm run test:smoke` (or install the existing Playwright Chromium dependency into its standard browser directory first).

- Source lint checks forbidden gradients, browser secret names, unsafe execution, SQL-generated types, and numeric palette contrast. Build checks enforce CSP/security/cache headers and gzip budgets.
- `tests/smoke/ui.spec.ts` checks dashboard, class, vault, question, chat, and admin at 320×568, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1920×1080, and 844×390. It asserts no horizontal/page-level overflow, visible primary actions, coarse-pointer primary targets, and a desktop dashboard that fits its pane.
- Browser interaction tests cover the class drawer, command palette, saved-file filtering, quiz answers/flags after reload, and reduced viewport height for chat and fill-in answers. A docked-chat test verifies keyboard resizing and that the full chat route keeps a single composer. These keyboard-height checks are a simulation, not real mobile keyboard certification.
- Axe checks the six preview screens in both themes. Existing smoke tests exercise invite/policy/login/class/quiz/cache cleanup, public/legal accessibility, authenticated pages/admin tabs in both themes, and HTML sandbox isolation.
- Unit tests cover the plural helper, all seven scoring types, import validation, valid seven-type preview content, preview data isolation, last-admin simulation, and the existing session cleanup behavior.
- Desktop and phone screenshots are inspected locally. A separate final run/result record is in `docs/VERIFICATION.md`.

Still requires operator/device verification: actual iOS Safari and Android Chrome keyboards, orientation and 200% browser/text zoom, a manual keyboard pass on those devices, and Lighthouse mobile performance/accessibility 90+. No Lighthouse dependency was added, as requested. Automated axe/Chromium checks do not certify formal WCAG 2.2 AA compliance. Real hosting performance, LCP/INP/CLS under throttling, and hosted Supabase workflows require the deployment environment.

## Minimal presentation refinement

The later design refinement keeps CQStudio and the Ink & Violet palette. The dashboard now has Continue studying, Quiz, Recent files, and Updates; progress remains available through the study section and navigation. Motivational slogans, decorative header labels, progress rings on the dashboard, duplicate study actions, card status badges, and setup/sign-in illustrations were removed. The setup screen is a short checklist; sign-in is one column. Class cards retain their useful progress, but Open class is a text action rather than a full-width filled button. Form labels and empty states use direct language.
