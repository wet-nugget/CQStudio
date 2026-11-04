import { lazy, Suspense, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { adminAction } from '../api/admin';
import { quizContentSchema, quizSettingsSchema } from '../../quizzes/api/model';
import { Message, Skeleton } from '../../../components/Feedback';
import {Button,Drawer} from '../../../components/ui/kit';
const QuizPractice = lazy(() => import('../../quizzes/components/QuizPractice'));
const HtmlRunner = lazy(() => import('../../quizzes/components/HtmlRunner'));
export default function ReviewQueue() {
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const query = useQuery({ queryKey: ['reviews', page], staleTime: 0, queryFn: async () => {
            const { data, error } = await db().from('quiz_versions').select('*').eq('status', 'pending').order('created_at').range(page * 25, page * 25 + 24);
            if (error)
                throw error;
            return data;
        } });
    const version = query.data?.find(item => item.id === selected);
    async function review(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!version)
            return;
        setBusy(true);
        setError('');
        const form = new FormData(event.currentTarget);
        try {
            await adminAction({
                action: 'review_quiz', version_id: version.id, decision: form.get('decision'), note: form.get('note')
            });
            setSelected(null);
            await queryClient.invalidateQueries({ queryKey: ['reviews'] });
            await queryClient.invalidateQueries({ queryKey: ['quizzes'] });
            await queryClient.invalidateQueries({ queryKey: ['quiz'] });
        }
        catch {
            setError('Could not review this version. It may already have been reviewed.');
        }
        finally {
            setBusy(false);
        }
    }
    return <>{error && <Message error>{error}</Message>}<section className="panel"><h2>Quiz review queue</h2>{query.isPending ? <Skeleton /> : query.isError ? <Message error>Could not load submissions.</Message> : query.data.length ? query.data.map(item => <div className="list-row" key={item.id}><span>Version {item.version} · {item.kind}<small>Submitted {new Date(item.created_at).toLocaleDateString()}</small></span><button className="button-secondary" onClick={() => setSelected(item.id)}>Review</button></div>) : <p>All caught up. No quizzes are waiting for review.</p>}</section><Drawer title="Review quiz" open={Boolean(version)} onClose={()=>setSelected(null)} footer={<Button form="review-form" disabled={busy}>{busy?'Saving review…':'Save review'}</Button>}>{version && <><h2 className="section-space">Review version {version.version}</h2><Suspense fallback={<Skeleton />}>{version.kind === 'manual' ? <QuizPractice key={version.id} content={quizContentSchema.parse(version.content)} settings={quizSettingsSchema.parse(version.settings)}/> : <HtmlRunner key={version.id} versionId={version.id} fileId={version.html_file_id!} adminSource/>}</Suspense><section className="panel section-space"><form id="review-form" onSubmit={review}><label htmlFor="review-decision">Decision</label><select id="review-decision" name="decision"><option value="published">Publish</option><option value="rejected">Reject</option></select><label htmlFor="review-note">Note for the author</label><textarea id="review-note" name="note" maxLength={2000}/></form></section></>}</Drawer><div className="pagination"><button className="button-secondary" disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button className="button-secondary" disabled={(query.data?.length ?? 0) < 25} onClick={() => setPage(page + 1)}>Next</button></div></>;
}
