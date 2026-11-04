import { BrandMark } from '../../../components/ui/Avatar';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth, usePolicy } from '../hooks/useAuth';
import { acceptInvite } from '../api/auth';
import { db, isConfigured } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { acceptanceSchema, validationMessage } from '../../../lib/validation';
import { Footer } from '../../../components/Footer';
import { Message, Skeleton } from '../../../components/Feedback';
export default function InvitePage() {
    const { ready, session, signOut } = useAuth();
    const policy = usePolicy();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const context = useQuery({
        queryKey: ['invitation', session?.user.id], enabled: Boolean(session), retry: false,
        queryFn: async () => {
            const { data, error: failure } = await db().rpc('invitation_context');
            if (failure)
                throw failure;
            return data;
        },
    });
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!policy.data)
            return;
        const form = new FormData(event.currentTarget);
        const value = {
            username: form.get('username'), display_name: form.get('display_name'), password: form.get('password'), accepted: form.get('accepted') === 'on'
        };
        const parsed = acceptanceSchema.safeParse(value);
        if (!parsed.success) {
            setError(validationMessage(parsed.error));
            return;
        }
        setBusy(true);
        setError('');
        try {
            await acceptInvite(value, policy.data.policy_version);
            await queryClient.invalidateQueries({ queryKey: ['profile'] });
            void navigate('/');
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Could not accept this invitation.');
        }
        finally {
            setBusy(false);
        }
    }
    if (!ready || policy.isPending || (session && context.isPending))
        return <Skeleton />;
    return <div className="public-layout"><Link to="/login" className="brand"><BrandMark/>CQStudio</Link><main className="auth-card invite-card"><h1>Accept invitation</h1>{!isConfigured || !session || !context.data ? <><p>Open the invitation link sent to your email. If it has expired or was revoked, ask an administrator for a new invitation.</p><Link to="/login" className="button">Go to sign in</Link></> : <><p>Choose your details and a password to join your group.</p><form onSubmit={submit}><label htmlFor="display_name">Display name</label><input id="display_name" name="display_name" autoComplete="name" required maxLength={80}/><label htmlFor="username">Username</label><input id="username" name="username" autoComplete="username" pattern="[a-z0-9_]{3,30}" required minLength={3} maxLength={30}/><small>3–30 lowercase letters, numbers, or underscores.</small><label htmlFor="new-password">Choose a password</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/><small>At least 12 characters.</small><label className="checkbox-label"><input name="accepted" type="checkbox" required/><span>I have read the <Link to="/privacy" target="_blank">Privacy Policy</Link> and <Link to="/terms" target="_blank">Terms</Link> (version {policy.data?.policy_version}).</span></label>{error && <Message error>{error}</Message>}<button disabled={busy || policy.isError}>{busy ? 'Joining…' : 'Join the workspace'}</button></form><button className="text-button" onClick={() => void signOut()}>Use a different account</button></>}{policy.isError && <Message error>Could not load the policy. Reconnect before accepting.</Message>}</main><Footer /></div>;
}
