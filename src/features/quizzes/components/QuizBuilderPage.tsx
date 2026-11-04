import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { useClasses } from '../../classes/hooks/useClasses';
import { defaultQuizSettings, quizContentSchema, quizSettingsSchema, type Question, type QuizSettings } from '../api/model';
import { uploadFile } from '../../vault/api/vault';
import { Message, Skeleton } from '../../../components/Feedback';
import { Icon } from '../../../components/Icon';
import { useAuth } from '../../auth/hooks/useAuth';
import { discardDraft, readDraft, useDraftAutosave } from '../../../lib/drafts';
const QuestionEditor = lazy(() => import('./QuestionEditor'));
const QuizPractice = lazy(() => import('./QuizPractice'));
export default function QuizBuilderPage() {
    const { quizId } = useParams();
    const [search] = useSearchParams();
    const navigate = useNavigate();
    const classes = useClasses();
    const [title, setTitle] = useState('');
    const [classId, setClassId] = useState(search.get('class') ?? '');
    const [kind, setKind] = useState<'manual' | 'html'>('manual');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [settings, setSettings] = useState<QuizSettings>(defaultQuizSettings);
    const [editing, setEditing] = useState<Question | null | undefined>(undefined);
    const [preview, setPreview] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [html, setHtml] = useState<{
        id: string;
        path: string;
    } | null>(null);
    const [largeHtml, setLargeHtml] = useState(false);
    const duplicate = search.get('duplicate');
    const existing = useQuery({ queryKey: ['quiz-edit', quizId, duplicate], enabled: Boolean(quizId || duplicate), queryFn: async () => {
            const v = quizId ? await db().from('quiz_versions').select('*').eq('quiz_id', quizId).order('version', { ascending: false }).limit(1).single() : await db().from('quiz_versions').select('*').eq('id', duplicate!).single();
            if (v.error)
                throw v.error;
            const q = await db().from('quizzes').select('*').eq('id', v.data.quiz_id).single();
            if (q.error || v.error)
                throw new Error('Quiz unavailable.');
            return { quiz: q.data, version: v.data };
        } });
    const { session } = useAuth();
    const [loaded, setLoaded] = useState(false);
    const draftKey = `cqstudio.user.${session?.user.id}.draft.quiz.${quizId ?? duplicate ?? search.get('class') ?? 'new'}`;
    const draftSchema = z.strictObject({
        title: z.string().max(200), classId: z.string(), kind: z.enum(['manual', 'html']), questions: z.array(quizContentSchema.shape.questions.element).max(1000), settings: quizSettingsSchema, html: z.strictObject({ id: z.uuid(), path: z.string() }).nullable()
    });
    useEffect(() => {
        if (loaded || ((quizId || duplicate) && !existing.data))
            return;
        const draft = readDraft(draftKey, draftSchema);
        setLoaded(true);
        if (draft) {
            setTitle(draft.title);
            setClassId(draft.classId);
            setKind(draft.kind);
            setQuestions(draft.questions);
            setSettings(draft.settings);
            setHtml(draft.html);
            return;
        }
        if (!existing.data)
            return;
        const { quiz, version } = existing.data;
        setTitle(duplicate && !quizId ? `Copy of ${quiz.title}`.slice(0, 200) : quiz.title);
        setClassId(quiz.class_id);
        setSettings(quizSettingsSchema.parse(version.settings));
        setKind(version.kind === 'html' ? 'html' : 'manual');
        if (version.kind === 'manual')
            setQuestions(quizContentSchema.parse(version.content).questions);
        else
            setHtml({ id: version.html_file_id!, path: z.object({ path: z.string() }).parse(version.content).path });
    }, [existing.data, loaded, draftKey, quizId, duplicate]);
    const draftFailed = useDraftAutosave(draftKey, {
        title, classId, kind, questions, settings, html
    }, loaded && !busy);
    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setBusy(true);
        try {
            const name = z.string().trim().min(1).max(200).parse(title);
            const cls = z.uuid().parse(classId);
            const content = kind === 'manual' ? quizContentSchema.parse({ format_version: 1, questions }) : z.strictObject({ path: z.string().min(1) }).parse({ path: html?.path });
            const config = quizSettingsSchema.parse(settings);
            const { data, error: failure } = await db().rpc('save_quiz', {
                p_class: cls, p_title: name, p_kind: kind, p_content: content, p_settings: config, p_html_file: html?.id ?? null, p_quiz: quizId ?? null
            });
            if (failure)
                throw new Error('Could not save your quiz. Check ownership, question limits, and class capacity.');
            await queryClient.invalidateQueries({ queryKey: ['quizzes'] });
            await queryClient.invalidateQueries({ queryKey: ['quiz'] });
            discardDraft(draftKey);
            void navigate(`/quizzes/${data.quiz_id}`);
        }
        catch (failure) {
            setError(failure instanceof z.ZodError ? failure.issues.map(issue => issue.message).join('\n') : failure instanceof Error ? failure.message : 'Could not save quiz.');
        }
        finally {
            setBusy(false);
        }
    }
    async function importMarkdown(file: File) {
        setError('');
        try {
            if (file.size > 2097152)
                throw new Error('Markdown import must be at most 2 MiB.');
            const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
            const { parseQuizMarkdown } = await import('../api/markdown');
            const parsed = parseQuizMarkdown(text);
            setTitle(parsed.title);
            setQuestions(parsed.content.questions);
            setKind('manual');
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Could not import this file.');
        }
    }
    async function importHtml(file: File) {
        setBusy(true);
        setError('');
        setLargeHtml(file.size > 5242880);
        setProgress(0);
        try {
            if (!file.name.toLowerCase().endsWith('.html'))
                throw new Error('Choose a single .html file.');
            const result = await uploadFile(file, 'HTML quiz source', null, 'html_quiz', setProgress);
            setHtml({ id: result.id, path: result.path });
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Could not import HTML.');
        }
        finally {
            setBusy(false);
            setProgress(null);
        }
    }
    if ((quizId || duplicate) && existing.isPending)
        return <Skeleton />;
    if (existing.isError)
        return <Message error>Could not load this quiz for editing.</Message>;
    return <><div className="page-heading"><div><span className="eyebrow">TURN CURIOSITY INTO PRACTICE</span><h1>{quizId ? 'Edit quiz' : 'Create a quiz'}</h1><p>Save a draft, preview it, then submit it for an administrator’s review.</p></div></div>{draftFailed && <Message error>Your browser could not save this draft. Export or copy your work before leaving.</Message>}{error && <Message error>{error}</Message>}<form onSubmit={save} className="panel"><label htmlFor="quiz-title">Quiz title</label><input id="quiz-title" value={title} onChange={event => setTitle(event.target.value)} required maxLength={200}/><label htmlFor="quiz-class">Class</label><select id="quiz-class" value={classId} onChange={event => setClassId(event.target.value)} required disabled={Boolean(quizId)}><option value="">Choose a class</option>{classes.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><label htmlFor="quiz-kind">Quiz format</label><select id="quiz-kind" value={kind} onChange={event => setKind(event.target.value === 'html' ? 'html' : 'manual')}><option value="manual">Seven-type quiz (manual or Markdown)</option><option value="html">Isolated HTML quiz</option></select>{kind === 'manual' ? <><label htmlFor="quiz-md">Import Markdown (optional)</label><input id="quiz-md" type="file" accept=".md,text/markdown,text/plain" onChange={event => {
        const file = event.target.files?.[0];
        if (file)
            void importMarkdown(file);
    }}/><p className="fine-print">Use the format in docs/QUIZZES.md. Import replaces the question list; save a copy of existing work first.</p><ol className="builder-questions">{questions.map((question, index) => <li key={question.id}><div><strong>{index + 1}. {question.prompt.slice(0, 100)}</strong><small>{question.type.replaceAll('_', ' ')} · {question.points} points</small></div><div className="action-row"><button type="button" className="text-button" onClick={() => setEditing(question)}>Edit</button><button type="button" className="text-button danger-text" onClick={() => setQuestions(questions.filter(item => item.id !== question.id))}>Remove</button></div></li>)}</ol><button type="button" className="button-secondary" onClick={() => setEditing(null)}><Icon name="plus" size={16}/>Add question</button></> : <><label htmlFor="quiz-html">Single HTML file</label><input id="quiz-html" type="file" accept=".html,text/html" disabled={busy} onChange={event => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 5242880)
                setError('For HTML over 5 MiB, consider compressing embedded images and fonts before uploading.');
            void importHtml(file);
        }
    }}/>{largeHtml && <p className="fine-print">For HTML over 5 MiB, consider compressing embedded images and fonts.</p>}{html && <Message>HTML uploaded and validated. Its bytes count toward storage quotas.</Message>}{progress !== null && <progress max={100} value={progress} aria-label="HTML upload progress"/>}<p>Embed scripts/styles directly and images/fonts as data: URLs. External resources and nested frames are rejected. Sandboxing reduces risk but does not make uploaded code safe.</p></>}<hr /><h2>Practice settings</h2><label className="checkbox-label"><input type="checkbox" checked={settings.shuffle} onChange={event => setSettings({ ...settings, shuffle: event.target.checked })}/><span>Shuffle questions</span></label><label htmlFor="quiz-mode">Navigation</label><select id="quiz-mode" value={settings.mode} onChange={event => setSettings({ ...settings, mode: event.target.value === 'single' ? 'single' : 'paged' })}><option value="paged">Paged</option><option value="single">One question at a time</option></select><div className="form-columns"><label>Questions per page<input type="number" min={1} max={50} value={settings.page_size} onChange={event => setSettings({ ...settings, page_size: Number(event.target.value) })}/></label><label>Whole quiz timer (seconds, optional)<input type="number" min={5} max={86400} value={settings.quiz_seconds ?? ''} onChange={event => setSettings({ ...settings, quiz_seconds: event.target.value ? Number(event.target.value) : null })}/></label><label>Per-question timer (seconds, optional)<input type="number" min={5} max={3600} value={settings.question_seconds ?? ''} onChange={event => setSettings({ ...settings, question_seconds: event.target.value ? Number(event.target.value) : null })}/></label></div>{kind === 'html' && <p className="fine-print">HTML quizzes control their own question navigation and timers; these manual-quiz settings do not change uploaded code.</p>}<div className="action-row"><button disabled={busy || kind === 'manual' && !questions.length || kind === 'html' && !html}>{busy ? 'Saving…' : 'Save draft'}</button>{kind === 'manual' && <button type="button" className="button-secondary" disabled={!questions.length} onClick={() => setPreview(!preview)}>{preview ? 'Close' : 'Open'} preview</button>}</div></form>{editing !== undefined && <Suspense fallback={<Skeleton />}><QuestionEditor key={editing?.id ?? 'new'} initial={editing ?? undefined} onCancel={() => setEditing(undefined)} onSave={question => {
        setQuestions(current => current.some(item => item.id === question.id) ? current.map(item => item.id === question.id ? question : item) : [...current, question]);
        setEditing(undefined);
    }}/></Suspense>}{preview && kind === 'manual' && <section className="section-space"><h2>Quiz preview</h2><Suspense fallback={<Skeleton />}><QuizPractice content={quizContentSchema.parse({ format_version: 1, questions })} settings={quizSettingsSchema.parse(settings)}/></Suspense></section>}</>;
}
