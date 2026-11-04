import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { clearUserData, removeUserKeys } from '../../../lib/storage';
class MemoryStorage {
    data = new Map<string, string>();
    get length() {
        return this.data.size;
    }
    key(index: number) {
        return [...this.data.keys()][index] ?? null;
    }
    removeItem(key: string) {
        this.data.delete(key);
    }
    setItem(key: string, value: string) {
        this.data.set(key, value);
    }
}
afterEach(() => vi.unstubAllGlobals());
describe('session cleanup', () => {
    it('clears only CQStudio keys and can preserve a newly signed-in session', () => {
        const storage = new MemoryStorage();
        storage.setItem('cqstudio.auth', 'new-user-token');
        storage.setItem('cqstudio.user.old.attempt.v1', 'answers');
        storage.setItem('cqstudio.theme', 'dark');
        storage.setItem('other-app', 'keep');
        removeUserKeys(storage, true);
        expect([...storage.data.keys()]).toEqual(['cqstudio.auth', 'other-app']);
        removeUserKeys(storage);
        expect([...storage.data.keys()]).toEqual(['other-app']);
    });
    it('clears query data, persistent drafts, HTML caches, IndexedDB and workers', async () => {
        const local = new MemoryStorage();
        local.setItem('cqstudio.auth', 'session');
        local.setItem('cqstudio.user.member.draft.chat.shared', 'private draft');
        const session = new MemoryStorage();
        session.setItem('cqstudio.user.member.attempt.v1', 'private answers');
        const deletedCache = vi.fn(async (_name: string) => true);
        const unregister = vi.fn(async () => true);
        const deletedDatabase = vi.fn(() => {
            const request: {
                onsuccess?: () => void;
            } = {};
            queueMicrotask(() => request.onsuccess?.());
            return request;
        });
        vi.stubGlobal('localStorage', local);
        vi.stubGlobal('sessionStorage', session);
        vi.stubGlobal('caches', { keys: async () => ['cqstudio-quiz-html', 'cqstudio-shell', 'unrelated-cache'], delete: deletedCache });
        vi.stubGlobal('indexedDB', { deleteDatabase: deletedDatabase });
        vi.stubGlobal('navigator', { serviceWorker: { getRegistrations: async () => [{ unregister }] } });
        const client = new QueryClient();
        client.setQueryData(['private-attempts'], ['private']);
        await clearUserData(client);
        expect(local.length).toBe(0);
        expect(session.length).toBe(0);
        expect(client.getQueryCache().getAll()).toHaveLength(0);
        expect(deletedCache.mock.calls.map(call => call[0])).toEqual(['cqstudio-quiz-html', 'cqstudio-shell']);
        expect(deletedDatabase).toHaveBeenCalledTimes(2);
        expect(unregister).toHaveBeenCalledOnce();
    });
    it('rejects blocked deletion so an account switch cannot silently continue', async () => {
        vi.stubGlobal('localStorage', new MemoryStorage());
        vi.stubGlobal('sessionStorage', new MemoryStorage());
        vi.stubGlobal('navigator', {});
        vi.stubGlobal('indexedDB', { deleteDatabase: () => {
                const request: {
                    onblocked?: () => void;
                } = {};
                queueMicrotask(() => request.onblocked?.());
                return request;
            } });
        await expect(clearUserData(new QueryClient())).rejects.toThrow('Close other CQStudio tabs');
    });
});
