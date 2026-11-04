import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { totpSchema } from '../api/mfa';
import { Message } from '../../../components/Feedback';
export default function MfaPage() {
    const auth = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const code = String(new FormData(event.currentTarget).get('code') ?? '');
        if (!totpSchema.safeParse({code}).success) {
            setError('Enter the six-digit authenticator code.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const { data, error: failure } = await db().auth.mfa.listFactors();
            const factor = data?.totp.find((item) => item.status === 'verified');
            if (failure || !factor)
                throw new Error('Factor unavailable.');
            const result = await db().auth.mfa.challengeAndVerify({ factorId: factor.id, code });
            if (result.error)
                throw result.error;
            await queryClient.invalidateQueries({ queryKey: ['assurance'] });
            void navigate('/');
        }
        catch {
            setError('Could not verify that code. Check your authenticator and try again.');
        }
        finally {
            setBusy(false);
        }
    }
    if (auth.ready && !auth.session)
        return <Navigate to="/login" replace/>;
    return <div className="public-layout"><main className="auth-card"><h1>Your authenticator code.</h1><p>Enter the code from your authenticator app.</p><form onSubmit={submit}><label htmlFor="code">Six-digit code</label><input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus/>{error && <Message error>{error}</Message>}<button disabled={busy}>{busy ? 'Checking…' : 'Verify and continue'}</button></form><button className="text-button" onClick={() => void auth.signOut()}>Sign out</button></main></div>;
}
