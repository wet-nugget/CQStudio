import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from './http.ts';
// Service copies give shared objects no member owner. Auth otherwise refuses to
// delete an uploader even when public.files.created_by uses ON DELETE SET NULL.
export function readyPath(file: {
    id: string;
    path: string;
}) {
    return `ready/${file.id}.${file.path.split('.').pop()}`;
}
export async function adoptUpload(service: SupabaseClient, file: {
    id: string;
    path: string;
}) {
    const path = readyPath(file);
    const bucket = service.storage.from('cq-vault');
    const { error } = await bucket.copy(file.path, path);
    if (error) {
        // A previous invocation may have copied the object before the DB commit.
        const { data, error: lookupError } = await bucket.info(path);
        if (lookupError || !data)
            throw new HttpError(409, 'Upload could not be prepared. Retry finalizing it.');
    }
    const { error: removalError } = await bucket.remove([file.path]);
    if (removalError)
        throw new HttpError(409, 'Upload cleanup did not complete. Retry finalizing it.');
    return path;
}
export async function removePendingUploads(service: SupabaseClient, userId: string) {
    // Membership is already disabled: new reservations/finalization are denied.
    while (true) {
        const { data, error } = await service.from('files').select('id,path').eq('created_by', userId).in('state', ['pending', 'deleting']).limit(100);
        if (error)
            throw new HttpError(502, 'Could not clean up pending uploads. An administrator can retry deletion.');
        if (!data?.length)
            return;
        const { error: removalError } = await service.storage.from('cq-vault').remove(data.flatMap(file => [file.path, readyPath(file)]));
        if (removalError)
            throw new HttpError(502, 'Could not remove pending uploads. An administrator can retry deletion.');
        const { error: rowError } = await service.from('files').delete().in('id', data.map(file => file.id)).in('state', ['pending', 'deleting']);
        if (rowError)
            throw new HttpError(502, 'Could not finish upload cleanup. An administrator can retry deletion.');
    }
}
