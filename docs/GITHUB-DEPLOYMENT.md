# Deploy CQStudio from GitHub — browser-only owner setup

The repository is the deployment source. The repo owner can complete this path
using **GitHub, Vercel and Supabase dashboards**. They do not need your local
folder, a cloned checkout, Node, a terminal, a ZIP, or a `.env.local` file.

You first put the complete source in a private GitHub repository. After that,
Vercel retrieves the source through its Git integration, and GitHub-hosted Actions
retrieve the same source to deploy Supabase. Credentials live in dashboard secret
stores, not committed files. This is deployment automation, not a claim that the
hosting accounts or email service have already been created/tested.

## 1. Agree on ownership and collect the public details once

The responsible person decides account ownership, billing, contact information,
first administrator, backup responsibilities and policy details. Use
[the owner input form](../setup/OWNER-INPUTS.example.md) as a checklist. The owner
can answer in a private GitHub issue or private message; no local form is required.
Do not put passwords/tokens into issues, commits, screenshots or chat.

Keep GitHub private. Only trusted maintainers should be allowed to edit workflows
or push release branches, because deployment workflows can use repository secrets.
Use available branch/review controls. The supplied workflows use repository-level
secrets and variables; paid GitHub Environment secret support is not required.

## 2. Make the two branches in GitHub's website

1. Open the repository and its **Code** tab.
2. Confirm the default branch is `main`.
3. Open the branch selector, type `development`, and create that branch from `main`
   if it does not exist. Both branches must contain the workflows and source.
4. Keep test configuration and live credentials separate throughout this guide.

The setup uses two Supabase projects and four Vercel projects:

| Purpose | Git branch | Supabase project | App Vercel project | Runner Vercel project |
| --- | --- | --- | --- | --- |
| Rehearsal | `development` | `cqstudio-dev` | An available development app name | An available development runner name |
| Real members | `main` | `cqstudio-prod` | An available live app name | An available live runner name |

Choose names available in your accounts. Review the selected plans' actual limits
and billing before creating services. This guide does not assume a paid feature
or quote a price.

## 3. Create the Supabase projects in its dashboard

Repeat for `cqstudio-dev` and `cqstudio-prod`:

1. Sign in to [Supabase](https://supabase.com/dashboard) with the agreed owner.
2. Select/create the appropriate organization and create the project.
3. Choose the region, record it for the policy, and save a new strong database
   password in the password manager. Use different passwords for the two projects.
4. Wait for provisioning to finish.
5. From **Connect** or **Project Settings → API/API Keys**, record the actual
   project reference, HTTPS project URL and browser-safe publishable key.
6. A `sb_publishable_…` key or legacy `anon` JWT is valid for the app. A
   `service_role` or `sb_secret_…` key is never an app/runner variable.

Also create a **Supabase account access token** using its account access-token
settings. This authenticates the deployment CLI in GitHub Actions. It is not a
project publishable key, service-role key or database password. Use an account/token
with the permissions needed to link the intended project, apply migrations,
manage function secrets and deploy functions. Keep it in the password manager.

GitHub Actions supplies that token as `SUPABASE_ACCESS_TOKEN` to the CLI; no
interactive `supabase login` is needed on the owner's computer.
[Supabase CLI authentication](https://supabase.com/docs/reference/cli/supabase-login).

## 4. Connect four Vercel projects to the GitHub repository

For each project, open [Vercel](https://vercel.com/dashboard), choose
**Add New → Project**, connect GitHub if necessary, authorize the intended private
repository and import it. Use the agreed owner's account/team.

| Setting | Main app | HTML runner |
| --- | --- | --- |
| Repository | The same GitHub repository | The same GitHub repository |
| Root Directory | Repository root, no subfolder | `runner` |
| Framework Preset | **Other**; repository sets `framework: null` | **Other** |
| Install Command | From config: `npm ci --ignore-scripts` | From config: `node -e "process.exit(0)"` |
| Build Command | From config: `npm run build:vercel` | From config: `node build.mjs --vercel` |
| Output Directory | Leave override unset | Leave override unset |
| Node version | 24.x | 24.x |

Do not set the output directory to `dist` or upload a built folder for this path.
The cloud build writes `.vercel/output` in Vercel's build machine, using the
[Build Output API](https://vercel.com/docs/build-output-api). That output includes
the exact security headers, routing and assets. Both tracked `vercel.json` files
are generic: you never edit their origins or run local header preparation.

The first import may fail because required settings/policy details are still
blank. That is expected. Keep the production checks in place.

### Record the real stable domains

In each project's **Settings → Domains**, record its assigned `.vercel.app`
origin. Use the stable project address, not an individual deployment URL. An
origin is just `https://address`, without `/login`, query, fragment or trailing
slash. The app and runner must have different origins.

### Match project branches

Under **Settings → Environments → Production → Branch Tracking**, or the current
production-branch setting:

- Both development projects track `development`.
- Both live projects track `main`.

These are each project's primary deployments, so even the development projects
use Vercel's **Production** environment, containing development values.
[Vercel Git deployment reference](https://vercel.com/docs/git).

In each project's **Ignored Build Step** custom field, skip other branches:

Development projects:

```sh
if [ "$VERCEL_GIT_COMMIT_REF" = "development" ]; then exit 1; else exit 0; fi
```

Live projects:

```sh
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 1; else exit 0; fi
```

These snippets are pasted into the Vercel dashboard field, not run locally.
Exit 0 means skip, 1 means build in this particular setting. Do not replace the
normal Build Command with these snippets.
[Ignored-build reference](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel).

## 5. Enter Vercel environment values

For each **app** project's **Settings → Environment Variables**, add these four
names, scoped to that project's Production environment:

| Name | That environment's value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase HTTPS project origin |
| `VITE_SUPABASE_ANON_KEY` | Publishable/anon key for that project |
| `VITE_APP_ORIGIN` | Main app stable HTTPS origin |
| `VITE_QUIZ_RUNNER_ORIGIN` | Separate runner stable HTTPS origin |

For each **runner** project, add only `APP_ORIGIN`, set to the matching **main app**
origin, also scoped to Production. No Supabase key is needed by the runner.
Do not add database, management, SMTP, bootstrap or maintenance credentials to
either Vercel project. Save the values and redeploy after the policy is completed.

Vercel will generate headers from these values during each build. Changing a
dashboard variable requires a new deployment; an already built browser bundle
does not change retroactively.
[Vercel environment reference](https://vercel.com/docs/environment-variables).

## 6. Configure GitHub Actions through the browser

Open the repository **Settings → Secrets and variables → Actions**. Use
**Repository variables** for the first table and **Repository secrets** for the
second. Do not create similarly named source files or put the values in YAML.

### Repository variables

Add both columns. Use each environment's actual values:

| Development name | Production name | Value |
| --- | --- | --- |
| `CQ_DEV_SUPABASE_PROJECT_REF` | `CQ_PROD_SUPABASE_PROJECT_REF` | Project reference, not full URL |
| `CQ_DEV_SUPABASE_URL` | `CQ_PROD_SUPABASE_URL` | Supabase project origin |
| `CQ_DEV_SUPABASE_ANON_KEY` | `CQ_PROD_SUPABASE_ANON_KEY` | Browser-safe publishable/anon key |
| `CQ_DEV_APP_ORIGIN` | `CQ_PROD_APP_ORIGIN` | Main app origin |
| `CQ_DEV_RUNNER_ORIGIN` | `CQ_PROD_RUNNER_ORIGIN` | Runner origin |

### Repository secrets

| Development name | Production name | Value |
| --- | --- | --- |
| `CQ_DEV_SUPABASE_ACCESS_TOKEN` | `CQ_PROD_SUPABASE_ACCESS_TOKEN` | Supabase account deployment access token |
| `CQ_DEV_SUPABASE_DB_PASSWORD` | `CQ_PROD_SUPABASE_DB_PASSWORD` | That project's database password |
| `CQ_DEV_MAINTENANCE_TOKEN` | `CQ_PROD_MAINTENANCE_TOKEN` | A strong random token, different in each environment |
| `CQ_DEV_BOOTSTRAP_TOKEN` | `CQ_PROD_BOOTSTRAP_TOKEN` | A different strong random token for first-admin setup |
| `CQ_DEV_FIRST_ADMIN_EMAIL` | `CQ_PROD_FIRST_ADMIN_EMAIL` | Intended first administrator inbox; kept secret so it is masked in logs |

For bootstrap/maintenance tokens, generate 64 random hexadecimal characters in
your password manager, or use 32–512 random letters/digits/underscores/hyphens.
Keep bootstrap and maintenance tokens different. The regular deployment never
restores the bootstrap token after it has been removed.

Finally add one repository variable:

| Name | Value |
| --- | --- |
| `CQ_GITHUB_DEPLOYMENTS_ENABLED` | `true`, only after both sets of required settings are complete |

Until enabled, deployment/monitor jobs are skipped. A skipped run is not proof
of deployment. `main` selects only production names; `development` selects only
development names. Missing production credentials fail validation instead of
falling back to development values. Other branches and pull requests never run
these credentialed deployment jobs.

## 7. Set hosted Auth and SMTP in both Supabase dashboards

These initial account/provider settings are dashboard work; they are not configured
by `config.toml` simply existing in GitHub. No local terminal is needed.

In each project's **Authentication → URL Configuration**:

- Site URL: matching main app origin.
- Allowed redirect: matching main app origin plus `/accept-invite`.
- Allowed redirect: matching main app origin plus `/reset-password`.
- Use exact URLs. Do not put the runner here or use a production wildcard.

In the applicable Auth/provider/security panels, verify:

| Setting | Required state |
| --- | --- |
| Email/password sign-in | Enabled |
| Public self-signup | Disabled |
| Anonymous sign-ins | Disabled |
| Email confirmation | Enabled |
| Password minimum | 12 characters |
| JWT lifetime | 900 seconds where configurable |
| Refresh-token rotation | Enabled |
| TOTP/app authenticator | Enrollment and verification enabled |
| Auth rate limits | Reviewed for this invite-only group |
| Leaked-password protection | Enabled where supported by the selected plan |

Do not enable CAPTCHA without adding its client challenge flow; this app does
not currently implement one. Avoid unused social/manual-link providers.

Set up a real SMTP delivery provider, verify its sender/domain and DNS records,
then open Supabase's **Authentication → Emails → SMTP Settings**. Copy the
provider-supplied SMTP host, port, username, password and verified sender. The
public contact inbox can differ from the SMTP sending identity. Test delivery,
check spam and provider logs, and review both providers' rate limits. Disable
authentication-email link tracking if offered.

In Invite user and Reset password email templates, keep the link using
`{{ .ConfirmationURL }}`; the app supplies the correct redirect. Do not replace
it with just the homepage or a new custom callback. Request a fresh link if it
expires or was consumed by an email scanner. The app invitation reservation and
provider email-token expiry are different limits.
[SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp),
[email templates](https://supabase.com/docs/guides/auth/auth-email-templates),
[redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

## 8. Complete public policies by editing the GitHub file

In GitHub's Code tab, select the intended branch and open
`src/config/operator.json`. Click the pencil/Edit control. Enter actual operator,
contact, country, hosting/SMTP processor details, log retention, backup retention,
applicable terms and privacy responsibilities. Keep `minimumAge` as the number
18. Review the actual facts and disclosures before changing `reviewed` to `true`.

Use valid JSON: double-quoted strings, commas between fields, no comments or
trailing comma. These are public disclosures; never put credentials in this file.
Do not invent legal identity, provider regions or retention promises to satisfy
the build. This guide does not provide jurisdiction-specific legal wording.

Commit the change using GitHub's website, directly on the appropriate controlled
branch or through your review process. Keep the development and production policy
facts accurate for their services. No files need downloading or local editing.

## 9. Deploy development from GitHub

First rehearse the `development` branch:

1. Open repository **Actions**. Enable Actions if GitHub asks.
2. Open **Deploy Supabase from GitHub → Run workflow**.
3. Select branch **development**, then Run workflow.
4. Wait for the reusable **Checks** jobs, including local database policy tests,
   to pass. The deployment job does not receive credentials until those succeed.
5. Open the deployment job. It validates configuration, links the intended
   project, shows/applies pending migrations, lints the hosted schema, sets origin
   and maintenance secrets, and deploys all five functions.
6. Require the job to succeed. It does not reset the hosted database or import
   development seed data into production.
7. In both development Vercel projects, wait for the `development` Git build to
   be Ready. If the branch was already deployed before variables/policy were set,
   use the dashboard's Redeploy option for the correct branch commit.

Vercel and Supabase deployment are separate jobs/services and may finish at
different times. Do not admit users until **both** are successful and the live
checks pass. For later schema changes, keep old/new app compatibility or plan a
coordinated migration; a frontend rollback does not roll back a database.

The Supabase pipeline uses the repository's `supabase/migrations` and
`supabase/functions`, following
[Supabase's GitHub deployment model](https://supabase.com/docs/guides/deployment/managing-environments)
and [function CI deployment](https://supabase.com/docs/guides/functions/deploy).

## 10. Invite the first admin with a GitHub button

Once both websites and the backend work and SMTP is configured:

1. Open **Actions → Invite first administrator → Run workflow**.
2. Select **development** for rehearsal. Later select **main** for production.
3. The workflow reads that branch's `FIRST_ADMIN_EMAIL` and bootstrap secret.
4. It checks live routing/headers/backend availability first, temporarily sets
   the hosted bootstrap token, sends the protected invitation, and unsets the
   hosted token during cleanup after any secret-setting attempt, including a
   partial setting failure or a failed invitation request.
5. Require the cleanup step to succeed. If cleanup fails, remove `BOOTSTRAP_TOKEN`
   in Supabase **Edge Functions → Secrets** before considering bootstrap retired.
6. Open the intended inbox, follow the link, choose a unique username and your
   own password, accept the reviewed policy, and join.
7. Enable the authenticator in the app's profile Security settings; test sign-in.
8. Invite a trusted second administrator through **Admin space → members** and
   have them accept and enable MFA.
9. After successful acceptance, remove the corresponding `CQ_DEV_BOOTSTRAP_TOKEN`
   or `CQ_PROD_BOOTSTRAP_TOKEN` from GitHub Secrets as well. Future ordinary
   deployments do not need it and do not re-enable bootstrap.

If email delivery fails or an old Auth identity/reservation remains, inspect the
function/Auth/SMTP logs and actual invitation state before retrying. Do not
manually assign admin database roles or create generic Auth users as a shortcut.

## 11. Finish scheduled cleanup in the Supabase Vault UI

The migrations create retention/touch/storage-cleanup cron jobs. In each
Supabase project's **database Vault** UI, add:

| Vault name | Value |
| --- | --- |
| `cqstudio_maintenance_url` | That Supabase URL followed by `/functions/v1/maintenance` |
| `cqstudio_maintenance_token` | Same token stored in its GitHub maintenance secret |

The workflow already places that token in the matching Edge `MAINTENANCE_TOKEN`.
Database Vault, Edge Secrets and the app's shared-file vault are three different
places. Use the exact lowercase Vault names. Do not embed tokens in SQL history.
[Supabase Vault reference](https://supabase.com/docs/guides/database/vault).

In Supabase SQL Editor, this read-only query checks schedules:

```sql
select jobname, schedule, active
from cron.job
where jobname like 'cqstudio-%'
order by jobname;
```

Expect `cqstudio-retention`, `cqstudio-daily-touch` and
`cqstudio-storage-cleanup`. Observe their executions and the actual maintenance
function response. A successful cron enqueue alone is not proof that the HTTP
cleanup succeeded. Without Vault secrets, cleanup intentionally does nothing.

## 12. Promote and verify production

After real development acceptance:

1. In GitHub, open a pull request from `development` into `main`, review it and
   merge the tested source. Confirm production policy/provider facts too.
2. `main` now triggers the production Supabase workflow and the two production
   Vercel projects. They select production values from their dashboards.
3. Wait for all jobs/deployments to succeed. Check their commit identifiers.
4. Run **Invite first administrator** on **main** once for the intended real
   admin, then retire its GitHub bootstrap secret after acceptance.
5. Complete production database Vault setup and verify maintenance.
6. Run **Actions → Production availability → Run workflow** on **main**.
7. Check the actual app `/login`, `/privacy`, `/terms` and `/health.json`; refresh
   direct routes. The runner alone may display its waiting message.

Verify actual invitation/reset emails, sign-in/MFA, upload/download, lessons,
all quiz formats, HTML preview without saving, HTML practice with a saved result,
chat/Realtime, notifications, private-data boundaries, disabled membership,
exports/imports and account deletion. Use consenting/disposable development
accounts for destructive/privacy experiments. The included browser tests use
fixtures and do not replace these hosted checks.

A tiny self-contained HTML test file is included at
[`docs/samples/launch-test-quiz.html`](samples/launch-test-quiz.html). It can be
downloaded from GitHub in the browser for a test upload. It reports one result
through the supported protocol; opening it directly is not proof of app integration.

Test real phone layouts, keyboards, zoom, light/dark themes and live performance.
Record backup scope/retention and an isolated database-plus-Storage restoration
rehearsal. [The administrator guide](ADMIN.md) explains recovery responsibilities;
provider-supported backups and an authorized operator/recovery environment are
separate from the source-deployment path. Do not put member backups into GitHub.

Complete [the acceptance record](../setup/ACCEPTANCE.md) and
[the launch checklist](LAUNCH.md). Return the results to the owner through the
agreed private record; no local template copy is required. A green build or
Vercel Ready label alone is insufficient to launch the group.

## 13. Monitoring and later updates

- **Production availability** runs every 30 minutes with the `CQ_PROD_` public
  variables and checks the app, runner, policy database RPC and anonymous denial
  by member functions. Run it manually and confirm operator GitHub failure notifications.
- **Daily database touch** uses `CQ_DEV_SUPABASE_URL` and
  `CQ_DEV_MAINTENANCE_TOKEN`. It is development-only and is not a backup/uptime
  guarantee. GitHub schedules are best effort.
- A Vercel hosting login/password screen may block embedded runner access or
  availability probes. Test with an invited person who is not signed into the
  owner's Vercel account. The current probe has no protection bypass; use an
  authorized compatible monitor for a hosting-protected production deployment.
  Do not weaken the application's membership checks or quiz sandbox to satisfy a probe.
- After the initial setup, update source through GitHub commits/pull requests.
  Vercel rebuilds from GitHub and the Supabase workflow applies pending migrations.
  Add migrations as new files; do not rewrite already applied SQL history.
- Only `main`/`development` can run the credentialed deployment workflow. Review
  workflow changes and limit who can push those branches.
- Do not use a hosted `db reset`, upload local `dist`, or commit a real `.env` file
  as a deployment workaround. Header values are generated in the cloud now.

## Troubleshooting without local commands

| Symptom | Where to inspect | Next action |
| --- | --- | --- |
| Deployment action skipped | GitHub repository Variables | Set `CQ_GITHUB_DEPLOYMENTS_ENABLED=true`; select main/development |
| Named configuration missing | The selected branch's `CQ_DEV_` or `CQ_PROD_` settings | Fill the exact repository variable/secret named in the validation error |
| Missing production secret | Production-prefixed repository secrets | Add the production value; it deliberately does not use development as fallback |
| Supabase link/migration error | Selected project reference/password/token and action log | Correct target/permissions; inspect migration failure; never reset production |
| Vercel `/setup` or blocked production build | App's four variables and operator JSON | Correct values in dashboards/GitHub and redeploy |
| Old "prepare vercel.json" instruction | An older commit or old guide | Use this version's generic configs and cloud build commands |
| Vercel routes/headers missing | Framework/output-directory overrides | Use Other, keep output override unset and the configured Build Output API command |
| HTML runner fails | Runner `APP_ORIGIN`, app runner origin, host protection | Match the intended pair of origins and verify member iframe access |
| Invite workflow fails live probe | Both Vercel sites and backend deployment statuses | Wait/fix the failed service, then rerun before sending an invite |
| Invite email never arrives | Supabase SMTP/Auth/function logs and provider delivery log | Fix sender, credentials, limits, redirect or expiry; inspect reservation state |
| Bootstrap cleanup failed | Bootstrap workflow cleanup step / Supabase Edge Secrets | Remove hosted `BOOTSTRAP_TOKEN` manually and verify |
| Cleanup doesn't run | Supabase database Vault + actual function invocation | Correct the two exact Vault values and confirm the HTTP result |
| Availability fails on a login/redirect | Vercel hosting protection | Arrange authorized probe access rather than exposing private backend data |
| Main/development values get mixed | GitHub prefixes and each Vercel project's settings | Correct the selected environment and redeploy from its matching branch |

All actual project addresses, credentials and operator disclosures are entered by
the installer in the relevant dashboards. They cannot be pre-created in a source
repository. No cloud workflow or deployment was executed during preparation of
these source files; first-run hosted results remain to be verified by the owner.
