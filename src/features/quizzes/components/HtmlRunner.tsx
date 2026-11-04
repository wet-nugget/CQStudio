import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { db } from '../../../lib/supabase';
import { downloadUrl } from '../../vault/api/vault';
import { cacheHtmlVersion, readHtmlVersion, removeHtmlVersion } from '../api/html-cache';
import { fetchWithTimeout } from '../../../lib/network';
import { Message } from '../../../components/Feedback';
const resultSchema = z.strictObject({
    type: z.literal('cq-result'), channel: z.string(), score: z.number().finite().min(0), max: z.number().finite().positive().max(1000000)
}).refine(value => value.score <= value.max);
export default function HtmlRunner({ versionId, fileId, record = false, adminSource = false }: {
    versionId: string;
    fileId: string;
    record?: boolean;
    adminSource?: boolean;
}) {
    const frame = useRef<HTMLIFrameElement>(null);
    const channel = useRef(crypto.randomUUID());
    const accepted = useRef(false);
    const attemptId = useRef(crypto.randomUUID());
    const started = useRef(new Date().toISOString());
    const [source, setSource] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{
        score: number;
        max: number;
    } | null>(null);
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);
    const [shown, setShown] = useState(204800);
    const [warnings, setWarnings] = useState<{
        line: number;
        message: string;
    }[]>([]);
    const runner = import.meta.env.VITE_QUIZ_RUNNER_ORIGIN as string | undefined;
    let origin: string | null = null;
    try {
        const url = new URL(runner ?? '');
        if (url.origin !== location.origin && (url.protocol === 'https:' || import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(url.hostname)))
            origin = url.origin;
    }
    catch { /* Show configuration guidance below. */ }
    useEffect(() => {
        let active = true;
        const abort = new AbortController();
        const load = async () => {
            const { data: version, error: failure } = await db().from('quiz_versions').select('status').eq('id', versionId).single();
            if (failure) {
                if (active)
                    await removeHtmlVersion(versionId);
                throw new Error('Quiz unavailable.');
            }
            if (!active)
                return;
            if (version.status !== 'published')
                await removeHtmlVersion(versionId);
            let html = version.status === 'published' ? await readHtmlVersion(versionId) : undefined;
            if (!html) {
                const url = await downloadUrl(fileId);
                const response = await fetchWithTimeout(url, { credentials: 'omit', cache: 'no-store', signal: abort.signal });
                if (!response.ok)
                    throw new Error('Could not load quiz source.');
                const buffer = await response.arrayBuffer();
                if (buffer.byteLength > 52428800)
                    throw new Error('Quiz exceeds the bucket size limit.');
                html = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
                if (active && version.status === 'published')
                    await cacheHtmlVersion(versionId, html);
            }
            if (active)
                setSource(html);
        };
        void load().catch(() => {
            if (active)
                setError('Could not open this HTML quiz. Reconnect or ask an administrator to check the file.');
        });
        return () => {
            active = false;
            abort.abort();
        };
    }, [versionId, fileId]);
    useEffect(() => {
        if (!source || !adminSource)
            return;
        const worker = new Worker(new URL('../api/html.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = event => {
            const parsed = z.object({ ok: z.boolean(), issues: z.array(z.object({ line: z.number(), message: z.string() })) }).safeParse(event.data);
            if (parsed.success)
                setWarnings(parsed.data.issues);
        };
        worker.postMessage({ type: 'scan', source });
        return () => worker.terminate();
    }, [source, adminSource]);
    async function save(value: {
        score: number;
        max: number;
    }) {
        setBusy(true);
        setError('');
        try {
            const { error: failure } = await db().rpc('record_attempt', {
                p_id: attemptId.current, p_version: versionId, p_score: value.score, p_max: value.max, p_answers: { html_report: true }, p_started: started.current
            });
            if (failure)
                throw failure;
            setSaved(true);
        }
        catch {
            setError('Result received, but saving failed. Keep this tab open and retry.');
        }
        finally {
            setBusy(false);
        }
    }
    useEffect(() => {
        const receive = (event: MessageEvent) => {
            if (event.source !== frame.current?.contentWindow)
                return;
            const parsed = resultSchema.safeParse(event.data);
            if (!parsed.success || parsed.data.channel !== channel.current || accepted.current)
                return;
            accepted.current = true;
            const value = { score: parsed.data.score, max: parsed.data.max };
            setResult(value);
            if (record)
                void save(value);
        };
        window.addEventListener('message', receive);
        return () => window.removeEventListener('message', receive);
    }, [record, versionId]);
    const send = () => {
        if (source && frame.current)
            frame.current.contentWindow?.postMessage({ type: 'cq-load', channel: channel.current, html: source }, '*');
    };
    useEffect(send, [source]);
    if (!origin)
        return <Message error>Configure a separate HTTPS quiz-runner origin before opening HTML quizzes.</Message>;
    const excerpt = source ? new TextDecoder().decode(new TextEncoder().encode(source).slice(0, shown)) : '';
    return <>{error && <Message error>{error}</Message>}{source ? <iframe className="html-runner" ref={frame} src={origin} title="Isolated HTML quiz" sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={send}/> : <p role="status">Opening isolated quiz…</p>}{result && <Message>Reported result: {result.score} / {result.max}. {record ? saved ? 'Saved to your private progress.' : 'Waiting to save.' : 'Preview only; no attempt recorded.'}</Message>}{result && record && !saved && <button disabled={busy} onClick={() => void save(result)}>{busy ? 'Saving…' : 'Retry saving result'}</button>}{!result && source && <p className="fine-print">This quiz may report a result. Without a result message, no score is stored.</p>}{adminSource && source && <section className="panel section-space"><h2>Source & review warnings</h2><p>Risky patterns are warnings, not proof of malicious code. Review the source and sandboxed behavior.</p><ul>{warnings.map((warning, index) => <li key={index}>Line {warning.line}: {warning.message}</li>)}</ul><pre className="source-preview">{excerpt}</pre>{new TextEncoder().encode(source).byteLength > shown && <button className="button-secondary" onClick={() => setShown(shown + 204800)}>Load 200 KiB more source</button>}</section>}</>;
}
