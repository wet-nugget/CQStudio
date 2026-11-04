import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { SESSION_KEY } from './storage';
import { fetchWithTimeout } from './network';
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
function isPublicKey(value: string): boolean {
    if (value.startsWith('sb_publishable_'))
        return true;
    try {
        return JSON.parse(atob((value.split('.')[1] ?? '').replaceAll('-', '+').replaceAll('_', '/'))).role === 'anon';
    }
    catch {
        return false;
    }
}
function validProjectUrl(value: string): boolean {
    try {
        const parsed = new URL(value);
        return !value.includes('YOUR_') && (parsed.protocol === 'https:' || (import.meta.env.DEV && parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)));
    }
    catch {
        return false;
    }
}
export const isConfigured = Boolean(url && key && validProjectUrl(url) && isPublicKey(key));
export const supabase = isConfigured ? createClient<Database>(url!, key!, {
    global: { fetch: fetchWithTimeout },
    auth: {
        storageKey: SESSION_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit'
    },
}) : null;
export function db() {
    if (!supabase)
        throw new Error('Connect your development Supabase project to continue.');
    return supabase;
}
export function requireData<T>({ data, error }: {
    data: T;
    error: unknown;
}): NonNullable<T> {
    if (error || data == null)
        throw new Error('The request could not be completed. Please try again.');
    return data;
}
