# Start here: deploy from GitHub

**The repository owner can deploy using only the GitHub, Vercel and Supabase
websites. No local checkout, terminal, Node installation or uploaded build folder
is required.** The repository contains the complete application, migrations,
functions, workflows and build configuration.

Follow [the browser-only deployment guide](docs/GITHUB-DEPLOYMENT.md) in order.
It gives every dashboard field, secret name, branch choice and acceptance check.

1. Put the complete source in a private GitHub repository; keep `main` and
   `development` branches. The installer works from that repository in the browser.
2. Create separate development and production Supabase projects.
3. Import the repository into Vercel for each environment's app and separate HTML
   runner. Both use the checked-in generic `vercel.json`; headers are generated
   in the cloud from dashboard values, with no local preparation.
4. Enter the exact public values and secrets in the dashboards using
   [the GitHub settings template](setup/templates/github-cloud.json.example).
5. Configure hosted Auth, real SMTP and reviewed operator disclosures. Public
   policy JSON can be edited directly through GitHub's website.
6. Run **Deploy Supabase from GitHub** on `development`, wait for both Vercel
   sites, then run **Invite first administrator** from the Actions tab.
7. Rehearse the real workflows, promote tested source to `main`, deploy/verify
   production, enable monitoring and complete the backup/restore acceptance.

Ordinary deployments run the tests before applying pending Supabase migrations
and deploying all five functions. They do not reset production or re-enable the
retired bootstrap token. Vercel independently rebuilds the matching branch.
Require both services and live acceptance to succeed before admitting the group.

Read [HANDOFF.md](HANDOFF.md) for owner/installer responsibilities and
[GITHUB-PUSH.md](GITHUB-PUSH.md) for the initial source upload. Account ownership,
real project values and reviewed policy facts must be supplied; no accounts were
created or accessed while these files were prepared.

The local wizard and [developer commands](docs/LOCAL-DEVELOPMENT.md) remain
optional tools for developers. They are not steps the repo owner must perform.
