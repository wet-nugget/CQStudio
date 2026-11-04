export const HTML_CACHE = 'cqstudio-quiz-html';
export const htmlCacheKey = (version: string) => `${location.origin}/__cq-quiz/${version}`;
export async function readHtmlVersion(version: string): Promise<string | undefined> {
    try {
        if ('caches' in globalThis)
            return await (await caches.open(HTML_CACHE)).match(htmlCacheKey(version)).then(response => response?.text());
    }
    catch { /* Cache access is optional; fetch an authorized copy instead. */ }
}
export async function cacheHtmlVersion(version: string, source: string): Promise<void> {
    try {
        if ('caches' in globalThis)
            await (await caches.open(HTML_CACHE)).put(htmlCacheKey(version), new Response(source, { headers: { 'Content-Type': 'text/plain' } }));
    }
    catch { /* Quota/privacy restrictions must not prevent opening the quiz. */ }
}
export async function removeHtmlVersion(version: string) {
    try {
        if ('caches' in globalThis) {
            const cache = await caches.open(HTML_CACHE);
            await cache.delete(htmlCacheKey(version));
        }
    }
    catch { /* Every read still requires a fresh version authorization check. */ }
}
