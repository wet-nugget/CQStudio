import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createMockAccess } from '../api/mock';
import type { WorkspaceAccess, WorkspaceSnapshot } from '../api/model';
import { Skeleton } from '../../../components/ui/kit';
interface WorkspaceContextValue {
    data: WorkspaceSnapshot;
    access: WorkspaceAccess;
    refresh: () => Promise<void>;
    notify: (s: string) => void;
    message: string;
    dismiss: () => void;
}
const Context = createContext<WorkspaceContextValue | null>(null);
export function WorkspaceProvider({ children }: {
    children: ReactNode;
}) { const access = useMemo(createMockAccess, []); const [data, setData] = useState<WorkspaceSnapshot>(); const [message, notify] = useState(''); const refresh = async () => setData(await access.read()); useEffect(() => { void refresh(); }, [access]); return data ? <Context.Provider value={{ data, access, refresh, notify, message, dismiss: () => notify('') }}>{children}</Context.Provider> : <Skeleton />; }
export function useWorkspace() { const c = useContext(Context); if (!c)
    throw Error('Workspace data provider is unavailable.'); return c; }
