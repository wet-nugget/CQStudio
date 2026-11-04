import { z } from 'zod';
import { db } from '../../../lib/supabase';
const bytes = (max: number) => (value: string) => new TextEncoder().encode(value).byteLength <= max;
export const lessonSchema = z.strictObject({ title: z.string().trim().min(1).max(200), markdown: z.string().refine(bytes(204800), 'Lesson must be at most 200 KiB.') });
export const noteSchema = z.strictObject({ title: z.string().trim().min(1).max(200), body: z.string().refine(bytes(51200), 'Note must be at most 50 KiB.'), links: z.array(z.strictObject({ label: z.string().min(1).max(200), url: z.url().max(2048).refine(value => /^https?:\/\//.test(value), 'Use an HTTP or HTTPS link.') })).max(30) });
export const progressSchema = z.strictObject({ status: z.enum(['not_started', 'in_progress', 'complete']), confidence: z.number().int().min(1).max(5).nullable(), reflection: z.string().refine(bytes(20000), 'Reflection is too large.') });
export async function saveLesson(input: unknown, classId: string, userId: string, id?: string) {
    const value = lessonSchema.parse(input);
    const result = id ? await db().from('lessons').update(value).eq('id', id).select().single() : await db().from('lessons').insert({ ...value, class_id: classId, created_by: userId }).select().single();
    if (result.error)
        throw new Error('Could not save the lesson. Check access and content limits.');
    return result.data;
}
