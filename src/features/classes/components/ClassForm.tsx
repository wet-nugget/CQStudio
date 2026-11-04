import { lazy, Suspense, useState, type FormEvent } from 'react';
import type { Row } from '../../../lib/database.types';
import { useAuth } from '../../auth/hooks/useAuth';
import { saveClass } from '../api/classes';
import { queryClient } from '../../../lib/query';
import { Message } from '../../../components/Feedback';
const FolderPicker = lazy(() => import('../../vault/components/FolderPicker'));
export default function ClassForm({ existing, onDone }: {
    existing?: Row<'classes'>;
    onDone: () => void;
}) {
    const { session } = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [folder, setFolder] = useState<string | null>(existing?.folder_id ?? null);
    const [choosingFolder, setChoosingFolder] = useState(false);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!session)
            return;
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError('');
        try {
            await saveClass({ ...Object.fromEntries(form), folder_id: folder }, session.user.id, existing?.id);
            await queryClient.invalidateQueries({ queryKey: ['classes'] });
            await queryClient.invalidateQueries({ queryKey: ['class'] });
            await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            onDone();
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Check the fields and try again.');
        }
        finally {
            setBusy(false);
        }
    }
    return <section className="panel section-space"><h2>{existing ? 'Edit class' : 'New class'}</h2><form onSubmit={submit}><label htmlFor="class-name">Class name</label><input id="class-name" name="name" defaultValue={existing?.name} required maxLength={100}/><label htmlFor="class-subject">Teacher / subject</label><input id="class-subject" name="teacher_subject" defaultValue={existing?.teacher_subject} maxLength={120}/><label htmlFor="class-description">Description</label><textarea id="class-description" name="description" defaultValue={existing?.description} maxLength={10000}/><label htmlFor="class-icon">Icon</label><select id="class-icon" name="icon" defaultValue={existing?.icon ?? 'book'}>{['book', 'flask', 'globe', 'code', 'leaf', 'calculator', 'palette', 'language'].map(icon => <option key={icon}>{icon}</option>)}</select><div className="section-space"><button type="button" className="button-secondary" onClick={() => setChoosingFolder(!choosingFolder)}>{folder ? 'Change linked vault folder' : 'Link a vault folder'}</button>{folder && <button type="button" className="text-button" onClick={() => {
        setFolder(null);
        setChoosingFolder(false);
    }}>Unlink folder</button>}{choosingFolder && <Suspense fallback={<p>Loading folders…</p>}><FolderPicker value={folder} onChange={setFolder}/></Suspense>}<p className="fine-print">Choose a folder to show in this class’s Files tab. Vault root means no linked folder.</p></div>{error && <Message error>{error}</Message>}<div className="action-row"><button disabled={busy}>{busy ? 'Saving…' : 'Save class'}</button><button type="button" className="button-secondary" onClick={onDone}>Cancel</button></div></form></section>;
}
