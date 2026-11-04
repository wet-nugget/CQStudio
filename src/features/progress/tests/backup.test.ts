import { describe, expect, it } from 'vitest';
import { backupSchema } from '../api/backup';
const id = '06000000-0000-4000-8000-000000000001', date = '2026-11-01T00:00:00.000Z';
function backup() {
    return {
        format_version: 1, exported_at: date, email: 'member@example.test', profile: {
            id, username: 'member', display_name: 'Member', avatar: 0, theme: 'system', role: 'member', status: 'approved', policy_version: '2026-11-01', policy_accepted_at: date, created_at: date
        }, attempts: [{
                id, user_id: id, quiz_version_id: id, score: 1, max_score: 1, answers: { responses: { q1: true }, question_ids: ['q1'] }, summary: false, started_at: date, completed_at: date
            }], lesson_progress: [], saved_files: [], chat_messages: [], uploads: [], notifications: []
    };
}
describe('own-data backup validation', () => {
    it('accepts the actual export shape including exact-version attempts', () => {
        expect(backupSchema.parse(backup()).attempts[0]?.score).toBe(1);
    });
    it('rejects unknown top-level and nested fields', () => {
        expect(backupSchema.safeParse({ ...backup(), service_key: 'forbidden' }).success).toBe(false);
        const value = backup();
        expect(backupSchema.safeParse({ ...value, profile: { ...value.profile, permissions: ['admin'] } }).success).toBe(false);
    });
    it('rejects scores beyond their maximum and inverted dates', () => {
        const value = backup();
        expect(backupSchema.safeParse({ ...value, attempts: [{ ...value.attempts[0], score: 2 }] }).success).toBe(false);
        expect(backupSchema.safeParse({ ...value, attempts: [{ ...value.attempts[0], started_at: '2026-11-02T00:00:00.000Z' }] }).success).toBe(false);
    });
    it('requires summarized attempts to omit answer details', () => {
        const value = backup();
        expect(backupSchema.safeParse({ ...value, attempts: [{ ...value.attempts[0], summary: true }] }).success).toBe(false);
        expect(backupSchema.safeParse({ ...value, attempts: [{ ...value.attempts[0], summary: true, answers: null }] }).success).toBe(true);
    });
});
