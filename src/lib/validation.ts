import { z } from 'zod';
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const loginIdentifierSchema = z.string().trim().toLowerCase().max(254).refine(
    (value) => emailSchema.safeParse(value).success || /^[a-z0-9_]{3,30}$/.test(value),
    'Enter a valid email address or username.',
);
export const passwordSchema = z.string().min(12, 'Use at least 12 characters.').max(128);
export const loginSchema = z.strictObject({ email: loginIdentifierSchema, password: z.string().min(1).max(128) });
export const profileSchema = z.strictObject({
    username: z.string().regex(/^[a-z0-9_]{3,30}$/, 'Use 3–30 lowercase letters, numbers, or underscores.'),
    display_name: z.string().trim().min(1).max(80),
    avatar: z.number().int().min(0).max(29),
    theme: z.enum(['light', 'dark', 'system']),
});
export const acceptanceSchema = z.strictObject({
    username: profileSchema.shape.username,
    display_name: profileSchema.shape.display_name,
    password: passwordSchema,
    accepted: z.literal(true, { error: 'Read and accept the Privacy Policy and Terms.' }),
});
export const policySettingsSchema = z.strictObject({
    name: z.string(), policy_version: z.string(), chat_days: z.number().int().positive(),
    activity_days: z.number().int().positive(), notification_days: z.number().int().positive(), full_attempts: z.number().int().positive(),
});
export type PolicySettings = z.infer<typeof policySettingsSchema>;
export const defaultPolicy: PolicySettings = {
    name: 'CQStudio', policy_version: '2026-11-01', chat_days: 90, activity_days: 60, notification_days: 30, full_attempts: 30,
};
export function validationMessage(error: z.ZodError): string {
    return error.issues[0]?.message ?? 'Please check the form.';
}
