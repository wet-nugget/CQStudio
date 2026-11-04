import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge, Button, Select } from '../../../components/ui/kit';
import { Icon } from '../../../components/Icon';
import { useWorkspace } from './WorkspaceProvider';
import { PageHeader } from './shared';
const schema = z.string().trim().min(1).max(2000);
export default function PreviewChat({ docked = false, classId }: {
    docked?: boolean;
    classId?: string;
}) { const { data, access, refresh } = useWorkspace(); const key = `cqstudio.user.preview.draft.chat.${classId ?? 'shared'}`; const [body, setBody] = useState(() => localStorage.getItem(key)?.slice(0, 2000) ?? ''); const [tag, setTag] = useState(classId ?? ''); const [error, setError] = useState(''); const [sending, setSending] = useState(false); const [limit, setLimit] = useState(50); const [atBottom, setAtBottom] = useState(true); const log = useRef<HTMLDivElement>(null); const end = useRef<HTMLDivElement>(null); const messages = data.messages.filter(m => !classId || m.classId === classId); const recent = messages.slice(-limit); useEffect(() => { try {
    if (body)
        localStorage.setItem(key, body);
    else
        localStorage.removeItem(key);
}
catch {
    setError('Your draft cannot be saved locally. Keep this tab open.');
} }, [body, key]); useEffect(() => { if (atBottom)
    end.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length, atBottom]); async function send() { const value = schema.safeParse(body); if (!value.success) {
    setError('Write a message of 1–2,000 characters.');
    return;
} setSending(true); setError(''); try {
    await access.sendMessage(value.data, tag || undefined);
    setBody('');
    setAtBottom(true);
    await refresh();
}
catch {
    setError('Could not send. Your draft is kept.');
}
finally {
    setSending(false);
} } return <div className={`chat-screen feature-screen ${docked ? 'compact-chat' : ''}`}>{!docked && !classId && <PageHeader title="Group chat" description=""/>}<section className="chat-room"><header className="chat-room-header"><span><span className="online-indicator"/>Our study crew</span><Badge>{data.members.length} members</Badge></header><div className="chat-history" role="log" tabIndex={0} aria-label="Group messages" aria-live="polite" aria-relevant="additions" ref={log} onScroll={e => { const t = e.currentTarget; setAtBottom(t.scrollHeight - t.scrollTop - t.clientHeight < 60); if (t.scrollTop < 20 && limit < messages.length)
    setLimit(n => n + 50); }}>{limit < messages.length && <Button variant="quiet" onClick={() => setLimit(limit + 50)}>Load older</Button>}<div className="chat-day"><span>Today</span></div>{recent.map((m, i) => <article className={`study-message ${m.own ? 'own' : ''}`} key={m.id}>{i === recent.length - 1 && !m.own && <div className="unread-divider">New messages</div>}<Avatar index={m.avatar} size={32}/><div className="study-message-body"><header><strong>{m.own ? 'You' : m.author}</strong><time>{m.time}</time></header><p>{m.body}</p>{m.classId && <Badge>{data.classes.find(c => c.id === m.classId)?.name ?? 'Class'}</Badge>}</div></article>)}<div ref={end}/></div>{!atBottom && <Button variant="secondary" className="jump-latest" onClick={() => { setAtBottom(true); end.current?.scrollIntoView({ block: 'nearest' }); }}>Jump to latest ↓</Button>}<form className="chat-composer" onSubmit={e => { e.preventDefault(); void send(); }}><label htmlFor={`message-${classId ?? (docked ? 'dock' : 'page')}`}>Message</label><textarea id={`message-${classId ?? (docked ? 'dock' : 'page')}`} placeholder="Message the group…" value={body} maxLength={2000} rows={2} onChange={e => setBody(e.target.value)} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    void send();
} }}/><div className="composer-footer">{!classId && <Select label="Class tag" value={tag} onChange={e => setTag(e.target.value)}><option value="">Whole group</option>{data.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}<small>{body.length} / 2,000<em>Draft saved on device</em></small><Button disabled={!body.trim() || sending} loading={sending}><Icon name="arrow" size={17}/><span>Send</span></Button></div>{error && <p role="alert" className="danger-text">{error}</p>}</form></section></div>; }
