import { lazy, Suspense, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useClasses } from '../hooks/useClasses';
import { EmptyState, Message, Skeleton } from '../../../components/Feedback';
import { Icon } from '../../../components/Icon';
import { Drawer } from '../../../components/ui/kit';
const ClassForm = lazy(() => import('./ClassForm'));
export default function ClassesPage() {
    const query = useClasses();
    const [params]=useSearchParams();
    const [create, setCreate] = useState(params.has('new'));
    return <><div className="page-heading"><div><h1>Your classes</h1><p></p></div><button onClick={() => setCreate(!create)}><Icon name="plus" size={16}/>New class</button></div><Drawer title="Create a class" open={create} onClose={()=>setCreate(false)}><Suspense fallback={<Skeleton />}><ClassForm onDone={() => setCreate(false)}/></Suspense></Drawer>{query.isPending ? <Skeleton /> : query.isError ? <Message error>Could not load classes. <button className="text-button" onClick={() => void query.refetch()}>Retry</button></Message> : query.data.length ? <div className="card-grid section-space">{query.data.map((item, index) => <Link key={item.id} to={`/classes/${item.id}`} className="panel class-card"><span className={`class-icon ${['violet','teal','amber','green','rose','blue','orange','slate'][index%8]}`}><Icon name={item.icon} size={25}/></span><h2>{item.name}</h2><p>{item.teacher_subject || 'Shared learning'}</p><p>{item.description}</p><span className="card-link">Open class<Icon name="arrow" size={16}/></span></Link>)}</div> : <EmptyState title="No classes yet."><p>Create a class to add lessons, notes, quizzes, and files.</p></EmptyState>}</>;
}
