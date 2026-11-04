import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { EmptyState, Message, Skeleton } from '../../../components/Feedback';
export default function NotificationsPage() {
    const [page, setPage] = useState(0);
    const [error, setError] = useState('');
    const query = useQuery({ queryKey: ['notifications', page], staleTime: 0, queryFn: async () => {
            const { data, error } = await db().from('notifications').select('*').order('created_at', { ascending: false }).range(page * 25, page * 25 + 24);
            if (error)
                throw error;
            return data;
        } });
    async function read(id?: string) {
        let request = db().from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
        if (id)
            request = request.eq('id', id);
        const { error: failure } = await request;
        if (failure)
            setError('Could not mark notifications read.');
        else {
            await queryClient.invalidateQueries({ queryKey: ['notifications'] });
            await queryClient.invalidateQueries({ queryKey: ['unread'] });
        }
    }
    return <><div className="page-heading"><div><h1>Notifications</h1><p>Invitations, quiz reviews, and changes around your workspace.</p></div><button className="button-secondary" onClick={() => void read()}>Mark all read</button></div>{error && <Message error>{error}</Message>}{query.isPending ? <Skeleton /> : query.isError ? <Message error>Could not load notifications.</Message> : query.data.length ? <section className="panel">{query.data.map(item => <article className="list-row" key={item.id}><span><strong>{item.title}</strong><small>{new Date(item.created_at).toLocaleString()}</small></span>{!item.read_at ? <button className="text-button" onClick={() => void read(item.id)}>Mark read</button> : <span className="fine-print">Read</span>}</article>)}</section> : <EmptyState title="All quiet for now."><p>New updates will appear here.</p></EmptyState>}<div className="pagination"><button className="button-secondary" disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button className="button-secondary" disabled={(query.data?.length ?? 0) < 25} onClick={() => setPage(page + 1)}>Next</button></div></>;
}
