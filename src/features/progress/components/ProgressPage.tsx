import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/supabase';
import { useAuth } from '../../auth/hooks/useAuth';
import { useClasses } from '../../classes/hooks/useClasses';
import { answerMapSchema, quizContentSchema, scoreQuiz } from '../../quizzes/api/model';
import { z } from 'zod';
import { Message, Skeleton } from '../../../components/Feedback';
const DataTransfer = lazy(() => import('./DataTransfer'));
export default function ProgressPage() {
    const { session } = useAuth();
    const classes = useClasses();
    const [page, setPage] = useState(0);
    const [classId, setClassId] = useState('');
    const [transfer, setTransfer] = useState(false);
    const query = useQuery({ queryKey: ['progress', session?.user.id, page, classId], queryFn: async () => {
            const [attempts, progress, lessons, quizzes] = await Promise.all([db().rpc('my_attempts', { p_class: classId || null, p_page: page }), db().from('lesson_progress').select('*').order('updated_at', { ascending: false }).limit(100), classId ? db().from('lessons').select('id,title,class_id').eq('class_id', classId).limit(100) : db().from('lessons').select('id,title,class_id').order('updated_at', { ascending: false }).limit(100), db().from('quizzes').select('id,title,class_id').limit(1000)]);
            if (attempts.error || progress.error || lessons.error || quizzes.error)
                throw new Error('Progress unavailable.');
            const ids = [...new Set(attempts.data.map(attempt => attempt.quiz_version_id))];
            const versions = ids.length ? await db().from('quiz_versions').select('*').in('id', ids) : { data: [], error: null };
            if (versions.error)
                throw versions.error;
            return {
                attempts: attempts.data, progress: progress.data, lessons: lessons.data, quizzes: quizzes.data, versions: versions.data ?? []
            };
        } });
    if (query.isPending)
        return <Skeleton />;
    if (query.isError)
        return <Message error>Could not load your private progress. <button className="text-button" onClick={() => void query.refetch()}>Retry</button></Message>;
    const data = query.data;
    const attempts = data.attempts;
    const trend = [...attempts].reverse();
    const points = trend.map((attempt, index) => `${trend.length === 1 ? 150 : index / (trend.length - 1) * 300},${100 - attempt.score / attempt.max_score * 100}`).join(' ');
    const weak = attempts.flatMap(attempt => {
        const version = data.versions.find(version => version.id === attempt.quiz_version_id);
        if (version?.kind !== 'manual' || !attempt.answers)
            return [];
        const parsed = z.object({ responses: answerMapSchema, question_ids: z.array(z.string()) }).safeParse(attempt.answers);
        if (!parsed.success)
            return [];
        const content = quizContentSchema.parse(version.content);
        return scoreQuiz(content, parsed.data.responses, parsed.data.question_ids).details.filter(item => !item.correct).map(item => ({ prompt: content.questions.find(question => question.id === item.id)!.prompt, attempt: attempt.id }));
    }).slice(0, 10);
    return <><div className="page-heading"><div><h1>Your progress</h1><p>Only you can see this page, your answers, and your reflections.</p></div><button className="button-secondary" onClick={() => setTransfer(!transfer)}>Import my data</button></div>{transfer && <Suspense fallback={<Skeleton />}><DataTransfer /></Suspense>}<div className="dashboard-lower"><section className="panel"><h2>Your recent score trend</h2>{trend.length ? <figure className="trend"><svg viewBox="-8 -8 316 116" role="img" aria-label={`Score trend for ${trend.length} recent attempts, oldest to newest`}><path d="M0 0v100h300" fill="none" stroke="var(--line)"/><polyline points={points} fill="none" stroke="var(--forest)" strokeWidth={3}/>{trend.map((attempt, index) => <circle key={attempt.id} cx={trend.length === 1 ? 150 : index / (trend.length - 1) * 300} cy={100 - attempt.score / attempt.max_score * 100} r={3} fill="var(--forest)"/>)}</svg><figcaption>Oldest → newest · 0–100%. Exact scores appear in the history below.</figcaption></figure> : <p>Your practice history will appear here after your first attempt.</p>}</section><section className="panel"><h2>Ideas to revisit</h2>{weak.length ? <ul className="simple-list">{weak.map((item, index) => <li key={index}><Link to={`/attempts/${item.attempt}`}>{item.prompt.slice(0, 130)}</Link></li>)}</ul> : <p>No missed questions in the loaded history. </p>}</section></div><div className="section-heading"><h2>Practice history</h2><select aria-label="Filter progress by class" value={classId} onChange={event => {
        setClassId(event.target.value);
        setPage(0);
    }}><option value="">All classes</option>{classes.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><section className="panel table-scroll"><table><caption>Your private attempts, newest first</caption><thead><tr><th>Quiz</th><th>Score</th><th>When</th><th>Review</th></tr></thead><tbody>{attempts.map(attempt => {
        const version = data.versions.find(version => version.id === attempt.quiz_version_id);
        return <tr key={attempt.id}><td>{data.quizzes.find(quiz => quiz.id === version?.quiz_id)?.title ?? 'Previous quiz'}<small> · v{version?.version}</small></td><td>{attempt.score} / {attempt.max_score} ({Math.round(attempt.score / attempt.max_score * 100)}%)</td><td>{new Date(attempt.completed_at).toLocaleDateString()}</td><td><Link to={`/attempts/${attempt.id}`}>{attempt.summary ? 'Summary' : 'Review answers'}</Link></td></tr>;
    })}</tbody></table>{!attempts.length && <p>No attempts in this page of history.</p>}</section><div className="pagination"><button className="button-secondary" disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button className="button-secondary" disabled={data.attempts.length < 25} onClick={() => setPage(page + 1)}>Next</button></div><section className="panel section-space"><h2>Lesson check-ins</h2>{data.lessons.map(lesson => {
        const progress = data.progress.find(item => item.lesson_id === lesson.id);
        return <div className="list-row" key={lesson.id}><Link to={`/lessons/${lesson.id}`}>{lesson.title}</Link><span className="pill">{progress?.status.replaceAll('_', ' ') ?? 'Not started'}{progress?.confidence ? ` · ${progress.confidence}/5` : ''}</span></div>;
    })}<p className="fine-print">Showing the latest 100 lessons. Open an individual class to explore its full lesson list.</p></section></>;
}
