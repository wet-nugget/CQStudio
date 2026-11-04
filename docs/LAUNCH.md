# Launch checklist

For the full walkthrough, start with the [step-by-step beginner launch guide](BEGINNER-LAUNCH-GUIDE.md). This file is the shorter operator checklist.

## Preparing the two deployments

The code can be tested without hosting accounts. Production remains blocked until
the real deployment configuration and operator disclosures are supplied. A local
build is not certification of hosted Auth, email delivery, storage, or recovery.

1. Create separate development and production Supabase projects. Follow the
   migrations, Edge Functions, Auth/SMTP, first-admin and maintenance setup in
   README. Never use the production database for fixtures or smoke tests.
2. Create two Vercel projects from the same repository: app at the repository
   root, runner with Root Directory `runner`. Reserve their final addresses.
3. Set the four browser-safe `VITE_` values in `.env.local` and in the **app**
   Vercel project's Production environment. Use real origins, with no paths.
   Set `APP_ORIGIN` to the app's exact HTTPS origin in the **runner** Vercel
   project's Production environment and Supabase Edge secrets. Service-role,
   bootstrap and maintenance credentials never belong in `VITE_` variables.
4. Complete `src/config/operator.json` with the actual operator/contact/country,
   hosting and email processor details, retention, and applicable terms. The
   minimum age is 18. Review the rendered Privacy/Terms/storage pages and the
   configured services, then set `reviewed` to `true`. The fields are public;
   do not put secrets or private account information in this file.
5. Prepare and check configuration **before** Vercel creates a deployment:

   ```sh
   npm run deploy:prepare
   npm run launch:check
   npm run lint
   npm test
   npm run build
   npx playwright install chromium
   npm run test:smoke
   ```

   Browser smoke builds use OpenSSL (included on the GitHub Ubuntu runner) to
   generate a two-day local TLS certificate outside the served directories.
   Only the test browser ignores that certificate's trust error. The actual
   application still requires a separate HTTPS quiz runner in built releases.

   Use the generated app and runner `vercel.json` in the deployment checkout.
   Vercel reads these before the build. For Git deployment, commit the prepared
   public-origin headers and completed public operator configuration. The app's
   production build automatically runs configuration/policy checks when
   `VERCEL_ENV=production`. Other hosts/CLI builds can enforce them with
   `CQ_DEPLOYMENT=production`. The runner rejects local/placeholder app origins
   in production. Local setup/fixture builds remain available for development.
6. Deploy both projects, then run `npm run launch:live` from the same configured
   checkout. It verifies the static health response, SPA/asset routing, actual
   security headers, separate runner, public database policy RPC and anonymous
   rejection by the three member Edge Functions. It is read-only and prints
   check names only, never credentials or provider response bodies. It does not
   replace the real-account checks below.

Production environment values must match the prepared headers. Environment files
are read in Vite order (`.env`, `.env.local`, `.env.production`,
`.env.production.local`), with existing process values winning. Use literal
origins, not interpolated `$VARIABLE` references. The preview build can use dev
settings; prepare its headers separately in its own deployment checkout.

## Availability and failure diagnostics

`/health.json` identifies the frontend only; a static 200 response does not prove
the database works. `npm run launch:live` checks the database and runner too.
To enable the included 30-minute GitHub availability workflow, configure these
repository **variables** (all browser-safe/public):

- `CQ_PROD_APP_ORIGIN`
- `CQ_PROD_RUNNER_ORIGIN`
- `CQ_PROD_SUPABASE_URL`
- `CQ_PROD_SUPABASE_ANON_KEY`

Run **Production availability** manually once and verify your GitHub Actions
failure notifications reach the operator. Scheduled monitoring begins only after
the workflow is in the default branch and `CQ_PROD_APP_ORIGIN` is configured.
GitHub schedules are best effort; use a dedicated uptime service if you need
faster or guaranteed checks. A protected deployment must use a monitor with
appropriate authorized access; never remove access restrictions to satisfy a probe.

Edge server failures return `X-Request-ID` and log only that ID and HTTP status
in Supabase function logs. No member identity, request contents, tokens or raw
provider errors are logged. Review error counts and set provider alerts as
supported by the chosen plan. There is no third-party browser tracking SDK.

## Real-service acceptance

- [ ] All requested milestones are implemented and their acceptance tests pass. Review the verification limits in README.
- [ ] Replace every legal placeholder: operator name, contact/security email, country, minimum age, processor regions/contracts, technical log retention, backup retention, applicable terms.
- [ ] Have Privacy, Terms, and storage disclosures reviewed for the actual group and jurisdiction. Assess Philippine Data Privacy Act responsibilities when applicable.
- [ ] Confirm public signup and anonymous signup are disabled in hosted Auth (local configuration alone is insufficient).
- [ ] Minimum password 12, JWT expiry 900 seconds, refresh rotation, Auth rate limits, leaked-password protection where supported.
- [ ] Custom SMTP configured, sender authenticated, real invitation and password-reset emails tested.
- [ ] First admin accepted the current policy; bootstrap Edge secret removed; all admins use MFA; secure succession arranged.
- [ ] Distinct dev/prod Supabase projects; separate app and quiz-runner Vercel projects and origins; environment values verified.
- [ ] Browser receives only anon/publishable credentials. Service credentials are Edge secrets. No secrets in Git history, build output, artifacts, or CI logs.
- [ ] Every migration applied and official hosted type generation reviewed; RLS and limit-boundary tests pass against development.
- [ ] Production headers, CSP, asset cache behavior, noindex, robots, and SPA routing verified from actual HTTP responses.
- [ ] Preview deployments access restricted where supported, connected only to development Supabase. If provider access restriction is unavailable, adopt an appropriate operator-approved restriction before sharing previews.
- [ ] Runner isolation tests pass: app storage inaccessible, network denied, top navigation denied, forged/result flooding rejected.
- [ ] Retention jobs and external daily keep-alive enabled and observed running. Do not assume an internal cron guarantees a free project stays active.
- [ ] Monthly database + Storage backup running; restoration into isolated dev rehearsed; retention documented.
- [ ] No serious/critical axe issues; light/dark/mobile and full keyboard paths checked; reduced-motion supported. Formal compliance not certified.
- [ ] Bundle budgets and dashboard Lighthouse mobile target manually verified (no Lighthouse dependency is installed) on a representative live build. No authenticated API data cached by CDN/service worker.
- [ ] Invite → accept policy → login → class → quiz smoke passes with dedicated development accounts.
- [ ] Account deletion, partial-failure retry, own-data export, consent update, sign-out-all, and all local cache cleanup verified.
- [ ] Operator understands: sandboxing reduces risk, uploaded code is not safe; no malware scanning; no end-to-end encryption.
