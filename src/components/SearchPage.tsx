import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from '../lib/supabase';
import { EmptyState, Message, Skeleton } from './Feedback';
const resultSchema = z.array(z.strictObject({
    title: z.string(), kind: z.string(), url: z.string().startsWith('/'), updated: z.string()
}));
export default function SearchPage() {
    const [input, setInput] = useState('');
    const [term, setTerm] = useState('');
    const [page, setPage] = useState(0);
    useEffect(() => {
        const timer = setTimeout(() => {
            setTerm(input.trim());
            setPage(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [input]);
    const query = useQuery({ queryKey: ['search', term, page], enabled: term.length >= 2 && term.length <= 100, queryFn: async () => {
            const { data, error } = await db().rpc('global_search', { p_term: term, p_page: page });
            if (error)
                throw error;
            return resultSchema.parse(data);
        } });
    return <><div className="page-heading"><div><h1>Search</h1><p>Search words in lessons, notes, quizzes, and ready shared files.</p></div></div><label className="sr-only" htmlFor="global-search">Search the workspace</label><input id="global-search" type="search" value={input} onChange={event => setInput(event.target.value)} maxLength={100} placeholder="Search lessons, notes, quizzes, and files" autoFocus/>{term.length < 2 ? <EmptyState title="Search the workspace"><p>Enter at least two characters to search your group’s shared content.</p></EmptyState> : query.isPending ? <Skeleton /> : query.isError ? <Message error>Could not search right now.</Message> : query.data?.length ? <section className="panel section-space">{query.data.map((item, index) => <Link className="list-row search-result" to={item.url} key={index}><span><strong>{item.title}</strong><small>{item.kind}</small></span><span aria-hidden="true">→</span></Link>)}</section> : <EmptyState title="No results found."><p>Try another word or check a class directly.</p></EmptyState>}<div className="pagination"><button className="button-secondary" disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button className="button-secondary" disabled={(query.data?.length ?? 0) < 25} onClick={() => setPage(page + 1)}>Next</button></div></>;
}
