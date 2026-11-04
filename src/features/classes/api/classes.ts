import { z } from 'zod';
import { db } from '../../../lib/supabase';
export const classSchema = z.strictObject({
    name: z.string().trim().min(1).max(100), teacher_subject: z.string().trim().max(120), description: z.string().max(10000), icon: z.enum(['book', 'flask', 'globe', 'code', 'leaf', 'calculator', 'palette', 'language']), folder_id: z.uuid().nullable().default(null)
});
export async function saveClass(input: unknown, userId: string, id?: string) {
    const value = classSchema.parse(input);
    const result = id ? await db().from('classes').update(value).eq('id', id).select().single() : await db().from('classes').insert({ ...value, created_by: userId }).select().single();
    if (result.error)
        throw new Error('Could not save this class. Check your access and class capacity.');
    return result.data;
}
