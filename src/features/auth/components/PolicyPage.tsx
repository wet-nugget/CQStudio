import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth, usePolicy, useProfile } from '../hooks/useAuth';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { Footer } from '../../../components/Footer';
import { Message, Skeleton } from '../../../components/Feedback';
export default function PolicyPage() {
    const auth = useAuth();
    const profile = useProfile();
    const policy = usePolicy();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (new FormData(event.currentTarget).get('accepted') !== 'on' || !policy.data)
            return;
        setBusy(true);
        setError('');
        try {
            const { error: failure } = await db().rpc('accept_policy', { p_version: policy.data.policy_version, p_accepted: true });
            if (failure)
                throw failure;
            await queryClient.invalidateQueries({ queryKey: ['profile'] });
        }
        catch {
            setError('Could not save acceptance. Reload the current policy and try again.');
        }
        finally {
            setBusy(false);
        }
    }
    if (!auth.ready)
        return <Skeleton />;
    if (!auth.session)
        return <Navigate to="/login" replace/>;
    if (profile.isPending || policy.isPending)
        return <Skeleton />;
    if (profile.data?.policy_version === policy.data?.policy_version && profile.data)
        return <Navigate to="/" replace/>;
    return <div className="public-layout"><main className="auth-card"><h1>Our policy has changed.</h1><p>Read the current Privacy Policy and Terms before returning to your workspace.</p><p>Version: {policy.data?.policy_version}</p><form onSubmit={submit}><label className="checkbox-label"><input name="accepted" type="checkbox" required/><span>I have read the <Link to="/privacy" target="_blank">Privacy Policy</Link> and <Link to="/terms" target="_blank">Terms</Link>.</span></label>{error && <Message error>{error}</Message>}{(policy.isError || profile.isError) && <Message error>Could not load the current policy. Please reconnect.</Message>}<button disabled={busy || policy.isError || profile.isError}>{busy ? 'Saving…' : 'Accept and continue'}</button></form><button className="text-button" onClick={() => void auth.signOut()}>Sign out without accepting</button></main><Footer /></div>;
}
