import type { QueryClient } from '@tanstack/react-query';
export const SESSION_KEY = 'cqstudio.auth';
export const OWNER_KEY = 'cqstudio.owner';
export const THEME_KEY = 'cqstudio.theme';
export const NOTICE_KEY = 'cqstudio.storage-notice';
export const USER_PREFIX = 'cqstudio.user.';
export const CACHE_PREFIX = 'cqstudio-';
export const DATABASES = ['cqstudio-quiz-html', 'cqstudio-offline'] as const;
export interface StorageEntry {
    name: string;
    medium: string;
    purpose: string;
    lifetime: string;
}
export const storageInventory: readonly StorageEntry[] = [
    {
        name: SESSION_KEY, medium: 'localStorage', purpose: 'Supabase session and refresh token', lifetime: 'Until sign-out, expiry, or account switch'
    },
    {
        name: `${SESSION_KEY}-code-verifier`, medium: 'localStorage', purpose: 'Temporary Auth PKCE exchange verifier, if supplied by Supabase', lifetime: 'Until exchange completes or session cleanup'
    },
    {
        name: OWNER_KEY, medium: 'localStorage', purpose: 'Detect account changes before displaying cached data', lifetime: 'Until session cleanup'
    },
    {
        name: THEME_KEY, medium: 'localStorage', purpose: 'Your selected light, dark, or system appearance', lifetime: 'Until session cleanup'
    },
    {name:`${USER_PREFIX}<user>.ui`,medium:'localStorage',purpose:'Per-user theme, density, sidebar, last class and last tab; preview uses user preview',lifetime:'Until session cleanup'},
    {
        name: NOTICE_KEY, medium: 'localStorage', purpose: 'Remember dismissal of the browser-storage notice', lifetime: 'Until session cleanup'
    },
    {
        name: `${USER_PREFIX}<user>.attempt.<version>`, medium: 'localStorage', purpose: 'Restore quiz answers, flags, question order, and timer deadlines; preview attempts use version preview', lifetime: 'Until submission, discard, or session cleanup'
    },
    {
        name: `${USER_PREFIX}<user>.draft.<kind>.<id>`, medium: 'localStorage', purpose: 'Recover unsent chat and unfinished content drafts', lifetime: 'Until sent, discarded, or session cleanup'
    },
    {
        name: 'cqstudio-quiz-html / <quiz_version_id>', medium: 'Cache API', purpose: 'Reuse HTML quiz source after it is opened', lifetime: 'Until unpublished, deleted, or session cleanup'
    },
    {
        name: 'TanStack Query cache', medium: 'Memory', purpose: 'Avoid repeated authenticated requests; never persisted', lifetime: 'Until page closes or session cleanup'
    },
    {
        name: 'sessionStorage / IndexedDB / service worker', medium: 'Not used in v1', purpose: 'No optional storage; cleanup also removes CQStudio remnants', lifetime: 'CQStudio remnants removed on session cleanup'
    },
    {
        name: 'Cookies', medium: 'Not set by CQStudio', purpose: 'No advertising, tracking, or analytics cookies', lifetime: 'Not applicable'
    },
];
export function removeUserKeys(storage: Pick<Storage, 'length' | 'key' | 'removeItem'>, preserveSession = false): void {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) {
        if (key?.startsWith('cqstudio.') && !(preserveSession && key.startsWith(SESSION_KEY)))
            storage.removeItem(key);
    }
}
// A single cleanup path is used by explicit logout, expired sessions, and account changes.
export async function clearUserData(client: QueryClient, preserveSession = false): Promise<void> {
    await client.cancelQueries();
    client.clear();
    removeUserKeys(localStorage, preserveSession);
    removeUserKeys(sessionStorage);
    const pending: Promise<unknown>[] = [];
    if ('caches' in globalThis)
        pending.push(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key)))));
    if ('indexedDB' in globalThis) {
        for (const name of DATABASES)
            pending.push(new Promise<void>((resolve, reject) => {
                const request = indexedDB.deleteDatabase(name);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(new Error('Could not clear local data.'));
                request.onblocked = () => reject(new Error('Close other CQStudio tabs to clear local data.'));
            }));
    }
    if ('serviceWorker' in navigator)
        pending.push(navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))));
    // A cleanup failure must not silently allow the next account to open.
    await Promise.all(pending);
}
export function downloadJson(name: string, data: unknown): void {
    const href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
}
