import { z } from 'zod';
import { authenticate, HttpError, jsonInput, serve, serviceClient } from '../_shared/http.ts';
import { removePendingUploads } from '../_shared/storage.ts';
const schema = z.strictObject({ action: z.literal('delete_account'), confirm: z.literal('DELETE') });
serve(async (request) => {
    const { user } = await authenticate(request);
    schema.parse(await jsonInput(request));
    const service = serviceClient();
    const { error } = await service.rpc('prepare_account_deletion', { p_actor: user.id, p_user: user.id, p_remove_shared: false });
    if (error)
        throw new HttpError(409, 'Account cannot be deleted. Ask another approved administrator to take over first.');
    await removePendingUploads(service, user.id);
    const { error: authError } = await service.auth.admin.deleteUser(user.id);
    if (authError)
        throw new HttpError(502, 'Membership disabled. Contact your administrator to finish account deletion.');
    return { ok: true };
});
