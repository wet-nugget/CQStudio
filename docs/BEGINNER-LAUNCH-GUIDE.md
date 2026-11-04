# CQStudio: step-by-step launch guide

Prepared for this project on **4 November 2026, Asia/Manila**.

This guide starts with a source archive, GitHub checkout or the original folder and finishes with a tested private
workspace on Supabase and Vercel. It includes the first launch and later updates.
Follow the numbered sections in order. At each checkpoint, stop if the expected
result is missing. Fix that step before continuing.

The local code passed 48 unit tests and 33 Chromium browser tests during launch
preparation. Those tests use simulated account/database responses. Your actual
hosting projects, email delivery, backups and real accounts still need the checks
below. The site has **not** already been deployed.

Dashboard labels sometimes move. The setting names and values below matter more
than their precise position. Official references are linked beside relevant steps.
Nothing in this guide requires putting a password or secret key into chat.

The repository now also includes [START-HERE.md](../START-HERE.md), an offline
`npm run setup:doctor` completeness check, and a guided `npm run setup` command.
Use [the configuration map](../setup/README.md) for its generated settings and
[the owner form](../setup/OWNER-INPUTS.example.md) to collect owner decisions once.

**If you are setting this up for someone else:** read [the deployment handoff](../HANDOFF.md)
first. “You” in the command instructions means the installer. The owner still
supplies or approves public operator details, account ownership, billing,
administrators and retention. The installer can work on their own computer.

## Contents

1. [Understand what you are creating](#1-understand-what-you-are-creating)
2. [Prepare your accounts and information](#2-prepare-your-accounts-and-information)
3. [Check your computer and tools](#3-check-your-computer-and-tools)
4. [Make a clean publishable copy and GitHub repository](#4-make-a-clean-publishable-copy-and-github-repository)
5. [Create the two Supabase projects](#5-create-the-two-supabase-projects)
6. [Create the Vercel projects and record their addresses](#6-create-the-vercel-projects-and-record-their-addresses)
7. [Configure authentication and real email delivery](#7-configure-authentication-and-real-email-delivery)
8. [Install the development database and server functions](#8-install-the-development-database-and-server-functions)
9. [Complete the policy and development environment](#9-complete-the-policy-and-development-environment)
10. [Test and deploy the development websites](#10-test-and-deploy-the-development-websites)
11. [Create the first development administrator](#11-create-the-first-development-administrator)
12. [Enable maintenance and test the real development workspace](#12-enable-maintenance-and-test-the-real-development-workspace)
13. [Prepare and deploy production](#13-prepare-and-deploy-production)
14. [Set up monitoring and operator notifications](#14-set-up-monitoring-and-operator-notifications)
15. [Back up and rehearse recovery](#15-back-up-and-rehearse-recovery)
16. [Make the final launch decision](#16-make-the-final-launch-decision)
17. [Make future updates and recover from a bad release](#17-make-future-updates-and-recover-from-a-bad-release)
18. [Optional custom domains](#18-optional-custom-domains)
19. [Troubleshooting](#19-troubleshooting)
20. [Your completed launch record](#20-your-completed-launch-record)

## 1. Understand what you are creating

There are three parts to CQStudio:

| Part | What it does | Where it lives |
| --- | --- | --- |
| Main app | Accounts, classes, lessons, quizzes, progress, files, chat and administration | Vercel |
| HTML quiz runner | Opens uploaded interactive HTML quizzes in an isolated frame | A different Vercel project/address |
| Backend | Authentication, database, private files and privileged server operations | Supabase |

An **origin** is a website's protocol and address, such as
`https://cqstudio-yourname.vercel.app`. It does not include `/login`, another
path, a query, or a fragment. Use HTTPS and omit the trailing slash in configuration.

The main app and runner need different origins. The runner is not a second study
workspace. Opening its address directly may just show “Waiting for your quiz…”.

### The recommended arrangement for this guide

Use two Supabase projects and four Vercel projects:

| Purpose | Git branch | Supabase | Main app on Vercel | Runner on Vercel |
| --- | --- | --- | --- | --- |
| Development/rehearsal | `development` | `cqstudio-dev` | `cqstudio-dev-YOURSUFFIX` | `cqstudio-runner-dev-YOURSUFFIX` |
| Real members | `main` | `cqstudio-prod` | `cqstudio-YOURSUFFIX` | `cqstudio-runner-YOURSUFFIX` |

Names above are suggestions, not addresses you already own. Choose an available
suffix, and record the actual domains assigned by Vercel. Four small static
projects keep test settings separate from live settings; confirm your chosen
plans permit this arrangement before proceeding. This guide does not quote prices
or assume a paid feature is included.

“Production” in a Vercel project's settings means that project's primary
deployment. Consequently, even the **development** Vercel projects use their
**Production** environment settings, with development Supabase values.

The general separation of staging and live databases follows
[Supabase's environment guidance](https://supabase.com/docs/guides/deployment/managing-environments).
The exact four-project arrangement is this guide's recommendation for CQStudio.

## 2. Prepare your accounts and information

### 2.1 Accounts

Have these ready:

- A GitHub account for the source repository and automated checks.
- A Supabase account for the two backends.
- A Vercel account connected to your GitHub account.
- An email delivery account that provides SMTP credentials and supports your
  verified sender. The specific provider is your choice.
- A password manager for database passwords, account recovery information and
  the two special application tokens.
- An authenticator app for administrator two-factor authentication.
- An encrypted backup location outside the code repository and outside hosting.

Enable two-factor authentication for your hosting and GitHub accounts, and store
their recovery information somewhere you can access if your phone is lost.

### 2.2 Your public operator details

Write down:

| Detail | What to use |
| --- | --- |
| Site name | CQStudio |
| Operator | The real person or organization responsible for the workspace |
| Public contact email | An inbox the operator owns, checks, and is comfortable publishing |
| Country | Where the operator is actually based |
| Minimum member age | 18; already set in this project |
| Privacy/security contact | The responsible person and working contact route |
| Retention | Actual periods you will follow for logs and backups |

Your previously stated 18–25 range is treated as an intended audience with an
18+ minimum. The app does not collect birthdays or automatically reject people
older than 25. Do not describe it as enforcing an upper age limit.

You will also need the actual hosting regions, email provider details and
applicable terms for the policy. Do not guess those values or mark a policy
reviewed just to make a build turn green.

### 2.3 Keep a private setup worksheet

Keep the following worksheet in your password manager or private operator notes,
not in the public policy file. A project reference is the identifier shown in
Supabase settings, often also the first part of its default project URL.

| Item | Development value | Production value |
| --- | --- | --- |
| Supabase project name | | |
| Supabase project reference | | |
| Supabase project URL | | |
| Supabase public/publishable key | | |
| Database password location | | |
| Main app exact origin | | |
| Runner exact origin | | |
| Bootstrap token location | | |
| Maintenance token location | | |
| First administrator email | | |
| SMTP sender email | | |
| SMTP credential location | | |
| Supabase region | | |

Keep development and production tokens/passwords separate.

## 3. Check your computer and tools

The commands below are for **Bash on Linux**, matching your current setup. Run
one command block at a time. Do not type a leading `$` prompt. Replace uppercase
placeholders with your own values; do not keep the placeholder words.

### 3.1 Open a terminal

In your file manager, open your project folder and choose the equivalent of
“Open Terminal Here”, or open your terminal application. Check:

```bash
pwd
node --version
npm --version
git --version
gh --version
openssl version
rsync --version
```

Use Node **24.x**, the version used by this project's CI. The project minimum is
22.12. If Node 24 is already installed, keep it. If you use nvm, select it with
`nvm use 24`; install it with `nvm install 24` if necessary. Otherwise follow the
[official Node installation instructions](https://nodejs.org/en/download).

On Fedora, missing supporting tools can be installed with:

```bash
sudo dnf install git gh openssl rsync
```

On Ubuntu/Debian, the corresponding commands are:

```bash
sudo apt update
sudo apt install git gh openssl rsync
```

Use only the command block for your operating system. `sudo` may ask for your
computer password without displaying characters. These commands install tools;
they do not deploy your website.

### 3.2 Define a Supabase CLI shortcut

The repository pins Supabase CLI **2.122.0** in CI. To use the same version without
changing the app's dependencies, enter this Bash function:

```bash
cqsb() {
  npx --yes --ignore-scripts=false --package=supabase@2.122.0 supabase "$@"
}
cqsb --version
```

The first run downloads the CLI and can take time. `--ignore-scripts=false` here
allows the trusted CLI package's installation step; the app itself continues to
use its existing `--ignore-scripts` dependency installation. Do not run
`npm install -g supabase` as a substitute.

This function exists only in the current terminal. Define it again after opening
a new terminal. If npm installation is unavailable on your system, install the
appropriate native package from the
[official CLI release](https://github.com/supabase/cli/releases/tag/v2.122.0)
and replace `cqsb` in this guide with `supabase`.
[Supabase CLI installation reference](https://supabase.com/docs/guides/local-development/cli/getting-started).
The temporary package-runner mechanism is documented in
[npm exec](https://docs.npmjs.com/cli/v11/commands/npm-exec/).

**Checkpoint:** each tool prints a version rather than “command not found”.

## 4. Make a clean publishable copy and GitHub repository

### 4.1 Choose the starting point that matches what you received

**A. You received the clean `CQStudio-handoff.zip` archive**

Extract it into a new empty directory named `CQStudioLaunch` in your home folder.
The archive has the project files directly at its root. On Linux, if your download
is in the usual Downloads folder:

```bash
mkdir "$HOME/CQStudioLaunch"
unzip "$HOME/Downloads/CQStudio-handoff.zip" -d "$HOME/CQStudioLaunch"
cd "$HOME/CQStudioLaunch"
ls -la
```

Use your archive's actual location if it differs. A graphical archive manager is
also fine; do not extract unrelated files into the same directory. Confirm that
`package.json`, `src`, `runner`, `supabase`, `.github`, `.gitignore`, `.npmrc` and
`.env.example` are in the working directory. Then continue at **section 4.2**.
Skip the original-machine copy block below.

**B. You received access to an existing private GitHub repository**

Authenticate with `gh auth login`, then clone the actual owner/repository into a
new directory:

```bash
gh repo clone OWNER/REPOSITORY "$HOME/CQStudioLaunch"
cd "$HOME/CQStudioLaunch"
git status --short
git branch -a
```

Replace `OWNER/REPOSITORY` with the provided repository path. This is already a
Git checkout: skip the `git init`, repository creation and initial commit steps in
section 4.2. Use the existing `development` branch, or create/push it from the
intended baseline if it does not yet exist. Continue at section 5. Keep `main` as
the agreed production branch; do not rename existing branches without coordination.

**C. You are copying directly from the original author's computer**

Your current folder's `.git` directory was empty and read-only during inspection.
It is not a working Git checkout. Do not delete or repair that special directory
in place. Make a clean working copy that excludes it and local/private files.

In your normal local terminal, run:

```bash
mkdir "$HOME/CQStudioLaunch"
rsync -a \
  --exclude='.git/' \
  --exclude='.agents/' \
  --exclude='.codex/' \
  --exclude='.aws/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='test-results/' \
  --exclude='playwright-report/' \
  --exclude='coverage/' \
  --exclude='backups/' \
  --exclude='.vercel/' \
  --exclude='.supabase/' \
  --exclude='supabase/.temp/' \
  --exclude='supabase/.branches/' \
  --include='.env.example' \
  --exclude='.env*' \
  --exclude='*.log' \
  /home/masterthebaiter/Desktop/projects/TheCQStudio/ \
  "$HOME/CQStudioLaunch/"
cd "$HOME/CQStudioLaunch"
pwd
```

If the first command says the destination already exists, stop and inspect it.
Use a new empty destination name consistently instead of merging blindly.
The source path ends with `/` deliberately: copy its contents. The original
project remains in place.

**All remaining terminal commands run from this new working copy**, unless a
section explicitly says otherwise. Keep the original folder as your reference
copy. Later code changes should be made in the working copy connected to GitHub.

### 4.2 Create a private GitHub repository

1. Sign in to GitHub in your browser. For a client/owner setup, agree who owns the
   repository before creating it. The example below creates it in your authenticated
   account; arrange the correct owner/account rather than assuming installer ownership.
2. Authenticate the GitHub command-line tool:

   ```bash
   gh auth login
   ```

3. Choose GitHub.com, HTTPS, and browser login. Follow the displayed code/link.
4. Set your Git author details for this repository. Use your own real display
   name and the verified or GitHub-provided private commit email from your
   GitHub account's **Settings → Emails**:

   ```bash
   git init -b main
   git config user.name "YOUR COMMIT DISPLAY NAME"
   git config user.email "YOUR VERIFIED OR GITHUB NOREPLY EMAIL"
   ```

5. Inspect the files and create the initial commit:

   ```bash
   git add .
   git status --short
   git diff --cached --stat
   git ls-files '.env*'
   ```

6. The last command should list **only `.env.example`**. If it lists another
   environment file, stop and remove that file from the staged changes before
   committing. Do not publish credentials even in a private repository.
7. Commit and create the remote repository:

   ```bash
   git commit -m "Prepare CQStudio source for deployment"
   gh repo create cqstudio --private --source=. --remote=origin --push
   ```

8. If `cqstudio` already exists in your GitHub account, choose another unused
   name. Do not overwrite or force-push an existing repository.
9. Open the new repository in your browser. Confirm `src`, `runner`, `supabase`,
   `scripts`, `docs` and `.github/workflows` are present.
10. Create the development branch:

    ```bash
    git switch -c development
    git push -u origin development
    ```

The project now has `main` for real releases and `development` for rehearsal.
GitHub's [new repository guide](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
is the fallback if you create the empty private repository in the browser instead.

**Checkpoint:** the repository is private, both branches exist, and no local
environment file, backup, or private key appears in GitHub.

## 5. Create the two Supabase projects

Repeat these steps once for development and once for production:

1. Sign in at [Supabase](https://supabase.com/dashboard).
2. Select your organization, or create the organization you will own/manage.
3. Create a new project named `cqstudio-dev`, then later `cqstudio-prod`.
4. Choose the plan after reviewing its current limits and billing.
5. Choose an appropriate available database region for your users and record its
   actual name. Consider your policy/processor requirements as well as distance.
6. Generate a different strong database password for each project. Save it in
   your password manager with the project name/reference.
7. Wait for the project to finish provisioning before using its API.
8. Find the project URL and public key in **Connect** or **Project Settings →
   API/API Keys**, depending on the dashboard layout.
9. Copy the URL, reference and **publishable key** into the worksheet. A legacy
   `anon` JWT key is also supported by CQStudio.

### Key names: do not interchange them

| Value | May go into the browser/app build? | Where this project uses it |
| --- | --- | --- |
| Supabase project URL | Yes | App environment and operator commands |
| Publishable key, starting `sb_publishable_` | Yes | `VITE_SUPABASE_ANON_KEY`, despite that variable's legacy name |
| Legacy `anon` key | Yes | An alternative to the publishable key |
| `service_role` or `sb_secret_` credential | **No** | Privileged server environment only |
| Database password | **No** | CLI/database administration only |
| Bootstrap token | **No** | Temporary Edge secret and bootstrap process |
| Maintenance token | **No** | Edge secret, Supabase Vault and approved maintenance job |
| SMTP password | **No** | Hosted Auth's SMTP settings |

Supabase supplies the standard `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` to its Edge runtime. Do not copy a service key into
Vercel or a `VITE_` variable. See
[Supabase's function environment reference](https://supabase.com/docs/guides/functions/secrets).

**Checkpoint:** you have two different project references and can identify which
URL/key belongs to each without guessing.

## 6. Create the Vercel projects and record their addresses

### 6.1 Import the same repository four times

In [Vercel](https://vercel.com/dashboard), use **Add New → Project**, connect your
GitHub account if prompted, and import the private repository. Grant access to
the intended repository. Repeat for the four names in section 1.

Use these settings:

| Setting | Each main app project | Each runner project |
| --- | --- | --- |
| Root Directory | Repository root; no subfolder | `runner` |
| Framework Preset | Vite | Other/static |
| Install Command | `npm ci --ignore-scripts` | Override with `node -e "process.exit(0)"` |
| Build Command | `npm run build` | `node build.mjs --check` |
| Output Directory | `dist` | `dist` |
| Node version | 24.x | 24.x |

The runner has no package dependencies. Its install override simply exits
successfully. `runner/dist` would be the wrong output value in the runner
project: paths there are relative to its `runner` Root Directory.

Vercel supports separate projects from a repository with different roots;
see [monorepo projects](https://vercel.com/docs/monorepos) and
[build settings](https://vercel.com/docs/builds/configure-a-build).

### 6.2 Expect the first builds to fail

The dashboard may start a deployment when you import. At this point the policies,
origins and credentials are not complete, so CQStudio's production guard should
reject it. This is an expected setup-stage failure. Do not remove the guard.

After each project exists:

1. Open its **Settings → Domains** or project domain list.
2. Record its stable assigned `.vercel.app` address in your worksheet.
3. If the proposed project name was unavailable, use the actual assigned domain.
4. Do not use a long, temporary, individual-deployment URL as your permanent app
   origin. Authentication and runner headers must keep matching one stable origin.

### 6.3 Set each project's tracked branch

Under **Settings → Environments → Production → Branch Tracking**, or the
equivalent production-branch setting:

- Both development projects track `development`.
- Both live projects track `main`.

Save each change. [Vercel's Git deployment guide](https://vercel.com/docs/git)
explains production branch tracking.

To avoid cross-branch preview deployments with mismatched prepared headers, set
**Ignored Build Step** to a custom command in each project:

Development projects:

```sh
if [ "$VERCEL_GIT_COMMIT_REF" = "development" ]; then exit 1; else exit 0; fi
```

Live projects:

```sh
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 1; else exit 0; fi
```

This field has unusual semantics: **0 skips, 1 builds**. These commands belong
in Vercel's Ignored Build Step field, not the normal Build Command. Keep the normal
build commands from the table unchanged.
[Ignored Build Step reference](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel).

### 6.4 Decide who can reach the hosting pages

Restrict development deployments using the deployment access controls available
on your plan. The CQStudio membership gate remains required regardless.

The main app must be able to load its runner inside an iframe. A separate Vercel
login screen or host password on the runner can interfere with that. Test access
with an invited person who is **not** signed into your Vercel account. If hosting
protection blocks embedding, choose a compatible access arrangement; do not
disable CQStudio authentication or weaken the runner sandbox/CSP.

The production runner can be reachable as a static viewer while the app's
database and quiz files remain private; it has no service key or database of its
own. The current availability checker has no Vercel protection-bypass support.
For a host-protected production site, arrange an authorized compatible monitor
before relying on that check. See
[Vercel deployment protection](https://vercel.com/docs/deployment-protection).

**Checkpoint:** the worksheet contains four real origins, each project has the
right root/branch, and the app and runner addresses are different.

## 7. Configure authentication and real email delivery

Do this in **both Supabase projects**, substituting that environment's app origin.
Verify the selected project name at the top of the dashboard before editing.

### 7.1 URL configuration

Find **Authentication → URL Configuration**:

| Setting | Exact value |
| --- | --- |
| Site URL | That environment's main app origin |
| Allowed redirect URL 1 | That app origin followed by `/accept-invite` |
| Allowed redirect URL 2 | That app origin followed by `/reset-password` |

For example, if your actual development origin were
`https://cqstudio-dev-yourname.vercel.app`, the invitation redirect would be
`https://cqstudio-dev-yourname.vercel.app/accept-invite`.
Replace the example with your real address.

Use the main app address here, not the runner. Do not add broad production
wildcards or development addresses to the production allowlist. Save.
[Redirect URL reference](https://supabase.com/docs/guides/auth/redirect-urls).

### 7.2 Authentication switches

Use the relevant **Authentication** settings/providers/session/security panels:

| Setting | Project requirement |
| --- | --- |
| Email/password authentication | Enabled |
| Public self-signup / Allow new users to sign up | Disabled |
| Anonymous sign-ins | Disabled |
| Email confirmation | Enabled |
| Minimum password length | 12 characters |
| JWT lifetime | 900 seconds, if editable in your project settings |
| Refresh-token rotation | Enabled |
| TOTP / app authenticator MFA | Enrollment and verification enabled |
| Auth rate limits | Review and configure for a small invite-only group |
| Leaked-password protection | Enable where supported by your plan |

Keep manual/social providers you do not use disabled. Do not enable CAPTCHA
without integrating its required client challenge: CQStudio currently does not
provide a CAPTCHA flow. Use its existing invitation-only access and rate limits.

The checked-in `supabase/config.toml` does not automatically apply all these
settings to an already hosted project. Verify the dashboard values directly.
[Hosted Auth configuration](https://supabase.com/docs/guides/auth/general-configuration).

### 7.3 Configure SMTP

Supabase's default email sender is restricted and is unsuitable as your launch
email setup. Configure custom SMTP before inviting real members.
[Custom SMTP reference](https://supabase.com/docs/guides/auth/auth-smtp).

1. In your email delivery provider, verify the sender/domain it requires.
2. Add the exact DNS verification/SPF/DKIM records that provider gives you.
   Do not guess record values; confirm verification in that provider's dashboard.
3. If you already have an SPF record, follow the provider's instructions for
   updating it rather than creating conflicting duplicate SPF records.
4. Open the Supabase project's **Authentication → Emails → SMTP Settings**, or
   the equivalent Custom SMTP screen.
5. Copy the following values from your chosen email provider:

   | Field | What to enter |
   | --- | --- |
   | Sender name | CQStudio, or a clear development variation for the test project |
   | Sender email | The verified sender supported by your provider |
   | SMTP host | Provider-supplied hostname |
   | SMTP port | Provider-supplied SMTP submission port |
   | Username | Provider-supplied SMTP username |
   | Password | SMTP password/token from your password manager |

6. Save, and send the provider/Supabase test email if offered.
7. Check the receiving inbox and spam folder. Confirm the sender identity.
8. Disable link tracking for authentication messages if your email provider
   offers it; modified links can interfere with verification.
9. Review both your provider's sending limits and Supabase's email limits.
   Increase only to what your intended small group needs.

The public support inbox and SMTP sending identity can be different. Owning a
Gmail-style inbox alone does not supply SMTP delivery credentials for an unrelated
sender/domain. Use the exact supported setup from your delivery provider.

### 7.4 Invitation and reset templates

In Supabase's authentication email templates:

1. Open **Invite user**. Preserve a link using `{{ .ConfirmationURL }}`.
2. Open **Reset password**. Preserve its verification link using the same
   provider-generated confirmation URL variable.
3. Change surrounding wording to CQStudio if desired.
4. Do not replace the link with just the app homepage or `{{ .SiteURL }}`.
5. Do not substitute a custom PKCE/token-hash callback: this app uses the
   existing browser implicit-flow invitation/reset callbacks.
6. Save and later test a real invitation and real reset link.

The code supplies `/accept-invite` or `/reset-password` as the redirect.
Provider token expiry and the application's seven-day invitation reservation
are separate limits; a live reservation does not make an expired email link valid.
[Email template reference](https://supabase.com/docs/guides/auth/auth-email-templates).

**Checkpoint:** the correct app URLs are allowed, public/anonymous signup is off,
and a real SMTP test message reaches your inbox.

## 8. Install the development database and server functions

### 8.1 Confirm your terminal's location and branch

```bash
cd "$HOME/CQStudioLaunch"
git branch --show-current
cqsb login
```

The branch should be `development`. Follow the Supabase CLI login instructions.
If `cqsb` is missing, redefine the function from section 3.2.

### 8.2 Link only the development project first

```bash
read -r -p 'DEVELOPMENT Supabase project reference: ' CQ_TARGET_REF
cqsb link --project-ref "$CQ_TARGET_REF"
cqsb migration list --linked
cqsb db push --dry-run
```

Enter the development project reference from your worksheet, not its entire URL.
If prompted for a database password, use the development database password.
Check the project reference and planned migration filenames before continuing.

Apply the migrations:

```bash
cqsb db push
cqsb migration list --linked
cqsb db lint --linked --level error
```

If prompted for confirmation, confirm only after checking that this is the
development project. Do not run `supabase init`; this project already has its
Supabase configuration and migrations.

In the dashboard, confirm that the application tables exist. In **Storage**,
confirm a bucket named **`cq-vault`** exists and is **private**. Do not create a
different public bucket to work around an error. The migration set defines the
bucket and authorization rules.

**Do not run `db reset` against a linked hosted project.** The CI reset command
belongs to a disposable local test stack. The scripts containing
`cqstudio-db-test` or `cqstudio-storage-test` are also disposable test utilities,
not deployment commands.

### 8.3 Set three application secrets in the development project

If using the guided setup, run `npm run setup` now, after the real project and
website addresses exist. Use the tokens it generates in
`setup/private/development/edge.env` throughout the following steps. Do not
generate a second manual pair: the Edge, database Vault, bootstrap and GitHub
copies must match. [The configuration map](../setup/README.md) gives an optional
CLI import command. If you already configured secrets manually, keep that complete
manual path or deliberately update every destination before adopting new tokens.

Open **Edge Functions → Secrets**. Create:

| Name | Value |
| --- | --- |
| `APP_ORIGIN` | Exact development main app origin |
| `BOOTSTRAP_TOKEN` | New random token; use at least 32 characters, preferably 64 random characters |
| `MAINTENANCE_TOKEN` | A different strong random token |

Generate/store the tokens in your password manager. Copy directly into the
secret-value fields. They are different secrets with different purposes.
The name is case-sensitive. No `VITE_` prefix is used here.

### 8.4 Deploy all five functions

```bash
cqsb functions deploy admin --project-ref "$CQ_TARGET_REF"
cqsb functions deploy account --project-ref "$CQ_TARGET_REF"
cqsb functions deploy vault --project-ref "$CQ_TARGET_REF"
cqsb functions deploy bootstrap-admin --project-ref "$CQ_TARGET_REF" --no-verify-jwt
cqsb functions deploy maintenance --project-ref "$CQ_TARGET_REF" --no-verify-jwt
```

Keep the two `--no-verify-jwt` flags where shown: these endpoints validate their
dedicated tokens inside the function. The member functions authenticate users
and check database membership/permissions in their code. Do not delete those checks.
[Function deployment reference](https://supabase.com/docs/guides/functions/deploy).

Check that all five functions are listed in the development dashboard and that
their deployments succeeded. A deploy error is not fixed by editing database
rows or manually giving your user an administrator role.

**Checkpoint:** migrations are applied, lint reports no errors, `cq-vault` is
private, three secrets exist, and all five function deployments succeeded.

## 9. Complete the policy and development environment

### 9.1 Install the app dependencies

```bash
cd "$HOME/CQStudioLaunch"
npm ci --ignore-scripts
```

Use the included lockfile. Do not replace this with a broad dependency update.
If the command fails, read the first relevant error before retrying.

### 9.2 Create `.env.local`

If `.env.local` does not already exist, copy `.env.example` to `.env.local` using
your editor or file manager. Enable hidden files if you cannot see dotfiles.
Open `.env.local` in a plain-text/code editor and replace all four values:

```dotenv
VITE_SUPABASE_URL=YOUR_ACTUAL_DEVELOPMENT_SUPABASE_HTTPS_ORIGIN
VITE_SUPABASE_ANON_KEY=YOUR_ACTUAL_DEVELOPMENT_PUBLISHABLE_OR_ANON_KEY
VITE_APP_ORIGIN=YOUR_ACTUAL_DEVELOPMENT_APP_HTTPS_ORIGIN
VITE_QUIZ_RUNNER_ORIGIN=YOUR_ACTUAL_DEVELOPMENT_RUNNER_HTTPS_ORIGIN
```

This is a map of fields, not runnable configuration until you replace the
uppercase values. Use literal origins, no `/login`, no trailing slash, no
`$OTHER_VARIABLE` substitutions. Save the file as `.env.local`, not `.env.local.txt`.

Do not put bootstrap/maintenance/service/SMTP/database secrets into this file.
If you have other `.env`, `.env.production`, or `.env.production.local` files,
inspect them before proceeding: later production-mode files can override earlier
ones, and exported terminal values override files. Use one `.env.local` for this
guide to reduce confusion.

To check for exported variables by **name only**, without printing their values:

```bash
printenv | cut -d= -f1 | sort | rg '^(VITE_|CQ_DEPLOYMENT|VERCEL_ENV)'
```

`rg` is optional for this inspection; your editor can check the environment files.
If you previously exported conflicting `VITE_` values, unset those specific names
or use a fresh terminal before building. Do not print all environment values into
shared logs when troubleshooting.

### 9.3 Complete every field in `src/config/operator.json`

Open the file in your editor. Keep it valid JSON: double quotes around keys and
strings, commas between fields, no comments, and no trailing comma after the last
field. Save UTF-8 text.

| Field | What belongs here |
| --- | --- |
| `operatorName` | Real responsible individual or organization |
| `contactEmail` | Real public inbox under the operator's control |
| `country` | Actual operator country |
| `minimumAge` | Keep the number `18` unless you deliberately raise the minimum |
| `supabaseDetails` | Actual project region, processor relationship and relevant transfer/contract details |
| `vercelDetails` | Actual hosting/processing/log arrangements for the selected service |
| `emailDetails` | Actual SMTP provider, processing/retention and relevant processor details |
| `technicalLogRetention` | Actual log retention across configured providers |
| `backupRetention` | How long each backup and its copies will actually be retained |
| `applicableTerms` | Applicable terms, law/dispute/liability wording reviewed for the actual operator |
| `hostingStorageDetails` | Verified cookies/storage behavior of the app and chosen hosting access setup |
| `privacyResponsibilities` | Responsible privacy contact and applicable privacy duties/review |
| `reviewed` | Keep `false` until the disclosures and actual settings have been reviewed |

Find provider facts in the project's settings, contracts, current documentation
and your chosen email provider. The code cannot invent them. Filling a field with
“not applicable” without checking is not a review. This guide explains where data
goes; it does not supply jurisdiction-specific legal advice or certify compliance.

Preview the pages locally:

```bash
npm run dev
```

Open the exact local URL printed by Vite. Read `/privacy`, `/terms`, and `/storage`.
The development account workflows should be tested at the hosted development
origin configured earlier; opening the local interface does not configure hosted
email redirects. Stop the local server with **Ctrl+C** when finished.

After the actual policy/settings review, change `reviewed` to the JSON boolean
`true`. Do not use the string `"true"`. Also complete the operator contact/backup
placeholders in `docs/SECURITY.md` and `docs/ADMIN.md` for your operator records.
Recheck these documents when configuring production.

### 9.4 Add the same development values to Vercel

For the development **main app** project, open **Settings → Environment Variables**.
Add the four exact `VITE_` names/values from `.env.local`, scoped to that project's
**Production** environment. Save each. Do not include quote characters in the
dashboard value unless they are part of the actual value; none are needed here.

For the development **runner** project, add only:

| Name | Value | Environment |
| --- | --- | --- |
| `APP_ORIGIN` | Exact development main app origin | Production |

Do not put Supabase credentials in the runner project. The runner's
`APP_ORIGIN`, the app's `VITE_APP_ORIGIN`, and the development Edge secret
`APP_ORIGIN` must all name the same app address.

Dashboard environment changes affect a new deployment, not an already built
JavaScript file. [Vercel environment reference](https://vercel.com/docs/environment-variables).

**Checkpoint:** local and dashboard values match, the operator fields contain
reviewed facts, and `.env.local` remains untracked.

## 10. Test and deploy the development websites

### 10.1 Prepare configuration before creating the deployment

```bash
cd "$HOME/CQStudioLaunch"
git branch --show-current
npm run deploy:prepare
npm run launch:check
```

The branch must be `development`. Preparation writes the exact-origin security
configuration into root `vercel.json` and `runner/vercel.json`. Commit those public
configuration files. Vercel reads configuration before running the build, which
is why doing this only inside the cloud Build Command is too late.

If `launch:check` reports a missing field, fix the named field and rerun it.
Do not bypass it with a modified script.

### 10.2 Run the complete local checks

```bash
npm run lint
npm run typecheck
npx tsc --project supabase/functions/tsconfig.json
npm test
npm audit --audit-level=high
node scripts/check-secrets.mjs
npm run build
npx playwright install chromium
npm run test:smoke
```

The first browser installation downloads a large test browser. Allow it to finish.
OpenSSL is required for the temporary local HTTPS runner. If Linux browser
libraries are missing, use Playwright's supported dependency installation for your
operating system; on supported distributions the tool offers
`npx playwright install --with-deps chromium`. Do not ignore a failed browser run.

Expected on the current code: 52 unit tests and 33 browser tests pass. Test counts
can legitimately change after later development; require all current tests to
pass. Build warnings about third-party `use client` directives are not test
failures when the build exits successfully and the header/bundle checks pass.

The test servers use local ports **4173 and 4174** and disposable `/tmp` outputs.
They do not need hosted credentials. If ports are occupied, stop your own earlier
test/preview process; do not kill an unknown process. Do not share the temporary
fixture servers as the real site.

### 10.3 Commit and push the prepared development branch

```bash
git status --short
git diff --stat
git add .
git diff --cached --stat
git ls-files '.env*'
git commit -m "Configure and verify CQStudio development deployment"
git push origin development
```

Review staged files before committing. Only `.env.example` should be tracked as
an environment file. If there are no changes to commit, do not manufacture a
change; verify that the existing commit already contains your preparation.

### 10.4 Wait for both development deployments

1. Open the development app's **Deployments** page in Vercel.
2. Confirm the deployment branch is `development` and its commit is the one you
   just pushed. Check the runner project the same way.
3. Wait for both to show **Ready**.
4. If nothing starts, verify Branch Tracking and the Ignored Build Step command.
   Use Vercel's deployment-from-Git-reference flow for the correct branch if needed.
5. Open the stable app address, not a temporary build address.
6. Expect the sign-in page, not the unconfigured `/setup` page.
7. Open `/privacy`, `/terms`, and `/storage` and inspect the deployed text.
8. Open the runner address directly; “Waiting for your quiz…” is acceptable.

Run from your locally configured development working copy:

```bash
npm run launch:live
```

All named probes should pass. They test the frontend, entry asset, response headers,
separate runner, public policy RPC and rejection of unauthenticated member-function
requests. A hosting login/protection page may cause these probes to fail; fix the
monitor's authorized access arrangement rather than changing app security.

**Checkpoint:** both development websites are Ready, the main app is configured,
and the live probes pass or an authorized equivalent has been verified.

## 11. Create the first development administrator

Do this **after the app is deployed and SMTP works**. Otherwise the email could
send a valid link to a site that is not ready.

### 11.1 Enter the bootstrap process settings safely

In the working-copy terminal:

```bash
read -r -p 'DEVELOPMENT Supabase project URL: ' SUPABASE_URL
export SUPABASE_URL
read -rs -p 'DEVELOPMENT bootstrap token: ' CQ_BOOTSTRAP_TOKEN
export CQ_BOOTSTRAP_TOKEN
npm run bootstrap
unset CQ_BOOTSTRAP_TOKEN
unset SUPABASE_URL
```

The token prompt is intentionally hidden. Paste the exact token you saved as the
development project's Edge `BOOTSTRAP_TOKEN`, then press Enter. The script asks
for **First administrator email**; enter an inbox you can open now. Note the two
names: the Edge secret is `BOOTSTRAP_TOKEN`, while the local process reads
`CQ_BOOTSTRAP_TOKEN`. Neither belongs in Vercel or a browser variable.

### 11.2 Accept the invitation

1. Wait for the message. Check spam and your SMTP provider's delivery log if needed.
2. Open its link in a browser you control. Check it belongs to the development app.
3. Enter a display name and a unique username: 3–30 lowercase letters, digits or
   underscores.
4. Choose a password of at least 12 characters and store it in your password manager.
5. Read the Privacy Policy and Terms, tick acceptance and join.
6. Confirm the home screen loads and **Admin space** is available.
7. Sign out and sign in again with the same email/password.

Do not use the Supabase dashboard's generic “Add user” as a replacement: CQStudio
requires its own invitation reservation and explicit policy acceptance.

### 11.3 Remove bootstrap access and enable MFA

1. In the development project's **Edge Functions → Secrets**, delete
   `BOOTSTRAP_TOKEN`. Keep `APP_ORIGIN` and `MAINTENANCE_TOKEN`.
2. In CQStudio, open your profile/settings **Security** section.
3. Choose **Set up authenticator**, scan the QR code, and enter the six-digit code.
4. Keep the setup information private. Complete verification before closing it.
5. Sign out, sign in, and verify that an authenticator challenge works.
6. Invite a second trusted administrator via **Admin space → members**. Have that
   person accept and enable MFA too, so the group has a tested successor.

The final approved administrator cannot be demoted, disabled or deleted. This is
intentional protection against leaving the workspace without an administrator.

**Checkpoint:** the first administrator can sign in with MFA, a successor exists,
and the one-time bootstrap secret has been removed.

## 12. Enable maintenance and test the real development workspace

### 12.1 Create the database Vault secrets

**Supabase Vault is different from CQStudio's shared file vault and from Edge
Function Secrets.** Open the Supabase project's Vault management UI, under the
database/integrations area in the current dashboard. Create:

| Vault secret name | Value |
| --- | --- |
| `cqstudio_maintenance_url` | The development Supabase URL followed by `/functions/v1/maintenance` |
| `cqstudio_maintenance_token` | Exact same value as that project's Edge `MAINTENANCE_TOKEN` |

Use the secret-entry UI, not a SQL statement with the token embedded in it. Names
are exact lowercase strings. Save both.
[Supabase Vault reference](https://supabase.com/docs/guides/database/vault).

### 12.2 Verify the scheduled jobs

The migrations install three named schedules. In Supabase SQL Editor, this
read-only query shows whether they exist:

```sql
select jobname, schedule, active
from cron.job
where jobname like 'cqstudio-%'
order by jobname;
```

Expected names:

- `cqstudio-retention`: daily retention.
- `cqstudio-daily-touch`: internal daily database touch.
- `cqstudio-storage-cleanup`: cleanup request every 30 minutes.

Inspect recent job execution without selecting the job's command or secrets:

```sql
select j.jobname, r.status, r.start_time, r.end_time
from cron.job_run_details r
join cron.job j on j.jobid = r.jobid
where j.jobname like 'cqstudio-%'
order by r.start_time desc
limit 20;
```

The database job can enqueue an HTTP request successfully even if the function
later fails. Also check the maintenance function's actual invocation result and
logs in Supabase. Missing Vault secrets cause cleanup to do nothing intentionally.
Record the dashboard timezone; do not assume schedule timestamps are Manila time.

### 12.3 Test a maintenance invocation

From the working-copy terminal, enter the development URL/token, then run:

```bash
read -r -p 'DEVELOPMENT Supabase URL: ' CQ_MAINTENANCE_URL
export CQ_MAINTENANCE_URL
read -rs -p 'DEVELOPMENT maintenance token: ' CQ_MAINTENANCE_TOKEN
export CQ_MAINTENANCE_TOKEN
node --input-type=module <<'JS'
const result = await fetch(new URL('/functions/v1/maintenance', process.env.CQ_MAINTENANCE_URL), {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'x-maintenance-token': process.env.CQ_MAINTENANCE_TOKEN},
  body: JSON.stringify({action: 'cleanup'}),
  signal: AbortSignal.timeout(30000)
});
console.log('Maintenance HTTP status:', result.status);
if (!result.ok) process.exitCode = 1;
JS
unset CQ_MAINTENANCE_TOKEN
unset CQ_MAINTENANCE_URL
```

Expected status: **200**. This invocation runs the actual configured cleanup of
expired/deleting objects. Use the development project for this rehearsal, and
compare with the function logs. It does not print the token.

### 12.4 Use two test members and separate browser sessions

Use two real inboxes you control or consenting testers. Use separate browser
profiles, or one normal and one private window, so the accounts do not mix.
Do not use an administrator account as the only test account.

Complete the following checks on the **hosted development app**:

| Check | Exact action | Expected result |
| --- | --- | --- |
| Invitation | Admin invites a member; member opens email and accepts policy | Member can enter; no manual database edits required |
| Password reset | Sign out; request reset; open real email; choose new password | New password works; reset reaches the correct app |
| Disabled membership | Disable test member in Admin, then attempt access as that member | Protected data becomes unavailable; re-enable afterward |
| Classes/lessons | Create class, Markdown lesson and note; refresh | Saved content returns |
| Draft separation | Start lesson A, navigate to another class's lesson editor | A's draft does not appear in the other class |
| Private progress | Save member A's reflection/attempt; inspect as member B and as admin | Other accounts cannot retrieve A's private learning data through the app |
| File vault | Upload a small PDF/text file, download it, create/navigate a folder | Transfer completes; downloaded bytes/file open correctly |
| Manual quiz | Create, submit, review/publish, practice, refresh before finishing | Answers resume and final attempt is saved privately |
| Seven question formats | Use the format guide and answer every supported type | Scoring/review behave as documented |
| HTML quiz | Follow section 12.5 | Preview does not save; practice saves one result |
| Chat | Open same discussion in two browsers and send a message | Other browser receives it; refresh preserves it |
| Notifications | Publish/update relevant content | Intended notification appears; unread state updates |
| Own-data export | Profile → Download my data | JSON downloads and belongs to that member |
| Private import | Use a test member's export; preview Merge; test Replace only on disposable data | Counts/confirmation work; shared content and roles are unchanged |
| Delete account | Delete a disposable non-last-admin test account | Account/private data are removed; shared content behavior matches policy |
| Cleanup/sign-out | Sign out, then sign in as a different test member | Previous user's drafts/results are not shown |
| Expired/revoked link | Revoke a spare test invite and try its old email link | It cannot create approved membership |

If an operation fails after partly completing, inspect its actual state before
retrying. For a partially failed account deletion, use another administrator's
deletion flow; disabled membership can prevent the departing user from retrying.

### 12.5 Create one tiny HTML quiz for testing

In a plain-text editor, create a file called `cqstudio-test-quiz.html` outside
the repository's source folders. Save this content:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CQStudio test quiz</title>
  <style>
    body { font: 18px system-ui; padding: 24px; color: #111; background: #fff; }
    button { font: inherit; padding: 12px; margin: 8px; }
  </style>
</head>
<body>
  <h1>What is 2 + 2?</h1>
  <button type="button" onclick="finish(0)">3</button>
  <button type="button" onclick="finish(1)">4</button>
  <p id="result" role="status"></p>
  <script>
    let finished = false;
    function finish(score) {
      if (finished) return;
      finished = true;
      document.getElementById('result').textContent = score ? 'Correct.' : 'Try again next time.';
      for (const button of document.querySelectorAll('button')) button.disabled = true;
      parent.postMessage({type: 'cq-result', score, max: 1}, '*');
    }
  </script>
</body>
</html>
```

In CQStudio:

1. Open a test class's quizzes and create a quiz.
2. Choose **Isolated HTML quiz** and upload the file.
3. Save the draft, preview it and answer. Confirm no practice attempt is stored.
4. Submit it for review.
5. As an administrator, inspect the source and sandboxed behavior and publish it.
6. As a member, choose **Start HTML practice**, then answer `4`.
7. Confirm the app reports **1 / 1** and **Saved to your private progress**.
8. Refresh/open progress and confirm the attempt exists once.

The runner does not automatically understand arbitrary quiz scores. The uploaded
file must send the result message shown above if you want a saved score. A file
without that message can run without recording a result. External libraries,
stylesheets, images and network requests are blocked; keep the file self-contained.
The default HTML upload limit is 20 MiB. These are self-practice scores, not
verified exam grades. See [the HTML quiz guide](HTML-QUIZZES.md).

### 12.6 Check mobile usability and performance

1. Test on a real phone, not only a resized desktop window.
2. Test light/dark appearance, portrait/landscape, and the on-screen keyboard.
3. Use the keyboard alone on desktop: Tab, Shift+Tab, Enter, Space and Escape.
4. Check visible focus, dialogs, errors, navigation and 200% zoom. In Chrome or
   Chromium, the main menu's Zoom controls can set 200%; check that text and
   primary actions remain accessible. Restore 100% afterward.
5. On a representative hosted development dashboard, open Chrome/Chromium's
   Developer Tools and find **Lighthouse** (possibly under the extra-panels `»`
   menu). Select **Mobile** and **Performance**, keep the test account signed in,
   and start the page-load/navigation audit. Save/export its report privately.
   Do not publish the report if it contains account details or member content.
6. The project's target is 90+ performance with the metrics in
   [performance verification](PERFORMANCE.md). Investigate a miss rather than
   calling the automated fixture suite proof of live performance.

See [Chrome's Lighthouse instructions](https://developer.chrome.com/docs/lighthouse/overview)
if the panel is not visible in your browser.

**Checkpoint:** record actual results, dates and account roles. Resolve failures
before promoting the same code to real members.

## 13. Prepare and deploy production

### 13.1 Prepare the production backend

Repeat **sections 7 and 8** for `cqstudio-prod`, using production values throughout:

- Production main app Site URL and exact invitation/reset redirects.
- Production SMTP configuration and confirmed delivery.
- Production database password, reference and URL.
- Production `APP_ORIGIN`.
- Fresh, distinct production bootstrap and maintenance tokens.
- The same migration files and five function deployments.

For clarity, explicitly relink and check before applying anything:

```bash
read -r -p 'PRODUCTION Supabase project reference: ' CQ_TARGET_REF
cqsb link --project-ref "$CQ_TARGET_REF"
cqsb migration list --linked
cqsb db push --dry-run
```

Read the target and planned migrations. On the initial empty production project,
apply them only after the development rehearsal has succeeded:

```bash
cqsb db push
cqsb migration list --linked
cqsb db lint --linked --level error
```

Deploy the five functions again with the production reference using section 8.4.
Do not import `supabase/seed.sql` into production. Do not copy development users,
tokens, progress or uploaded files into production as launch shortcuts.

### 13.2 Promote the tested code locally, then regenerate production configuration

Make sure development work is committed first:

```bash
git status --short
git switch main
git merge development
```

If Git reports a conflict, stop and resolve it; do not force a merge or push.
Do not push `main` yet. The merged header files still contain development origins.
Your ignored `.env.local` is also still the development file: Git branch switching
does **not** switch its values for you.

Replace the four values in `.env.local` with production values. Recheck the
operator JSON for production regions, providers and retention. Update any changed
policy version in the app's administrative settings when a policy change requires
member re-acceptance; do not silently change retention promises for an existing group.

In the production Vercel **app** project's Production environment, set:

- `VITE_SUPABASE_URL`: production Supabase origin.
- `VITE_SUPABASE_ANON_KEY`: production publishable/anon key.
- `VITE_APP_ORIGIN`: production main app origin.
- `VITE_QUIZ_RUNNER_ORIGIN`: production runner origin.

In the production Vercel **runner** project's Production environment, set:

- `APP_ORIGIN`: production main app origin.

Verify those values against the worksheet and Supabase Edge `APP_ORIGIN`.

### 13.3 Prepare, check and push the live configuration

```bash
npm run deploy:prepare
npm run launch:check
npm run lint
npm run typecheck
npx tsc --project supabase/functions/tsconfig.json
npm test
npm run build
```

Because the app's production environment is automatically enforced on Vercel,
you can additionally rehearse that exact gate locally:

```bash
CQ_DEPLOYMENT=production npm run build
```

The one-command environment value does not remain exported afterward. Do not
manually set `VERCEL_ENV` in Vercel to bypass its system environment.

Review and commit the production preparation:

```bash
git add .
git diff --cached --stat
git diff --cached -- vercel.json runner/vercel.json src/config/operator.json
git ls-files '.env*'
git commit -m "Prepare verified CQStudio production configuration"
git push origin main
```

Wait for both production Vercel projects to be **Ready** on the expected `main`
commit. Open their stable addresses. The app should offer sign-in, and the runner
may show its waiting screen. Refresh a direct `/login` or `/privacy` URL to test
server-side route handling.

```bash
npm run launch:live
```

Require all probes or their authorized hosting-protected equivalents to pass.
Check real response headers and confirm the app is talking to the production
project, not the development project. Verify the project hostname in the browser's
Network panel without copying tokens or authorization headers into a report.

### 13.4 Bootstrap production and finish maintenance setup

Repeat **section 11** using the production URL, production bootstrap token and
the intended real administrator inbox. Then remove the production bootstrap
secret, enable MFA, and establish a second trusted administrator.

Repeat **sections 12.1–12.3** in production with production Vault secrets and its
production maintenance token. Check the scheduled function invocation, not just
the existence of a cron row.

Use a small, controlled production acceptance account to verify invitation,
reset, sign-in/MFA, a small upload/download, quiz/practice and logout. Keep test
content clearly labelled and remove disposable test content through normal app
flows. Do destructive failure experiments in development.

**Checkpoint:** production uses production credentials everywhere; both sites,
real email, administrator MFA, private uploads and maintenance work.

## 14. Set up monitoring and operator notifications

### 14.1 Production availability workflow

In the GitHub repository, open **Settings → Secrets and variables → Actions →
Variables**. Add these **repository variables**, not secret service credentials:

| Name | Production value |
| --- | --- |
| `CQ_PROD_APP_ORIGIN` | Main app origin |
| `CQ_PROD_RUNNER_ORIGIN` | Runner origin |
| `CQ_PROD_SUPABASE_URL` | Supabase project origin |
| `CQ_PROD_SUPABASE_ANON_KEY` | Browser-safe publishable/anon key |

Open **Actions → Production availability → Run workflow**, choose `main`, and run
it. Open the run and confirm success. The included job runs every 30 minutes once
configured on the default branch. Without `CQ_PROD_APP_ORIGIN`, it is skipped;
skipped does not mean monitored or healthy.

Enable the GitHub Actions failure notifications appropriate to your operator
account and confirm how you will receive them. This repository does not include
a separate email/Slack alert integration. GitHub schedules are best effort; a
dedicated uptime service is needed if your availability requirements exceed that.

The current script cannot pass a Vercel login screen or use a protection bypass.
For a protected live deployment, configure an authorized compatible monitor and
record that arrangement. Do not treat a protection-page failure as proof the
database is down, or disable access restrictions solely to turn this check green.

### 14.2 Development keep-alive

The existing **Daily database touch** workflow is development-only. In GitHub
**Actions → Secrets**, create repository secrets:

- `CQ_DEV_SUPABASE_URL`: development Supabase URL.
- `CQ_DEV_MAINTENANCE_TOKEN`: development maintenance token.

Run **Daily database touch** manually on `main` and confirm success. Its schedule
is `02:13 UTC`, which is **10:13 AM Asia/Manila**. This touch is not a backup,
uptime guarantee, or a promise that a free project cannot pause. Production's
availability workflow already reads its database regularly; review your selected
plan's availability and backup guarantees rather than relying on touches alone.
If its schedule ran before you added the two development secrets, that earlier
setup-stage failure is expected; require a successful manual run after configuring them.

### 14.3 Error diagnosis

For a failed server operation:

1. Record the time, environment, action and HTTP status.
2. If present, record the response's `X-Request-ID` from browser Network details.
3. Find the matching invocation in Supabase's function logs.
4. The app's server diagnostic includes only a random request ID and status,
   deliberately excluding request bodies, member content and raw exception text.
5. Check Auth/SMTP/Storage/provider logs as appropriate with administrator access.
6. Share a redacted description, not session tokens, signed file URLs or member data.

**Checkpoint:** the monitor has actually run, the operator knows how failures
arrive, and the keep-alive/maintenance jobs are not being mistaken for backups.

## 15. Back up and rehearse recovery

Do this before admitting the group, then repeat on the documented schedule and
before risky database changes. Choose backup retention you can really enforce.

### 15.1 Know the three different exports

| Export | Includes | Does not replace |
| --- | --- | --- |
| Profile → Download my data | That member's personal export | Whole-workspace disaster recovery |
| Admin → backups → workspace export | Shared data/metadata | Database/Auth/private-data and file-binary backups |
| Operator database dump + Storage copy | Recovery material for the configured scope | A tested restoration procedure |

Supabase database backups do not contain the actual Storage file bytes. Back up
Storage separately and verify your plan's backup availability/retention.
[Supabase backup reference](https://supabase.com/docs/guides/platform/backups).

### 15.2 Prepare an encrypted backup directory

Unlock or mount your chosen encrypted storage. In Bash, enter its **actual**
absolute destination, including a new dated snapshot directory:

```bash
umask 077
read -r -p 'Absolute snapshot directory on encrypted storage: ' CQ_BACKUP_DIR
export CQ_BACKUP_DIR
mkdir -p "$CQ_BACKUP_DIR"
```

Confirm its location in your file manager. A directory named `backups` on an
unencrypted drive is not automatically encrypted. Keep it outside the repository
and do not publish it in GitHub or Vercel.

### 15.3 Back up the database

Use the hosted project's actual connection details and a compatible PostgreSQL
client/provider-supported dump procedure. `pg_dump` must not be older than the
server's major version. Obtain host/user/port from Supabase's **Connect** panel;
connection methods vary with network/IPv4 support. Do not use the HTTP API URL
as a PostgreSQL connection string. See [Supabase database connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres).

For a password-prompting operator dump, check `pg_dump --version`, then enter the
actual direct or **session-pooler** connection details from the production
project's Connect panel. Do not use a transaction-pooler connection for this dump.
The following command prompts for the password rather than putting it in a URI
or saved command:

```bash
pg_dump --version
read -r -p 'Database host from production Connect panel: ' CQ_DB_HOST
read -r -p 'Database port from that connection: ' CQ_DB_PORT
read -r -p 'Database username from that connection: ' CQ_DB_USER
read -r -p 'Database name from that connection: ' CQ_DB_NAME
PGSSLMODE=require pg_dump \
  --host="$CQ_DB_HOST" \
  --port="$CQ_DB_PORT" \
  --username="$CQ_DB_USER" \
  --dbname="$CQ_DB_NAME" \
  --format=custom --no-owner --no-acl --password \
  --file="$CQ_BACKUP_DIR/cqstudio.database.dump"
pg_restore --list "$CQ_BACKUP_DIR/cqstudio.database.dump"
```

Use a new snapshot directory so you do not overwrite a prior dump. Enter the
production database password at `pg_dump`'s hidden prompt. Require a successful
exit and inspect the listed application tables. If dumping a managed schema is
denied, do not silently accept an incomplete file as a full backup. Use the
provider-supported method for the required scope and document any exclusions.

The existing [administrator guide](ADMIN.md#concrete-monthly-commands) has further
operator notes. For managed Auth/Storage schemas, roles and restoration, follow the provider's
[backup/restore procedure](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
Record what your chosen dump contains and excludes. Do not assume one generic
restore command can safely recreate every managed object on a live project.

### 15.4 Back up file bytes with the included utility

1. Sign into the app as an approved administrator, complete MFA, and open
   **Admin space → backups**.
2. Download the workspace JSON export into the encrypted snapshot directory.
   Rename that file `cqstudio-workspace.json` for the command below.
3. Finish pending uploads and briefly pause shared-content changes while taking
   the snapshot. Re-export metadata after any intervening change.
4. Open browser Developer Tools → Application/Storage → Local Storage → the app
   origin. In your own `cqstudio.auth` session record, locate its `access_token`.
   This is a short-lived **administrator session token**, not the service key.
   Do not take a screenshot, paste it into chat, or store it in the backup manifest.
5. Enter public project settings and the hidden session token in your terminal:

   ```bash
   read -r -p 'Supabase project URL for this backup: ' SUPABASE_URL
   export SUPABASE_URL
   read -r -p 'Public publishable/anon key for this project: ' SUPABASE_ANON_KEY
   export SUPABASE_ANON_KEY
   read -rs -p 'Current administrator access token: ' CQ_BACKUP_ACCESS_TOKEN
   export CQ_BACKUP_ACCESS_TOKEN
   node scripts/backup-storage.mjs "$CQ_BACKUP_DIR/cqstudio-workspace.json" "$CQ_BACKUP_DIR/objects"
   unset CQ_BACKUP_ACCESS_TOKEN
   unset SUPABASE_ANON_KEY
   unset SUPABASE_URL
   ```

6. Confirm all ready objects were verified and a `cqstudio-manifest.json` exists
   inside `objects`. With an empty workspace, zero objects is legitimate.
7. If your short-lived session expires, refresh your app session and repeat with
   the new access token and the **same metadata snapshot/directory**. Verified
   matching files are reused. Do not overwrite an interrupted `.part` file or
   mismatched manifest without inspection.
8. Keep the database dump, JSON export, file bytes and checksum manifest together.

The script is an operator tool and requires technical access to your own session.
If you are uncomfortable inspecting that token, use an administrator-assisted or
provider-supported Storage backup method instead; never substitute a browser-exposed
service credential.

### 15.5 Prove restoration works

Use a fresh isolated recovery project or an explicitly disposable development
environment, with outbound email controlled so a rehearsal cannot invite members.
Do not restore over the live project to “test” the backup.

Verify the restored schema/permissions, expected identities, record counts,
Storage object bytes/checksums, ownership/access, invitation/policy gates,
lessons, quiz versions and a sample private member record. Reapply account deletion
requests made after the snapshot and revoke old sessions as appropriate.
Record the time required and every missing item. If you need help with managed
Auth restoration, get it before launch rather than marking recovery tested.

**Checkpoint:** you have a recoverable off-host backup, know its scope/expiry,
and have recorded a successful isolated restoration rehearsal.

## 16. Make the final launch decision

Do not invite the whole group until each item is true:

- [ ] Correct production app/runner origins, separate from development.
- [ ] GitHub source is private; no secrets or backups are committed.
- [ ] Both production Vercel deployments are Ready on the intended commit.
- [ ] `launch:check` passes with production settings.
- [ ] `launch:live` or an authorized equivalent passes against actual production.
- [ ] Hosted migrations/functions and private Storage policies are verified.
- [ ] Invitation/reset email, account acceptance and admin MFA work.
- [ ] One-time bootstrap secret has been removed.
- [ ] A second trusted administrator has accepted and tested access.
- [ ] Operator/contact/country, provider facts, retention and policies are complete.
- [ ] Retention/cleanup jobs and actual maintenance responses are verified.
- [ ] Availability checks run and operator failure notifications are configured.
- [ ] Mobile/keyboard/zoom/accessibility and live performance were checked.
- [ ] A database-plus-Storage backup and isolated restoration were verified.
- [ ] Real development tests of privacy, disabled membership and deletion passed.
- [ ] Remaining failures from CI or live testing have been resolved.

Check off the repository's [launch checklist](LAUNCH.md#real-service-acceptance)
as you verify each item. Record evidence in private operator notes.

Then invite a small first group through **Admin space → members**. Watch error
logs and delivery during their first sessions. Expand to the full group after
the first users can join, study and recover accounts successfully.

## 17. Make future updates and recover from a bad release

### Development update

1. Start with a clean working tree. Run `git status --short`.
2. Switch to `development` and explicitly restore development `.env.local` values.
3. Recheck any exported terminal variables and your linked Supabase reference.
4. Make/test the changes. Rehearse database migrations on development first.
5. Run `deploy:prepare` if origins/configuration changed, then the relevant tests.
6. Commit and push `development`. Verify both development deployments and real flows.

### Production update

1. Take and verify a fresh backup before database changes.
2. Merge the tested development code into `main` locally.
3. Replace local environment values with production values again.
4. Review policy/retention differences and the migration's compatibility with the
   currently deployed app before changing the database.
5. Prepare the production headers, run checks, commit the preparation and push.
6. Apply approved compatible migrations and redeploy changed functions in the
   planned order; do not guess if a change requires downtime or coordination.
7. Check both websites, `launch:live`, monitoring and a short real-account flow.

### If a release breaks

Use Vercel's deployment history to select a known working release, after checking
it still works with the current database, policies and origins. Rolling back the
frontend does **not** roll back Supabase migrations, functions or member data.
Do not run a hosted `db reset` as a rollback. Use a reviewed corrective migration
or the tested recovery procedure. Preserve failure details/request IDs and follow
[the incident procedure](SECURITY.md).

## 18. Optional custom domains

The assigned `.vercel.app` origins are sufficient to begin. A custom domain is
optional. If you add one later, plan it as an origin change rather than just a
cosmetic rename.

1. Own/manage the domain first.
2. Add the app domain to the app Vercel project and a different host/subdomain to
   the runner project.
3. Add the exact DNS records Vercel currently specifies. Wait for DNS and HTTPS
   validation; do not copy generic IP/CNAME values from an old guide.
4. Update app `VITE_APP_ORIGIN`/`VITE_QUIZ_RUNNER_ORIGIN`, runner `APP_ORIGIN`,
   Edge `APP_ORIGIN`, Auth Site URL and the two exact Auth redirects.
5. Update local settings, run `deploy:prepare`, commit the prepared headers and
   redeploy both projects with matching values.
6. Update monitor variables and test invitation/reset links, embeds and live probes.
7. Remove obsolete redirect allowances when they are no longer needed. Tell
   members their login/storage belongs to the new origin and they may need to
   sign in again.

[Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

## 19. Troubleshooting

Work from the first relevant error. A later “build failed” line is usually only
the consequence. Never paste secret values into an issue to diagnose it.

| Symptom | Check first | Correct next action |
| --- | --- | --- |
| `command not found: cqsb` | New terminal lost the Bash function | Redefine section 3.2, or use installed native `supabase` |
| npm download/network error | Internet/proxy/DNS and registry reachability | Restore connectivity, then retry the same pinned operation |
| Git says not a repository/read-only `.git` | You are still in the original folder | Use the clean working copy from section 4; do not delete special metadata |
| GitHub rejects password login | HTTPS Git authentication | Complete `gh auth login`; do not put a token in the remote URL |
| `Production launch is blocked` | Listed missing settings/policy fields | Complete each real value; rerun preparation/checks |
| `Deployment origins changed` | Dashboard environment differs from committed headers | Correct local values, run `deploy:prepare`, commit and deploy a new build |
| Runner asks to prepare `vercel.json` | Wrong `APP_ORIGIN` or stale runner configuration | Prepare both projects with the intended environment before deployment |
| Build skipped | Branch filter/production branch setting | Verify section 6.3; exit 0 in Ignored Build Step means skip |
| Site shows `/setup` after deployment | Missing/invalid `VITE_` URL or public key at build time | Set correct app environment; create a fresh deployment |
| Privacy page shows incomplete fields | Wrong commit or incomplete JSON | Finish/review real operator values and redeploy |
| Login loops back to policy | Current database policy version not accepted | Accept current policy with that account; investigate settings/retrieval errors |
| Invite sends but user cannot join | Redirect, reserved invitation, expiry, same email/account | Inspect Auth and function logs; use app invitation flow, not manual role edits |
| Bootstrap fails | Selected project, Edge token, SMTP and existing invite/member state | Check all four; do not repeatedly create users directly in Auth |
| Existing Auth user prevents fresh invite | Previous attempt created an Auth identity | Inspect in development; administrator/operator must resolve the incomplete invitation deliberately |
| No invitation/reset email | Verified sender, SMTP credentials, delivery log, spam/rate limits | Fix delivery; preserve confirmation links and test again |
| Link goes to wrong site | That project's Site URL, redirect list and Edge `APP_ORIGIN` | Correct exact origins and request a fresh link |
| Auth link already used/expired | Email scanner, old message, provider token expiry | Request a new link; review tracking/scanning behavior with the mail provider |
| Member functions return 401 | Session, token headers, current project/signing configuration | Inspect gateway versus function error before changing verification |
| Member function returns 403 | Membership, current policy, MFA or origin | Restore legitimate approved access; do not disable authorization checks |
| HTML viewer says separate HTTPS origin required | Missing, same-origin or HTTP runner value | Set real separate HTTPS runner, prepare headers and rebuild |
| HTML viewer blank | Runner deployment, frame CSP and hosting protection | Confirm correct pair of origins and that embedded access works for a normal member |
| HTML runs but no score is stored | Quiz's result message and practice versus preview mode | Use `cq-result` with finite valid score/max; start practice rather than preview |
| HTML import rejects an external resource | Remote script/style/image/font/import | Embed allowed assets and inline code; do not loosen CSP to load a CDN |
| File upload fails | Limits, bucket, session and vault-function invocation | Check reservation/finalization response; unused reservations require cleanup |
| Saving a quiz/result fails | Session/network/RPC availability | Keep the tab open and use its retry; avoid repeated reloads that lose unsaved work |
| Account deletion partly fails | Disabled member, pending uploads, Auth deletion log | Have another approved administrator retry the admin deletion flow |
| Cannot remove last admin | No approved successor | Invite/approve another secured administrator first |
| Chat only updates after refresh | Realtime connection/publication/provider status | Check websocket access and provider logs; do not expose private data to fix subscriptions |
| Cron exists but files stay pending/deleting | Missing Vault secrets or non-200 maintenance response | Check exact Vault names/token and actual function invocation |
| Availability workflow skipped | Missing repository `CQ_PROD_APP_ORIGIN` variable | Add all four public production variables and run manually |
| Availability fails on redirects/login page | Hosting protection in front of the probes | Configure an authorized compatible monitor; do not call it a database failure |
| Backup utility stops | Session expiry, snapshot mismatch, `.part` or checksum mismatch | Inspect the specific snapshot/files; refresh own session; never overwrite unverified data blindly |
| Browser tests cannot start | Browser download, Linux libraries, OpenSSL, local ports | Install supported test prerequisites, stop your own stale test server and rerun |

For Edge 401s, consult Supabase's current
[authorization header reference](https://supabase.com/docs/guides/functions/auth-headers)
and [401 troubleshooting](https://supabase.com/kb/troubleshooting/edge-function-401-error-response).
Provider gateway behavior can differ with key types/platform changes. The project's
in-function authentication must stay in place; do not switch off checks blindly.

## 20. Your completed launch record

Fill this in your private operator notes after verification. It is intentionally
blank because the hosting setup has not been done yet.

| Item | Actual result |
| --- | --- |
| Responsible operator and contact | |
| Production app origin | |
| Production runner origin | |
| Production Supabase reference and region | |
| GitHub repository and released commit | |
| Main app and runner deployment IDs | |
| Date/time and timezone tested | |
| Hosted migration/function verification | |
| Invitation/reset/MFA result | |
| File/HTML quiz/private-progress result | |
| Maintenance invocation result | |
| Monitoring run and notification destination | |
| Backup location, scope and expiry | |
| Restore rehearsal date/result | |
| Mobile/accessibility/performance checks | |
| Policy version and review record | |
| Known limitations and owner for each | |
| Decision to admit real members | |

Keep credentials in the password manager, never in this record. Revisit the
record when domains, providers, policies, administrators or recovery plans change.
