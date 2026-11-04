# Administrator guide

## First administrator and invitations

Follow README setup. The one-time bootstrap sends a real Auth invitation and never creates a password. Open it, choose a password, and explicitly accept the current legal policy. Remove `BOOTSTRAP_TOKEN` after successful acceptance. Use Admin space → Members to invite people by email, change roles, disable/re-enable members, or revoke invitations. Invitations default to seven days; expired Auth email tokens may need a fresh invite. The default capacity counts approved members plus live invitations (30), with at most five administrators and ten live invitations.

Custom SMTP is recommended because Supabase's default email service is rate-limited. Test delivery and recovery before inviting the group. Administrator MFA is recommended. The last approved administrator cannot be demoted, disabled, or deleted, including through Auth cascades. Approve a second administrator before handing over.

Disabling membership blocks database access and issuance of new file links immediately; issued signed links expire within 60 seconds. The client may display already-loaded content until its next membership check. Remote offline devices clear locally stored data when they learn their session is revoked; always sign out on shared devices.

## Privacy and deletion

Members export their own data and delete their account from Profile. Admins see membership categories, shared content, and usage, but cannot read private attempts or reflections through the app. Infrastructure credentials require stricter operator controls because they bypass RLS.

Admin deletion optionally removes shared contributions where dependencies permit. Private records and own chat messages are deleted; surviving shared content is anonymized. Finalized shared files are ownerless Storage objects and remain accessible to the group; pending uploads are removed during deletion. A partially failed Auth deletion leaves membership disabled. Retry through the admin flow and verify completion. Preserve a record of deletion requests separately from backups so they can be reapplied after restoration.

## Capacity and retention

Admin space → Usage shows storage reservations plus ready objects, database size, content counts, and top storage contributors. Default limits are stored centrally. The service-only `update_settings` RPC rejects a limit below current usage and logs changes. Use Admin space → Settings to edit the name, limits, and policy version through the authenticated admin Edge action. Retention changes require a new policy version and re-acceptance. Never patch table rows from a browser or bypass RLS.

At capacity, new actions stop; existing content is preserved. Storage warning threshold is 80%; configured uploads must stop at 100%. Database target is under 400 MB and requires regular monitoring. Raising storage beyond 900 MiB should be paired with a plan review and sufficient headroom. Per-object hard limit stays 50 MiB; raise the bucket's provider limit only when the plan supports it. Moving to a paid plan does not automatically change app limits.

Default scheduled retention: chat 90 days, activity 60, notifications 30, 30 full attempts per quiz per member. The legal pages read the current database settings. Review the legal text before changing retention. Confirm pg_cron ran; configure the external daily keep-alive workflow for each hosted project and verify its run history. Free projects can still pause for provider reasons; the keep-alive is not an uptime guarantee.

## Monthly backup and restore

The app's Workspace export contains shared table JSON and file metadata. It is not a full disaster-recovery backup and does not contain private learning records, Auth secrets, or file binaries.

Once a month, and before migrations:

1. Store an encrypted backup in an access-restricted operator location outside the public repository.
2. Use Supabase CLI database dumps or `pg_dump` with a database connection stored in a secret manager. Dump schema, database roles as supported, and required application data; do not expose connection strings in shell history/logs. Supabase-managed Auth/Storage schema restore requires the provider's documented procedure.
3. Back up private Storage objects using Supabase's supported Storage API/CLI download or S3-compatible workflow configured for your project. Keep an object manifest with path, size, and checksum. Never copy just `storage.objects` metadata and assume the bytes are backed up.
4. Retain backups for [BACKUP RETENTION PERIOD], matching the Privacy Policy. Record the backup date, encryption location, object count, and verification result.
5. Restore into an isolated development project first. Apply schema migrations, restore compatible data and Storage objects, rebind restored ownership appropriately, then test policy gates, RLS, membership, and object access. Reapply deletion requests after the snapshot. Never email members from a recovery rehearsal.
6. Record restore duration and any missing objects. Only an operator-approved, verified restoration should replace production.

Review current official [Supabase backup/restore guidance](https://supabase.com/docs/guides/platform/backups) for the selected plan and tool version. Verify plan backup availability in the dashboard rather than assuming automatic recovery exists.

## Reporting and incidents

Security contact: [SECURITY CONTACT EMAIL]. Privacy contact: [CONTACT EMAIL]. Follow `docs/SECURITY.md` for incident containment, session revocation, key rotation, and notification assessment. Do not log or share passwords, file contents, chat bodies, private attempts, or reflections.

## HTML upload housekeeping

Usage → Unattached HTML uploads lists ready HTML assets with no saved version. Confirm with the uploader before removing one: an unfinished browser draft may still reference it. Removing a quiz/version or replacing an unpublished draft's HTML schedules an asset for cleanup only after its final saved reference disappears. Referenced published source remains protected. Storage usage includes pending/deleting rows until physical cleanup completes.

## Concrete monthly commands

Run on an encrypted operator volume outside this repository. Set `CQ_BACKUP_DIR` to its absolute directory and create it with restricted permissions (`umask 077`). Use the hosted project's direct/session connection information from its dashboard; fill host/user/port below without putting the password in the URI. A compatible `pg_dump` prompts for the database password:

```sh
pg_dump --format=custom --no-owner --no-acl --password \
  --dbname='postgresql://YOUR_DATABASE_USER@YOUR_DATABASE_HOST:5432/postgres?sslmode=require' \
  --file="$CQ_BACKUP_DIR/cqstudio.database.dump"
pg_restore --list "$CQ_BACKUP_DIR/cqstudio.database.dump"
```

Verify the dump's table list and a test restoration. This operator dump may contain private data; restrict access. Supabase-managed schemas/extensions/roles require the provider's documented restoration procedure, so do not blindly restore the full dump over a live managed project. Restore into an empty isolated dev project, inspect conflicts against migrations, and use compatible provider tooling for Auth identities and sessions. Revoke old sessions after recovery. Never send rehearsal emails.

In Admin → Backups, download the shared workspace JSON into the same encrypted directory. For ready file binaries, set the public `SUPABASE_URL` and `SUPABASE_ANON_KEY`. While signed into the app as an approved admin (complete MFA), take the current short-lived access token from your own session. Enter it with a masked terminal prompt; never paste it into an issue/chat or a literal shell command:

```sh
read -rs -p 'Current admin access token: ' CQ_BACKUP_ACCESS_TOKEN
export CQ_BACKUP_ACCESS_TOKEN
node scripts/backup-storage.mjs "$CQ_BACKUP_DIR/cqstudio-workspace.json" "$CQ_BACKUP_DIR/objects"
unset CQ_BACKUP_ACCESS_TOKEN
```

The script uses the authenticated vault Edge endpoint and signed attachments; it rejects service-role credentials, validates paths, checks byte counts, and writes a SHA-256 manifest. It downloads ready objects only, preserving Storage paths. Finish pending uploads or let cleanup settle before exporting. Pause shared-content changes during the snapshot and export metadata again after any change. If the 15-minute session expires, refresh it in the app and rerun against the same export: matching files with a verified manifest are skipped. An interrupted `.part` file or an existing file without a matching manifest requires operator inspection/removal before retrying; the script never silently overwrites it. Compare exported ready-object counts with the manifest. Restore binary objects through the Storage API/dashboard at their recorded paths, not by inserting Storage metadata rows. Verify checksums and test signed downloads after restoration.

Record the date, database dump check, ready-object count, checksum results, restore rehearsal, and backup expiry date. Apply [BACKUP RETENTION PERIOD] consistently to the dump, JSON, binaries, and copies. A successful command exit alone is not a proven disaster-recovery plan.
