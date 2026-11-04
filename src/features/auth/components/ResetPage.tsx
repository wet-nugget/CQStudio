import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../../../lib/supabase';
import { passwordSchema, validationMessage } from '../../../lib/validation';
import { Message } from '../../../components/Feedback';
import { Footer } from '../../../components/Footer';
export default function ResetPage() {
    const { session, signOut } = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const parsed = passwordSchema.safeParse(new FormData(event.currentTarget).get('password'));
        if (!parsed.success) {
            setError(validationMessage(parsed.error));
            return;
        }
        setBusy(true);
        setError('');
        try {
            const { error: failure } = await db().auth.updateUser({ password: parsed.data });
            if (failure)
                throw failure;
            const revoked = await signOut('global');
            setDone(true);
            if (!revoked)
                setError('Your password was updated, but signing out of all devices could not be confirmed. Sign in and retry from Security.');
        }
        catch {
            setError('Could not update your password. Request a new reset link and try again.');
        }
        finally {
            setBusy(false);
        }
    }
    return <div className="public-layout"><main className="auth-card"><h1>Choose a new password.</h1>{done ? <><Message>Your password was updated. <Link to="/login">Sign in again</Link>.</Message>{error && <Message error>{error}</Message>}</> : !session ? <p>Open the reset link from your email, or <Link to="/login">request a new link</Link>.</p> : <form onSubmit={submit}><label htmlFor="reset-password">New password</label><input id="reset-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/><small>At least 12 characters.</small>{error && <Message error>{error}</Message>}<button disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button></form>}</main><Footer /></div>;
}
