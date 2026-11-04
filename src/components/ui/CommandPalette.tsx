import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Input } from './kit';
import { Icon } from '../Icon';
export interface CommandItem {
    label: string;
    detail: string;
    to?: string;
    action?: () => void;
}
export default function CommandPalette({ open, onClose, items }: {
    open: boolean;
    onClose: () => void;
    items: CommandItem[];
}) { const [query, setQuery] = useState(''); const [active, setActive] = useState(0); const navigate = useNavigate(); const list = useRef<HTMLDivElement>(null); useEffect(() => { if (open) {
    setQuery('');
    setActive(0);
} }, [open]); const found = items.filter(i => `${i.label} ${i.detail}`.toLowerCase().includes(query.toLowerCase())).slice(0, 30); function choose(item: CommandItem) { onClose(); if (item.to)
    void navigate(item.to); item.action?.(); } return <Dialog title="Search workspace" open={open} onClose={onClose}><div onKeyDown={e => { if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActive(n => Math.min(n + 1, found.length - 1));
} if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActive(n => Math.max(0, n - 1));
} if (e.key === 'Enter' && found[active]) {
    e.preventDefault();
    choose(found[active]!);
} }}><Input label="Search classes, lessons, quizzes, files, or actions" autoFocus value={query} onChange={e => { setQuery(e.target.value); setActive(0); }}/><div className="command-results" ref={list}>{found.map((i, n) => <button key={`${i.detail}-${i.label}`} className={`command-item ${n === active ? 'selected' : ''}`} onClick={() => choose(i)} onFocus={() => setActive(n)}><Icon name="search" size={18}/><span>{i.label}<small>{i.detail}</small></span><Icon name="arrow" size={16}/></button>)}{!found.length && <p>No matches. Try another word.</p>}</div></div></Dialog>; }
