import { lazy, Suspense, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useProfile } from '../features/auth/hooks/useAuth';
import { queryClient } from '../lib/query';
import { db } from '../lib/supabase';
import { prefetchRoute } from '../lib/prefetch';
import { useNotificationEvents, useUnread } from '../features/notifications/hooks/useNotifications';
import WorkspaceLayout from './ui/WorkspaceLayout';
import { useClasses } from '../features/classes/hooks/useClasses';
import { Skeleton } from './Feedback';
const ChatRoom = lazy(() => import('../features/chat/components/ChatRoom'));
export default function AppShell() {
    useNotificationEvents();
    const unread = useUnread();
    const { data: profile } = useProfile();
    const classes = useClasses();
    const auth = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        const timer = setTimeout(() => prefetchRoute('/classes'), 1500);
        return () => clearTimeout(timer);
    }, []);
    useEffect(() => {
        if (!profile)
            return;
        const channel = db().channel(`membership:${profile.id}`).on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}`
        }, () => {
            void queryClient.invalidateQueries({ queryKey: ['profile'] });
        }).subscribe();
        return () => {
            void db().removeChannel(channel);
        };
    }, [profile?.id]);
    useEffect(() => {
        const channel = db().channel('shared-metadata');
        for (const table of ['classes', 'files', 'folders', 'workspace_settings'])
            channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
                for (const key of ['classes', 'class', 'vault', 'folder-picker', 'dashboard', 'policy'])
                    void queryClient.invalidateQueries({ queryKey: [key] });
            });
        channel.subscribe();
        return () => {
            void db().removeChannel(channel);
        };
    }, []);
    // Preserve the shell, but never carry editor/attempt/chat state into a
    // different class, lesson, quiz, or filtered retake on client navigation.
    return <WorkspaceLayout user={profile?.id ?? 'member'} name={profile?.display_name ?? 'Your profile'} avatar={profile?.avatar ?? 0} admin={profile?.role === 'admin'} classes={classes.data ?? []} unread={unread.data ?? 0} onSignOut={() => void auth.signOut().then(() => navigate('/login'))} chat={<Suspense fallback={<Skeleton />}><ChatRoom /></Suspense>}><Outlet key={location.pathname + location.search}/></WorkspaceLayout>;
}
