import { useState } from 'react';
import { z } from 'zod';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { readBackup } from '../api/backup';
import type { Json } from '../../../lib/database.types';
import { Message } from '../../../components/Feedback';
const countsSchema = z.strictObject({
    attempts: z.number(), lesson_progress: z.number(), saved_files: z.number(), existing_attempts: z.number(), existing_progress: z.number(), existing_saved: z.number()
});
export default function DataTransfer() {
    const [payload, setPayload] = useState<Json | null>(null);
    const [mode, setMode] = useState<'merge' | 'replace'>('merge');
    const [counts, setCounts] = useState<z.infer<typeof countsSchema> | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    async function load(file: File) {
        setBusy(true);
        setError('');
        setNotice('');
        setCounts(null);
        setConfirmed(false);
        try {
            const backup = await readBackup(file);
            setPayload({ attempts: backup.attempts, lesson_progress: backup.lesson_progress, saved_files: backup.saved_files });
        }
        catch {
            setPayload(null);
            setError('This backup is invalid, unsupported, or too large. Use an unchanged CQStudio own-data export.');
        }
        finally {
            setBusy(false);
        }
    }
    async function preview() {
        if (!payload)
            return;
        setBusy(true);
        setError('');
        try {
            const { data, error: failure } = await db().rpc('preview_private_import', { p_payload: payload, p_mode: mode });
            if (failure)
                throw failure;
            setCounts(countsSchema.parse(data));
        }
        catch {
            setError('Could not preview this backup. Check your connection and data format.');
        }
        finally {
            setBusy(false);
        }
    }
    async function apply() {
        if (!payload || !counts || !confirmed)
            return;
        setBusy(true);
        setError('');
        try {
            const { error: failure } = await db().rpc('import_private_data', { p_payload: payload, p_mode: mode, p_confirm: true });
            if (failure)
                throw failure;
            await queryClient.invalidateQueries();
            setPayload(null);
            setCounts(null);
            setNotice('Private learning data imported. References to unavailable content were skipped.');
        }
        catch {
            setError('Import did not complete. Existing data was preserved because the transaction rolled back. Check saved-file limits and references.');
        }
        finally {
            setBusy(false);
        }
    }
    return <section className="panel section-space"><h2>Import learning data</h2><p>Import your own-data JSON export. Only private attempts, lesson progress, and saved items are restored. Profile identity, roles, policy acceptance, messages, notifications, and shared uploads are not changed.</p><label htmlFor="backup-json">CQStudio JSON backup (up to 50 MiB)</label><input id="backup-json" type="file" accept=".json,application/json" disabled={busy} onChange={event => {
        const file = event.target.files?.[0];
        if (file)
            void load(file);
    }}/><label htmlFor="import-mode">Import mode</label><select id="import-mode" value={mode} onChange={event => {
        setMode(event.target.value === 'replace' ? 'replace' : 'merge');
        setCounts(null);
        setConfirmed(false);
    }}><option value="merge">Merge — preserve existing attempts; use newer lesson progress</option><option value="replace">Replace — remove my current attempts, progress, and saved items first</option></select><button className="button-secondary section-space" disabled={!payload || busy} onClick={() => void preview()}>Preview counts</button>{counts && <><div className="table-scroll"><table><caption>Available references in this backup; missing or inaccessible content is skipped</caption><thead><tr><th>Category</th><th>Backup</th><th>Current</th></tr></thead><tbody><tr><td>Attempts</td><td>{counts.attempts}</td><td>{counts.existing_attempts}</td></tr><tr><td>Lesson progress</td><td>{counts.lesson_progress}</td><td>{counts.existing_progress}</td></tr><tr><td>Saved files</td><td>{counts.saved_files}</td><td>{counts.existing_saved}</td></tr></tbody></table></div><label className="checkbox-label"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/><span>I reviewed the counts. {mode === 'replace' ? 'Replace my current private learning records with available backup records.' : 'Merge this backup into my private learning records.'}</span></label><button disabled={!confirmed || busy} onClick={() => void apply()}>{busy ? 'Importing…' : 'Confirm import'}</button></>}{error && <Message error>{error}</Message>}{notice && <Message>{notice}</Message>}</section>;
}
