import { z } from 'zod';
import { db } from '../../../lib/supabase';
export const uploadSchema = z.strictObject({
    name: z.string().min(1).max(200).regex(/^[^/\\\x00-\x1f\x7f]+$/), size: z.number().int().positive().max(52428800), mime: z.string().min(1).max(150), description: z.string().max(2000)
});
export const folderSchema = z.strictObject({ name: z.string().trim().min(1).max(120).regex(/^[^/\\\x00-\x1f\x7f]+$/) });
const mimes: Record<string, string> = {
    pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', zip: 'application/zip', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', html: 'text/html'
};
export function fileMime(file: File) {
    return mimes[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? file.type;
}
export async function uploadFile(file: File, description: string, folder: string | null, purpose: 'vault' | 'html_quiz', onProgress: (percent: number) => void) {
    const value = uploadSchema.parse({
        name: file.name, size: file.size, mime: fileMime(file), description
    });
    const { data: settings, error: settingsError } = await db().from('workspace_settings').select('limits').single();
    if (settingsError)
        throw new Error('Could not check the current upload limits.');
    const limits = z.record(z.string(), z.number()).parse(settings.limits);
    const maximum = limits[purpose === 'html_quiz' ? 'html_bytes' : 'file_bytes']!;
    if (file.size > maximum)
        throw new Error(`Choose a file up to ${(maximum / 1048576).toFixed(1)} MiB.`);
    const { data: reserved, error } = await db().rpc('request_upload', {
        p_name: value.name, p_size: value.size, p_mime: value.mime, p_folder: folder, p_purpose: purpose, p_description: description
    });
    if (error)
        throw new Error('Upload unavailable. Check the file type, size, folder, and storage limits.');
    const { data: { session } } = await db().auth.getSession();
    if (!session)
        throw new Error('Sign in again.');
    await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/cq-vault/${reserved.path}`);
        request.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        request.setRequestHeader('apikey', String(import.meta.env.VITE_SUPABASE_ANON_KEY));
        request.setRequestHeader('Content-Type', value.mime);
        request.setRequestHeader('Cache-Control', 'max-age=3600');
        request.setRequestHeader('x-upsert', 'false');
        request.upload.onprogress = event => {
            if (event.lengthComputable)
                onProgress(Math.round(event.loaded / event.total * 95));
        };
        request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error('Upload failed. The reservation will be cleaned up automatically.'));
        request.onerror = () => reject(new Error('Connection lost during upload. Retry after reconnecting.'));
        request.timeout = 120000;
        request.ontimeout = () => reject(new Error('Upload timed out. Reconnect and retry; the unused reservation will be cleaned up.'));
        request.onabort = () => reject(new Error('Upload cancelled. The unused reservation will be cleaned up.'));
        request.send(file);
    });
    const { data, error: failure } = await db().functions.invoke('vault', { body: { action: 'finalize', file_id: reserved.id } });
    if (failure)
        throw new Error('The upload could not be finalized.');
    const result = z.object({ ok: z.boolean(), path: z.string().optional(), issues: z.array(z.object({ line: z.number(), message: z.string() })).optional() }).parse(data);
    if (!result.ok)
        throw new Error(result.issues?.map(issue => `Line ${issue.line}: ${issue.message}`).join('\n') ?? 'HTML validation failed.');
    if (!result.path)
        throw new Error('The upload could not be finalized.');
    onProgress(100);
    return { ...reserved, path: result.path };
}
export async function downloadUrl(fileId: string) {
    const { data, error } = await db().functions.invoke('vault', { body: { action: 'download', file_id: fileId } });
    if (error)
        throw new Error('Could not prepare this download.');
    return z.strictObject({ url: z.url(), expires_in: z.number() }).parse(data).url;
}
