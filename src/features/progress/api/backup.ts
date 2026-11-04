import { z } from 'zod';
import { answerMapSchema } from '../../quizzes/api/model';
const uuid = z.uuid(), date = z.string().datetime({ offset: true });
const profile = z.strictObject({
    id: uuid, username: z.string(), display_name: z.string(), avatar: z.number().int().min(0).max(29), theme: z.enum(['light', 'dark', 'system']), role: z.enum(['member', 'admin']), status: z.enum(['approved', 'disabled', 'rejected']), policy_version: z.string(), policy_accepted_at: date, created_at: date
});
const attemptAnswers = z.union([z.strictObject({ responses: answerMapSchema, question_ids: z.array(z.string().max(80)).max(1000) }), z.strictObject({ html_report: z.literal(true) })]);
const attempt = z.strictObject({
    id: uuid, user_id: uuid, quiz_version_id: uuid, score: z.number().finite().min(0), max_score: z.number().finite().positive().max(1000000), answers: attemptAnswers.nullable(), summary: z.boolean(), started_at: date, completed_at: date
}).refine(value => value.score <= value.max_score && Date.parse(value.started_at) <= Date.parse(value.completed_at) && (!value.summary || value.answers === null), 'Invalid score, dates, or summary.');
const progress = z.strictObject({
    user_id: uuid, lesson_id: uuid, status: z.enum(['not_started', 'in_progress', 'complete']), confidence: z.number().int().min(1).max(5).nullable(), reflection: z.string().max(20000), updated_at: date
});
const saved = z.strictObject({ user_id: uuid, file_id: uuid, created_at: date });
export const backupSchema = z.strictObject({
    format_version: z.literal(1), exported_at: date, profile, email: z.email(),
    attempts: z.array(attempt).max(100000), lesson_progress: z.array(progress).max(100000), saved_files: z.array(saved).max(100000),
    chat_messages: z.array(z.strictObject({
        id: uuid, user_id: uuid, class_id: uuid.nullable(), body: z.string().max(2000), created_at: date
    })),
    uploads: z.array(z.strictObject({
        id: uuid, folder_id: uuid.nullable(), path: z.string(), name: z.string(), mime: z.string(), size: z.number().int().positive(), description: z.string(), purpose: z.string(), state: z.enum(['pending', 'ready', 'deleting']), created_by: uuid.nullable(), created_at: date, expires_at: date, ready_at: date.nullable()
    })),
    notifications: z.array(z.strictObject({
        id: uuid, user_id: uuid, kind: z.string(), title: z.string(), entity_id: uuid.nullable(), read_at: date.nullable(), created_at: date
    })),
});
export async function readBackup(file: File) {
    if (file.size > 52428800)
        throw new Error('Backup import must be at most 50 MiB.');
    const source = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
    return backupSchema.parse(JSON.parse(source));
}
