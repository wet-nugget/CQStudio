import { useEffect, useState } from 'react';
import type { ZodType } from 'zod';
// A successfully saved server record must remain successful even when browser
// storage is unavailable. Authentication cleanup uses its own strict path.
export function discardDraft(key: string): boolean {
    try {
        localStorage.removeItem(key);
        return true;
    }
    catch {
        return false;
    }
}
export function readDraft<T>(key: string, schema: ZodType<T>): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw)
            return null;
        const result = schema.safeParse(JSON.parse(raw));
        return result.success ? result.data : null;
    }
    catch {
        return null;
    }
}
export function useDraftAutosave(key: string, value: unknown, ready: boolean) {
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (!ready)
            return;
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                setFailed(false);
            }
            catch {
                setFailed(true);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [key, value, ready]);
    return failed;
}
