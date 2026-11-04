import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/supabase';
import { EmptyState, Message, Skeleton } from '../../../components/Feedback';
export default function ClassQuizzes({ classId }: {
    classId: string;
}) {
    const query = useQuery({ queryKey: ['quizzes', classId], queryFn: async () => {
            const { data, error } = await db().from('quizzes').select('*').eq('class_id', classId).order('created_at', { ascending: false }).limit(100);
            if (error)
                throw error;
            return data;
        } });
    return <><div className="section-heading"><h2>A little practice goes a long way.</h2><Link className="button" to={`/quizzes/new?class=${classId}`}>Create a quiz</Link></div>{query.isPending ? <Skeleton /> : query.isError ? <Message error>Could not load quizzes.</Message> : query.data.length ? <div className="card-grid">{query.data.map(quiz => <Link className="panel class-card" to={`/quizzes/${quiz.id}`} key={quiz.id}><span className="pill">{quiz.published_version_id ? 'Published' : 'Your draft'}</span><h3>{quiz.title}</h3><span className="card-link">Open quiz →</span></Link>)}</div> : <EmptyState title="Make space for a little practice."><p>Create a quiz manually, import Markdown, or upload isolated HTML.</p></EmptyState>}</>;
}
