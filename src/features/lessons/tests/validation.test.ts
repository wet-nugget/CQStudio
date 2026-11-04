import { describe, expect, it } from 'vitest';
import { lessonSchema, noteSchema, progressSchema } from '../api/lessons';
describe('learning content validation', () => {
    it('counts UTF-8 bytes, including multi-byte content', () => {
        expect(lessonSchema.safeParse({ title: 'Cells', markdown: 'é'.repeat(102400) }).success).toBe(true);
        expect(lessonSchema.safeParse({ title: 'Cells', markdown: 'é'.repeat(102401) }).success).toBe(false);
    });
    it('rejects executable and unknown reference fields', () => {
        expect(noteSchema.safeParse({ title: 'Notes', body: 'Body', links: [{ label: 'Bad', url: 'javascript:alert(1)' }] }).success).toBe(false);
        expect(noteSchema.safeParse({ title: 'Notes', body: 'Body', links: [{ label: 'Good', url: 'https://example.com', private: true }] }).success).toBe(false);
    });
    it('bounds private confidence and reflection', () => {
        expect(progressSchema.safeParse({ status: 'complete', confidence: 6, reflection: '' }).success).toBe(false);
        expect(progressSchema.safeParse({ status: 'in_progress', confidence: 3, reflection: 'One question left.' }).success).toBe(true);
    });
});
