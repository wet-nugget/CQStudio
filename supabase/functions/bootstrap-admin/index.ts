import { z } from 'zod';
import { HttpError, jsonInput, secret, serve, verifySecret } from '../_shared/http.ts';
import { sendInvitation } from '../_shared/invite.ts';
serve(async (request) => {
    const token = secret('BOOTSTRAP_TOKEN');
    if (token.length < 32)
        throw new HttpError(503, 'Configure a stronger bootstrap token.');
    await verifySecret(request.headers.get('x-bootstrap-token'), token);
    const { email } = z.strictObject({ email: z.string().trim().toLowerCase().email().max(254) }).parse(await jsonInput(request));
    return sendInvitation(email, 'admin', null, true);
});
