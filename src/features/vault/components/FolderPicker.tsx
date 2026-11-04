import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { db } from '../../../lib/supabase';
import { Icon } from '../../../components/Icon';
import { Message } from '../../../components/Feedback';
export default function FolderPicker({ value, onChange }: {
    value: string | null;
    onChange: (id: string | null) => void;
}) {
    const [page, setPage] = useState(0);
    const query = useQuery({ queryKey: ['folder-picker', value, page], queryFn: async () => {
            let request = db().from('folders').select('*').order('name').range(page * 25, page * 25 + 24);
            request = value ? request.eq('parent_id', value) : request.is('parent_id', null);
            const [folders, path] = await Promise.all([request, db().rpc('folder_path', { p_folder: value ?? '00000000-0000-0000-0000-000000000000' })]);
            if (folders.error || path.error)
                throw new Error('Could not load folders.');
            return { folders: folders.data, path: z.array(z.object({ id: z.string(), name: z.string() })).parse(path.data) };
        } });
    const choose = (id: string | null) => {
        setPage(0);
        onChange(id);
    };
    return <fieldset className="folder-picker"><legend>Destination folder</legend><nav aria-label="Choose destination"><button type="button" className="text-button" onClick={() => choose(null)}>Vault root</button>{query.data?.path.map(folder => <span key={folder.id}> / <button type="button" className="text-button" onClick={() => choose(folder.id)}>{folder.name}</button></span>)}</nav><p className="fine-print">The selected destination is {query.data?.path.at(-1)?.name ?? 'Vault root'}. Open a folder below to choose a different destination.</p>{query.isError ? <Message error>Could not load folders.</Message> : query.data?.folders.map(folder => <button type="button" className="folder-choice" key={folder.id} onClick={() => choose(folder.id)}><Icon name="folder" size={16}/>{folder.name}<Icon name="chevron" size={14}/></button>)}<div className="pagination"><button type="button" className="text-button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous folders</button><button type="button" className="text-button" disabled={(query.data?.folders.length ?? 0) < 25} onClick={() => setPage(page + 1)}>More folders</button></div></fieldset>;
}
