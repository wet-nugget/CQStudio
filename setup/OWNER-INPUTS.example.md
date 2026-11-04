# Owner decisions — complete once before giving the installer the job

Copy this file to `setup/private/OWNER-INPUTS.md`, then fill it in. That copy is
ignored by Git. Share its non-secret decisions directly with the installer.
Do not write passwords, tokens or private member information into it.

## Responsibility and public details

- Real operator/person or organization name:
- Public contact email controlled by that operator:
- Operator country:
- Intended audience: ages 18–25; minimum age 18, no automatic upper-age enforcement.
- First administrator email:
- Trusted successor administrator email:
- Person responsible for privacy/security enquiries:

## Account ownership and access

- GitHub repository owner and repository URL:
- Supabase organization/account owner:
- Vercel account/team owner:
- Email delivery account owner:
- Who approves billing or plan changes:
- Approved spending limits or “no paid services without approval”:
- Installer's access invitation route/contact:
- Who keeps long-term recovery access after setup:

The installer may create and record the actual project references/origins. Those
do not have to be known before the projects exist. Use separate test/live values.

## Actual operating decisions

- Chosen/approved email provider and verified sender, or permission for installer to propose one:
- Owned domain, if any; otherwise use assigned Vercel addresses initially:
- Hosting region/processor restrictions, if any:
- Who maintains encrypted database and file backups:
- Encrypted backup location and access owner:
- Approved backup retention and deletion procedure:
- Actual technical-log retention / person who will verify provider settings:
- Who reviews and approves the final privacy/terms/storage disclosures:
- Who receives availability failures and responds:
- Whether installer access is removed/reduced after acceptance:

## Installer fills these after setup

- Development app/runner origins and Supabase reference:
- Production app/runner origins and Supabase reference:
- Release commit and deployment identifiers:
- Secret-manager location labels (names only, never values):
- MFA/bootstrap removal confirmation:
- Live acceptance, monitoring and backup/restore evidence:
- Owner access verified and final acceptance date:

Blank owner decisions are not permission to invent an identity, email address,
retention promise or purchase approval. Gather the decisions above together at
the beginning rather than asking the owner piecemeal throughout the setup.
