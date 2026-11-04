// Bound provider requests so a lost connection cannot leave an action pending
// forever. Keep caller cancellation (including Query cancellation) intact.
export async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const caller = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const cancel = () => controller.abort(caller?.reason);
    if (caller?.aborted)
        cancel();
    else
        caller?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => controller.abort(new DOMException('Request timed out.', 'TimeoutError')), 30000);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    }
    finally {
        clearTimeout(timer);
        caller?.removeEventListener('abort', cancel);
    }
}
