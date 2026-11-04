# Launch checklist

Start with [the browser-only GitHub → Vercel + Supabase guide](GITHUB-DEPLOYMENT.md).
The owner uses provider dashboards and GitHub Actions; a local checkout, Node,
`.env.local`, generated header files or uploaded build folder is not required.

- Vercel imports the GitHub repository: Other framework, app root `.`, build
  `npm run build:vercel`; runner root `runner`, build `node build.mjs --vercel`.
  Leave output overrides unset. Each cloud build generates `.vercel/output`
  with exact-origin headers from its own dashboard values.
- Configure the exact GitHub repository variables/secrets in
  [the cloud template](../setup/templates/github-cloud.json.example) and enable
  `CQ_GITHUB_DEPLOYMENTS_ENABLED` when complete.
- **Deploy Supabase from GitHub** tests source/database policies before linking
  the selected project, applying pending migrations and deploying all five
  functions. It never resets or seeds production and never restores bootstrap.
- **Invite first administrator** is manually triggered on the selected branch.
  It probes live services, sends the invitation and retires the temporary hosted
  token. Verify cleanup and remove the GitHub bootstrap secret after acceptance.
- Configure hosted Auth/SMTP and database Vault through Supabase's dashboard.
  Local config files do not automatically apply hosted Auth settings.
- Run **Production availability** on `main`, verify notifications and actual
  maintenance responses. A static health 200 or a cron enqueue is insufficient.

No hosted deployment was performed while preparing the repository. A successful
source/build check does not certify live email, privacy boundaries or recovery.
Optional computer-based development is documented in [the developer reference](LOCAL-DEVELOPMENT.md).

## Real-service acceptance

- [ ] All requested milestones are implemented and their acceptance tests pass. Review the verification limits in README.
- [ ] Replace every legal placeholder: operator name, contact/security email, country, minimum age, processor regions/contracts, technical log retention, backup retention, applicable terms.
- [ ] Have Privacy, Terms, and storage disclosures reviewed for the actual group and jurisdiction. Assess Philippine Data Privacy Act responsibilities when applicable.
- [ ] Confirm public signup and anonymous signup are disabled in hosted Auth (local configuration alone is insufficient).
- [ ] Minimum password 12, JWT expiry 900 seconds, refresh rotation, Auth rate limits, leaked-password protection where supported.
- [ ] Custom SMTP configured, sender authenticated, real invitation and password-reset emails tested.
- [ ] First admin accepted the current policy; bootstrap Edge secret removed; all admins use MFA; secure succession arranged.
- [ ] Distinct dev/prod Supabase projects; separate app/runner Vercel projects; matching GitHub/dashboard values and branch selection verified.
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
