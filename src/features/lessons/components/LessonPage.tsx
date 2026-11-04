import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/supabase';
import { queryClient, freshness } from '../../../lib/query';
import { useAuth, useProfile } from '../../auth/hooks/useAuth';
import { progressSchema } from '../api/lessons';
import { Message, Skeleton } from '../../../components/Feedback';
const Markdown = lazy(() => import('./Markdown'));
export default function LessonPage() {
    const { lessonId } = useParams();
    const { session } = useAuth();
    const { data: profile } = useProfile();
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [reflection, setReflection] = useState('');
    const [status, setStatus] = useState('not_started');
    const [confidence, setConfidence] = useState('');
    const query = useQuery({ queryKey: ['lesson', lessonId], staleTime: freshness.content, queryFn: async () => {
            const { data, error } = await db().from('lessons').select('*').eq('id', lessonId!).single();
            if (error)
                throw error;
            return data;
        } });
    const progress = useQuery({ queryKey: ['lesson-progress', session?.user.id, lessonId], queryFn: async () => {
            const { data, error } = await db().from('lesson_progress').select('*').eq('lesson_id', lessonId!).eq('user_id', session!.user.id).maybeSingle();
            if (error)
                throw error;
            return data;
        } });
    useEffect(() => {
        setReflection(progress.data?.reflection ?? '');
        setStatus(progress.data?.status ?? 'not_started');
        setConfidence(progress.data?.confidence?.toString() ?? '');
    }, [lessonId, progress.data]);
    useEffect(() => {
        setNotice('');
        setError('');
    }, [lessonId]);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const parsed = progressSchema.safeParse({ status, confidence: confidence ? Number(confidence) : null, reflection });
        if (!parsed.success) {
            setError('Check your status, confidence, and reflection size.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const { error: failure } = await db().from('lesson_progress').upsert({ ...parsed.data, user_id: session!.user.id, lesson_id: lessonId! });
            if (failure)
                throw failure;
            setNotice('Your private progress was saved.');
            await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            await queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
        }
        catch {
            setError('Could not save your progress. Your entries are kept here; reconnect and retry.');
        }
        finally {
            setBusy(false);
        }
    }
    if (query.isPending)
        return <Skeleton />;
    if (query.isError)
        return <Message error>Could not load this lesson.</Message>;
    return <><div className="page-heading"><div><Link to={`/classes/${query.data.class_id}/lessons`} className="back-link">← Back to class</Link><h1>{query.data.title}</h1></div>{(query.data.created_by === session?.user.id || profile?.role === 'admin') && <Link className="button button-secondary" to={`/lessons/${lessonId}/edit`}>Edit lesson</Link>}</div><div className="lesson-layout"><article className="panel"><Suspense fallback={<Skeleton />}><Markdown source={query.data.markdown}/></Suspense></article><aside className="panel"><h2>Your learning check-in</h2><p>Only you can read this progress and reflection.</p>{progress.isError ? <Message error>Could not load your saved progress. Reconnect before editing.</Message> : <form onSubmit={submit}><label htmlFor="lesson-status">Status</label><select id="lesson-status" value={status} onChange={event => setStatus(event.target.value)}><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="complete">Complete</option></select><label htmlFor="confidence">How confident do you feel?</label><select id="confidence" value={confidence} onChange={event => setConfidence(event.target.value)}><option value="">Not set</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select><label htmlFor="reflection">A private reflection</label><textarea id="reflection" value={reflection} onChange={event => setReflection(event.target.value)} placeholder="Add a private reflection"/>{error && <Message error>{error}</Message>}{notice && <Message>{notice}</Message>}<button disabled={busy || progress.isPending}>{busy ? 'Saving…' : 'Save my progress'}</button></form>}</aside></div></>;
}
