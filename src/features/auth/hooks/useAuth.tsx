import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { db, supabase } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { clearUserData, OWNER_KEY, THEME_KEY } from '../../../lib/storage';
import { applyTheme } from '../../../lib/appearance';
import { defaultPolicy, policySettingsSchema } from '../../../lib/validation';
type AuthState = {
    session: Session | null;
    ready: boolean;
    cleanupError: boolean;
    signOut: (scope?: 'local' | 'global') => Promise<boolean>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: {
    children: ReactNode;
}) {
    const [session, setSession] = useState<Session | null>(null);
    const [ready, setReady] = useState(!supabase);
    const [cleanupError, setCleanupError] = useState(false);
    const chain = useRef(Promise.resolve());
    useEffect(() => {
        if (!supabase)
            return;
        let active = true;
        function transition(next: Session | null) {
            if (active && (!next || localStorage.getItem(OWNER_KEY) !== (next?.user.id ?? null)))
                setReady(false);
            // Serialize cross-tab and refresh events. Never call Auth APIs while its
            // onAuthStateChange callback is holding the Auth client's internal lock.
            chain.current = chain.current.then(async () => {
                if (!active)
                    return;
                const previousOwner = localStorage.getItem(OWNER_KEY);
                const nextOwner = next?.user.id ?? null;
                if (!next || previousOwner !== nextOwner) {
                    setReady(false);
                    setSession(null);
                    try {
                        await clearUserData(queryClient, Boolean(next));
                        applyTheme('dark');
                        delete document.documentElement.dataset.density;
                        setCleanupError(false);
                    }
                    catch {
                        setCleanupError(true);
                        setReady(true);
                        return;
                    }
                }
                if (!active)
                    return;
                if (nextOwner)
                    localStorage.setItem(OWNER_KEY, nextOwner);
                setSession(next);
                setReady(true);
            }).catch(() => {
                if (active) {
                    setSession(null);
                    setCleanupError(true);
                    setReady(true);
                }
            });
        }
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
            transition(next);
        });
        void supabase.auth.getSession().then(({ data, error }) => transition(error ? null : data.session)).catch(() => transition(null));
        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);
    const signOut = useCallback(async (scope: 'local' | 'global' = 'local') => {
        setReady(false);
        setSession(null);
        let revoked = true;
        try {
            if (supabase) {
                const { error } = await supabase.auth.signOut({ scope });
                revoked = !error;
            }
        }
        catch {
            revoked = false;
        }
        try {
            await clearUserData(queryClient);
            setCleanupError(false);
        }
        catch {
            setCleanupError(true);
            revoked = false;
        }
        applyTheme('dark');
                        delete document.documentElement.dataset.density;
        setReady(true);
        return revoked;
    }, []);
    useEffect(() => {
        if (!session || !supabase)
            return;
        let checking = false;
        let active = true;
        const check = async () => {
            if (checking || !navigator.onLine)
                return;
            checking = true;
            try {
                const { data, error } = await db().rpc('session_is_active');
                if (active && ((!error && data === false) || (error && ['PGRST301', 'PGRST303'].includes(error.code))))
                    await signOut();
            }
            finally {
                checking = false;
            }
        };
        const timer = setInterval(() => void check().catch(() => undefined), 30000);
        const onFocus = () => {
            void check().catch(() => undefined);
        };
        window.addEventListener('focus', onFocus);
        return () => {
            active = false;
            clearInterval(timer);
            window.removeEventListener('focus', onFocus);
        };
    }, [session?.access_token, signOut]);
    return <AuthContext.Provider value={{
        session, ready, cleanupError, signOut
    }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const value = useContext(AuthContext);
    if (!value)
        throw new Error('Auth provider is unavailable.');
    return value;
}
export function useProfile() {
    const { session } = useAuth();
    return useQuery({
        queryKey: ['profile', session?.user.id], enabled: Boolean(session), staleTime: 0, refetchInterval: 30000,
        queryFn: async () => {
            const { data, error } = await db().from('profiles').select('*').eq('id', session!.user.id).maybeSingle();
            if (error)
                throw new Error('Could not check your membership.');
            return data;
        },
    });
}
export function usePolicy() {
    return useQuery({
        queryKey: ['policy'], staleTime: 30000, refetchInterval: 30000,
        queryFn: async () => {
            if (!supabase)
                return defaultPolicy;
            const { data, error } = await supabase.rpc('public_policy_settings');
            if (error)
                throw new Error('Could not load the current policy.');
            return policySettingsSchema.parse(data);
        },
    });
}
export function useAssurance() {
    const { session } = useAuth();
    return useQuery({
        queryKey: ['assurance', session?.user.id, session?.access_token.slice(-12)], enabled: Boolean(session), staleTime: 0,
        queryFn: async () => {
            const { data, error } = await db().auth.mfa.getAuthenticatorAssuranceLevel();
            if (error)
                throw new Error('Could not verify session security.');
            return data;
        },
    });
}
export function useTheme(theme?: string) {
    useEffect(() => {
        if (!theme)
            return;
        const media = matchMedia('(prefers-color-scheme: dark)');
        const apply = () => {
            document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
        };
        localStorage.setItem(THEME_KEY, theme);
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, [theme]);
}
