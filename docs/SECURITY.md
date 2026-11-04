# Security model and operations

## Trust boundaries

One invite-only group. Browsers, uploaded files, imported content, profile fields, and message payloads are untrusted. Postgres RLS is the authorization boundary. Profiles store authoritative status and role; mutable Auth metadata never grants access. `is_approved()` also checks the Auth session still exists and requires AAL2 when a verified factor exists. `can_use_workspace()` additionally requires current policy acceptance.

Approved members can read shared group content. They cannot read anyone else's private attempts, reflections, progress, saved files, or notifications. This restriction also applies to application administrators. Infrastructure operators with service/database credentials can technically access stored data and must restrict privileged access. No end-to-end encryption and no malware scanning are provided.

Every application table has RLS enabled with explicit policies. Browser grants do not include membership mutation or quiz review. SECURITY DEFINER functions use an empty search path, qualified names, and explicit EXECUTE grants. Service-only administrative functions recheck the acting administrator from database state. The singleton settings row serializes capacity changes and protects the last approved administrator under concurrent requests.

Auth email invitations reserve a seat before calling the Auth Admin API. The accepted email must match an invitation bound to the authenticated user's ID; email must be verified, invitation live, and current policy explicitly accepted. The database ignores user-supplied role metadata. Expired/revoked links cannot create membership. Bootstrap requires an Edge-only one-time token and an empty membership/invitation state.

## Secrets and hardening

Only the project URL and anon/publishable key go in browser variables. Service-role credentials exist only in Edge Function secret stores; never scripts, `.env` committed files, build output, or browser code. Deployment configuration is prepared from public origins before a deployment is created; the build checks it matches the environment. App CSP does not permit inline scripts, eval, remote executable content, objects, or framing by another site. HTML quiz isolation uses a separate origin, two script-only sandboxes, source-window/channel validation, bounded results, and a runner CSP that denies network access.

Admin Edge Functions check the bearer JWT with Auth, approved status, policy acceptance, session validity, MFA state, and admin role. Inputs use strict Zod schemas and bounded request bodies. CORS allows only `APP_ORIGIN`; origin checks supplement authentication. No dynamic SQL is constructed from input.

Configure a 12-character minimum password, short JWT lifetime (900 seconds), refresh rotation, Auth rate limits, custom SMTP, and leaked-password protection if supported by the selected plan. Use MFA for administrators. Keep dependencies pinned, review Dependabot changes, run audit, and enable GitHub secret scanning where available. The repository's local pattern check is supplementary and does not guarantee all secrets are detected.

## Logging and retention

Activity log: action, actor, entity reference, and allowlisted metadata. Never passwords, tokens, file contents, chat bodies, private answers, or reflections. No third-party error tracker is installed. UI errors are generic; internal stack traces are not rendered. Provider technical logs must be reviewed separately and assigned a documented retention before launch.

Edge failures with HTTP status 500 or above emit a provider-native diagnostic
containing only `request.failed`, a random request ID, and the status. The same
ID is returned as `X-Request-ID` for operator correlation. Raw exceptions and
request details are excluded. The optional GitHub Production availability job
checks app/runner/DB availability and rejection of anonymous function calls;
configure its public variables and operator failure notifications before launch.

Daily `pg_cron` retention uses `workspace_settings`: chat 90 days, activity 60, notifications 30 by default. Full answer detail is retained for the latest 30 attempts per quiz per member; older attempts retain date and score. Shared content is not automatically deleted at capacity. Deletion of object binaries must use the Storage API, never direct deletion of `storage.objects` metadata.

## Incident checklist

1. Record when the incident was discovered, affected systems, and operator responsible. Preserve minimal evidence securely; never paste tokens, chat bodies, or private data into issue trackers.
2. Disable affected memberships through the normal flow. The database prevents disabling the last admin; appoint a secured successor first. Revoke Auth sessions and restrict deployments if needed.
3. Rotate compromised credentials and review unexpected administrator/role changes in the activity log. Rotate SMTP/maintenance/bootstrap tokens where relevant.
4. Determine what data was accessed, which members are affected, and whether processor assistance is needed. Review provider logs under least privilege.
5. Consult the operator's legal/privacy contact and applicable notification obligations. Notify members and authorities when required; document the decision and timing.
6. Restore from a verified backup if necessary. Reapply deletion requests and role/status changes made after the backup. Verify RLS, sessions, and access restrictions before reopening.
7. Document the cause, remediation, and prevention without exposing private content. Follow up with affected members.

For Philippine members, assess duties under the [Data Privacy Act of 2012](https://privacy.gov.ph/data-privacy-act/) and applicable National Privacy Commission breach rules. Templates do not certify legal compliance.

## Key rotation

Use Supabase's current dashboard rotation process for the key type in use. Prepare replacement server credentials in Edge secrets, deploy/verify server functions, rotate and revoke the old key, then verify no old service credential works. For JWT signing-key rotation, follow Supabase's signing-key rollout/revocation procedure and invalidate affected sessions as appropriate. Update browser anon/publishable keys only when the selected rotation changes them; rebuild both dev and prod with their own environment. Rotate maintenance tokens in Edge secrets and GitHub Actions together. Remove the bootstrap token after first-admin acceptance.

## Verification limits

Automated pgTAP tests cover membership, private records, invitations, consent, revoked sessions, limits, and last-admin behavior. Browser checks cover public pages, fixture-backed member/admin routes in light/dark, policy acceptance, cache cleanup, and separate-origin quiz isolation. Hosted Auth mail delivery, configured SMTP, deployment access controls, recovery email behavior, and provider region/retention must be verified against the real development project before launch. WCAG 2.2 AA is a target; formal accessibility compliance is not certified.

Report vulnerabilities privately to [SECURITY CONTACT EMAIL]. Do not disclose private member content in a public report.
