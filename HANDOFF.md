# CQStudio deployment handoff — start here

For a GitHub handoff, push the files in [GITHUB-PUSH.md](GITHUB-PUSH.md). The owner/installer uses GitHub, Vercel and Supabase in the browser; no local clone or ZIP transfer is required.

This project is being handed to another person for setup. The owner does not need
to run the deployment commands. The installer should read this note, then follow
[START-HERE.md](START-HERE.md) and [the full beginner launch guide](docs/BEGINNER-LAUNCH-GUIDE.md).

Collect owner decisions once using [the owner input form](setup/OWNER-INPUTS.example.md).
Every source file is listed in `setup/required-files.json`; GitHub Actions checks
completeness automatically. The [browser-only setup guide](docs/GITHUB-DEPLOYMENT.md)
lists every dashboard value. The local wizard is optional developer tooling.

## Current status

- The application source and deployment tools are included.
- Supabase and Vercel are the intended hosting services.
- Hosting projects have not been created or connected in this handoff.
- Previous local verification: 48 unit tests, 33 Chromium browser tests, application
  and Edge TypeScript, source checks, and the release build passed.
- Those browser tests use simulated Supabase responses. Live authentication,
  SMTP, database authorization, storage, monitoring and recovery still require
  verification against the new services.
- Operator disclosures remain incomplete; the minimum member age is 18.
- The production build deliberately blocks missing configuration or unreviewed
  policy details. Do not remove that protection to deploy an unfinished setup.

## Agree with the owner before starting

| Decision | Owner supplies or approves | Installer handles |
| --- | --- | --- |
| Account ownership | Who should own GitHub, Supabase, Vercel, email delivery and billing | Set up in the agreed accounts; use invited access where available |
| Public identity | Responsible operator/person or organization, country and public contact inbox | Enter actual details in the policy configuration |
| Addresses | Project naming and any owned custom domains | Reserve real app/runner addresses and configure them consistently |
| Spending | Hosting/email plan and any cost approval | Explain selected service limits and avoid unapproved purchases |
| Data and policies | Actual retention choices and reviewed terms/privacy responsibilities | Record provider regions/settings and implement the approved configuration |
| Administrators | First admin's real email and a trusted successor | Use the protected bootstrap and invitation flows; verify MFA |
| Operations | Who responds to failures and maintains backups | Configure checks, notifications, maintenance and a tested recovery process |

The installer is not automatically the public legal operator just because they
configure the site. Do not substitute their identity or inbox without agreement.
The owner should enter passwords themselves or grant appropriate account access;
sharing a source ZIP does not require sharing account passwords.

## Start from the GitHub repository

Open [START-HERE.md](START-HERE.md) in GitHub, then follow
[the browser-only walkthrough](docs/GITHUB-DEPLOYMENT.md). Vercel retrieves the
repository itself; GitHub-hosted workflows check out the source to deploy Supabase.
The owner does not need the original author's machine, Node, a terminal, a local
`.env` file, generated headers or a built folder. Real settings are entered in
GitHub/Vercel/Supabase dashboards. Developer-only local tools remain optional.

## Installer's work, in order

1. Obtain the owner's decisions above and agree where the accounts/repository live.
2. Use the complete private GitHub repository; keep source and account access restricted.
3. Prepare separate development and production Supabase backends.
4. Prepare the separate app and HTML runner Vercel projects for each environment.
5. Configure hosted Auth, exact redirects, custom SMTP and email templates.
6. Apply migrations and deploy all five Edge Functions to the intended project.
7. Complete public operator disclosures in GitHub and settings in the dashboards;
   keep the generic Vercel configurations. Cloud builds generate exact headers.
8. Run the GitHub workflows, deploy development and exercise the real user flows.
9. Prepare production with its own values, deploy and create its first administrator.
10. Remove bootstrap access after successful acceptance; verify administrator MFA.
11. Verify private file transfers, HTML quiz practice, privacy boundaries, maintenance,
    monitoring and a database-plus-Storage restoration rehearsal.
12. Complete the launch checklist and return the acceptance evidence to the owner.

Detailed commands and checkpoints:
[beginner launch guide](docs/BEGINNER-LAUNCH-GUIDE.md).
Every cloud configuration destination: [GitHub deployment guide](docs/GITHUB-DEPLOYMENT.md).
Completion record: [installer acceptance form](setup/ACCEPTANCE.md).
Acceptance checklist: [launch checklist](docs/LAUNCH.md).
Known verification limits: [verification record](docs/VERIFICATION.md).

## What must stay out of the repository

Real `.env` files, service credentials, SMTP/database passwords, bootstrap and
maintenance tokens, private keys, session tokens, database dumps, file backups and
member exports. Only `.env.example` is a source template. Public operator details
belong in `src/config/operator.json`; credentials do not.

## Return these to the owner when finished

- Final main app and runner addresses, GitHub repository, release commit and
  Supabase project identifiers.
- Confirmed account ownership, billing responsibility and the owner's tested access.
- First administrator and successor acceptance/MFA results. Each administrator
  chooses their own password; do not return a shared password in a handoff message.
- Results for real invitation/reset, file transfer, HTML practice and private-data checks.
- Confirmed removal of bootstrap secrets and a record of where remaining secrets
  are stored securely, without including their values in this document.
- Monitoring run, notification destination and the responsible operator.
- Backup location, actual retention, scope and successful restore rehearsal record.
- Completed public policies, launch checklist and any unresolved limitations.
- Confirmation that the owner can operate the site before temporary installer
  access is removed or reduced by agreement.

A Ready label on Vercel or a passing build alone is not acceptance of the complete
hosted workspace. Record the real-service results before inviting the group.
