# Optional local development

The repo owner can deploy entirely through [the browser-only GitHub guide](GITHUB-DEPLOYMENT.md).
These tools are for a developer who chooses to work on a computer; they are not
required for the owner to deploy.

Use Node 24.x, npm, Git and OpenSSL on Linux/Bash (or an appropriately configured
development environment). Preserve hidden source files and the dependency lockfile.

```sh
npm ci --ignore-scripts
npm run setup:doctor
npm run dev
```

Open the local address printed by Vite. Without live configuration, use `/setup`,
`/preview` or `/design`. Stop the server with Ctrl+C. A localhost interface does
not change hosted Auth callbacks or the hosted runner's permitted parent origin.

For hosted-development values, the optional `npm run setup` wizard and
[configuration map](../setup/README.md) generate ignored files. Do not use
production data for development or commit private generated configuration.
Changing branches does not change ignored `.env.local`; select the intended
environment explicitly and check for conflicting exported variables.

## Local checks

```sh
npm run lint
npm run typecheck
npx tsc --project supabase/functions/tsconfig.json
npm test
npm run build
npx playwright install chromium
npm run test:smoke
```

Browser checks require OpenSSL for the local HTTPS runner and supported Chromium
libraries. Playwright's supported Linux dependency installer is
`npx playwright install --with-deps chromium`; check your operating system before
using it. The test servers use ports 4173/4174 and disposable `/tmp` artifacts.
They mock provider responses and do not configure a real project.

`npm run headers` writes ignored `.cq-deployment/app.json` from the current
environment. Normal `npm run build` does this automatically and writes `dist`.
Vercel calls `npm run build:vercel`, enforces real configuration/policy values
and emits `.vercel/output` with headers/routes. The runner emits its own Build
Output API artifact with `node runner/build.mjs --vercel`. Neither build modifies
tracked `vercel.json`. The generic tracked files must stay in the repository.

## Supabase CLI for developers

This helper uses the same pinned CLI as CI without changing app dependencies:

```bash
cqsb() {
  npx --yes --ignore-scripts=false --package=supabase@2.122.0 supabase "$@"
}
cqsb --version
```

The installer may download the trusted CLI package. Define the function again
in a new terminal, or use a matching native CLI as `supabase`.
The existing `supabase/` directory is already initialized; do not run `init` over it.

For deliberate manual development administration, authenticate, link the correct
project, inspect the dry run and apply migrations:

```bash
cqsb login
read -r -p 'Development project reference: ' CQ_TARGET_REF
cqsb link --project-ref "$CQ_TARGET_REF"
cqsb migration list --linked
cqsb db push --dry-run
cqsb db push
cqsb db lint --linked --level error
```

Do not run a hosted `db reset`. Scripts targeting `cqstudio-db-test` and
`cqstudio-storage-test` are disposable-container test tools, not deployment tools.
Hosted Auth/SMTP/Vault and real-account checks still need dashboard verification.
For normal releases, use the repository workflows rather than manually deploying
from a machine. The cloud workflow is authoritative and never includes the seed.

Regenerate `setup/required-files.json` after source paths change and include it in
the same commit. If working in the original supplied folder with an empty/read-only
`.git`, make a clean source copy or use the prepared GitHub source folder; do not
repair that special metadata in place. The initial uploader can push the full
source, after which the owner works from GitHub without any local folder.
