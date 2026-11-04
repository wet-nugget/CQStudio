import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ErrorBoundary } from '../src/components/Feedback';
import { discardDraft } from '../src/lib/drafts';
import { cacheHtmlVersion, readHtmlVersion, removeHtmlVersion } from '../src/features/quizzes/api/html-cache';

afterEach(() => vi.unstubAllGlobals());
describe('restricted browser storage', () => {
    it('does not turn a server save into failure when removing its draft is blocked', () => {
        vi.stubGlobal('localStorage', { removeItem: () => { throw new DOMException('Denied', 'SecurityError'); } });
        expect(discardDraft('cqstudio.user.member.attempt.version')).toBe(false);
    });
    it('treats unavailable HTML caches as a cache miss, without unhandled rejections', async () => {
        vi.stubGlobal('caches', { open: async () => { throw new DOMException('Quota', 'QuotaExceededError'); } });
        await expect(readHtmlVersion('version')).resolves.toBeUndefined();
        await expect(cacheHtmlVersion('version', '<h1>Quiz</h1>')).resolves.toBeUndefined();
        await expect(removeHtmlVersion('version')).resolves.toBeUndefined();
    });
});
it('renders the root error recovery without a router context', () => {
    const boundary = new ErrorBoundary({ children: null });
    boundary.state = { failed: true };
    const markup = renderToStaticMarkup(boundary.render());
    expect(markup).toContain('Could not load this page.');
    expect(markup).toContain('href="/"');
});
