import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import WorkspaceLayout from '../../../components/ui/WorkspaceLayout';
import { Toast, Skeleton } from '../../../components/ui/kit';
import { WorkspaceProvider, useWorkspace } from './WorkspaceProvider';
const Chat = lazy(() => import('./PreviewChat'));
function Layout() { const { data, message, dismiss } = useWorkspace(); return <WorkspaceLayout user="preview" name="Alex Rivera" avatar={0} admin preview classes={data.classes} unread={data.notifications.filter(n => !n.read).length} commands={[...data.lessons.map(l => ({ label: l.title, detail: 'Lesson', to: `/preview/classes/${l.classId}?lesson=${l.id}` })), ...data.quizzes.map(q => ({ label: q.title, detail: 'Quiz', to: `/preview/quizzes/${q.id}` })), ...data.files.map(f => ({ label: f.name, detail: 'File', to: `/preview/vault?file=${f.id}` }))]} chat={<Suspense fallback={<Skeleton />}><Chat docked/></Suspense>}><Outlet /><Toast message={message} onDismiss={dismiss}/></WorkspaceLayout>; }
export default function PreviewLayout() { return <WorkspaceProvider><Layout /></WorkspaceProvider>; }
