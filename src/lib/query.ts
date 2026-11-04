import { QueryClient } from '@tanstack/react-query';
export const freshness = {
    lists: 60000, content: 600000, realtime: 0, admin: 30000
} as const;
export const queryClient = new QueryClient({
    defaultOptions: { queries: {
            staleTime: freshness.lists, refetchOnWindowFocus: false,
            retry: (count, error) => count < 2 && !('status' in error && [401, 403].includes(Number(error.status))),
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        }, mutations: { retry: false } },
});
