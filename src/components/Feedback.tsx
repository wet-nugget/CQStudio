import { Component, type ErrorInfo, type ReactNode } from 'react';
export function Skeleton() {
    return <div className="skeleton-page" role="status" aria-label="Loading page"><div className="skeleton skeleton-title"/><div className="skeleton skeleton-banner"/><div className="card-grid">{[0, 1, 2].map((key) => <div key={key} className="skeleton skeleton-card"/>)}</div><span className="sr-only">Loading…</span></div>;
}
export function EmptyState({ title, children }: {
    title: string;
    children?: ReactNode;
}) {
    return <div className="empty-state"><h2>{title}</h2>{children}</div>;
}
export function Message({ children, error = false }: {
    children: ReactNode;
    error?: boolean;
}) {
    return <p className={`message ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{children}</p>;
}
export class ErrorBoundary extends Component<{
    children: ReactNode;
    resetKey?:string;
}, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidCatch(_error: Error, _info: ErrorInfo) { }
    componentDidUpdate(previous:Readonly<{children:ReactNode;resetKey?:string}>){if(previous.resetKey!==this.props.resetKey&&this.state.failed)this.setState({failed:false});}
    render() {
        // The outer boundary also handles failures before BrowserRouter mounts.
        return this.state.failed ? <main className="error-page"><h1>Could not load this page.</h1><p>Reload the page or return to your workspace.</p><button onClick={() => location.reload()}>Reload page</button><a href="/">Go home</a></main> : this.props.children;
    }
}
