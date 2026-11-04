import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth, useProfile } from '../hooks/useAuth';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { profileSchema, validationMessage } from '../../../lib/validation';
import { mfaQrUrl, totpSchema } from '../api/mfa';
import { Message } from '../../../components/Feedback';
import { Tabs } from '../../../components/ui/kit';
import { useAppearance } from '../../../lib/appearance';
const Appearance=lazy(()=>import('../../workspace/components/AppearancePanel'));
const AvatarPicker = lazy(() => import('./AvatarPicker'));
const DataTransfer = lazy(() => import('../../progress/components/DataTransfer'));
export default function ProfilePage() {
    const { data: profile } = useProfile();
    const auth = useAuth();
    const navigate = useNavigate();
    const {tab='profile'}=useParams();
    const appearance=useAppearance(profile?.id??'member');
    const section=['profile','appearance','security','privacy-data'].includes(tab)?tab:'profile';
    const tabs=['Profile','Appearance','Security','Privacy & data'];
    const [avatar, setAvatar] = useState(profile?.avatar ?? 0);
    const [showAvatars, setShowAvatars] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [enrollment, setEnrollment] = useState<{
        id: string;
        qr: string;
        secret: string;
    } | null>(null);
    const [deleting, setDeleting] = useState(false);
    async function perform(action: () => Promise<void>) {
        setBusy(true);
        setError('');
        setNotice('');
        try {
            await action();
        }
        catch {
            setError('Could not complete this action. Check your connection and try again.');
        }
        finally {
            setBusy(false);
        }
    }
    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const parsed = profileSchema.safeParse({
            username: form.get('username'), display_name: form.get('display_name'), avatar, theme: form.get('theme')
        });
        if (!parsed.success) {
            setError(validationMessage(parsed.error));
            return;
        }
        await perform(async () => {
            const value = parsed.data;
            const { error: failure } = await db().rpc('update_my_profile', {
                p_username: value.username, p_display_name: value.display_name, p_avatar: value.avatar, p_theme: value.theme
            });
            if (failure)
                throw failure;
            await queryClient.invalidateQueries({ queryKey: ['profile'] });
            appearance.update({theme:value.theme});
            setNotice('Profile saved.');
        });
    }
    async function exportData() {
        await perform(async () => {
            const { data, error: failure } = await db().rpc('export_my_data');
            if (failure)
                throw failure;
            const { downloadJson } = await import('../../../lib/storage');
            downloadJson('cqstudio-my-data.json', data);
            setNotice('Your data export is ready. Store it privately.');
        });
    }
    async function enroll() {
        await perform(async () => {
            const existing=await db().auth.mfa.listFactors();if(existing.error)throw existing.error;for(const factor of existing.data.all){if(factor.factor_type==='totp'&&factor.status==='unverified'){const removed=await db().auth.mfa.unenroll({factorId:factor.id});if(removed.error)throw removed.error;}}
            const { data, error: failure } = await db().auth.mfa.enroll({ factorType: 'totp', friendlyName: `CQStudio ${new Date().toISOString().slice(0, 10)}`, issuer: 'CQStudio' });
            if (failure || !data)
                throw failure;
            setEnrollment({ id: data.id, qr: mfaQrUrl(data.totp.qr_code), secret: data.totp.secret });
        });
    }
    async function verify(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const code = String(new FormData(event.currentTarget).get('code') ?? '');
        if (!totpSchema.safeParse({code}).success || !enrollment) {
            setError('Enter the six-digit code.');
            return;
        }
        await perform(async () => {
            const { error: failure } = await db().auth.mfa.challengeAndVerify({ factorId: enrollment.id, code });
            if (failure)
                throw failure;
            setEnrollment(null);
            setNotice('Two-factor authentication enabled.');
            await queryClient.invalidateQueries({ queryKey: ['assurance'] });
        });
    }
    async function removeMfa() {
        await perform(async () => {
            const { data, error: failure } = await db().auth.mfa.listFactors();
            if (failure)
                throw failure;
            for (const factor of data?.all.filter(item=>item.factor_type==='totp') ?? []) {
                const result = await db().auth.mfa.unenroll({ factorId: factor.id });
                if (result.error)
                    throw result.error;
            }
            await db().auth.refreshSession();
            await queryClient.invalidateQueries({ queryKey: ['assurance'] });
            setNotice('Authenticator factors removed.');
        });
    }
    async function deleteAccount(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (new FormData(event.currentTarget).get('confirm') !== 'DELETE')
            return;
        await perform(async () => {
            const { error: failure } = await db().functions.invoke('account', { body: { action: 'delete_account', confirm: 'DELETE' } });
            if (failure) {
                setError('Deletion unavailable. The last administrator must appoint a successor. For a partial deletion, contact an administrator.');
                return;
            }
            await auth.signOut();
            void navigate('/login');
        });
    }
    if (!profile)
        return null;
    return <div className="profile-settings feature-screen" data-section={section}><div className="page-heading"><div><h1>Your profile</h1><p></p></div><span className="pill">{profile.role}</span></div><Tabs items={tabs} value={tabs.find(t=>t.toLowerCase().replaceAll(' & ','-')===section)??'Profile'} onChange={s=>void navigate(`/settings/${s.toLowerCase().replaceAll(' & ','-')}`)} label="Settings sections"/>{section==='appearance'&&<Suspense fallback={<p>Loading appearance…</p>}><Appearance user={profile.id}/></Suspense>}{error && <Message error>{error}</Message>}{notice && <Message>{notice}</Message>}<div className="profile-grid pane-scroll"><section className="panel profile-details"><h2>Profile</h2><form onSubmit={save}><label htmlFor="display-name">Display name</label><input id="display-name" name="display_name" defaultValue={profile.display_name} required maxLength={80}/><label htmlFor="username">Username</label><input id="username" name="username" defaultValue={profile.username} required pattern="[a-z0-9_]{3,30}"/><label htmlFor="theme">Appearance</label><select id="theme" name="theme" defaultValue={profile.theme}><option value="system">Follow system</option><option value="light">Light</option><option value="dark">Dark</option></select><button type="button" className="button-secondary" onClick={() => setShowAvatars(!showAvatars)}>Choose avatar</button>{showAvatars && <Suspense fallback={<p>Loading avatars…</p>}><AvatarPicker value={avatar} onChange={setAvatar}/></Suspense>}<button disabled={busy}>Save changes</button></form><p className="fine-print">Policy {profile.policy_version} accepted {new Date(profile.policy_accepted_at).toLocaleDateString()}. <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link> · <Link to="/storage">Storage</Link></p></section><div className="stack"><section className="panel profile-security"><h2>Security</h2><p>Use an authenticator app for another layer of protection. Recommended for administrators.</p><div className="action-row"><button className="button-secondary" disabled={busy} onClick={() => void enroll()}>Set up authenticator</button><button className="text-button" disabled={busy} onClick={() => void removeMfa()}>Remove authenticator factors</button></div>{enrollment && <form onSubmit={verify}><p>Scan this QR code, or enter the setup key manually. Keep it private.</p><img src={enrollment.qr} alt="Authenticator enrollment QR code" width={180} height={180} loading="lazy" decoding="async"/><code className="setup-key">{enrollment.secret}</code><label htmlFor="totp-code">Six-digit code</label><input id="totp-code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required/><button disabled={busy}>Verify authenticator</button><button type="button" className="text-button" onClick={() => void perform(async () => {
        if (enrollment) {
            const { error: failure } = await db().auth.mfa.unenroll({ factorId: enrollment.id });
            if (failure)
                throw failure;
            setEnrollment(null);
        }
    })}>Cancel setup</button></form>}<hr /><button className="button-secondary" disabled={busy} onClick={() => void perform(async () => {
        const ok = await auth.signOut('global');
        if (!ok)
            throw new Error('Revocation unavailable.');
        void navigate('/login');
    })}>Sign out of all devices</button></section><section className="panel profile-privacy"><h2>Your data</h2><p>Download your profile, messages, upload list, attempts, progress, saved items, and notifications.</p><button className="button-secondary" disabled={busy} onClick={() => void exportData()}>Download my data</button><hr /><button className="text-button danger-text" onClick={() => setDeleting(!deleting)}>Delete my account</button>{deleting && <form onSubmit={deleteAccount}><p>Your private records and messages will be deleted. Shared contributions remain with your authorship removed. An administrator can remove shared content separately. Backup copies follow the operator’s retention policy.</p><label htmlFor="confirm-delete">Type DELETE to confirm</label><input id="confirm-delete" name="confirm" required pattern="DELETE" autoComplete="off"/><button className="button-danger" disabled={busy}>Permanently delete my account</button></form>}</section></div></div><div className="profile-transfer"><Suspense fallback={<p>Loading data import…</p>}><DataTransfer /></Suspense></div></div>;
}
