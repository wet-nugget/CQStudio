import { z } from 'zod';
import { authenticate, HttpError, jsonInput, serve, serviceClient } from '../_shared/http.ts';
import { sendInvitation } from '../_shared/invite.ts';
import { removePendingUploads } from '../_shared/storage.ts';
const input = z.discriminatedUnion('action', [
    z.strictObject({ action: z.literal('invite'), email: z.string().trim().toLowerCase().email().max(254), role: z.enum(['member', 'admin']) }),
    z.strictObject({ action: z.literal('revoke_invite'), invitation_id: z.uuid() }),
    z.strictObject({
        action: z.literal('change_member'), user_id: z.uuid(), role: z.enum(['member', 'admin']), status: z.enum(['approved', 'disabled', 'rejected'])
    }),
    z.strictObject({
        action: z.literal('delete_member'), user_id: z.uuid(), remove_shared: z.boolean(), confirm: z.literal('DELETE')
    }),
    z.strictObject({ action: z.literal('export_workspace') }),
    z.strictObject({
        action: z.literal('update_settings'), name: z.string().trim().min(1).max(80), policy_version: z.string().min(1).max(50), limits: z.record(z.string(), z.number().int().positive())
    }),
    z.strictObject({
        action: z.literal('manage_folder'), id: z.uuid(), name: z.string().min(1).max(120), parent_id: z.uuid().nullable(), remove: z.boolean()
    }),
    z.strictObject({
        action: z.literal('manage_file'), id: z.uuid(), name: z.string().min(1).max(200), folder_id: z.uuid().nullable(), remove: z.boolean()
    }),
    z.strictObject({
        action: z.literal('review_quiz'), version_id: z.uuid(), decision: z.enum(['published', 'rejected']), note: z.string().max(2000)
    }),
    z.strictObject({ action: z.literal('unpublish_quiz'), quiz_id: z.uuid(), remove: z.boolean() }),
]);
serve(async (request) => {
    const { user } = await authenticate(request, true);
    const value = input.parse(await jsonInput(request));
    const service = serviceClient();
    if (value.action === 'invite')
        return sendInvitation(value.email, value.role, user.id);
    if (value.action === 'delete_member') {
        const { error } = await service.rpc('prepare_account_deletion', { p_actor: user.id, p_user: value.user_id, p_remove_shared: value.remove_shared });
        if (error)
            throw new HttpError(409, 'Account cannot be deleted. Keep at least one approved administrator.');
        await removePendingUploads(service, value.user_id);
        const { error: authError } = await service.auth.admin.deleteUser(value.user_id);
        if (authError)
            throw new HttpError(502, 'Membership disabled. Account deletion needs a retry by an administrator.');
        return { ok: true };
    }
    const result = value.action === 'unpublish_quiz'
        ? await service.rpc('unpublish_quiz', { p_actor: user.id, p_quiz: value.quiz_id, p_delete: value.remove })
        : value.action === 'review_quiz'
            ? await service.rpc('review_quiz', {
                p_actor: user.id, p_version: value.version_id, p_decision: value.decision, p_note: value.note
            })
            : value.action === 'manage_folder'
                ? await service.rpc('manage_folder', {
                    p_actor: user.id, p_id: value.id, p_name: value.name, p_parent: value.parent_id, p_delete: value.remove
                })
                : value.action === 'manage_file'
                    ? await service.rpc('manage_file', {
                        p_actor: user.id, p_id: value.id, p_name: value.name, p_folder: value.folder_id, p_delete: value.remove
                    })
                    : value.action === 'update_settings'
                        ? await service.rpc('update_settings', {
                            p_actor: user.id, p_name: value.name, p_policy_version: value.policy_version, p_limits: value.limits
                        })
                        : value.action === 'revoke_invite'
                            ? await service.rpc('cancel_invitation', { p_actor: user.id, p_invitation: value.invitation_id })
                            : value.action === 'change_member'
                                ? await service.rpc('change_member', {
                                    p_actor: user.id, p_user: value.user_id, p_role: value.role, p_status: value.status
                                })
                                : await service.rpc('export_workspace', { p_actor: user.id });
    if (result.error)
        throw new HttpError(409, 'Action unavailable. Check limits and last-administrator protection.');
    return value.action === 'export_workspace' ? result.data : { ok: true };
});
