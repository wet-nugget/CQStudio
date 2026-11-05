import { describe, expect, it } from 'vitest';
import { acceptanceSchema, loginSchema, passwordSchema, profileSchema } from '../../../lib/validation';
describe('authentication input validation', () => {
    it('normalizes email or username and rejects unknown login fields', () => {
        expect(loginSchema.parse({ email: ' Member@Example.com ', password: 'secret' }).email).toBe('member@example.com');
        expect(loginSchema.parse({ email: ' Member_01 ', password: 'secret' }).email).toBe('member_01');
        expect(loginSchema.safeParse({ email: 'ab', password: 'secret' }).success).toBe(false);
        expect(loginSchema.safeParse({ email: 'member@example.com', password: 'secret', role: 'admin' }).success).toBe(false);
    });
    it('requires a twelve-character password and bounded profile fields', () => {
        expect(passwordSchema.safeParse('12345678901').success).toBe(false);
        expect(passwordSchema.safeParse('123456789012').success).toBe(true);
        expect(profileSchema.safeParse({
            username: 'Member', display_name: 'Member', avatar: 0, theme: 'system'
        }).success).toBe(false);
        expect(profileSchema.safeParse({
            username: 'member', display_name: 'Member', avatar: 30, theme: 'system'
        }).success).toBe(false);
    });
    it('requires explicit policy acceptance', () => {
        const input = {
            username: 'member', display_name: 'Member', password: 'twelve-characters', accepted: false
        };
        expect(acceptanceSchema.safeParse(input).success).toBe(false);
        expect(acceptanceSchema.safeParse({ ...input, accepted: true }).success).toBe(true);
        expect(acceptanceSchema.safeParse({ ...input, accepted: true, status: 'approved' }).success).toBe(false);
    });
});
