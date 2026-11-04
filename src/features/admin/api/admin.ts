import { db } from '../../../lib/supabase';
export async function adminAction(body: Record<string, unknown>) {
    const { data, error } = await db().functions.invoke('admin', { body });
    if (error)
        throw new Error('Action unavailable. Check capacity, email delivery, and last-administrator protection.');
    return data as unknown;
}
