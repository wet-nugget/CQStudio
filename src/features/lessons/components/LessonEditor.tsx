import { lazy, Suspense, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { useAuth } from '../../auth/hooks/useAuth';
import { saveLesson } from '../api/lessons';
import { Message, Skeleton } from '../../../components/Feedback';
import { z } from 'zod';
import { discardDraft, readDraft, useDraftAutosave } from '../../../lib/drafts';
const Markdown = lazy(() => import('./Markdown'));
export default function LessonEditor() {
    const { lessonId, classId } = useParams();
    const { session } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [source, setSource] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [preview, setPreview] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const query = useQuery({ queryKey: ['lesson', lessonId], enabled: Boolean(lessonId), queryFn: async () => {
            const { data, error } = await db().from('lessons').select('*').eq('id', lessonId!).single();
            if (error)
                throw error;
            return data;
        } });
    const key = `cqstudio.user.${session?.user.id}.draft.lesson.${lessonId ?? classId}`;
    if (!loaded && (!lessonId || query.data)) {
        const draft = readDraft(key, z.strictObject({ title: z.string().max(200), source: z.string().max(204800) }));
        setTitle(draft?.title ?? query.data?.title ?? '');
        setSource(draft?.source ?? query.data?.markdown ?? '');
        setLoaded(true);
    }
    const draftFailed = useDraftAutosave(key, { title, source }, loaded && !busy);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!session)
            return;
        setBusy(true);
        setError('');
        try {
            const result = await saveLesson({ title, markdown: source }, classId ?? query.data!.class_id, session.user.id, lessonId);
            await queryClient.invalidateQueries({ queryKey: ['class-content'] });
            await queryClient.invalidateQueries({ queryKey: ['lesson'] });
            discardDraft(key);
            void navigate(`/lessons/${result.id}`);
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Could not save lesson.');
        }
        finally {
            setBusy(false);
        }
    }
    if (lessonId && query.isPending)
        return <Skeleton />;
    if (query.isError)
        return <Message error>Lesson unavailable.</Message>;
    return <><div className="page-heading"><div><h1>{lessonId ? 'Edit lesson' : 'New lesson'}</h1><p>Markdown supports headings, lists, code, and tables. HTML and remote images are omitted.</p></div></div><section className="panel"><form onSubmit={submit}><label htmlFor="lesson-title">Title</label><input id="lesson-title" value={title} onChange={event => setTitle(event.target.value)} required maxLength={200}/><label htmlFor="import-md">Import a Markdown file</label><input id="import-md" type="file" accept=".md,text/markdown,text/plain" onChange={event => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        if (file.size > 204800 || !file.name.toLowerCase().endsWith('.md')) {
            setError('Choose a .md file up to 200 KiB.');
            return;
        }
        void file.arrayBuffer().then(buffer => setSource(new TextDecoder('utf-8', { fatal: true }).decode(buffer))).catch(() => setError('The file must use valid UTF-8.'));
    }}/><label htmlFor="lesson-markdown">Lesson Markdown</label><textarea id="lesson-markdown" className="code-editor" value={source} onChange={event => setSource(event.target.value)}/><button type="button" className="button-secondary" onClick={() => setPreview(!preview)}>{preview ? 'Hide' : 'Show'} preview</button>{preview && <Suspense fallback={<Skeleton />}><Markdown source={source}/></Suspense>}{draftFailed && <Message error>Your browser could not save this draft. Copy your work before leaving.</Message>}{error && <Message error>{error}</Message>}<div className="action-row"><button disabled={busy}>{busy ? 'Saving…' : 'Save lesson'}</button><button type="button" className="button-secondary" onClick={() => void navigate(-1)}>Cancel</button></div></form></section></>;
}
