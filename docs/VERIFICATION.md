# Local verification record

## Self-contained GitHub installer handoff — 4 November 2026

Added a single installer entry point (`START-HERE.md`), Node 24 version files,
all public configuration templates, a destination map, owner/acceptance forms,
an offline full-source manifest check, and an interactive local setup wizard.
The wizard creates consistent browser/runner/Edge/bootstrap/Vault/monitoring
settings in an ignored private directory. New tokens are independent and existing
ones are preserved or rejected for inspection rather than silently rotated.
No GitHub or hosting account connection is used by these commands.

The interactive wizard was exercised in an isolated temporary directory. Matching
bootstrap/maintenance destinations, owner-only file permissions and `.env.local`
selection were verified without contacting a service. The offline doctor passed
against the source manifest before dependency installation in the clean source
copy. Unit tests now total 52 across 18 files; app/Edge TypeScript, source checks,
secret-pattern scan and the build pass. The previous 33-browser-test result below
is unchanged; browser tests were not rerun for this installer-only change.

No real project addresses, credentials or operator facts were invented. Hosted
configuration and real-service acceptance remain the installer's work using the
included instructions. Source completeness is separate from launch readiness.

## Launch preparation — 4 November 2026 (Asia/Manila)

Fresh local checks after the launch fixes:

| Check | Result |
| --- | --- |
| Source/schema/contrast checks | Passed |
| Application and Edge Function TypeScript | Passed |
| Unit/regression tests | 48 tests across 17 files passed |
| Chromium browser suite | 33 tests passed |
| Built HTML quiz through actual app/runner UI | Passed: open → report result → save private attempt, with Cache API deliberately unavailable |
| Save recovery | Provider failure → retry → saved result; blocked local draft removal no longer misreports a successful server save |
| Client navigation | A lesson draft does not carry into another class |
| Separate-origin sandbox and tested accessibility/responsive checks | Passed |
| Build/header/bundle checks | Passed; initial JS approximately 102.8 KiB gzip |
| npm audit | Zero reported vulnerabilities |
| Credential pattern scan | Passed; supplementary pattern check only |
| Production configuration guards | Expected rejection verified for both unconfigured app and local-origin runner |
| Live availability checker | Mocked success and broken isolation-header cases passed; no hosted projects exist to probe |

Fixes include bounded browser provider requests/uploads, form failure recovery,
safe draft cleanup after successful saves, optional HTML caching that tolerates
browser privacy/quota restrictions, route-scoped form/quiz state, and an error
fallback that works before the router mounts. Edge server failures now expose a
random request ID and log only that ID/status, without private exception text.

Production preparation validates browser-safe credentials, exact distinct HTTPS
origins, environment-file precedence, reviewed operator disclosures, and the
runner's parent origin. `npm run deploy:prepare` prepares both Vercel projects;
`npm run launch:check` checks their public configuration. The public policy
configuration has minimum age 18; actual operator/contact/country, provider and
retention details, and review are still outstanding. No values were invented.

Browser tests use disposable setup/fixture artifacts, mocked Supabase responses,
and a separate local HTTPS runner with an ephemeral test certificate. They do
not exercise hosted SMTP, Supabase authorization/Realtime or Vercel routing.
No SQL migrations or RLS policies were changed in this pass. The database and
Storage test results below are historical and were not rerun in this pass; no
disposable test containers were running.

Supabase and Vercel projects have not been created. Live migrations/functions,
Auth/SMTP/MFA, backups and restore rehearsal, scheduling, production response
headers and real-account flows must still be verified. The included GitHub
availability workflow is prepared but has not run and needs repository variables
and operator failure notifications. No deployment, Git commit, or external CI
run was performed. See `docs/LAUNCH.md` for the remaining steps.

## Earlier verification

Verified on 1 November 2026 (Asia/Manila), with no hosted Supabase credentials configured.

| Check | Result |
| --- | --- |
| Strict application TypeScript + source safety checks | Passed |
| Edge Function TypeScript | Passed against pinned SDKs; not deployed |
| Vitest | 35 tests, 13 files passed |
| Fresh SQL migration application | All 26 migrations applied to disposable Supabase Postgres 17 |
| pgTAP | 169 assertions passed |
| Real local Storage API | Reserved upload accepted; raw authenticated download denied; service copy cleared ownership; finalization verified size/MIME; signed attachment downloaded |
| Playwright Chromium | 29 smoke/UI tests passed |
| axe | No serious/critical violations in tested public/main member/admin routes, light/dark |
| Sandbox boundary | App storage, network request, top navigation, and forged-result probes blocked under real response CSP |
| Build/header/bundle budgets | Passed; initial JS approximately 102.7 KiB gzip; all noninitial JS chunks <100 KiB gzip |
| npm audit | Zero reported vulnerabilities in the installed lockfile |
| Credential pattern scan | Passed; supplementary pattern check only |

The database tests cover private attempts/reflections, disabled/revoked sessions, policy gates, roles/last admin, invitation/capacity boundaries, upload limits, quiz validation/version survival, imports/exports, chat throttling after deletion, notifications, MFA assurance, retention boundaries, asset cleanup, draft HTML metadata visibility, and deletion cascades.

The browser workflow uses fixture API responses with the real React routes and Auth SDK. Database/Storage authorization is tested separately against disposable services. Browser tests include invite acceptance → login → class creation → quiz attempt, refresh recovery, policy re-acceptance, local/session/IndexedDB/Cache cleanup, main routes and editor/admin tabs, mobile overflow/navigation/keyboard quiz input, and the separate-origin runner probe. Static fixture artifacts live under `/tmp`; production environment files and deployment output are not repurposed for test data.

The operator Storage backup utility was tested with mocked signed downloads, checksum/resume verification, corrupt-file rejection, and path traversal rejection. The hosted dump/download/restore procedure has not been performed.

Still requires real dev/prod setup: hosted Auth configuration and email/SMTP delivery, MFA/recovery with real identities, exact-origin Vercel deployment/headers, Realtime provider behavior, cron/Vault/keep-alive scheduling, backup restoration, processor regions/retention, legal placeholder review, and a live mobile Lighthouse report. Lighthouse was not installed per the dependency decision. Formal WCAG compliance is not certified; automated checks and mobile keyboard smoke do not replace the launch manual pass.

No external deployment or GitHub Actions run was performed. This workspace's `.git` directory is empty/read-only, so no Git commit was created. The dependency lockfile and workflows are included as source files.

## Ink & Violet UI verification

The CQStudio name is retained. The local mock workspace is `/preview`; `/design` documents the component kit. The live shell, dashboard, lessons, vault, quiz practice, chat, profile tabs, and review drawer use the redesigned surfaces and controls. Supabase credentials remain blank. SQL migrations/RLS were unchanged by this visual work; the database results above are from the preceding backend verification.

- `npm run lint`: passed, including no-gradient source scan, schema type signatures, browser-source safety, and 34 numeric text/background contrast pairs per theme (dark minimum 5.28:1, light 4.95:1).
- `npm run typecheck`: passed.
- `npm test`: 35 tests passed across 13 files, including pluralization and valid/isolated seven-type mock data.
- `npm run build`: passed security/cache/header and gzip budgets; initial JS approximately 102.7 KiB gzip and all lazy chunks below 100 KiB gzip.
- `npm run test:smoke`: 29 Chromium tests passed, including all eight requested viewport sizes on six primary preview screens, both themes, primary-action hit testing, card footer alignment, component-guide axe checks/focus restoration, keyboard chat resizing, and single-composer behavior.
- Existing invite, policy gate, login, class creation, persisted quiz attempt, session-cache cleanup, main-route/admin axe, mobile keyboard navigation, and HTML isolation smoke checks still pass.
- Final desktop dashboard, class/reader, vault, quiz and 390px phone screenshots were inspected locally. The dashboard fits one pane at 1366×768; phone cards scroll within the fixed shell. Keyboard-height tests simulate a smaller visual viewport.

Real iOS Safari/Android Chrome keyboard behavior, orientation and 200% browser/text zoom, Lighthouse 90+ under a real throttled mobile profile, and hosted Auth/Realtime delivery remain manual launch checks. No Lighthouse dependency, tracking service, PWA, or optional browser storage was added. See `docs/DESIGN.md` for the route/component/layout map.

## Minimal interface pass

The follow-up refinement preserves every Ink & Violet color token and the CQStudio name. Dashboard cards were reduced to four flat sections; decorative labels, repeated badges, slogans, and setup/sign-in illustrations were removed. The sidebar and class actions were simplified, with direct labels and empty states throughout. No dependencies or backend policies changed.

Strict TypeScript, lint/contrast checks, 35 unit tests, and the production header/bundle build passed. The initial JS is approximately 102.6 KiB gzip. All 29 Chromium checks passed after updating selectors for the shorter labels, including eight viewport sizes, light/dark axe checks, primary-action visibility, keyboard chat and quiz behavior, and the existing authenticated workflow. Desktop and phone dashboard screenshots were visually reviewed. The previously listed real-device and Lighthouse checks remain pending.
