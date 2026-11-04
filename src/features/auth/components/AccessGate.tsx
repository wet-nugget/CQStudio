import { Navigate, Outlet } from 'react-router-dom';
import { useAssurance, useAuth, usePolicy, useProfile } from '../hooks/useAuth';
import { isConfigured } from '../../../lib/supabase';
import { Message, Skeleton } from '../../../components/Feedback';
export function AccessGate() {
    const { session, ready, cleanupError, signOut } = useAuth();
    const profile = useProfile();
    const policy = usePolicy();
    const assurance = useAssurance();
    if (!isConfigured)
        return <Navigate to="/setup" replace/>;
    if (cleanupError)
        return <main className="auth-card"><h1>Local data needs clearing.</h1><p>Close other CQStudio tabs, then retry. If this continues, clear this site’s browser storage before signing in.</p><button onClick={() => void signOut()}>Retry cleanup</button></main>;
    if (!ready)
        return <Skeleton />;
    if (!session)
        return <Navigate to="/login" replace/>;
    if (profile.isPending || policy.isPending || assurance.isPending)
        return <Skeleton />;
    if (profile.isError || policy.isError || assurance.isError)
        return <main className="auth-card"><h1>We couldn’t check your access.</h1><Message error>Please reconnect and try again.</Message><button onClick={() => {
            void profile.refetch();
            void policy.refetch();
            void assurance.refetch();
        }}>Try again</button><button className="button-secondary" onClick={() => void signOut()}>Sign out</button></main>;
    if (assurance.data?.nextLevel === 'aal2' && assurance.data.currentLevel !== 'aal2')
        return <Navigate to="/mfa" replace/>;
    if (!profile.data)
        return <Navigate to="/accept-invite" replace/>;
    if (profile.data.status !== 'approved')
        return <main className="auth-card"><h1>Membership unavailable.</h1><p>Contact your workspace administrator about access.</p><button onClick={() => void signOut()}>Sign out</button></main>;
    if (profile.data.policy_version !== policy.data?.policy_version)
        return <Navigate to="/accept-policy" replace/>;
    return <Outlet />;
}
