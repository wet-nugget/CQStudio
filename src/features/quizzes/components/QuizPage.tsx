import { lazy, Suspense, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/supabase';
import { queryClient, freshness } from '../../../lib/query';
import { useAuth, useProfile } from '../../auth/hooks/useAuth';
import { answerMapSchema, expectedAnswer, quizContentSchema, quizSettingsSchema, scoreQuiz } from '../api/model';
import { z } from 'zod';
import { Message, Skeleton } from '../../../components/Feedback';
const QuizPractice = lazy(() => import('./QuizPractice'));
const HtmlRunner = lazy(() => import('./HtmlRunner'));
export default function QuizPage() {
    const { quizId, versionId, attemptId } = useParams();
    const [search] = useSearchParams();
    const { session } = useAuth();
    const { data: profile } = useProfile();
    const [preview, setPreview] = useState(false);
    const [htmlRecord, setHtmlRecord] = useState(false);
    const [error, setError] = useState('');
    const [managing, setManaging] = useState(false);
    const query = useQuery({ queryKey: ['quiz', quizId, versionId, attemptId], staleTime: freshness.content, queryFn: async () => {
            let attempt = null;
            let version = versionId;
            if (attemptId) {
                const result = await db().from('attempts').select('*').eq('id', attemptId).single();
                if (result.error)
                    throw result.error;
                attempt = result.data;
                version = attempt.quiz_version_id;
            }
            const q = quizId ? await db().from('quizzes').select('*').eq('id', quizId).single() : null;
            const v = version ? await db().from('quiz_versions').select('*').eq('id', version).single() : await db().from('quiz_versions').select('*').eq('quiz_id', quizId!).order('version', { ascending: false }).limit(1).single();
            if (q?.error || v.error)
                throw new Error('Quiz unavailable.');
            const reviews = await db().from('quiz_reviews').select('*').eq('quiz_version_id', v.data.id).order('created_at', { ascending: false }).limit(5);
            if (reviews.error)
                throw new Error('Review unavailable.');
            return {
                quiz: q?.data, version: v.data, attempt, reviews: reviews.data
            };
        } });
    if (query.isPending)
        return <Skeleton />;
    if (query.isError)
        return <Message error>Quiz or private review unavailable.</Message>;
    const { quiz, version, attempt } = query.data;
    const content = version.kind === 'manual' ? quizContentSchema.parse(version.content) : null;
    const settings = quizSettingsSchema.parse(version.settings);
    const owner = version.created_by === session?.user.id || profile?.role === 'admin';
    const imported = attempt?.answers ? z.strictObject({ responses: answerMapSchema, question_ids: z.array(z.string()).max(1000) }).safeParse(attempt.answers) : null;
    const missed = content && imported?.success ? scoreQuiz(content, imported.data.responses, imported.data.question_ids).details.filter(item => !item.correct).map(item => item.id) : [];
    const requestedIds = search.get('missed')?.split(',').filter(id => content?.questions.some(question => question.id === id));
    return <><div className="page-heading"><div><Link to={quiz ? `/classes/${quiz.class_id}/quizzes` : '/progress'} className="back-link">← Back to {quiz ? 'class' : 'progress'}</Link><h1>{quiz?.title ?? 'Your practice review'}</h1><p>Version {version.version} · {version.kind === 'manual' ? `${content?.questions.length} questions` : 'HTML quiz'} · <span className="pill">{version.status}</span></p></div>{owner && !attemptId && !versionId && <Link className="button button-secondary" to={`/quizzes/${quizId}/edit`}>Edit a new draft</Link>}</div>{error && <Message error>{error}</Message>}{query.data.reviews.map(review => <section className="panel section-space" key={review.id}><h2>Administrator’s review</h2><p>{review.decision}: {review.note || 'No additional note.'}</p></section>)}{quiz?.published_version_id && quiz.published_version_id !== version.id && <Message>A published version is still available. <Link to={`/quizzes/${quiz.id}/take/${quiz.published_version_id}`}>Practice the published version</Link></Message>}{profile?.role === 'admin' && quiz && !attempt && <div className="action-row section-space"><button className="button-secondary" onClick={() => setManaging(!managing)}>Manage publication</button></div>}{managing && quiz && <section className="panel section-space"><h2>Manage this quiz</h2><p>Unpublishing removes group access. Deleting also removes version history and associated attempts.</p><form onSubmit={event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void import('../../admin/api/admin').then(async ({ adminAction }) => {
            try {
                await adminAction({ action: 'unpublish_quiz', quiz_id: quiz.id, remove: form.get('remove') === 'on' });
                await queryClient.invalidateQueries({ queryKey: ['quiz'] });
                await queryClient.invalidateQueries({ queryKey: ['quizzes'] });
                setManaging(false);
                setError('Publication updated. Return to the class if this quiz was deleted.');
            }
            catch {
                setError('Could not change publication.');
            }
        });
    }}><label className="checkbox-label"><input type="checkbox" name="remove"/><span>Delete this quiz and its history permanently</span></label><label>Type CONFIRM<input required pattern="CONFIRM"/></label><button className="button-danger">Apply publication change</button></form></section>}{attempt ? <><section className="panel practice-result"><span className="eyebrow">YOUR PRIVATE PRACTICE</span><h2>{attempt.score} / {attempt.max_score}</h2><p>{new Date(attempt.completed_at).toLocaleString()}{attempt.summary ? ' · Older attempt: answer detail was summarized by retention.' : ''}</p>{missed.length > 0 && version.status === 'published' && <Link className="button" to={`/quizzes/${version.quiz_id}/take/${version.id}?missed=${missed.join(',')}`}>Retake missed questions</Link>}</section>{content && imported?.success && <div className="stack section-space">{content.questions.filter(question => imported.data.question_ids.includes(question.id)).map(question => <article className="panel" key={question.id}><h3>{question.prompt}</h3><p>Your answer: {JSON.stringify(imported.data.responses[question.id] ?? 'Unanswered')}</p><p>Correct answer: {expectedAnswer(question)}</p></article>)}</div>}</> : versionId && content ? <Suspense fallback={<Skeleton />}><QuizPractice key={version.id} content={content} settings={settings} versionId={version.id} onlyIds={requestedIds?.length ? [...new Set(requestedIds)] : undefined}/></Suspense> : <><section className="panel"><p>{version.status === 'published' ? 'Ready for a little practice? Your result is private to you.' : 'This version is being prepared. Preview it without recording an attempt.'}</p><div className="action-row">{version.status === 'published' && version.kind === 'manual' && <Link className="button" to={`/quizzes/${quizId}/take/${version.id}`}>Start practice</Link>}{version.kind === 'html' && <>{version.status === 'published' && <button onClick={() => {
        setHtmlRecord(true);
        setPreview(true);
    }}>Start HTML practice</button>}<button className="button-secondary" onClick={() => {
        setHtmlRecord(false);
        setPreview(!preview);
    }}>{preview ? 'Close' : 'Open'} HTML preview</button></>}{version.kind === 'manual' && <button className="button-secondary" onClick={() => setPreview(!preview)}>{preview ? 'Close' : 'Open'} preview</button>}{owner && ['draft', 'rejected'].includes(version.status) && <button onClick={() => void db().rpc('submit_quiz', { p_version: version.id }).then(async ({ error: failure }) => {
        if (failure)
            setError('Could not submit. Check your pending-submission limit.');
        else
            await queryClient.invalidateQueries({ queryKey: ['quiz'] });
    })}>Submit for review</button>}{version.status === 'published' && content && <Link className="button button-secondary" to={`/quizzes/new?duplicate=${version.id}&class=${quiz?.class_id}`}>Duplicate quiz</Link>}</div></section>{preview && version.kind === 'html' && <Suspense fallback={<Skeleton />}><HtmlRunner key={`${version.id}-${htmlRecord ? 'practice' : 'preview'}`} versionId={version.id} fileId={version.html_file_id!} record={htmlRecord && version.status === 'published'} adminSource={profile?.role === 'admin'}/></Suspense>}{preview && content && <Suspense fallback={<Skeleton />}><QuizPractice key={`preview-${version.id}`} content={content} settings={settings}/></Suspense>}</>}</>;
}
