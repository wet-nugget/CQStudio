import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import type { Row } from '../../../lib/database.types';
import { adminAction } from '../api/admin';
import { queryClient } from '../../../lib/query';
import { Message } from '../../../components/Feedback';
const labels: Record<string, string> = {
    members: 'Approved members + live invitations', admins: 'Approved + invited administrators', open_invites: 'Open invitations', invite_days: 'Invitation lifetime (days)', total_bytes: 'Workspace storage (MiB)', member_bytes: 'Per-member storage (MiB; admins exempt)', file_bytes: 'Maximum file (MiB)', html_bytes: 'Maximum HTML quiz (MiB)', classes: 'Classes', lessons_per_class: 'Lessons per class', notes_per_class: 'Notes per class', quizzes_per_class: 'Quizzes per class', questions_per_quiz: 'Questions per quiz', lesson_bytes: 'Lesson size (MiB)', note_bytes: 'Note size (MiB)', folder_depth: 'Folder depth', files_per_folder: 'Files per folder', pending_submissions: 'Pending quiz submissions per member', saved_files: 'Saved files per member', chat_days: 'Chat retention (days)', activity_days: 'Activity-log retention (days)', notification_days: 'Notification retention (days)', full_attempts: 'Full attempts retained per quiz/member'
};
export default function SettingsForm({ settings }: {
    settings: Row<'workspace_settings'>;
}) {
    const limits = z.record(z.string(), z.number().int().positive()).parse(settings.limits);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const values = Object.fromEntries(Object.keys(limits).map(key => [key, Math.round(Number(form.get(key)) * (key.endsWith('_bytes') ? 1048576 : 1))]));
        const parsed = z.strictObject({ name: z.string().trim().min(1).max(80), policy_version: z.string().min(1).max(50), limits: z.record(z.string(), z.number().int().positive().max(9999999999999)) }).safeParse({ name: form.get('name'), policy_version: form.get('policy_version'), limits: values });
        if (!parsed.success) {
            setError('Check the workspace name, policy version, and positive limits.');
            return;
        }
        setBusy(true);
        setError('');
        setNotice('');
        try {
            await adminAction({ action: 'update_settings', ...parsed.data });
            await queryClient.invalidateQueries({ queryKey: ['admin-foundation'] });
            await queryClient.invalidateQueries({ queryKey: ['policy'] });
            setNotice('Settings saved. A policy-version change requires every member to accept again.');
        }
        catch {
            setError('Settings were not changed. A limit may be below current usage, exceed a hard maximum, or need a new policy version for retention changes.');
        }
        finally {
            setBusy(false);
        }
    }
    return <section className="panel"><h2>Workspace settings</h2><p>Limits block new actions and preserve existing content. Retention changes affect stored history; update and review the policy text, then choose a new policy version before applying them.</p><form onSubmit={submit}><label htmlFor="settings-name">Workspace name</label><input id="settings-name" name="name" defaultValue={settings.name} required maxLength={80}/><label htmlFor="settings-policy">Current policy version</label><input id="settings-policy" name="policy_version" defaultValue={settings.policy_version} required maxLength={50}/><div className="form-columns">{Object.entries(limits).map(([key, value]) => <label key={key} htmlFor={`limit-${key}`}>{labels[key] ?? key}<input id={`limit-${key}`} name={key} type="number" min={key.endsWith('_bytes') ? 0.000001 : 1} step={key.endsWith('_bytes') ? 'any' : 1} max={['file_bytes', 'html_bytes'].includes(key) ? 50 : undefined} defaultValue={key.endsWith('_bytes') ? value / 1048576 : value} required/></label>)}</div><label className="checkbox-label"><input type="checkbox" required/><span>I reviewed current usage, provider capacity, and retention disclosures. Policy changes will require re-acceptance.</span></label>{error && <Message error>{error}</Message>}{notice && <Message>{notice}</Message>}<button disabled={busy}>{busy ? 'Saving…' : 'Apply settings'}</button></form></section>;
}
