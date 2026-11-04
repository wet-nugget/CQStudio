# Configuration destinations and installer commands

Start with [START-HERE.md](../START-HERE.md). This document is the exact map for
configuration files; the [long guide](../docs/BEGINNER-LAUNCH-GUIDE.md) supplies
the dashboard/account/verification steps. No account passwords or cloud secrets
are included in the repository.

## Generate settings for one environment

In the repository root, using an interactive terminal and Node 24.x:

```sh
npm run setup:doctor
npm ci --ignore-scripts
npm run setup
```

The wizard asks for development/production, Supabase origin, main app HTTPS
origin, separate runner HTTPS origin, and the browser-safe publishable/anon key.
Reserve the addresses in the hosting dashboards before entering them. It does
not ask for or accept a service key, database password or SMTP password.

Generated files go into `setup/private/development/` or
`setup/private/production/`. These directories are ignored by Git. Token files
are written with owner-only permissions on systems supporting Unix permissions;
protect the working directory appropriately on other operating systems. Never
upload the private directory by hand. Manual GitHub file uploads do not consult
the local `.gitignore` file.

New environments get two independently generated 64-character random tokens.
Rerunning an existing environment preserves them. If existing token data is
missing/changed, or the environment names another Supabase project, the wizard
stops for inspection instead of silently rotating/reusing credentials across
projects. Do not erase the private directory simply to bypass that check.

## Every generated file and its destination

| File inside the chosen private environment directory | Destination | Exact action |
| --- | --- | --- |
| `app.env` | Local `.env.local` and the **app** Vercel project's Production environment | The wizard can select this environment locally. In Vercel add each of its four `VITE_` names/values. |
| `runner.env` | The **runner** Vercel project's Production environment | Add `APP_ORIGIN`; it names the main app, not the runner. |
| `edge.env` | That Supabase project's **Edge Functions → Secrets** | Add `APP_ORIGIN`, `BOOTSTRAP_TOKEN`, `MAINTENANCE_TOKEN`, or use the CLI command below. |
| `bootstrap.env` | Local bootstrap process only | Run with Node's `--env-file` as shown below. Do not upload it to Vercel/GitHub. |
| `vault-secrets.json` | That Supabase project's database **Vault** UI | Create the two named secrets: cleanup endpoint URL and matching maintenance token. This is not Edge Secrets or CQStudio's file vault. |
| `github-secrets.env` — development only | GitHub repository **Actions → Secrets** | Add the two `CQ_DEV_` names/values for the development Daily database touch job. |
| `github-variables.json` — production only | GitHub repository **Actions → Variables** | Add the four browser-safe `CQ_PROD_` names/values for Production availability. |

The wizard does not generate SMTP credentials or database passwords. Create
those in the chosen providers and put them only in the destinations documented
below. It also does not mark the operator policy reviewed or deploy any service.

### Supabase CLI commands

Use the `cqsb` helper from section 3.2 of the long guide, or your installed
matching native Supabase CLI. Set `CQ_TARGET_REF` to the chosen environment's
actual project reference using the long guide's prompt, and verify the linked
target before database changes.

Development Edge secrets, then function deployments:

```bash
cqsb secrets set --project-ref "$CQ_TARGET_REF" --env-file setup/private/development/edge.env
cqsb functions deploy admin --project-ref "$CQ_TARGET_REF"
cqsb functions deploy account --project-ref "$CQ_TARGET_REF"
cqsb functions deploy vault --project-ref "$CQ_TARGET_REF"
cqsb functions deploy bootstrap-admin --project-ref "$CQ_TARGET_REF" --no-verify-jwt
cqsb functions deploy maintenance --project-ref "$CQ_TARGET_REF" --no-verify-jwt
```

For production, use the production project reference and replace the secret-file
path with `setup/private/production/edge.env`. Keep all five functions and the
two dedicated-token flags. Database migrations must also be applied to that
environment, as explained in the full guide.

### First administrator

After the selected app is deployed and its SMTP works, run exactly one of these:

```sh
node --env-file=setup/private/development/bootstrap.env scripts/bootstrap.mjs
```

```sh
node --env-file=setup/private/production/bootstrap.env scripts/bootstrap.mjs
```

Choose the environment you are setting up, not both at random. The script asks
for the first administrator's actual inbox. It creates an invitation, not a
shared password. Follow the real link, accept the policy and enable MFA. Do not
create or promote users manually in Auth as a replacement for this flow.

After successful acceptance:

1. Delete that environment's hosted Edge `BOOTSTRAP_TOKEN` in the Supabase dashboard.
2. Remove the local `bootstrap.env` file containing its copy.
3. Remove the `BOOTSTRAP_TOKEN` line from local `edge.env`; keep the maintenance
   token and origin. Remove any other privately saved copy of the retired token.
4. Record completion in the acceptance form. Do not redeploy the original
   three-secret file after retirement.
5. A later wizard run deliberately rejects the retired/incomplete token set;
   for normal future origin/key changes, edit the relevant non-bootstrap settings
   and use `deploy:prepare`. Do not regenerate bootstrap credentials merely to
   make a wizard run again.

If an unrelated old `SUPABASE_URL` or `CQ_BOOTSTRAP_TOKEN` is exported in your
terminal, it takes precedence over Node's `--env-file`. Use a clean terminal or
unset those specific variables before the command. Never paste the token as a
literal command argument.

## Settings that are not generated

| Setting | Where the installer gets it | Where it belongs |
| --- | --- | --- |
| Database password | Created when making each Supabase project | Password manager; CLI/database prompt when required |
| SMTP host/port/username/password | Chosen delivery provider after sender verification | Supabase Auth custom SMTP settings |
| Sender identity | Verified sender supported by that provider | Supabase Auth SMTP sender fields |
| Auth Site URL and allowed callbacks | Main app origin from `app.env` | Supabase Auth URL settings: origin, `/accept-invite`, `/reset-password` |
| Public/anonymous signup, password/session/MFA/rate limits | Requirements in long guide section 7 | Hosted Supabase Auth settings, not merely local config.toml |
| Standard service-role credentials | Supabase Edge runtime provides standard server values | Keep server-only; never copy into the app/runner environment |
| Operator/public privacy fields | Owner input form plus actual provider facts/review | `src/config/operator.json`; no credentials |
| Maintenance schedules | Created by SQL migrations | Verify cron rows and actual maintenance function responses |
| Notification destination and provider alerts | Operator's approved contact route and provider facilities | GitHub/provider account settings; confirm delivery |
| Backup and restore procedure | Chosen plan, encrypted operator storage, provider-compatible tooling | Private operator runbook and acceptance record |

No third-party API key is needed for displaying classes/quizzes or for the HTML
runner. No analytics SDK, payment provider, custom-domain purchase or GitHub
access token embedded in source is required to build the app.

## Switching local environments later

The selected local `.env.local` is ignored by Git: changing Git branches does
not change it. To select an already prepared environment without regenerating
any token, copy that private environment's `app.env` over `.env.local` after
backing up any local changes you need. For example in Bash/Linux:

```bash
cp setup/private/development/app.env .env.local
npm run deploy:prepare
npm run launch:check
```

Use `production/app.env` for production instead. Check for conflicting exported
variables and other `.env.production*` files. The copy is intentional replacement;
inspect before running it. Save the generated public headers for the matching
Git branch before pushing. See the full guide for the development-to-main flow.

## What to commit

Commit the full source, templates and guides, including both prepared public
`vercel.json` files. Do not commit generated private setup files. Before handoff:

```sh
npm run handoff:manifest
npm run setup:doctor
node scripts/check-secrets.mjs
```

The manifest records source paths, not secret values. Regenerate it whenever
source files are added or removed. Complete
[the acceptance form](ACCEPTANCE.md) in `setup/private/` when actual service
checks pass. Read [GITHUB-PUSH.md](../GITHUB-PUSH.md) before staging files.
