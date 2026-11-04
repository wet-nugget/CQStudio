import { BrandMark } from '../../../components/ui/Avatar';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, requestReset } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { isConfigured } from '../../../lib/supabase';
import { loginSchema, emailSchema, validationMessage } from '../../../lib/validation';
import { Message } from '../../../components/Feedback';
import { Footer } from '../../../components/Footer';
import { Icon } from '../../../components/Icon';
export default function LoginPage() {
    const [reset, setReset] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const navigate = useNavigate();
    const { session, signOut } = useAuth();
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setNotice('');
        const fields = new FormData(event.currentTarget);
        const value = { email: fields.get('email'), password: fields.get('password') };
        const parsed = reset ? emailSchema.safeParse(value.email) : loginSchema.safeParse(value);
        if (!parsed.success) {
            setError(validationMessage(parsed.error));
            return;
        }
        setBusy(true);
        try {
            if (reset) {
                await requestReset(value.email);
                setNotice('If this address has an account, a reset email is on its way.');
            }
            else {
                await login(value);
                void navigate('/');
            }
        }
        catch {
            setError(reset ? 'The request could not be sent. Please try again.' : 'Sign-in failed. Check your details and try again.');
        }
        finally {
            setBusy(false);
        }
    }
    return <div className="auth-layout"><Link to="/" className="brand"><BrandMark/>CQStudio</Link><main className="auth-split"><section className="auth-card"><h2>{reset ? 'Reset password' : 'Sign in'}</h2><p>{reset ? 'We’ll send you a link to choose a new password.' : 'Sign in with your invited email address.'}</p>{!isConfigured ? <Message>Connect your development Supabase project to sign in. <Link to="/setup">View setup</Link></Message> : session ? <Message>You’re signed in. <Link to="/">Open your workspace</Link> or <button className="text-button" onClick={() => void signOut()}>sign out</button>.</Message> : null}<form onSubmit={submit}><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com"/>{!reset && <><div className="label-row"><label htmlFor="password">Password</label><button type="button" className="text-button" onClick={() => {
        setReset(true);
        setError('');
    }}>Forgot password?</button></div><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} placeholder="Your password"/></>}{error && <Message error>{error}</Message>}{notice && <Message>{notice}</Message>}<button className="button-wide" disabled={busy || !isConfigured}>{busy ? 'Signing in…' : reset ? 'Send reset link' : 'Sign in'}<Icon name="arrow" size={18}/></button></form>{reset && <button className="text-button" onClick={() => {
        setReset(false);
        setError('');
        setNotice('');
    }}>Back to sign in</button>}<div className="invite-hint"><Icon name="shield" size={18}/><p>Access is by invitation. Contact your administrator to join.</p></div></section></main><Footer /></div>;
}
