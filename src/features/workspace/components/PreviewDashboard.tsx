import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { Progress } from '../../../components/ui/kit';
import { useWorkspace } from './WorkspaceProvider';
import { PageHeader } from './shared';

export default function PreviewDashboard() {
    const { data } = useWorkspace();
    const lesson = data.lessons.find(item => item.status === 'In progress') ?? data.lessons[0];
    const subject = data.classes.find(item => item.id === lesson?.classId);
    const quiz = data.quizzes.find(item => item.status === 'Published');
    const latestMessage = data.messages.at(-1);
    return <div className="dashboard-screen minimal-dashboard">
        <PageHeader title="Home" />
        <div className="dashboard-bento">
            <section className="bento-card continue-card">
                <div className="card-topline"><h2>Continue studying</h2><Link to="/preview/progress">Progress</Link></div>
                <div className="study-summary"><h3>{lesson?.title ?? 'Choose a lesson'}</h3><p>{subject?.name} · {lesson?.minutes ?? 0} min read</p></div>
                <Progress value={64} label="Reading progress" />
                <Link className="button dashboard-primary" to={lesson ? `/preview/classes/${lesson.classId}?lesson=${lesson.id}` : '/preview/classes'}>Continue studying<Icon name="arrow" size={16}/></Link>
            </section>
            <section className="bento-card quiz-card">
                <div className="card-topline"><h2>Quiz</h2><Link to={`/preview/classes/${quiz?.classId ?? 'biology'}/quizzes`}>All quizzes</Link></div>
                <div className="study-summary"><h3>{quiz?.title ?? 'No published quizzes'}</h3><p>{quiz?.content.questions.length ?? 0} questions · Untimed</p></div>
                {quiz && <Link className="card-text-link" to={`/preview/quizzes/${quiz.id}`}>Preview quiz<Icon name="arrow" size={16}/></Link>}
            </section>
            <section className="bento-card files-card">
                <div className="card-topline"><h2>Recent files</h2><Link to="/preview/vault">All files</Link></div>
                <ul className="bento-list">{data.files.slice(0, 3).map(file => <li key={file.id}><Icon name="file" size={18}/><Link to={`/preview/vault?file=${file.id}`}>{file.name}<small>{file.uploader}</small></Link><span className="file-kind">{file.kind}</span></li>)}</ul>
            </section>
            <section className="bento-card updates-card">
                <div className="card-topline"><h2>Updates</h2><Link to="/preview/notifications">Notifications</Link></div>
                <ul className="update-list">{data.notifications.slice(0, 2).map(item => <li key={item.id}>{item.text}</li>)}</ul>
                {latestMessage && <Link className="latest-discussion" to="/preview/chat"><span>Group chat</span><p className="clamp-2">{latestMessage.author}: {latestMessage.body}</p></Link>}
            </section>
        </div>
    </div>;
}
