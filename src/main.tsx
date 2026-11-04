import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query';
import { AuthProvider } from './features/auth/hooks/useAuth';
import { AccessGate } from './features/auth/components/AccessGate';
import { ErrorBoundary, Skeleton } from './components/Feedback';
import './styles.css';
const Login = lazy(() => import('./features/auth/components/LoginPage'));
const Invite = lazy(() => import('./features/auth/components/InvitePage'));
const Policy = lazy(() => import('./features/auth/components/PolicyPage'));
const Reset = lazy(() => import('./features/auth/components/ResetPage'));
const Mfa = lazy(() => import('./features/auth/components/MfaPage'));
const Profile = lazy(() => import('./features/auth/components/ProfilePage'));
const Legal = lazy(() => import('./features/legal/components/LegalPage'));
const Setup = lazy(() => import('./components/SetupPage'));
const Shell = lazy(() => import('./components/AppShell'));
const Dashboard = lazy(() => import('./features/progress/components/DashboardPage'));
const Admin = lazy(() => import('./features/admin/components/AdminPage'));
const Classes = lazy(() => import('./features/classes/components/ClassesPage'));
const ClassPage = lazy(() => import('./features/classes/components/ClassPage'));
const Lesson = lazy(() => import('./features/lessons/components/LessonPage'));
const LessonEditor = lazy(() => import('./features/lessons/components/LessonEditor'));
const Vault = lazy(() => import('./features/vault/components/VaultPage'));
const Quiz = lazy(() => import('./features/quizzes/components/QuizPage'));
const QuizBuilder = lazy(() => import('./features/quizzes/components/QuizBuilderPage'));
const Progress = lazy(() => import('./features/progress/components/ProgressPage'));
const Chat = lazy(() => import('./features/chat/components/ChatPage'));
const Notifications = lazy(() => import('./features/notifications/components/NotificationsPage'));
const Search = lazy(() => import('./components/SearchPage'));
const NotFound = lazy(() => import('./components/NotFoundPage'));
const PreviewLayout=lazy(()=>import('./features/workspace/components/PreviewLayout'));
const PreviewDashboard=lazy(()=>import('./features/workspace/components/PreviewDashboard'));
const PreviewClasses=lazy(()=>import('./features/workspace/components/PreviewClasses'));
const PreviewClass=lazy(()=>import('./features/workspace/components/PreviewClass'));
const PreviewVault=lazy(()=>import('./features/workspace/components/PreviewVault'));
const PreviewQuiz=lazy(()=>import('./features/workspace/components/PreviewQuiz'));
const PreviewChat=lazy(()=>import('./features/workspace/components/PreviewChat'));
const PreviewAdmin=lazy(()=>import('./features/workspace/components/PreviewAdmin'));
const PreviewSettings=lazy(()=>import('./features/workspace/components/PreviewSettings'));
const PreviewUpdates=lazy(()=>import('./features/workspace/components/PreviewUpdates'));
const Design=lazy(()=>import('./components/DesignPage'));
function Router() {
    const location = useLocation();
    return <ErrorBoundary resetKey={location.pathname}><Suspense fallback={<Skeleton />}><Routes>
    <Route path="/design" element={<Design/>}/>
    <Route path="/preview" element={<PreviewLayout/>}><Route index element={<PreviewDashboard/>}/><Route path="classes" element={<PreviewClasses/>}/><Route path="classes/:classId" element={<PreviewClass/>}/><Route path="classes/:classId/:tab" element={<PreviewClass/>}/><Route path="vault" element={<PreviewVault/>}/><Route path="quizzes/:quizId" element={<PreviewQuiz/>}/><Route path="chat" element={<PreviewChat/>}/><Route path="admin" element={<PreviewAdmin/>}/><Route path="settings/:tab" element={<PreviewSettings/>}/><Route path="progress" element={<PreviewUpdates/>}/><Route path="notifications" element={<PreviewUpdates/>}/></Route>
    <Route path="/login" element={<Login />}/><Route path="/accept-invite" element={<Invite />}/><Route path="/accept-policy" element={<Policy />}/><Route path="/reset-password" element={<Reset />}/><Route path="/mfa" element={<Mfa />}/><Route path="/setup" element={<Setup />}/>
    <Route path="/privacy" element={<Legal />}/><Route path="/terms" element={<Legal />}/><Route path="/storage" element={<Legal />}/>
    <Route element={<AccessGate />}><Route element={<Shell />}><Route index element={<Dashboard />}/><Route path="/profile" element={<Profile />}/><Route path="/settings/:tab" element={<Profile/>}/><Route path="/admin" element={<Admin />}/><Route path="/classes" element={<Classes />}/><Route path="/classes/:classId" element={<ClassPage />}/><Route path="/classes/:classId/:tab" element={<ClassPage />}/><Route path="/classes/:classId/lessons/new" element={<LessonEditor />}/><Route path="/lessons/:lessonId" element={<Lesson />}/><Route path="/lessons/:lessonId/edit" element={<LessonEditor />}/></Route></Route>
    <Route element={<AccessGate />}><Route element={<Shell />}><Route path="/vault" element={<Vault />}/><Route path="/vault/folders/:folderId" element={<Vault />}/><Route path="/vault/saved" element={<Vault />}/></Route></Route>
    <Route element={<AccessGate />}><Route element={<Shell />}><Route path="/quizzes/new" element={<QuizBuilder />}/><Route path="/quizzes/:quizId" element={<Quiz />}/><Route path="/quizzes/:quizId/edit" element={<QuizBuilder />}/><Route path="/quizzes/:quizId/take/:versionId" element={<Quiz />}/><Route path="/attempts/:attemptId" element={<Quiz />}/></Route></Route>
    <Route element={<AccessGate />}><Route element={<Shell />}><Route path="/progress" element={<Progress />}/><Route path="/chat" element={<Chat />}/><Route path="/notifications" element={<Notifications />}/></Route></Route>
    <Route element={<AccessGate />}><Route element={<Shell />}><Route path="/search" element={<Search />}/></Route></Route>
    <Route path="*" element={<NotFound />}/>
  </Routes></Suspense></ErrorBoundary>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><QueryClientProvider client={queryClient}><AuthProvider><BrowserRouter><Router /></BrowserRouter></AuthProvider></QueryClientProvider></ErrorBoundary></StrictMode>);
