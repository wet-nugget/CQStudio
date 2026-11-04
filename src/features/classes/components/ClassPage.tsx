import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useClass } from '../hooks/useClasses';
import { useAuth, useProfile } from '../../auth/hooks/useAuth';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { noteSchema } from '../../lessons/api/lessons';
import type { Row } from '../../../lib/database.types';
import { Icon } from '../../../components/Icon';
import { EmptyState, Message, Skeleton } from '../../../components/Feedback';
import { Drawer, ResponsiveDialog } from '../../../components/ui/kit';
import { useMedia } from '../../../components/ui/useMedia';
const LessonReader=lazy(()=>import('../../workspace/components/LessonReader'));
const ClassForm = lazy(() => import('./ClassForm'));
const Markdown = lazy(() => import('../../lessons/components/Markdown'));
const ClassQuizzes = lazy(() => import('../../quizzes/components/ClassQuizzes'));
const ChatRoom = lazy(() => import('../../chat/components/ChatRoom'));
export default function ClassPage() {
    const { classId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { session } = useAuth();
    const { data: profile } = useProfile();
    const item = useClass(classId);
    const tab = location.pathname.split('/')[3] ?? 'lessons';
    const small=useMedia('(max-width: 767px)');
    const [selectedLesson,setSelectedLesson]=useState('');
    const [lessonNotice,setLessonNotice]=useState('');
    const [editing, setEditing] = useState(false);
    const [noteEdit, setNoteEdit] = useState<Row<'notes'> | null | undefined>(undefined);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [page, setPage] = useState(0);
    const query = useQuery({ queryKey: ['class-content', classId, tab, page], queryFn: async () => {
            if (tab === 'notes') {
                const { data, error } = await db().from('notes').select('*').eq('class_id', classId!).order('created_at', { ascending: false }).range(page * 25, page * 25 + 24);
                if (error)
                    throw error;
                return { notes: data, lessons: [] };
            }
            const { data, error } = await db().from('lessons').select('*').eq('class_id', classId!).order('created_at', { ascending: false }).range(page * 25, page * 25 + 24);
            if (error)
                throw error;
            return { lessons: data, notes: [] };
        } });
    async function saveNote(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const url = String(fields.get('url') ?? '').trim();
        const parsed = noteSchema.safeParse({ title: fields.get('title'), body: fields.get('body'), links: url ? [{ label: String(fields.get('label') || 'Reference'), url }] : [] });
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? 'Check the note.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const result = noteEdit ? await db().from('notes').update(parsed.data).eq('id', noteEdit.id) : await db().from('notes').insert({ ...parsed.data, class_id: classId!, created_by: session!.user.id });
            if (result.error)
                throw result.error;
            setNoteEdit(undefined);
            await queryClient.invalidateQueries({ queryKey: ['class-content'] });
        }
        catch {
            setError('Could not save this note. Your entries are kept here; check access, connection and capacity.');
        }
        finally {
            setBusy(false);
        }
    }
    async function removeNote(id: string) {
        setBusy(true);
        try {
            const { error: failure } = await db().from('notes').delete().eq('id', id);
            if (failure)
                throw failure;
            await query.refetch();
        }
        catch {
            setError('Could not delete the note. Reconnect and retry.');
        }
        finally {
            setBusy(false);
        }
    }
    if (item.isPending)
        return <Skeleton />;
    if (item.isError)
        return <Message error>Class unavailable.</Message>;
    const activeLesson=query.data?.lessons.find(l=>l.id===selectedLesson)??(!small?query.data?.lessons[0]:undefined);
    const reader=activeLesson?<Suspense fallback={<Skeleton/>}><LessonReader key={activeLesson.id} lesson={{id:activeLesson.id,classId:activeLesson.class_id,title:activeLesson.title,minutes:Math.max(1,Math.round(activeLesson.markdown.split(/\s+/).length/200)),status:'Not started',markdown:activeLesson.markdown}} onDone={confidence=>{void (async()=>{const existing=await db().from('lesson_progress').select('*').eq('lesson_id',activeLesson.id).eq('user_id',session!.user.id).maybeSingle();if(existing.error){setError('Could not load your private progress.');return;}const result=await db().from('lesson_progress').upsert({user_id:session!.user.id,lesson_id:activeLesson.id,status:'complete',confidence,reflection:existing.data?.reflection??''});if(result.error)setError('Could not save your progress.');else{setLessonNotice('Your private lesson progress was saved.');void queryClient.invalidateQueries({queryKey:['dashboard']});}})();}}/></Suspense>:null;
    const owned = item.data.created_by === session?.user.id || profile?.role === 'admin';
    return <div className="feature-screen actual-class-screen"><div className="page-heading"><div><Link to="/classes" className="back-link">← All classes</Link><h1>{item.data.name}</h1><p>{item.data.teacher_subject}</p></div>{owned && <button className="button-secondary" onClick={() => setEditing(!editing)}>Edit class</button>}</div>{item.data.description && <p className="class-description">{item.data.description}</p>}<Drawer title="Edit class" open={editing} onClose={()=>setEditing(false)}><Suspense fallback={<Skeleton />}><ClassForm existing={item.data} onDone={() => setEditing(false)}/></Suspense></Drawer><nav className="tabs" aria-label="Class sections">{['lessons', 'notes', 'quizzes', 'files', 'discussion'].map(name => <Link key={name} className={tab === name ? 'active' : ''} to={`/classes/${classId}/${name}`} onClick={() => setPage(0)}>{name}</Link>)}</nav>{error && <Message error>{error}</Message>}{lessonNotice&&<Message>{lessonNotice}</Message>}{tab === 'lessons' ? <><div className="section-heading"><h2>Lessons</h2><Link to={`/classes/${classId}/lessons/new`} className="button"><Icon name="plus" size={16}/>Add lesson</Link></div>{query.isPending ? <Skeleton /> : query.isError ? <Message error>Could not load lessons.</Message> : query.data.lessons.length ? <div className="class-master-detail"><section className="lesson-master"><div className="pane-scroll">{query.data.lessons.map((lesson,i)=><button className={`lesson-item ${activeLesson?.id===lesson.id?'active':''}`} key={lesson.id} onClick={()=>setSelectedLesson(lesson.id)}><span className="lesson-number">{i+1}</span><span><strong>{lesson.title}</strong><small>Markdown lesson</small></span><Icon name="chevron" size={14}/></button>)}</div>{activeLesson&&<Link className="card-text-link" to={`/lessons/${activeLesson.id}`}>Private reflection & details<Icon name="arrow" size={16}/></Link>}</section>{!small&&reader}<ResponsiveDialog title="Back to lessons" open={small&&Boolean(activeLesson)} onClose={()=>setSelectedLesson('')} kind="full">{reader}</ResponsiveDialog></div> : <EmptyState title="No lessons yet."><p>Paste a lesson or import a Markdown file to share with your group.</p></EmptyState>}</> : tab === 'notes' ? <><div className="section-heading"><h2>Notes & materials</h2><button onClick={() => setNoteEdit(null)}><Icon name="plus" size={16}/>Add note</button></div>{noteEdit !== undefined && <section className="panel"><h2>{noteEdit ? 'Edit note' : 'New note'}</h2><form onSubmit={saveNote}><label htmlFor="note-title">Title</label><input id="note-title" name="title" defaultValue={noteEdit?.title} required maxLength={200}/><label htmlFor="note-body">Note (Markdown)</label><textarea id="note-body" name="body" defaultValue={noteEdit?.body}/><label htmlFor="note-url">Reference link (optional)</label><input id="note-url" name="url" type="url" defaultValue={(noteEdit?.links as {
        url: string;
    }[] | undefined)?.[0]?.url}/><label htmlFor="note-label">Reference label</label><input id="note-label" name="label" maxLength={200} defaultValue={(noteEdit?.links as {
        label: string;
    }[] | undefined)?.[0]?.label}/><div className="action-row"><button disabled={busy}>Save note</button><button type="button" className="button-secondary" onClick={() => setNoteEdit(undefined)}>Cancel</button></div></form></section>}{query.isPending ? <Skeleton /> : query.isError ? <Message error>Could not load notes.</Message> : query.data.notes.length ? <div className="stack section-space">{query.data.notes.map(note => <article className="panel" key={note.id}><h2>{note.title}</h2><Suspense fallback={<p>Loading note…</p>}><Markdown source={note.body}/></Suspense>{noteSchema.shape.links.parse(note.links).map(link => <p key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a></p>)}<div className="action-row">{(note.created_by === session?.user.id || profile?.role === 'admin') && <button className="text-button" onClick={() => setNoteEdit(note)}>Edit note</button>}{profile?.role === 'admin' && <button className="text-button danger-text" disabled={busy} onClick={() => void removeNote(note.id)}>Delete note</button>}</div></article>)}</div> : <EmptyState title="No notes yet."><p>Save notes, links, and references here. Upload attachments through the vault.</p></EmptyState>}</> : tab === 'files' ? <EmptyState title="Class files live in your shared vault."><Link className="button" to={item.data.folder_id ? `/vault/folders/${item.data.folder_id}` : '/vault'}>Open vault</Link></EmptyState> : tab === 'discussion' ? <Suspense fallback={<Skeleton />}><ChatRoom classId={classId}/></Suspense> : <Suspense fallback={<Skeleton />}><ClassQuizzes classId={classId!}/></Suspense>}{['lessons', 'notes'].includes(tab) && <div className="pagination"><button className="button-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button className="button-secondary" disabled={((tab === 'notes' ? query.data?.notes.length : query.data?.lessons.length) ?? 0) < 25} onClick={() => setPage(page + 1)}>Next</button></div>}{profile?.role === 'admin' && <details className="section-space"><summary>Class administration</summary><form onSubmit={event => {
        event.preventDefault();
        const confirm = new FormData(event.currentTarget).get('confirm');
        if (confirm !== item.data.name)
            return;
        void db().from('classes').delete().eq('id', classId!).then(async ({ error: failure }) => {
            if (failure)
                setError('Could not delete this class.');
            else {
                await queryClient.invalidateQueries({ queryKey: ['classes'] });
                void navigate('/classes');
            }
        });
    }}><p>Deleting this class removes its lessons, notes, quizzes, and associated private learning records. Files remain in the vault.</p><label htmlFor="confirm-class-delete">Type the class name to confirm</label><input id="confirm-class-delete" name="confirm" required/><button className="button-danger">Delete class</button></form></details>}</div>;
}
