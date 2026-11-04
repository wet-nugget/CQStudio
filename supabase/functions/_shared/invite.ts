import { HttpError, secret, serviceClient } from './http.ts';
export async function sendInvitation(email: string, role: 'admin' | 'member', actor: string | null, bootstrap = false) {
    const service = serviceClient();
    const { data: invite, error } = await service.rpc('reserve_invitation', {
        p_actor: actor, p_email: email, p_role: role, p_bootstrap: bootstrap
    });
    if (error || !invite)
        throw new HttpError(409, 'Invitation unavailable. Check capacity and existing invitations.');
    const { data, error: mailError } = await service.auth.admin.inviteUserByEmail(email, { redirectTo: `${secret('APP_ORIGIN')}/accept-invite` });
    if (mailError || !data.user) {
        await service.from('invitations').update({ revoked_at: new Date().toISOString() }).eq('id', invite.id);
        await service.from('activity_log').insert({ actor_id: actor, action: 'invite.delivery_failed', entity_id: invite.id });
        throw new HttpError(502, 'The invitation could not be sent. Check your email provider and existing Auth users.');
    }
    const { error: bindError } = await service.rpc('bind_invitation', { p_invitation: invite.id, p_user: data.user.id });
    if (bindError) {
        await service.from('invitations').update({ revoked_at: new Date().toISOString() }).eq('id', invite.id);
        throw new HttpError(500, 'Invitation could not be completed. Contact the operator.');
    }
    return { invitation_id: invite.id, expires_at: invite.expires_at };
}
