# CQStudio

**Deploy from the GitHub repository:** start with [START-HERE.md](START-HERE.md)
and the [browser-only Vercel + Supabase guide](docs/GITHUB-DEPLOYMENT.md). The
repository owner does not need a local checkout, a terminal or built files.

CQStudio is an invite-only study workspace for a small group, built with React,
strict TypeScript, Vite and Supabase. It includes accounts/policy acceptance,
profiles and TOTP, classes and Markdown lessons/notes, a private-file vault,
seven-type/manual/Markdown and isolated HTML quizzes, versioned review/publishing,
private practice history/progress/import/export, group chat, notifications,
search, administration and workspace metadata export. No analytics SDK or public
content-sharing links are included.

## GitHub deployment

- **Vercel:** connect this repository to separate app and HTML runner projects.
  The app root uses `npm run build:vercel`; the runner root is `runner` and uses
  `node build.mjs --vercel`. Framework is Other; output-directory override stays
  unset. Each builds `.vercel/output` with exact-origin headers generated from
  its cloud environment, so tracked header files never need local substitutions.
- **Supabase:** the included **Deploy Supabase from GitHub** workflow runs the
  reusable app/database checks, applies pending migrations and deploys the five
  Edge Functions. `main` uses production settings; `development` uses development
  settings. It never resets a hosted database or seeds production.
- **First admin:** run **Invite first administrator** in GitHub Actions. It checks
  the live services, sends a protected invitation, and cleans up the hosted
  bootstrap secret. Each admin chooses their own password and enables MFA.
- **Operations:** Production availability and Daily database touch workflows use
  the documented dashboard settings. Real Auth/SMTP, storage, privacy, maintenance,
  monitoring and database-plus-Storage restoration must be verified before launch.

Set the repository variable `CQ_GITHUB_DEPLOYMENTS_ENABLED=true` only after the
required dashboard settings are complete. All variable/secret names are listed
in [the cloud settings template](setup/templates/github-cloud.json.example).
Passwords, access tokens and actual environment files never belong in source.
Only the publishable/anon key is browser-safe; never use service credentials.

No hosting projects or live deployments have been created/verified by preparing
this repository. Public operator/provider/retention details remain to be supplied
and reviewed in `src/config/operator.json`. Minimum member age is 18.

## Handoff and acceptance

- [Files to push](GITHUB-PUSH.md)
- [Installer/owner handoff](HANDOFF.md)
- [Full dashboard walkthrough](docs/GITHUB-DEPLOYMENT.md)
- [Launch checklist](docs/LAUNCH.md)
- [Verification record and limits](docs/VERIFICATION.md)
- [Security and incident procedure](docs/SECURITY.md)
- [Administration, backups and recovery](docs/ADMIN.md)

## Optional local development

Developers may use Node 24.x and the included dependency lockfile:

```sh
npm ci --ignore-scripts
npm run setup:doctor
npm run dev
```

Without Supabase settings, `/setup` explains configuration, `/preview` is a
labelled mock workspace and `/design` is the component guide. Preview never
records a real attempt or substitutes mock data into authenticated routes.
See [local development](docs/LOCAL-DEVELOPMENT.md) and the optional
[local configuration tools](setup/README.md).

Source completeness is checked against `setup/required-files.json`; regenerate
it with `npm run handoff:manifest` when adding/removing source files. This check
is part of CI. Build checks enforce security/caching rules, private robots and
bundle budgets. Browser checks cover fixture-backed user flows, accessibility,
responsive layouts and the actual separate-origin quiz sandbox; they do not
certify hosted provider behavior or formal accessibility compliance.

[Architecture](docs/ARCHITECTURE.md), [quiz formats](docs/QUIZZES.md),
[HTML quizzes](docs/HTML-QUIZZES.md), [storage inventory](docs/STORAGE.md),
[performance checks](docs/PERFORMANCE.md) and [design guide](docs/DESIGN.md).
