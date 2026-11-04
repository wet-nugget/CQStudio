import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../../lib/supabase';
import { queryClient } from '../../../lib/query';
import { useAuth } from '../../auth/hooks/useAuth';
import { removeHtmlVersion } from '../../quizzes/api/html-cache';
export function useUnread() {
    const { session } = useAuth();
    return useQuery({
        queryKey: ['unread', session?.user.id], enabled: Boolean(session), staleTime: 0, queryFn: async () => {
            const { count, error } = await db().from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
            if (error)
                throw error;
            return count ?? 0;
        }
    });
}
export function useNotificationEvents() {
    const { session } = useAuth();
    useEffect(() => {
        if (!session)
            return;
        const channel = db().channel(`notifications:${session.user.id}`).on('postgres_changes', {
            event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}`
        }, event => {
            void queryClient.invalidateQueries({ queryKey: ['notifications'] });
            void queryClient.invalidateQueries({ queryKey: ['unread'] });
            void queryClient.invalidateQueries({ queryKey: ['quiz'] });
            void queryClient.invalidateQueries({ queryKey: ['quizzes'] });
            const row = event.new as {
                kind?: string;
                entity_id?: string;
            };
            if (row.kind?.startsWith('quiz_') && row.entity_id)
                void removeHtmlVersion(row.entity_id);
        }).subscribe();
        return () => {
            void db().removeChannel(channel);
        };
    }, [session?.user.id]);
}
