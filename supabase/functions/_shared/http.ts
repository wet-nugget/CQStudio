import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
export class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}
export function secret(name: string): string {
    const value = Deno.env.get(name);
    if (!value)
        throw new HttpError(503, 'The workspace is not configured yet.');
    return value;
}
function cors(request: Request): Record<string, string> {
    const appOrigin = secret('APP_ORIGIN');
    const origin = request.headers.get('origin');
    if (origin && origin !== appOrigin)
        throw new HttpError(403, 'Request not allowed.');
    return {
        'Access-Control-Allow-Origin': appOrigin,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-bootstrap-token, x-maintenance-token',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Expose-Headers': 'X-Request-ID', Vary: 'Origin'
    };
}
export function response(request: Request, body: unknown, status = 200, requestId?: string): Response {
    return new Response(JSON.stringify(body), { status, headers: {
            ...cors(request), 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(requestId ? { 'X-Request-ID': requestId } : {})
        } });
}
export function serve(handler: (request: Request) => Promise<unknown>) {
    Deno.serve(async (request: Request) => {
        const requestId = crypto.randomUUID();
        try {
            cors(request);
            if (request.method === 'OPTIONS')
                return new Response(null, { status: 204, headers: cors(request) });
            if (request.method !== 'POST')
                throw new HttpError(405, 'Use POST.');
            return response(request, await handler(request), 200, requestId);
        }
        catch (error) {
            // No request body, provider error, JWT, email, or stack trace is logged.
            const status = error instanceof HttpError ? error.status : error instanceof z.ZodError ? 400 : 500;
            const message = error instanceof HttpError ? error.message : error instanceof z.ZodError ? 'Check the submitted fields.' : 'The request could not be completed.';
            // Provider-native diagnostics contain no member/request data or error
            // text. The response ID lets the operator locate a failed invocation.
            if (status >= 500)
                console.error(JSON.stringify({ event: 'request.failed', request_id: requestId, status }));
            try {
                return response(request, { error: message }, status, requestId);
            }
            catch {
                return new Response(JSON.stringify({ error: 'Request unavailable.' }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Request-ID': requestId } });
            }
        }
    });
}
export async function jsonInput(request: Request, maxBytes = 16384): Promise<unknown> {
    if (!request.headers.get('content-type')?.startsWith('application/json'))
        throw new HttpError(415, 'Use JSON.');
    if (Number(request.headers.get('content-length') ?? 0) > maxBytes)
        throw new HttpError(413, 'Request too large.');
    const reader = request.body?.getReader();
    if (!reader)
        throw new HttpError(400, 'Missing request.');
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        total += value.byteLength;
        if (total > maxBytes) {
            await reader.cancel();
            throw new HttpError(413, 'Request too large.');
        }
        chunks.push(value);
    }
    const data = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
    }
    try {
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
    }
    catch {
        throw new HttpError(400, 'Invalid JSON.');
    }
}
export function serviceClient() {
    return createClient(secret('SUPABASE_URL'), secret('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
export async function authenticate(request: Request, admin = false) {
    const header = request.headers.get('authorization');
    if (!header?.startsWith('Bearer '))
        throw new HttpError(401, 'Sign in again.');
    const client = createClient(secret('SUPABASE_URL'), secret('SUPABASE_ANON_KEY'), {
        global: { headers: { Authorization: header } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: { user }, error } = await client.auth.getUser(header.slice(7));
    if (error || !user)
        throw new HttpError(401, 'Sign in again.');
    const { data: approved, error: memberError } = await client.rpc('can_use_workspace');
    if (!approved || memberError)
        throw new HttpError(403, 'Membership unavailable.');
    if (admin) {
        const { data: isAdmin, error: adminError } = await client.rpc('is_admin');
        if (!isAdmin || adminError)
            throw new HttpError(403, 'Administrator access required.');
    }
    return { user, client };
}
export async function verifySecret(provided: string | null, expected: string) {
    if (!provided || provided.length > 512)
        throw new HttpError(403, 'Request not allowed.');
    const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
    const [a, b] = await Promise.all([digest(provided), digest(expected)]);
    let difference = 0;
    for (let i = 0; i < a.length; i++)
        difference |= a[i]! ^ b[i]!;
    if (difference !== 0)
        throw new HttpError(403, 'Request not allowed.');
}
