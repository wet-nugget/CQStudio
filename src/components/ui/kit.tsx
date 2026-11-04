import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Icon } from '../Icon';
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
    loading?: boolean;
}>(function Button({ variant = 'primary', loading, children, className = '', ...props }, ref) {
    return <button ref={ref} className={`ui-button ${variant} ${className}`} aria-busy={loading || undefined} {...props} disabled={props.disabled || loading}>{loading ? 'Working…' : children}</button>;
});
export function IconButton({ label, icon, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    icon: string;
}) { return <button type="button" {...props} className={`icon-button ${props.className ?? ''}`} aria-label={label} title={label}><Icon name={icon}/></button>; }
export function Input({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
}) { const id = useId(); return <div className="ui-field"><label htmlFor={id}>{label}</label><input {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}/>{error && <small id={`${id}-error`} className="danger-text">{error}</small>}</div>; }
export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & {
    label: string;
}) { const id = useId(); return <div className="ui-field"><label htmlFor={id}>{label}</label><select {...props} id={id}>{children}</select></div>; }
export function Combobox({ label, options, onSelect }: {
    label: string;
    options: string[];
    onSelect: (s: string) => void;
}) { const id = useId(); return <div className="ui-field"><label htmlFor={id}>{label}</label><input id={id} list={`${id}-list`} onChange={e => onSelect(e.target.value)}/><datalist id={`${id}-list`}>{options.map(s => <option key={s}>{s}</option>)}</datalist></div>; }
export function Badge({ children, tone = 'quiet' }: {
    children: ReactNode;
    tone?: 'quiet' | 'success' | 'warning' | 'danger';
}) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Tabs({ items, value, onChange, label = 'Sections' }: {
    items: readonly string[];
    value: string;
    onChange: (s: string) => void;
    label?: string;
}) { return <nav className="segmented-tabs" aria-label={label}>{items.map(item => <button type="button" key={item} aria-current={value === item ? 'page' : undefined} className={value === item ? 'active' : ''} onClick={() => onChange(item)}>{item}</button>)}</nav>; }
export const SegmentedTabs = Tabs;
export function Progress({ value, label }: {
    value: number;
    label: string;
}) { return <div className="ui-progress"><div><span>{label}</span><strong>{Math.round(value)}%</strong></div><progress max={100} value={value} aria-label={label}/></div>; }
export function Ring({ value, label }: {
    value: number;
    label: string;
}) { return <div className="progress-ring"><svg viewBox="0 0 100 100" width="104" height="104" role="img" aria-label={`${label}: ${Math.round(value)}%`}><circle cx="50" cy="50" r="41" fill="none" stroke="var(--border)" strokeWidth="7"/><circle cx="50" cy="50" r="41" fill="none" stroke="var(--primary-text)" strokeWidth="7" strokeDasharray={`${Math.max(0, Math.min(100, value)) * 2.576} 258`} transform="rotate(-90 50 50)" strokeLinecap="round"/></svg><strong aria-hidden="true">{Math.round(value)}<small>%</small></strong></div>; }
export function Skeleton({ label = 'Loading', lines = 3 }: {
    label?: string;
    lines?: number;
}) { return <div className="ui-skeleton" role="status" aria-label={label}>{Array.from({ length: lines }, (_, i) => <div className="skeleton" key={i}/>)}<span className="sr-only">{label}</span></div>; }
export function EmptyState({ title, hint, action }: {
    title: string;
    hint: string;
    action?: ReactNode;
}) { return <div className="ui-empty"><h2>{title}</h2><p>{hint}</p>{action}</div>; }
export function ResponsiveDialog({ open, onClose, title, children, footer, kind = 'dialog' }: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    kind?: 'dialog' | 'drawer' | 'full';
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const heading = useId();
    useEffect(() => { const d = ref.current; if (open && !d?.open)
        d?.showModal();
    else if (!open && d?.open)
        d.close(); }, [open]);
    return <dialog ref={ref} className={`responsive-dialog ${kind}`} aria-labelledby={heading} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current)
        onClose(); }}><div className="dialog-body"><div className="sheet-handle" aria-hidden="true"/><header><h2 id={heading}>{title}</h2><IconButton icon="close" label="Close" onClick={onClose}/></header><div className="dialog-content">{open && children}</div>{footer && <footer>{footer}</footer>}</div></dialog>;
}
export function Drawer(props: Omit<Parameters<typeof ResponsiveDialog>[0], 'kind'>) { return <ResponsiveDialog {...props} kind="drawer"/>; }
export const Dialog = ResponsiveDialog;
export function Menu({ label, children }: {
    label: string;
    children: ReactNode;
}) { const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null); useEffect(() => { if (!open)
    return; const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node))
    setOpen(false); }; const key = (e: KeyboardEvent) => { if (e.key === 'Escape') {
    setOpen(false);
    ref.current?.querySelector('button')?.focus();
} }; document.addEventListener('pointerdown', close); document.addEventListener('keydown', key); return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key); }; }, [open]); return <div className="ui-menu" ref={ref}><button className="button-secondary" aria-expanded={open} onClick={() => setOpen(!open)}>{label}<Icon name="chevron" size={14}/></button>{open && <div className="menu-popover" onClick={() => setOpen(false)}>{children}</div>}</div>; }
export function Tooltip({ label, children }: {
    label: string;
    children: ReactNode;
}) { return <span className="ui-tooltip" tabIndex={0}>{children}<span role="tooltip">{label}</span></span>; }
export function Toast({ message, onDismiss }: {
    message: string;
    onDismiss: () => void;
}) { useEffect(() => { if (!message)
    return; const t = setTimeout(onDismiss, 5000); return () => clearTimeout(t); }, [message, onDismiss]); return <div className="toast-region" role="status" aria-live="polite">{message && <div className="toast"><Icon name="check"/><span>{message}</span><IconButton icon="close" label="Dismiss notification" onClick={onDismiss}/></div>}</div>; }
export function CardList<T>({ items, render }: {
    items: T[];
    render: (item: T, index: number) => ReactNode;
}) { return <div className="responsive-card-list">{items.map(render)}</div>; }
