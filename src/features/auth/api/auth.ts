import { db } from '../../../lib/supabase';
import { acceptanceSchema, loginIdentifierSchema, loginSchema } from '../../../lib/validation';
export async function login(input: unknown) {
    const value = loginSchema.parse(input);
    let email = value.email;
    if (!email.includes('@')) {
        const { data, error: lookupError } = await db().rpc('login_email', { p_identifier: email });
        if (lookupError || !data)
            throw new Error('Sign-in failed. Check your details and try again.');
        email = data;
    }
    const { error } = await db().auth.signInWithPassword({ email, password: value.password });
    if (error)
        throw new Error('Sign-in failed. Check your details and try again.');
}
export async function requestReset(input: unknown) {
    const identifier = loginIdentifierSchema.parse(input);
    let email = identifier;
    if (!email.includes('@')) {
        const { data } = await db().rpc('login_email', { p_identifier: identifier });
        if (!data)
            return;
        email = data;
    }
    // Always show the same result; do not expose account existence or Auth errors.
    await db().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` });
}
export async function acceptInvite(input: unknown, policyVersion: string) {
    const value = acceptanceSchema.parse(input);
    const { error: passwordError } = await db().auth.updateUser({ password: value.password });
    if (passwordError)
        throw new Error('Could not set your password. Please try again.');
    const { error } = await db().rpc('accept_invitation', {
        p_username: value.username, p_display_name: value.display_name, p_policy_version: policyVersion, p_accepted: true,
    });
    if (error)
        throw new Error('Could not accept the invitation. Check your username or request a fresh invite.');
}
