import { z } from 'zod';
import { HttpError, jsonInput, secret, serve, serviceClient, verifySecret } from '../_shared/http.ts';
import { readyPath } from '../_shared/storage.ts';
serve(async (request) => {
    await verifySecret(request.headers.get('x-maintenance-token'), secret('MAINTENANCE_TOKEN'));
    const { action } = z.strictObject({ action: z.enum(['touch', 'retention', 'cleanup']) }).parse(await jsonInput(request));
    const service = serviceClient();
    if (action === 'cleanup') {
        const now = new Date().toISOString();
        const { data: files, error } = await service.from('files').select('id,path').or(`and(state.eq.pending,expires_at.lt.${now}),state.eq.deleting`).limit(100);
        if (error)
            throw new HttpError(500, 'Cleanup did not complete.');
        for (const file of files ?? []) {
            const { error: removeError } = await service.storage.from('cq-vault').remove([file.path, readyPath(file)]);
            if (removeError)
                throw new HttpError(500, 'Object cleanup did not complete.');
            const { error: rowError } = await service.from('files').delete().eq('id', file.id).in('state', ['pending', 'deleting']);
            if (rowError)
                throw new HttpError(500, 'Metadata cleanup did not complete.');
        }
        const { data: orphans, error: orphanError } = await service.rpc('orphan_objects');
        if (orphanError)
            throw new HttpError(500, 'Orphan scan did not complete.');
        if (orphans?.length) {
            const { error: failure } = await service.storage.from('cq-vault').remove(orphans.map((item: {
                path: string;
            }) => item.path));
            if (failure)
                throw new HttpError(500, 'Orphan removal did not complete.');
        }
        return { ok: true, processed: files?.length ?? 0 };
    }
    const result = action === 'touch' ? await service.from('workspace_settings').select('id').single() : await service.rpc('apply_retention');
    if (result.error)
        throw new HttpError(500, 'Maintenance did not complete.');
    return { ok: true };
});
