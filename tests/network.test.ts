import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout } from '../src/lib/network';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('provider request recovery', () => {
    it('aborts a stalled request instead of leaving a form pending', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', (_input: unknown, init: RequestInit) => new Promise((_resolve, reject) => {
            init.signal!.addEventListener('abort', () => reject(init.signal!.reason));
        }));
        const pending = fetchWithTimeout('https://provider.invalid');
        const result = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
        await vi.advanceTimersByTimeAsync(30000);
        await result;
        expect(vi.getTimerCount()).toBe(0);
    });
    it('preserves caller cancellation and removes the timeout after success', async () => {
        vi.useFakeTimers();
        const controller = new AbortController();
        const fetcher = vi.fn(async (_input: unknown, init: RequestInit) => {
            if (init.signal?.aborted) throw init.signal.reason;
            return new Response('ok');
        });
        vi.stubGlobal('fetch', fetcher);
        expect(await (await fetchWithTimeout('https://provider.invalid')).text()).toBe('ok');
        expect(vi.getTimerCount()).toBe(0);
        controller.abort(new Error('Cancelled by caller'));
        await expect(fetchWithTimeout('https://provider.invalid', { signal: controller.signal })).rejects.toThrow('Cancelled by caller');
        expect(vi.getTimerCount()).toBe(0);
    });
});
