import { z } from 'zod';
import { authenticate, HttpError, jsonInput, serve, serviceClient } from '../_shared/http.ts';
import { validateHtml } from '../_shared/html.ts';
import { adoptUpload, readyPath } from '../_shared/storage.ts';
serve(async (request) => {
    const { user, client } = await authenticate(request);
    const input = z.strictObject({ action: z.enum(['finalize', 'download']), file_id: z.uuid() }).parse(await jsonInput(request));
    const service = serviceClient();
    const { data: file, error } = await client.from('files').select('*').eq('id', input.file_id).single();
    if (error || !file)
        throw new HttpError(404, 'File unavailable.');
    if (input.action === 'finalize') {
        if (file.created_by !== user.id || file.state !== 'pending')
            throw new HttpError(403, 'Upload unavailable.');
        const path = await adoptUpload(service, file);
        if (file.purpose === 'html_quiz') {
            const { data: blob, error: failure } = await service.storage.from('cq-vault').download(path);
            if (failure || !blob || blob.size !== file.size)
                throw new HttpError(400, 'Upload does not match its reservation.');
            let source: string;
            try {
                source = new TextDecoder('utf-8', { fatal: true }).decode(await blob.arrayBuffer());
            }
            catch {
                throw new HttpError(400, 'HTML must be valid UTF-8.');
            }
            const issues = validateHtml(source);
            if (issues.length) {
                await service.storage.from('cq-vault').remove([file.path, readyPath(file)]);
                await service.from('files').delete().eq('id', file.id);
                return { ok: false, issues };
            }
        }
        const { error: failure } = await service.rpc('finalize_upload', { p_id: file.id, p_actor: user.id });
        if (failure)
            throw new HttpError(409, 'Could not finalize this upload.');
        return { ok: true, path };
    }
    if (file.state !== 'ready')
        throw new HttpError(404, 'File unavailable.');
    if (file.purpose === 'html_quiz' && file.created_by !== user.id) {
        const {data:admin}=await client.rpc('is_admin');
        if(!admin){
            const { data: versions, error: failure } = await client.from('quiz_versions').select('id').eq('html_file_id', file.id).limit(1);
            if (failure || !versions?.length)throw new HttpError(403, 'Quiz source unavailable.');
        }
    }
    const { data, error: failure } = await service.storage.from('cq-vault').createSignedUrl(file.path, 60, { download: file.name });
    if (failure)
        throw new HttpError(500, 'Could not prepare download.');
    return { url: data.signedUrl, expires_in: 60 };
});
