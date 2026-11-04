import { lazy, Suspense, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { useProfile } from '../../auth/hooks/useAuth';
import { db } from '../../../lib/supabase';
import { queryClient, freshness } from '../../../lib/query';
import { adminAction } from '../api/admin';
import { emailSchema } from '../../../lib/validation';
import { Icon } from '../../../components/Icon';
import { Message, Skeleton } from '../../../components/Feedback';
const usageSchema = z.object({
    approved_members: z.number(), admins: z.number(), open_invites: z.number(), storage_bytes: z.number(), database_bytes: z.number(), classes: z.number(), lessons: z.number(), notes: z.number(), quizzes: z.number(), files: z.number(), top_storage_users: z.array(z.object({ id: z.string(), display_name: z.string(), bytes: z.number() }))
});
const ReviewQueue = lazy(() => import('./ReviewQueue'));
const UnusedHtml=lazy(()=>import('./UnusedHtml'));
const SettingsForm = lazy(() => import('./SettingsForm'));
export default function AdminPage() {
    const { data: profile } = useProfile();
    const [tab, setTab] = useState('members');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [memberPage, setMemberPage] = useState(0);
    const [activityPage, setActivityPage] = useState(0);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const query = useQuery({
        queryKey: ['admin-foundation', memberPage, activityPage], enabled: profile?.role === 'admin', staleTime: freshness.admin, queryFn: async () => {
            const results = await Promise.all([db().from('profiles').select('*').order('created_at').range(memberPage * 25, memberPage * 25 + 24), db().from('invitations').select('*').is('accepted_at',null).is('revoked_at',null).gt('expires_at',new Date().toISOString()).order('created_at', { ascending: false }).limit(100), db().rpc('workspace_usage'), db().from('activity_log').select('*').order('created_at', { ascending: false }).range(activityPage * 50, activityPage * 50 + 49), db().from('workspace_settings').select('*').single()]);
            if (results.some(r => r.error))
                throw new Error('Administration unavailable.');
            return {
                members: results[0]!.data ?? [], invitations: results[1]!.data ?? [], usage: usageSchema.parse(results[2]!.data), activity: results[3]!.data ?? [], settings: results[4]!.data!
            };
        }
    });
    async function perform(action: () => Promise<void>) {
        setBusy(true);
        setError('');
        setNotice('');
        try {
            await action();
            await queryClient.invalidateQueries({ queryKey: ['admin-foundation'] });
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Action unavailable.');
        }
        finally {
            setBusy(false);
        }
    }
    async function invite(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const fields = new FormData(form);
        const email = emailSchema.safeParse(fields.get('email'));
        if (!email.success) {
            setError('Enter a valid email address.');
            return;
        }
        await perform(async () => {
            await adminAction({ action: 'invite', email: email.data, role: fields.get('role') });
            form.reset();
            setNotice('Invitation sent.');
        });
    }
    async function remove(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (form.get('confirm') !== 'DELETE')
            return;
        await perform(async () => {
            await adminAction({
                action: 'delete_member', user_id: deleteTarget, confirm: 'DELETE', remove_shared: form.get('remove_shared') === 'on'
            });
            setDeleteTarget(null);
            setNotice('Account deleted.');
        });
    }
    if (profile?.role !== 'admin')
        return <Navigate to="/" replace/>;
    if (query.isPending)
        return <Skeleton />;
    const data = query.data;
    return <><div className="page-heading"><div><h1>Admin space</h1><p>Keep your group comfortable, safe, and ready to learn.</p></div><Icon name="shield" size={30}/></div><div className="tabs" role="navigation" aria-label="Admin sections">{['members', 'reviews', 'usage', 'settings', 'activity', 'backups'].map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)} aria-pressed={tab === t}>{t}</button>)}</div>{error && <Message error>{error}</Message>}{notice && <Message>{notice}</Message>}{query.isError && <Message error>Could not load administration. <button className="text-button" onClick={() => void query.refetch()}>Retry</button></Message>}{tab === 'settings' && data && <Suspense fallback={<Skeleton />}><SettingsForm settings={data.settings}/></Suspense>}{tab === 'reviews' && <Suspense fallback={<Skeleton />}><ReviewQueue /></Suspense>}{data && tab === 'members' && <><section className="panel"><h2>Invite someone to the table</h2><form className="inline-form" onSubmit={invite}><div><label htmlFor="invite-email">Email address</label><input id="invite-email" name="email" type="email" autoComplete="off" maxLength={254} required/></div><div><label htmlFor="invite-role">Role</label><select id="invite-role" name="role"><option value="member">Member</option><option value="admin">Administrator</option></select></div><button disabled={busy}>Send invitation<Icon name="plus" size={16}/></button></form><p className="fine-print">An invitation reserves a seat. It becomes approved membership when the recipient joins.</p></section><section className="panel section-space"><h2>Members</h2><div className="table-scroll"><table><caption>Approved members and inactive accounts</caption><thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.members.map(member => <tr key={member.id}><td><strong>{member.display_name}</strong><br /><small>@{member.username}</small></td><td><select aria-label={`Role for ${member.display_name}`} value={member.role} disabled={busy} onChange={event => void perform(async () => {
        await adminAction({
            action: 'change_member', user_id: member.id, role: event.target.value, status: member.status
        });
        setNotice('Role updated.');
    })}><option value="member">Member</option><option value="admin">Admin</option></select></td><td><span className="pill">{member.status}</span></td><td><div className="action-row"><button className="text-button" disabled={busy} onClick={() => void perform(async () => {
        await adminAction({
            action: 'change_member', user_id: member.id, role: member.role, status: member.status === 'approved' ? 'disabled' : 'approved'
        });
        setNotice('Membership updated.');
    })}>{member.status === 'approved' ? 'Disable' : 'Approve'}</button><button className="text-button danger-text" onClick={() => setDeleteTarget(member.id)}>Delete</button></div></td></tr>)}</tbody></table></div><div className="pagination"><button className="button-secondary" disabled={!memberPage} onClick={() => setMemberPage(memberPage - 1)}>Previous members</button><span>Page {memberPage + 1}</span><button className="button-secondary" disabled={data.members.length < 25} onClick={() => setMemberPage(memberPage + 1)}>More members</button></div></section>{deleteTarget && <section className="panel section-space"><h2>Delete this account?</h2><form onSubmit={remove}><p>Private records and chat messages will be removed. This action cannot be undone from the app.</p><label className="checkbox-label"><input name="remove_shared" type="checkbox"/><span>Also remove shared contributions where dependencies allow. Nonempty folders and files still referenced by other quizzes remain anonymized.</span></label><label htmlFor="delete-member">Type DELETE to confirm</label><input id="delete-member" name="confirm" pattern="DELETE" required/><div className="action-row"><button className="button-danger" disabled={busy}>Delete member</button><button type="button" className="button-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button></div></form></section>}<section className="panel section-space"><h2>Invitations</h2>{data.invitations.filter(i => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date()).map(i => <div className="list-row" key={i.id}><span>{i.email}<small>Expires {new Date(i.expires_at).toLocaleDateString()}</small></span><button className="text-button" disabled={busy} onClick={() => void perform(async () => {
        await adminAction({ action: 'revoke_invite', invitation_id: i.id });
        setNotice('Invitation revoked.');
    })}>Revoke</button></div>)}{!data.invitations.some(i => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date()) && <p>No open invitations.</p>}</section></>}{data && tab === 'usage' && <><Suspense fallback={<Skeleton/>}><UnusedHtml/></Suspense><UsageMeters usage={data.usage} limits={z.record(z.string(), z.number()).parse(data.settings.limits)}/><div className="card-grid">{[['Approved members', data.usage.approved_members], ['Open invitations', data.usage.open_invites], ['Storage reserved + used', `${(data.usage.storage_bytes / 1048576).toFixed(1)} MiB`], ['Database size', `${(data.usage.database_bytes / 1048576).toFixed(1)} MiB`], ['Classes', data.usage.classes], ['Shared files', data.usage.files]].map(([label, value]) => <section className="panel" key={label}><span className="eyebrow">{label}</span><p className="stat-number">{value}</p></section>)}</div><section className="panel section-space"><h2>Current limits</h2><div className="table-scroll"><table><tbody>{Object.entries(z.record(z.string(), z.number()).parse(data.settings.limits)).map(([key, value]) => <tr key={key}><th scope="row">{key.replaceAll('_', ' ')}</th><td>{value.toLocaleString()}</td></tr>)}</tbody></table></div></section><section className="panel section-space"><h2>Top storage contributors</h2>{data.usage.top_storage_users.map(user => <div className="list-row" key={user.id}><span>{user.display_name}</span><strong>{(user.bytes / 1048576).toFixed(1)} MiB</strong></div>)}</section></>}{data && tab === 'activity' && <section className="panel"><h2>Activity log</h2><p>Administrative actions and metadata only. No passwords, file contents, quiz answers, reflections, or chat bodies.</p>{data.activity.map(item => <div className="list-row" key={item.id}><span>{item.action.replaceAll('.', ' · ')}<small>{new Date(item.created_at).toLocaleString()}</small></span></div>)}<div className="pagination"><button className="button-secondary" disabled={!activityPage} onClick={() => setActivityPage(activityPage - 1)}>Newer activity</button><span>Page {activityPage + 1}</span><button className="button-secondary" disabled={data.activity.length < 50} onClick={() => setActivityPage(activityPage + 1)}>Older activity</button></div></section>}{tab === 'backups' && <section className="panel"><h2>Workspace export</h2><p>Download shared content and metadata as JSON. This excludes private attempts, reflections, progress, saved items, and notifications. File binaries require the separate Storage backup routine in the admin guide.</p><button disabled={busy} onClick={() => void perform(async () => {
        const data = await adminAction({ action: 'export_workspace' });
        const { downloadJson } = await import('../../../lib/storage');
        downloadJson('cqstudio-workspace.json', data);
        setNotice('Workspace metadata exported. Back up Storage binaries separately.');
    })}><Icon name="download" size={16}/>Export workspace</button><p className="fine-print">Keep exports encrypted and access restricted. Complete the monthly pg_dump and Storage backup procedure.</p></section>}</>;
}
function UsageMeters({ usage, limits }: {
    usage: z.infer<typeof usageSchema>;
    limits: Record<string, number>;
}) {
    const meters = [{
            label: 'Member seats (approved + invited)', used: usage.approved_members + usage.open_invites, max: limits.members!, unit: ''
        }, {
            label: 'Storage (reserved + ready)', used: usage.storage_bytes / 1048576, max: limits.total_bytes! / 1048576, unit: ' MiB'
        }, {
            label: 'Database planning target', used: usage.database_bytes / 1048576, max: 400, unit: ' MiB'
        }, {
            label: 'Classes', used: usage.classes, max: limits.classes!, unit: ''
        }];
    return <section className="panel section-space"><h2>Usage against capacity</h2>{meters.map(meter => <div key={meter.label} className="section-space"><label>{meter.label}<progress max={meter.max} value={meter.used} aria-label={meter.label}/></label><p>{Number(meter.used.toFixed(1))} / {Number(meter.max.toFixed(1))}{meter.unit}{meter.used / meter.max >= .8 ? ' · At least 80% used. Review capacity before adding more.' : ''}</p></div>)}<p className="fine-print">Lessons: {usage.lessons} · Notes: {usage.notes} · Quizzes: {usage.quizzes}. The database target is a planning threshold; provider limits also apply.</p></section>;
}
