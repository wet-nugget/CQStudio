# Setting up CQStudio from this repository

**For the person doing the setup:** everything needed to build the application,
install its database/functions, configure its two websites, and verify the result
belongs in this repository. You do not need files from the original author's
computer. No hosting accounts are connected or created by these instructions.

## 1. Check that you received the complete source

Open a terminal in the cloned repository, where `package.json` is located. Use
Node 24.x. Both `.nvmrc` and `.node-version` specify 24.

```sh
node --version
npm run setup:doctor
```

The doctor works before dependency installation and without internet/account
access. It checks the complete source manifest and matching dependency lockfile.
Pending hosting/policy fields are expected in a fresh clone and are listed
separately from missing files. If a required file is missing, get the complete
repository before proceeding.

## 2. Get owner decisions once

Read [HANDOFF.md](HANDOFF.md). Copy
[the owner input form](setup/OWNER-INPUTS.example.md) to
`setup/private/OWNER-INPUTS.md`, collect all owner approvals/details together, and
keep that completed copy private. This avoids repeatedly asking who owns the
accounts, what contact to publish, who the first admin is, or who maintains backups.
The installer can determine technical project IDs and provider settings while
creating the services. Actual owner identities and purchase approvals cannot be
generated from source code.

## 3. Follow the installation order

Use [the full numbered launch guide](docs/BEGINNER-LAUNCH-GUIDE.md) for account
creation, Git branches, Supabase projects, Vercel projects, SMTP and the first
administrator. It includes copyable commands, expected results and troubleshooting.
The [deployment targets](setup/deployment-targets.json) list every project root,
build command, output directory, branch and environment-variable name.

Do the development rehearsal before production. Keep both environments' database
projects and tokens separate. The app and HTML quiz runner need different HTTPS
origins. No custom domain is required to start with assigned Vercel origins.

## 4. Generate the configuration instead of assembling it by memory

Once the real project URL, public key and app/runner HTTPS addresses exist:

```sh
npm ci --ignore-scripts
npm run setup
```

Choose development or production. The wizard validates the four public settings,
generates separate random bootstrap/maintenance tokens locally, and produces the
files for every destination. It preserves existing generated tokens on rerun;
it does not silently rotate them. It asks before replacing `.env.local` and keeps
a private backup if you agree.

**Open [setup/README.md](setup/README.md) next.** Its destination table says exactly
where every generated value goes, including the two different Supabase secret
stores and GitHub variables versus secrets. Public templates for all destinations
are included in `setup/templates/` if you prefer manual entry.

## 5. Validate, deploy and return the acceptance record

Complete and review the actual public fields in `src/config/operator.json`, put
the generated settings into their destinations, then run:

```sh
npm run deploy:prepare
npm run launch:check
npm run lint
npm run typecheck
npx tsc --project supabase/functions/tsconfig.json
npm test
npm run build
npx playwright install chromium
npm run test:smoke
```

Deploy the correct Git branch to both Vercel projects using the prepared public
headers and matching environment values. Follow the full guide to bootstrap the
first admin, remove bootstrap access, verify MFA and configure maintenance.

```sh
npm run launch:live
```

Real invitation/reset emails, storage, privacy, maintenance and backup restoration
still require actual service verification. Complete
[the acceptance record](setup/ACCEPTANCE.md) and
[the launch checklist](docs/LAUNCH.md), then return evidence and account ownership
to the owner. Do not substitute a green build for a working hosted service.

## What not to add

Do not commit `setup/private/`, real `.env` files, passwords, tokens, member data,
backups, installed `node_modules` or generated `dist`. Their replacements are
templates, a pinned lockfile and reproducible build commands already in this
repository. See [GITHUB-PUSH.md](GITHUB-PUSH.md) for the complete source list.
