import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { Progress } from '../../../components/ui/kit';
import type { StudyClass } from '../api/model';
export function PageHeader({ title, description, action }: {
    title: string;
    description?: string;
    action?: ReactNode;
}) { return <header className="screen-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="heading-action">{action}</div>}</header>; }
export function ClassCard({ item, prefix = '/preview' }: {
    item: StudyClass;
    prefix?: string;
}) { return <article className="study-class-card"><div className="class-card-top"><span className={`class-icon ${item.color}`}><Icon name={item.icon} size={24}/></span></div><h2><Link to={`${prefix}/classes/${item.id}`}>{item.name}</Link></h2><small>{item.subject}</small><p className="clamp-2">{item.description}</p><div className="class-card-footer"><Progress value={item.progress} label="Progress"/><Link className="button button-secondary open-class" to={`${prefix}/classes/${item.id}`}>Open class<Icon name="arrow" size={17}/></Link></div></article>; }
export const bytes = (n: number) => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MiB` : `${Math.max(1, Math.round(n / 1024))} KiB`;
