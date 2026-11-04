import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { db } from '../../../lib/supabase';
import { useProfile } from '../../auth/hooks/useAuth';
import { Icon } from '../../../components/Icon';
import { Message, Skeleton } from '../../../components/Feedback';
import { Progress } from '../../../components/ui/kit';
import { PageHeader } from '../../workspace/components/shared';
export default function DashboardPage() { const { data: profile } = useProfile(); const query = useQuery({ queryKey: ['dashboard', profile?.id], queryFn: async () => { const [classes, progress, files, chat, notifications, quizzes] = await Promise.all([db().from('classes').select('*').order('created_at', { ascending: false }).limit(4), db().from('lesson_progress').select('*').order('updated_at', { ascending: false }).limit(100), db().from('files').select('id,name,mime').eq('state', 'ready').eq('purpose','vault').order('created_at', { ascending: false }).limit(3), db().from('chat_messages').select('id,body,created_at').order('created_at', { ascending: false }).limit(2), db().from('notifications').select('*').order('created_at', { ascending: false }).limit(3), db().from('quizzes').select('id,title,class_id').not('published_version_id', 'is', null).order('created_at', { ascending: false }).limit(1)]); if ([classes, progress, files, chat, notifications, quizzes].some(r => r.error))
        throw Error('Overview unavailable.'); return { classes: classes.data ?? [], progress: progress.data ?? [], files: files.data ?? [], chat: chat.data ?? [], notifications: notifications.data ?? [], quizzes: quizzes.data ?? [] }; } }); if (query.isPending)
    return <Skeleton />; if (query.isError)
    return <Message error>Could not load your overview. <button className="text-button" onClick={() => void query.refetch()}>Try again</button></Message>; const data = query.data; const active = data.progress.find(p => p.status === 'in_progress'); const next = data.quizzes[0]; const done = data.progress.filter(p => p.status === 'complete').length; const percent = data.progress.length ? done / data.progress.length * 100 : 0; return <div className="dashboard-screen minimal-dashboard">
        <PageHeader title="Home" />
        <div className="dashboard-bento">
            <section className="bento-card continue-card">
                <div className="card-topline"><h2>Lessons</h2><Link to="/progress">Progress</Link></div>
                <div className="study-summary"><h3>{active?'Continue your lesson':'Choose a class'}</h3><p>{data.progress.filter(item=>item.status==='in_progress').length} lessons in progress</p></div>
                <Progress value={percent} label="Completed recent check-ins" />
                <Link className="button dashboard-primary" to={active?`/lessons/${active.lesson_id}`:'/classes'}>Continue studying<Icon name="arrow" size={16}/></Link>
            </section>
            <section className="bento-card quiz-card">
                <div className="card-topline"><h2>Quiz</h2><Link to="/classes">Classes</Link></div>
                <div className="study-summary"><h3>{next?.title??'No published quizzes'}</h3><p>{next?'Your results are private.':'Published quizzes will appear here.'}</p></div>
                {next&&<Link className="card-text-link" to={`/quizzes/${next.id}`}>Preview quiz<Icon name="arrow" size={16}/></Link>}
            </section>
            <section className="bento-card files-card">
                <div className="card-topline"><h2>Recent files</h2><Link to="/vault">All files</Link></div>
                <ul className="bento-list">{data.files.map(file=><li key={file.id}><Icon name="file" size={18}/><Link to="/vault">{file.name}</Link></li>)}</ul>
                {!data.files.length&&<p>No files uploaded.</p>}
                <Link className="card-text-link" to="/classes">View classes<Icon name="arrow" size={16}/></Link>
            </section>
            <section className="bento-card updates-card">
                <div className="card-topline"><h2>Updates</h2><Link to="/notifications">Notifications</Link></div>
                <ul className="update-list">{data.notifications.map(item=><li key={item.id}>{item.title}</li>)}</ul>
                {!data.notifications.length&&<p>No new notifications.</p>}
                <Link className="latest-discussion" to="/chat"><span>Group chat</span><p className="clamp-2">{data.chat[0]?.body??'No messages yet.'}</p></Link>
            </section>
        </div>
    </div>;
}
