import type { ReactNode } from 'react';
export interface Column<T> {
    key: string;
    label: string;
    render: (item: T) => ReactNode;
    secondary?: boolean;
}
export default function DataTable<T extends {
    id: string;
}>({ items, columns, caption }: {
    items: T[];
    columns: Column<T>[];
    caption: string;
}) { return <div className="ui-table"><table><caption className="sr-only">{caption}</caption><thead><tr>{columns.map(c => <th key={c.key} className={c.secondary ? 'secondary-column' : ''}>{c.label}</th>)}</tr></thead><tbody>{items.map(row => <tr key={row.id}>{columns.map(c => <td key={c.key} className={c.secondary ? 'secondary-column' : ''}>{c.render(row)}</td>)}</tr>)}</tbody></table></div>; }
