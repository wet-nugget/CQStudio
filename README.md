# CQStudio

**Installer: begin with [START-HERE.md](START-HERE.md).** The repository includes a guided setup command, every configuration template, a complete source manifest, and an offline completeness check. Run `npm run setup:doctor` after cloning.

Pushing this project to GitHub? Use the [exact file checklist](GITHUB-PUSH.md). Local dependencies, generated output and private configuration are excluded by `.gitignore`.

Another person deploying this project? Start with [the deployment handoff](HANDOFF.md), then follow the linked full setup guide.

A private study workspace for one small group, built with Vite, React 18, strict TypeScript, and Supabase. The app and isolated HTML quiz runner deploy as **two static Vercel projects on different origins**.

Implemented: invite-only membership and policy acceptance, profiles/30 avatars/themes/TOTP, classes and Markdown lessons, notes, private progress, reserved-upload vault, all seven quiz types with manual/Markdown import, isolated HTML quizzes, versioned publishing/review, practice history and private-data import/export, shared chat, notifications, search, admin settings/usage/activity, and workspace metadata export. There are no analytics SDKs, public content links, or offline writes.

Credentials are intentionally blank. Run the app to see `/setup`, the legal templates, `/preview` (an explicitly labelled local mock workspace), and `/design` (the component guide). The preview never calls Supabase or substitutes sample data into authenticated pages. Hosted Auth/SMTP, production deployment, backups, and a real Lighthouse mobile score still need operator verification. See [the launch checklist](docs/LAUNCH.md) and [local verification record](docs/VERIFICATION.md).

Production preparation: complete the public operator details in `src/config/operator.json` (minimum age 18), set the real public deployment environment, run `npm run deploy:prepare`, then `npm run launch:check`. Vercel production builds automatically reject missing/placeholder settings and incomplete/unreviewed policies. After deploying both projects, run `npm run launch:live`. The launch guide explains the included availability workflow and real-service acceptance checks; neither a passing local build nor a static health response proves the hosted service is ready.

First deployment? Follow the [step-by-step beginner launch guide](docs/BEGINNER-LAUNCH-GUIDE.md), which includes account setup, the clean Git copy required by this workspace, every environment setting, development rehearsal, production deployment, first administrator, monitoring, backups, and troubleshooting.

See [the UI design guide](docs/DESIGN.md) for tokens, responsive layouts, components, and the acceptance test record. The project remains **CQStudio**.

## Local app

Use Node 24 LTS (minimum 22.12) and npm. Versions are exact, the lockfile is included, and package install scripts are disabled.

```sh
npm ci --ignore-scripts
cp .env.example .env.local
npm run dev
```

Leave values blank to use the local preview and design guide, or supply browser-safe values for the hosted **development** project:

| Variable | Location | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | App build/local environment | Dev project URL |
| `VITE_SUPABASE_ANON_KEY` | App build/local environment | Anon JWT or publishable key; never a service key |
| `VITE_APP_ORIGIN` | App build/local environment | Exact app origin |
| `VITE_QUIZ_RUNNER_ORIGIN` | App build/local environment | Exact, different runner origin |
| `APP_ORIGIN` | Edge secrets; separately runner build environment | Allowed app origin / invitation redirect |
| `BOOTSTRAP_TOKEN` | Temporary Edge secret | Random one-time token, at least 32 characters |
| `MAINTENANCE_TOKEN` | Edge secret | Random maintenance-only token |

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. The service-role key belongs only in that secret store. Nothing secret belongs in `VITE_` variables, source files, command logs, or Git.

## Hosted development setup

1. Create separate **dev and prod** Supabase projects. Develop against hosted dev. Local `supabase start` is optional; automated database tests use disposable infrastructure.
2. Install/authenticate the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), link dev, review, and apply migrations:

```sh
supabase login
supabase link --project-ref YOUR_DEV_PROJECT_REF
supabase db push
```

3. In hosted Auth settings, disable public and anonymous signups. Configure password minimum 12, JWT expiry 900 seconds, refresh-token rotation, TOTP, login/reset/invite rate limits, leaked-password protection if supported, and custom SMTP. Local `supabase/config.toml` does **not** configure hosted Auth. Set the Site URL and exact `/accept-invite` and `/reset-password` redirect URLs; avoid broad production wildcard redirects.
4. Set Edge secrets from a secret manager and deploy:

```sh
supabase functions deploy admin
supabase functions deploy account
supabase functions deploy vault
supabase functions deploy bootstrap-admin --no-verify-jwt
supabase functions deploy maintenance --no-verify-jwt
```

Bootstrap/maintenance authenticate dedicated secrets. Other functions verify the real caller using Auth and caller-scoped DB checks, then recheck administrative authority in SQL. Confirm gateway JWT mode supports your project's signing-key type; do not remove in-function verification.

5. Configure invitation email templates using `ConfirmationURL` and the allowed invite redirect; recovery uses `/reset-password`. The app consumes an implicit-flow session and removes the callback fragment. App invitation reservations default to seven days; hosted Auth token expiry is a separate provider setting. Test real email delivery and expired-link recovery with [Supabase's email-template guidance](https://supabase.com/docs/guides/auth/auth-email-templates).
6. Export `SUPABASE_URL` and `CQ_BOOTSTRAP_TOKEN` into the bootstrap process from your secret manager; run `npm run bootstrap`. It prompts for the first admin email and invokes the protected Edge endpoint without a service key. Accept the invite, choose a password, and tick Privacy/Terms acceptance. Remove `BOOTSTRAP_TOKEN` after success. Enable MFA for admins.
7. Optionally apply `supabase/seed.sql` **only to dev**. It creates demo classes/lessons without users, passwords, or invented progress.
8. In Supabase Vault, create secrets named `cqstudio_maintenance_url` (the full `/functions/v1/maintenance` URL) and `cqstudio_maintenance_token` (same value as the Edge secret), using the dashboard secret UI. The `pg_cron` cleanup job invokes this endpoint every 30 minutes. Without these values it intentionally does nothing. Verify a cleanup run before launch.

## Schema, imports, and tests

All schema changes are SQL migrations. [Architecture, ERD, routes, and policies](docs/ARCHITECTURE.md) describe the trust boundaries. Generate offline TypeScript types from migrations using `npm run types:generate`; lint checks freshness. After applying hosted migrations, review actual introspection for drift:

```sh
supabase gen types typescript --linked --schema public > /tmp/cqstudio-hosted.types.ts
supabase db lint --linked --level error
```

Quiz authoring: [seven-type Markdown format](docs/QUIZZES.md), [sample import](docs/samples/quiz.md), and [HTML authoring/runner deployment](docs/HTML-QUIZZES.md). Preview never records an attempt; scores are client-calculated self-practice. Published versions are immutable and attempts reference their exact version.

Profile → Download my data exports the caller's profile, email, chats, upload list, attempts, progress, saved items, and notifications. Import previews Merge/Replace counts and restores only private attempts/progress/saved references. It never changes roles, identity, consent, chat, or shared files. Missing/inaccessible references are skipped. Replace requires confirmation and runs transactionally.

```sh
npm run lint
npm run typecheck
npx tsc --project supabase/functions/tsconfig.json
npm test
npm run build
npx playwright install chromium
npm run test:smoke
```

Unit tests cover seven-type scoring, line-numbered Markdown parsing, HTML validation, strict backup/auth validation, CSV safety, cache cleanup, and migration safety. pgTAP tests exercise RLS, disabled/revoked sessions, private exports/imports, role restrictions, last-admin protection, reservations/limits, chat rate limiting, notifications, and historical versions. CI runs `supabase test db` on a disposable local stack. `scripts/test-database.mjs` and `test-storage-api.mjs` target only the specially named disposable Podman containers; they are not deployment tools.

Browser smoke tests cover public pages, a fixture-backed invite → accept policy → login → class → quiz workflow, refresh persistence, policy re-acceptance, sign-out cleanup, axe on main routes in light/dark, and real separate-origin CSP sandbox isolation. Setup/fixture builds go to `/tmp/cqstudio-setup-dist` and `/tmp/cqstudio-fixture-dist`; fake values never alter `.env.local`, production `dist`, or deployment configuration. CI prepares its own ephemeral app headers before checking the build. These tests do not verify hosted SMTP or provider integration. Complete the live-dev smoke in the launch checklist.

Build checks enforce security/caching headers, private robots settings, no inline app scripts, initial JS below 200 KiB gzip, and lazy chunks below 100 KiB gzip. Lighthouse was not added, per dependency preference; measure the mobile dashboard target manually before launch. See [performance checks](docs/PERFORMANCE.md).

## Deploy both static projects

**App:** Vercel root is the repository, build `npm run build`, output `dist`. Before creating a deployment, set public environment values and run `npm run headers` to prepare exact-origin `vercel.json`. Vercel reads configuration before its build; the build checks this file instead of rewriting it too late. Use a prepared checkout for CLI deployment, or commit the intended public-origin configuration for Git deployment. Environment/config mismatches fail the build.

**Runner:** Vercel root directory is `runner`, build `node build.mjs --check`, output `dist`. Prepare before deployment:

```sh
APP_ORIGIN=https://YOUR_APP.vercel.app node runner/build.mjs
```

Use that generated `runner/vercel.json` and set the same `APP_ORIGIN` on the runner project. Set its distinct origin in the app and regenerate app headers. See the [runner guide](docs/HTML-QUIZZES.md). Never serve imported HTML from the app origin. Sandboxing reduces risk but does not make uploaded code safe.

Preview deployments must use dev Supabase and access restrictions where the plan allows. Verify live response headers, SPA routing, separate origins, invitation redirects, and Storage signed attachments before launch. The private site has noindex/nofollow, disallow-all robots, and no sitemap.

## Operations, backups, and raising limits

The default singleton settings hold 30 approved+invited seats, five admins, ten open invitations, 900 MiB storage, 100 MiB/non-admin, 20 MiB files/HTML, and all requested content limits. Admin → Settings rejects limits below current usage and logs changes. A reached limit blocks only the new action. The bucket's hard per-object ceiling is 50 MiB. Raising app limits does not raise provider limits: review billing, database size, storage headroom, retention, and backup capacity when moving to a paid plan.

Daily `pg_cron` retention uses current settings (chat 90 days, activity 60, notifications 30; latest 30 full attempts per quiz/member). Retention changes require a new policy version and member re-acceptance; legal pages display current settings. Ready Storage objects have no member owner so shared files survive uploader deletion. Finalization uses a service API copy and deletes the original; failed pending objects and orphans are cleaned by the scheduled Storage API job.

Configure GitHub Actions secrets `CQ_DEV_SUPABASE_URL` and `CQ_DEV_MAINTENANCE_TOKEN` for the daily external keep-alive. Add a separate production job/secrets before launch; never reuse prod for previews. A scheduled touch does not guarantee provider uptime or prevent every pause condition.

Workspace export downloads shared-table JSON and metadata, excluding private learning data and file binaries. Perform the monthly encrypted `pg_dump`/Supabase dump **plus Storage download** and restore rehearsal in the [admin guide](docs/ADMIN.md). Set backup retention to match the completed Privacy Policy.

Required operator documents: [security/threat model and incident checklist](docs/SECURITY.md), [browser storage inventory](docs/STORAGE.md), [admin/backup guide](docs/ADMIN.md), and [launch checklist](docs/LAUNCH.md). Complete every legal placeholder and obtain review before launch. No malware scanning, end-to-end encryption, analytics, or third-party error tracking is provided.
