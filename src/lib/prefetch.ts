const loaders = {
    classes: () => import('../features/classes/components/ClassesPage'),
    vault: () => import('../features/vault/components/VaultPage'),
    progress: () => import('../features/progress/components/ProgressPage'),
    chat: () => import('../features/chat/components/ChatPage'),
    admin: () => import('../features/admin/components/AdminPage'),
};
const requested = new Set<string>();
export function prefetchRoute(path: string) {
    const key = path.split('/')[1] as keyof typeof loaders;
    if (!(key in loaders) || requested.has(key))
        return;
    requested.add(key);
    void loaders[key]().catch(() => requested.delete(key));
}
