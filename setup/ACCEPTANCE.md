# Installer completion record

Complete this checklist in a private GitHub issue or agreed private record; no
local file is required. Developers may optionally use `setup/private/ACCEPTANCE.md`.
Keep sensitive evidence/member data outside source. Record identifiers, not credentials.

## Environment and release

- Owner/operator and responsible installer:
- GitHub repository and release commit:
- Development app / runner origins:
- Development Supabase reference:
- Production app / runner origins:
- Production Supabase reference:
- App / runner deployment IDs:
- Verification date and timezone:

## Required evidence

- [ ] GitHub Checks source-completeness job passes.
- [ ] GitHub app/database checks and both Vercel builds pass.
- [ ] Database migrations and hosted permissions verified in development.
- [ ] Both environments use their own projects, addresses, keys and tokens.
- [ ] Hosted Auth disables public/anonymous signup; SMTP and exact redirects work.
- [ ] Real invitation, policy acceptance, login, reset and administrator MFA tested.
- [ ] First administrator and successor have accepted; each chose their own password.
- [ ] Hosted bootstrap secret removed after acceptance; local copies retired.
- [ ] Lessons, notes, manual quizzes, HTML preview/practice and result persistence tested.
- [ ] Private attempts/reflections unavailable to other members and app administrators.
- [ ] Upload, signed download, account deletion and sign-out cleanup tested.
- [ ] Actual response headers, SPA routes and runner isolation verified.
- [ ] Public operator/provider/retention/terms details reviewed and complete.
- [ ] Maintenance Vault secrets, cron and actual function responses verified.
- [ ] Production monitor ran and its operator notifications are confirmed.
- [ ] Database and file-byte backup completed; isolated restore rehearsal recorded.
- [ ] Real mobile, keyboard, zoom, accessibility and live performance checked.
- [ ] Owner's account ownership, billing and recovery access verified.

## Results to return

- Live-check result and run reference:
- Real-account acceptance result and evidence location:
- Monitor run / notification destination / response owner:
- Backup location / scope / retention / restoration result:
- Policy version / review record:
- Secret-manager labels and responsible owner (no values):
- Known limitations and next action for each:
- Owner acceptance / date:
- Installer access retained, reduced or removed by agreement:

Use [the full launch checklist](../docs/LAUNCH.md) when deciding whether to admit
real members. A passed source check or a Vercel Ready label alone is insufficient.
