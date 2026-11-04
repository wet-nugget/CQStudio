import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Icon } from '../../../components/Icon';
import { Button, Drawer, Input, Select, EmptyState } from '../../../components/ui/kit';
import { useWorkspace } from './WorkspaceProvider';
import { ClassCard, PageHeader } from './shared';
import { plural } from '../../../lib/plural';
const schema = z.strictObject({ name: z.string().trim().min(1).max(120), subject: z.string().max(120), description: z.string().max(2000), icon: z.string(), color: z.string() });
export default function PreviewClasses() { const { data, access, refresh, notify } = useWorkspace(); const [params, setParams] = useSearchParams(); const [open, setOpen] = useState(params.has('new')); const [search, setSearch] = useState(''); const [error, setError] = useState(''); const [step, setStep] = useState(1); const [name, setName] = useState(''); const [subject, setSubject] = useState(''); const [description, setDescription] = useState(''); const [color, setColor] = useState('violet'); const close = () => { setOpen(false); setParams({}); }; async function save() { const parsed = schema.safeParse({ name, subject, description, color, icon: 'book' }); if (!parsed.success) {
    setError('Add a class name (up to 120 characters).');
    return;
} try {
    await access.createClass(parsed.data);
    await refresh();
    notify('Class created.');
    close();
    setName('');
    setStep(1);
}
catch (e) {
    setError(e instanceof Error ? e.message : 'Could not create class.');
} } const items = data.classes.filter(c => `${c.name} ${c.subject}`.toLowerCase().includes(search.toLowerCase())); return <div className="feature-screen"><PageHeader title="Your classes" description={`${plural(data.classes.length, 'class', 'classes')}`} action={<Button onClick={() => setOpen(true)}><Icon name="plus" size={17}/>New class</Button>}/><div className="screen-toolbar"><div className="search-field"><Icon name="search" size={18}/><input aria-label="Search classes" placeholder="Find a class…" value={search} onChange={e => setSearch(e.target.value)}/></div></div><div className="pane-scroll"><div className="study-class-grid">{items.map(item => <ClassCard key={item.id} item={item}/>)}</div>{!items.length && <EmptyState title="No classes found" hint="Try a different search or create a class." action={<Button onClick={() => setOpen(true)}>New class</Button>}/>}</div><Drawer title="Create a class" open={open} onClose={close} footer={<><Button variant="quiet" onClick={close}>Cancel</Button><Button onClick={() => step === 1 ? (name.trim() ? (setError(''), setStep(2)) : setError('Add a class name.')) : void save()}>{step === 1 ? 'Next: details' : 'Create class'}</Button></>}><p className="eyebrow">STEP {step} OF 2 · {step === 1 ? 'BASICS' : 'DETAILS'}</p><progress max={2} value={step} aria-label="Form progress"/>{step === 1 ? <><Input label="Class name" value={name} onChange={e => setName(e.target.value)} maxLength={120} error={error}/><Input label="Teacher / subject" value={subject} onChange={e => setSubject(e.target.value)} maxLength={120}/></> : <><label htmlFor="class-description">Description</label><textarea id="class-description" value={description} onChange={e => setDescription(e.target.value)} maxLength={2000}/><Select label="Class color" value={color} onChange={e => setColor(e.target.value)}>{['violet', 'teal', 'amber', 'green', 'rose', 'blue', 'orange', 'slate'].map(c => <option key={c}>{c}</option>)}</Select><button className="text-button" onClick={() => setStep(1)}>Back to basics</button>{error && <p role="alert">{error}</p>}</>}</Drawer></div>; }
