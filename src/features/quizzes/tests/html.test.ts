import { describe, expect, it } from 'vitest';
import { validateHtml } from '../../../../supabase/functions/_shared/html';
describe('HTML import validation', () => {
    it('accepts inline scripts/styles and embedded data assets', () => {
        expect(validateHtml('<!doctype html><style>body{color:red} @font-face{font-family:study;src:url(data:font/woff;base64,AAAA)}</style><img src="data:image/png;base64,AAAA"><script>parent.postMessage({type:"cq-result",score:1,max:1},"*")</script>')).toEqual([]);
    });
    it('reports original lines and decodes attribute entities', () => {
        const issues = validateHtml('<!doctype html>\n<script src="&#104;ttps://evil.test/a.js"></script>\n<iframe src="data:text/html,hello"></iframe>');
        expect(issues.some(issue => issue.line === 2)).toBe(true);
        expect(issues.some(issue => issue.line === 3)).toBe(true);
    });
    it('rejects escaped CSS URLs, fonts, imported CSS and form destinations', () => {
        expect(validateHtml('<style>@import "https://evil.test/a.css";body{background:u\\72l(https://evil.test/a.png)}</style><form action="https://evil.test"></form>').length).toBeGreaterThanOrEqual(3);
    });
    it('inspects template contents and foreign resource references', () => {
        expect(validateHtml('<template><img src="https://evil.test/p.png"></template><svg><image href="https://evil.test/s.png"/></svg>').length).toBe(2);
    });
});
