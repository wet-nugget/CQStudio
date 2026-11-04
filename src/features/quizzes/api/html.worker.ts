import { htmlWarnings, validateHtml } from '../../../../supabase/functions/_shared/html';
const scope = self as unknown as {
    onmessage: ((event: MessageEvent<{
        type: 'scan' | 'validate';
        source: string;
    }>) => void) | null;
    postMessage: (value: unknown) => void;
};
scope.onmessage = event => {
    try {
        scope.postMessage({ ok: true, issues: event.data.type === 'validate' ? validateHtml(event.data.source) : htmlWarnings(event.data.source) });
    }
    catch {
        scope.postMessage({ ok: false, issues: [{ line: 1, message: 'Could not inspect this HTML. Simplify the file and try again.' }] });
    }
};
