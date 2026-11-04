# Files to include when you push CQStudio

The owner pushes the source to GitHub. The setup person then clones it and starts
with [HANDOFF.md](HANDOFF.md). GitHub account access is not needed to prepare these
local files.

## Include this structure

Place these files directly at the repository root, keeping their subfolders:

```text
.github/                    Workflows and dependency-update configuration
docs/                       Complete setup and operator guides
public/                     Public static assets
runner/                     HTML quiz runner source and vercel.json
scripts/                    Build, validation, deployment and backup tools
setup/                      Every setup template, deployment map and source manifest
src/                        Application source, styles and public operator config
supabase/                   Config, migrations, functions, seed source and tests
tests/                      Application and browser tests
.env.example                Template only; no real credentials
.gitignore
.npmrc
.nvmrc
.node-version
START-HERE.md
GITHUB-PUSH.md
HANDOFF.md
README.md
index.html
package.json
package-lock.json
playwright.config.ts
tsconfig.json
vercel.json
vite.config.ts
```

Include all source files inside those folders, including generated database
TypeScript types in `src` and the shared function modules in `supabase/functions`.
The operator configuration is public policy information, not a secret store.
The setup person completes it with approved real details before launch.

Both `vercel.json` files belong in GitHub. Their initial placeholders still need
the setup person's actual hosting addresses and `npm run deploy:prepare` before
deployment. Including `supabase/seed.sql` as source does not mean it should be
applied to production.

## Leave these out

```text
node_modules/
dist/                       Includes runner/dist/
test-results/
playwright-report/
coverage/
backups/
.vercel/
.supabase/
supabase/.temp/
supabase/.branches/
.aws/
.codex/
.agents/
.git/                       Git manages this locally; do not upload it manually
.env                        All real environment files stay local
.env.local
.env.production
.env.production.local
setup/private/              Installer-generated settings and tokens
*.log
*.pem, *.key, *.p12, *.pfx   Private credential/key material
*.dump, *.sql.gz            Database snapshots
CQStudio-handoff.zip        Upload the source contents, not an archive
CQStudio-handoff.sha256
```

Never commit member exports, downloaded study files, SMTP/database passwords,
service credentials, session tokens or bootstrap/maintenance tokens, regardless
of filename. The ignore rules help with known paths; they cannot recognize every
possible private file. Do not force-add an ignored file to make a push succeed.

## Stage the intended files in your own working Git checkout

Run this only in an initialized working repository, not the original folder's
empty read-only `.git` directory. If necessary, use the clean-copy instructions
in [section 4 of the setup guide](docs/BEGINNER-LAUNCH-GUIDE.md#4-make-a-clean-publishable-copy-and-github-repository).

```bash
git add .github docs public runner scripts setup src supabase tests \
  .env.example .gitignore .npmrc .nvmrc .node-version START-HERE.md GITHUB-PUSH.md HANDOFF.md README.md \
  index.html package.json package-lock.json playwright.config.ts \
  tsconfig.json vercel.json vite.config.ts

git status --short
git diff --cached --stat
git ls-files '.env*'
```

Review what is staged. The final command should list only `.env.example`.
Hidden files such as `.github`, `.gitignore`, `.npmrc` and `.env.example` are
necessary; preserve them if you copy the folder or upload manually.

Before pushing, run `npm run handoff:manifest` and `npm run setup:doctor` so the
installer receives every listed source/template file. Commit the updated
`setup/required-files.json` along with the source. The check does not contact
GitHub or create/stage a repository.

`.gitignore` does not remove files already tracked by an existing repository.
If a real credential was previously committed, stop and rotate that credential
and resolve the repository history before sharing it. Do not assume hiding the
current file makes an old secret safe.

## What the setup person receives from GitHub

They clone the repository, run `npm run setup:doctor`, install the locked
dependencies, and follow [START-HERE.md](START-HERE.md),
[the configuration map](setup/README.md), [HANDOFF.md](HANDOFF.md) and the
[full setup guide](docs/BEGINNER-LAUNCH-GUIDE.md).
They do not need your `node_modules`, built `dist`, local environment file,
computer-specific assistant folders or account passwords in the repository.
