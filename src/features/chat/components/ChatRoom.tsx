import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { USER_PREFIX } from '../../../lib/storage';
import { discardDraft } from '../../../lib/drafts';
import { useAuth, useProfile } from '../../auth/hooks/useAuth';
import { useClasses } from '../../classes/hooks/useClasses';
import { Message, Skeleton } from '../../../components/Feedback';
const chatSchema = z.strictObject({ body: z.string().trim().min(1).max(2000), class_id: z.uuid().nullable() });
export default function ChatRoom({ classId }: {
    classId?: string;
}) {
    const { session } = useAuth();
    const { data: profile } = useProfile();
    const classes = useClasses();
    const key = `${USER_PREFIX}${session!.user.id}.draft.chat.${classId ?? 'shared'}`;
    const [body, setBody] = useState(() => {
        try { return localStorage.getItem(key)?.slice(0, 2000) ?? ''; }
        catch { return ''; }
    });
    const [tag, setTag] = useState(classId ?? '');
    const [page, setPage] = useState(0);
    const [cursors, setCursors] = useState<({
        time: string;
        id: string;
    } | null)[]>([null]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const directory = useQuery({ queryKey: ['directory'], queryFn: async () => {
            const { data, error } = await db().rpc('member_directory');
            if (error)
                throw error;
            return data;
        } });
    const query = useQuery({ queryKey: ['chat', classId, page, cursors[page]], staleTime: 0, queryFn: async () => {
            let request = db().from('chat_messages').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50);
            if (classId)
                request = request.eq('class_id', classId);
            const cursor = cursors[page];
            if (cursor)
                request = request.or(`created_at.lt.${cursor.time},and(created_at.eq.${cursor.time},id.lt.${cursor.id})`);
            const { data, error } = await request;
            if (error)
                throw error;
            return data;
        } });
    useEffect(() => {
        try {
            if (body)
                localStorage.setItem(key, body);
            else
                localStorage.removeItem(key);
        }
        catch {
            setError('Your unsent message could not be saved locally. Keep this tab open.');
        }
    }, [body, key]);
    useEffect(() => {
        const channel = db().channel(`chat:${classId ?? 'shared'}`).on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
            void queryClient.invalidateQueries({ queryKey: ['chat'] });
        }).subscribe();
        return () => {
            void db().removeChannel(channel);
        };
    }, [classId]);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const parsed = chatSchema.safeParse({ body, class_id: tag || null });
        if (!parsed.success) {
            setError('Write a message of 1–2,000 characters.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const { error: failure } = await db().from('chat_messages').insert({ ...parsed.data, user_id: session!.user.id });
            if (failure)
                throw failure;
            setBody('');
            discardDraft(key);
            setPage(0);
            setCursors([null]);
            await queryClient.invalidateQueries({ queryKey: ['chat'] });
        }
        catch {
            setError('Message could not be sent. Reconnect, or wait a minute if you sent 20 messages recently. Your draft is kept.');
        }
        finally {
            setBusy(false);
        }
    }
    const history=useRef<HTMLDivElement>(null);
    const [latest,setLatest]=useState(true);
    useEffect(()=>{if(page===0&&latest&&history.current)history.current.scrollTop=history.current.scrollHeight;},[query.data,page,latest]);
    const messages = [...(query.data ?? [])].reverse();
    return <div className="actual-chat-room"><section className="panel"><div className="chat-navigation"><button className="button-secondary" disabled={(query.data?.length ?? 0) < 50} onClick={() => {
        const last = query.data?.at(-1);
        if (last) {
            setCursors([...cursors.slice(0, page + 1), { time: last.created_at, id: last.id }]);
            setPage(page + 1);
        }
    }}>Load older</button><span className="fine-print">{page === 0 ? 'Latest 50 messages' : `History page ${page + 1}`}</span><button className="button-secondary" disabled={!page} onClick={() => setPage(page - 1)}>Back to newer</button></div>{query.isPending ? <Skeleton /> : query.isError ? <Message error>Could not load messages. <button className="text-button" onClick={() => void query.refetch()}>Retry</button></Message> : <div className="chat-messages" ref={history} onScroll={e=>{const t=e.currentTarget;setLatest(t.scrollHeight-t.scrollTop-t.clientHeight<60);}} role="log" tabIndex={0} aria-label={classId ? 'Class discussion' : 'Shared group chat'} aria-live="polite" aria-relevant="additions">{messages.length ? messages.map(message => <article className={`chat-message ${message.user_id === session?.user.id ? 'own' : ''}`} key={message.id}><div className="message-author"><strong>{directory.data?.find(member => member.id === message.user_id)?.display_name ?? 'Former member'}</strong><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>{message.class_id && !classId && <span className="pill">{classes.data?.find(item => item.id === message.class_id)?.name ?? 'Class'}</span>}</div><p>{message.body}</p>{(message.user_id === session?.user.id || profile?.role === 'admin') && <button className="text-button" onClick={() => void db().from('chat_messages').delete().eq('id', message.id).then(({ error: failure }) => {
        if (failure)
            setError('Could not delete this message.');
        else
            void queryClient.invalidateQueries({ queryKey: ['chat'] });
    })}>Delete message</button>}</article>) : <p className="chat-empty">No messages yet.</p>}</div>}</section>{!latest&&<button className="jump-latest" onClick={()=>{setLatest(true);if(history.current)history.current.scrollTop=history.current.scrollHeight;}}>Jump to latest ↓</button>}<section className="panel section-space"><form onSubmit={submit}><label htmlFor={`chat-body-${classId ?? 'shared'}`}>Message</label><textarea id={`chat-body-${classId ?? 'shared'}`} value={body} onChange={event => setBody(event.target.value)} maxLength={2000} required placeholder="Message the group…"/>{!classId && <label>Optional class tag<select value={tag} onChange={event => setTag(event.target.value)}><option value="">Whole group</option>{classes.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<div className="chat-compose-footer"><small>{body.length} / 2,000 · Draft saved on this device</small><button disabled={busy || !body.trim()}>{busy ? 'Sending…' : 'Send message'}</button></div>{error && <Message error>{error}</Message>}</form></section></div>;
}
