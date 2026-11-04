/// <reference path="../supabase/functions/runtime.d.ts" />
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticate, jsonInput, serve } from '../supabase/functions/_shared/http';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('Edge request failures', () => {
    it('rejects unauthenticated requests before any privileged client can be created', async () => {
        await expect(authenticate(new Request('https://provider.invalid/functions/v1/admin', { method: 'POST' }), true)).rejects.toMatchObject({ status: 401 });
    });
    it('bounds JSON bodies even when Content-Length is missing', async () => {
        const request = new Request('https://provider.invalid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(200) }) });
        await expect(jsonInput(request, 100)).rejects.toMatchObject({ status: 413 });
    });
    it('records only a request ID and status when a server handler fails', async () => {
        let handler!: (request: Request) => Promise<Response>;
        vi.stubGlobal('Deno', { env: { get: () => 'https://cq-live.vercel.app' }, serve: (callback: typeof handler) => { handler = callback; } });
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        serve(async () => { throw new Error('private token and member content'); });
        const result = await handler(new Request('https://provider.invalid/functions/v1/vault', { method: 'POST', headers: { Origin: 'https://cq-live.vercel.app' } }));
        expect(result.status).toBe(500);
        expect(await result.json()).toEqual({ error: 'The request could not be completed.' });
        const record = JSON.parse(log.mock.calls[0]![0] as string);
        expect(record).toEqual({ event: 'request.failed', request_id: result.headers.get('X-Request-ID'), status: 500 });
        expect(record.request_id).toMatch(/^[a-f0-9-]{36}$/);
        expect(result.headers.get('cache-control')).toBe('no-store');
    });
});
