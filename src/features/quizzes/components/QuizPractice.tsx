import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { answerMapSchema, scoreQuiz, shuffled, type Answers, type QuizContent, type QuizSettings } from '../api/model';
import { useAuth } from '../../auth/hooks/useAuth';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { USER_PREFIX } from '../../../lib/storage';
import { discardDraft } from '../../../lib/drafts';
import QuestionInput from './QuestionInput';
import { Message } from '../../../components/Feedback';
import { Badge, Button, Drawer, Tabs } from '../../../components/ui/kit';
import { Icon } from '../../../components/Icon';
const draftSchema = z.strictObject({
    responses: answerMapSchema, order: z.array(z.string()).max(1000), started: z.string().datetime(), deadline: z.number().nullable(), question_deadlines: z.record(z.string(), z.number()), attempt_id: z.uuid(), flags: z.array(z.string()).default([])
});
export default function QuizPractice({ content, settings, versionId, onlyIds, localDraft = false }: {
    content: QuizContent;
    settings: QuizSettings;
    versionId?: string;
    onlyIds?: string[];
    localDraft?: boolean;
}) {
    const { session } = useAuth();
    const key = `${USER_PREFIX}${session?.user.id ?? 'preview'}.attempt.${versionId ?? 'preview'}${onlyIds ? `.${onlyIds.join('-')}` : ''}`;
    const [draft, setDraft] = useState(() => {
        if (versionId || localDraft) {
            try {
                const parsed = draftSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? 'null'));
                const ids = onlyIds ?? content.questions.map(question => question.id);
                if (parsed.success && parsed.data.order.length === ids.length && parsed.data.order.every(id => ids.includes(id)) && new Set(parsed.data.order).size === ids.length)
                    return parsed.data;
            }
            catch { /* Start a fresh draft when local data is invalid. */ }
        }
        const ids = onlyIds ?? content.questions.map(question => question.id);
        return {
            responses: {} as Answers, order: settings.shuffle ? shuffled(ids) : ids, started: new Date().toISOString(), deadline: settings.quiz_seconds ? Date.now() + settings.quiz_seconds * 1000 : null, question_deadlines: {} as Record<string, number>, attempt_id: crypto.randomUUID(), flags: [] as string[]
        };
    });
    const [palette, setPalette] = useState(false);
    const [filter, setFilter] = useState('All');
    const [page, setPage] = useState(0);
    const [now, setNow] = useState(Date.now());
    const [result, setResult] = useState<ReturnType<typeof scoreQuiz> | null>(null);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);
    const finishing = useRef(false);
    const size = settings.mode === 'single' ? 1 : settings.page_size;
    const visible = draft.order.slice(page * size, (page + 1) * size);
    const questions = visible.map(id => content.questions.find(question => question.id === id)!);
    useEffect(() => {
        if (!settings.question_seconds || result)
            return;
        setDraft(current => {
            const missing = visible.filter(id => !current.question_deadlines[id]);
            return missing.length ? { ...current, question_deadlines: { ...current.question_deadlines, ...Object.fromEntries(missing.map(id => [id, Date.now() + settings.question_seconds! * 1000])) } } : current;
        });
    }, [page, settings.question_seconds, result]);
    useEffect(() => {
        if ((versionId || localDraft) && !result) {
            try {
                localStorage.setItem(key, JSON.stringify(draft));
            }
            catch {
                setError('This browser could not save your answers locally. Keep this tab open until submission.');
            }
        }
    }, [draft, key, versionId, localDraft, result]);
    const persist = useCallback(async (outcome: ReturnType<typeof scoreQuiz>) => {
        if (!versionId) {
            if (localDraft)
                discardDraft(key);
            return;
        }
        setBusy(true);
        setError('');
        try {
            const { error: failure } = await db().rpc('record_attempt', {
                p_id: draft.attempt_id, p_version: versionId, p_score: outcome.score, p_max: outcome.max, p_answers: { responses: draft.responses, question_ids: draft.order }, p_started: draft.started
            });
            if (failure)
                throw failure;
            setSaved(true);
            if (!discardDraft(key))
                setError('Your result was saved. This browser could not remove the local draft; clear site data after signing out.');
            await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            await queryClient.invalidateQueries({ queryKey: ['progress'] });
        }
        catch {
            setError('Your result is ready, but saving failed. Keep this tab open and retry when connected.');
        }
        finally {
            setBusy(false);
        }
    }, [versionId, draft, key, localDraft]);
    const finish = useCallback(() => {
        if (finishing.current)
            return;
        finishing.current = true;
        const outcome = scoreQuiz(content, draft.responses, draft.order);
        setResult(outcome);
        void persist(outcome);
    }, [content, draft, persist]);
    useEffect(() => {
        if (result)
            return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [result]);
    useEffect(() => {
        if (result)
            return;
        if (draft.deadline && now >= draft.deadline)
            finish();
        else if (settings.mode === 'single' && settings.question_seconds && visible[0] && draft.question_deadlines[visible[0]] && now >= draft.question_deadlines[visible[0]]!) {
            if ((page + 1) * size < draft.order.length)
                setPage(page + 1);
            else
                finish();
        }
    }, [now, draft.deadline, draft.question_deadlines, finish, result]);
    const changeAnswer = useCallback((id: string, answer: Answers[string]) => setDraft(current => ({ ...current, responses: { ...current.responses, [id]: answer } })), []);
    const toggleFlag = useCallback((id: string) => setDraft(current => ({ ...current, flags: current.flags.includes(id) ? current.flags.filter(f => f !== id) : [...current.flags, id] })), []);
    useEffect(() => { const handle = (e: KeyboardEvent) => { const target = e.target as HTMLElement; if (target.closest('button,a,summary,input,textarea,select,[contenteditable],dialog') || e.ctrlKey || e.metaKey || e.altKey || result)
        return; const question = questions[0]; if (!question)
        return; if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFlag(question.id);
    } if (e.key === 'Enter') {
        e.preventDefault();
        if ((page + 1) * size < draft.order.length)
            setPage(p => p + 1);
        else
            finish();
    } const option = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : /^[a-i]$/i.test(e.key) ? e.key.toLowerCase().charCodeAt(0) - 97 : -1; if (option < 0)
        return; const deadline = draft.question_deadlines[question.id]; if (deadline && deadline <= Date.now())
        return; if (question.type === 'multiple_choice' && option < question.options.length) {
        e.preventDefault();
        changeAnswer(question.id, option);
    }
    else if (question.type === 'multiple_response' && option < question.options.length) {
        e.preventDefault();
        const values = Array.isArray(draft.responses[question.id]) ? draft.responses[question.id] as (string | number)[] : [];
        changeAnswer(question.id, values.includes(option) ? values.filter(v => v !== option) : [...values, option]);
    }
    else if (question.type === 'true_false' && option < 2) {
        e.preventDefault();
        changeAnswer(question.id, option === 0);
    } }; window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle); }, [questions, draft, page, size, result, finish, toggleFlag, changeAnswer]);
    const questionPalette = <div className="question-palette"><span className="eyebrow">YOUR QUESTIONS</span><div className="palette-grid">{draft.order.map((id, i) => <button key={id} className={`${visible.includes(id) ? 'current' : ''} ${draft.responses[id] !== undefined ? 'answered' : ''}`} aria-label={`Question ${i + 1}${draft.responses[id] !== undefined ? ', answered' : ''}${draft.flags.includes(id) ? ', flagged' : ''}`} onClick={() => { setPage(Math.floor(i / size)); setPalette(false); }}>{i + 1}{draft.flags.includes(id) && <Icon name="flag" size={10}/>}</button>)}</div><p><Icon name="check" size={14}/> Answered · <Icon name="flag" size={14}/> Flagged</p><small>Answers are saved on this device.</small></div>;
    if (result)
        return <div className="quiz-results feature-screen"><section className="result-summary"><div><span className="eyebrow">YOUR PRIVATE PRACTICE</span><h2>{result.score} / {result.max}</h2><p>{versionId ? (saved ? 'Saved to your private progress.' : 'Your result is ready.') : 'Preview complete. No attempt has been recorded.'}</p></div><Badge tone="success"><Icon name="check" size={15}/>Practice complete</Badge></section>{error && <Message error>{error}</Message>}{versionId && !saved && <Button disabled={busy} onClick={() => void persist(result)}>Retry saving result</Button>}<Tabs items={['All', 'Missed', 'Flagged']} value={filter} onChange={setFilter} label="Filter review"/><div className="pane-scroll result-list">{result.details.filter(d => filter === 'All' || (filter === 'Missed' ? !d.correct : draft.flags.includes(d.id))).map(detail => <article className="review-item" key={detail.id}><Badge tone={detail.correct ? 'success' : 'danger'}><Icon name={detail.correct ? 'check' : 'close'} size={14}/>{detail.correct ? 'Correct' : 'Incorrect'}</Badge><h3>{content.questions.find(q => q.id === detail.id)?.prompt}</h3><details><summary>Show answer & explanation</summary><p><strong>Correct answer:</strong> {detail.expected}</p><p>This question awards its points when the whole answer matches. Review the lesson if this is still unfamiliar.</p></details></article>)}{!result.details.some(d => filter === 'All' || (filter === 'Missed' ? !d.correct : draft.flags.includes(d.id))) && <p>No questions in this filter.</p>}</div>{versionId && saved && <Link to={`/attempts/${draft.attempt_id}`} className="button">Open saved review</Link>}</div>;
    const remaining = draft.deadline ? Math.max(0, Math.ceil((draft.deadline - now) / 1000)) : null;
    const timerTone = remaining !== null && settings.quiz_seconds ? (remaining / settings.quiz_seconds <= .1 ? 'danger-text' : remaining / settings.quiz_seconds <= .2 ? 'warning-text' : '') : '';
    return <section className="quiz-practice">{error && <Message error>{error}</Message>}<header className="quiz-practice-header"><div><span className="eyebrow">{versionId ? 'PRIVATE SELF-PRACTICE' : 'PREVIEW · NO ATTEMPT RECORDED'}</span><h2>Question {page * size + 1} of {draft.order.length}</h2></div><div className="quiz-status"><span className="autosave"><Icon name="check" size={14}/>{versionId || localDraft ? 'Saved on device' : 'Preview'}</span>{remaining !== null && <span role="timer" className={timerTone} aria-label="Whole quiz time remaining"><Icon name="clock" size={17}/>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>}<Button variant="quiet" onClick={() => setPalette(true)}>Questions</Button></div></header><span className="sr-only" aria-live="polite">{remaining !== null && remaining <= 30 ? 'Less than thirty seconds remain.' : ''}</span><progress max={draft.order.length} value={Object.keys(draft.responses).length} aria-label="Questions answered"/><div className="quiz-practice-body"><aside className="docked-palette">{questionPalette}</aside><div className="question-scroll pane-scroll">{questions.map((question, index) => { const deadline = draft.question_deadlines[question.id]; const expired = Boolean(deadline && deadline <= now); return <section className="question-card" key={question.id}><div className="question-meta"><Badge>{question.type.replaceAll('_', ' ')}</Badge><Button variant="quiet" aria-pressed={draft.flags.includes(question.id)} onClick={() => toggleFlag(question.id)}><Icon name="flag" size={16}/>{draft.flags.includes(question.id) ? 'Flagged' : 'Flag'}</Button></div>{deadline && <p role="timer" className={deadline && settings.question_seconds ? (deadline - now) / 1000 / settings.question_seconds <= .1 ? 'danger-text' : (deadline - now) / 1000 / settings.question_seconds <= .2 ? 'warning-text' : '' : ''}>{expired ? 'Time ended for this question' : `${Math.max(0, Math.ceil((deadline - now) / 1000))}s for this question`}</p>}<QuestionInput question={question} index={page * size + index} answer={draft.responses[question.id]} disabled={expired} onChange={answer => changeAnswer(question.id, answer)}/></section>; })}</div></div><footer className="quiz-practice-footer"><Button variant="quiet" disabled={!page} onClick={() => setPage(page - 1)}>Previous</Button><span>{page + 1} / {Math.ceil(draft.order.length / size)}</span>{(page + 1) * size < draft.order.length ? <Button onClick={() => setPage(page + 1)}>Next<Icon name="arrow" size={16}/></Button> : <Button onClick={finish}>Finish and review</Button>}</footer><Drawer title="Question palette" open={palette} onClose={() => setPalette(false)}>{questionPalette}</Drawer></section>;
}
