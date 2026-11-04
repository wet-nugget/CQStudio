import { z } from 'zod';
const text = z.string().trim().min(1).max(2000);
const common = { id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), prompt: z.string().trim().min(1).max(20000), points: z.number().int().min(1).max(100) };
const options = z.array(text).min(2).max(30);
const answers = z.array(text).min(1).max(100);
export const questionSchema = z.discriminatedUnion('type', [
    z.strictObject({
        ...common, type: z.literal('multiple_choice'), options, answer: z.number().int().min(0)
    }),
    z.strictObject({
        ...common, type: z.literal('multiple_response'), options, answers: z.array(z.number().int().min(0)).min(1).max(30)
    }),
    z.strictObject({ ...common, type: z.literal('matching'), pairs: z.array(z.strictObject({ left: text, right: text })).min(2).max(30) }),
    z.strictObject({ ...common, type: z.literal('true_false'), answer: z.boolean() }),
    z.strictObject({
        ...common, type: z.literal('identification'), accepted: answers, case_sensitive: z.boolean()
    }),
    z.strictObject({
        ...common, type: z.literal('fill_blank'), accepted: z.array(answers).min(1).max(30), case_sensitive: z.boolean()
    }),
    z.strictObject({
        ...common, type: z.literal('enumeration'), accepted: answers, case_sensitive: z.boolean(), order_matters: z.boolean()
    }),
]).superRefine((question, context) => {
    if (question.type === 'multiple_choice' && question.answer >= question.options.length)
        context.addIssue({ code: 'custom', message: 'Correct option is out of range.' });
    if (question.type === 'multiple_response' && (new Set(question.answers).size !== question.answers.length || question.answers.some(answer => answer >= question.options.length)))
        context.addIssue({ code: 'custom', message: 'Correct options must be unique and in range.' });
    if (question.type === 'fill_blank') {
        const blanks = [...question.prompt.matchAll(/\{\{(\d+)\}\}/g)].map(match => Number(match[1]));
        if (blanks.length !== question.accepted.length || blanks.some((blank, index) => blank !== index + 1))
            context.addIssue({ code: 'custom', message: 'Use {{1}}, {{2}}, … once each, in order, matching the blank answers.' });
    }
});
export const quizContentSchema = z.strictObject({ format_version: z.literal(1), questions: z.array(questionSchema).min(1).max(1000) }).superRefine((value, context) => {
    if (new Set(value.questions.map(question => question.id)).size !== value.questions.length)
        context.addIssue({ code: 'custom', message: 'Question IDs must be unique.' });
    if (new TextEncoder().encode(JSON.stringify(value)).length > 2097152)
        context.addIssue({ code: 'custom', message: 'Quiz content exceeds 2 MiB.' });
});
export const quizSettingsSchema = z.strictObject({
    shuffle: z.boolean(), mode: z.enum(['paged', 'single']), page_size: z.number().int().min(1).max(50), quiz_seconds: z.number().int().min(5).max(86400).nullable(), question_seconds: z.number().int().min(5).max(3600).nullable()
});
export const defaultQuizSettings: z.infer<typeof quizSettingsSchema> = {
    shuffle: false, mode: 'single', page_size: 1, quiz_seconds: null, question_seconds: null
};
const scalar = z.union([z.string().max(20000), z.number().int().min(0).max(1000)]);
export const answerSchema = z.union([scalar, z.boolean(), z.array(scalar).max(100), z.record(z.string().max(80), scalar)]);
export const answerMapSchema = z.record(z.string().max(80), answerSchema);
export type Question = z.infer<typeof questionSchema>;
export type QuizContent = z.infer<typeof quizContentSchema>;
export type QuizSettings = z.infer<typeof quizSettingsSchema>;
export type Answer = z.infer<typeof answerSchema>;
export type Answers = z.infer<typeof answerMapSchema>;
const normalize = (value: unknown, sensitive = false) => {
    const text = String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
    return sensitive ? text : text.toLowerCase();
};
const equalSet = (a: unknown[], b: unknown[]) => a.length === b.length && new Set(a).size === a.length && a.every(value => b.includes(value));
export function isCorrect(question: Question, answer: Answer | undefined): boolean {
    switch (question.type) {
        case 'multiple_choice': return answer === question.answer;
        case 'multiple_response': return Array.isArray(answer) && equalSet(answer, question.answers);
        case 'true_false': return answer === question.answer;
        case 'matching': return typeof answer === 'object' && answer !== null && !Array.isArray(answer) && Object.keys(answer).length === question.pairs.length && question.pairs.every((_pair, index) => String(answer[String(index)]) === String(index));
        case 'identification': return typeof answer === 'string' && question.accepted.some(value => normalize(value, question.case_sensitive) === normalize(answer, question.case_sensitive));
        case 'fill_blank': return Array.isArray(answer) && answer.length === question.accepted.length && question.accepted.every((alternatives, index) => alternatives.some(value => normalize(value, question.case_sensitive) === normalize(answer[index], question.case_sensitive)));
        case 'enumeration': {
            if (!Array.isArray(answer))
                return false;
            const actual = answer.map(value => normalize(value, question.case_sensitive));
            const expected = question.accepted.map(value => normalize(value, question.case_sensitive));
            return question.order_matters ? actual.length === expected.length && actual.every((value, index) => value === expected[index]) : equalSet(actual, expected);
        }
    }
}
export function expectedAnswer(question: Question): string {
    switch (question.type) {
        case 'multiple_choice': return question.options[question.answer] ?? '';
        case 'multiple_response': return question.answers.map(index => question.options[index]).join('; ');
        case 'true_false': return question.answer ? 'True' : 'False';
        case 'matching': return question.pairs.map(pair => `${pair.left} → ${pair.right}`).join('; ');
        case 'identification': return question.accepted.join(' / ');
        case 'fill_blank': return question.accepted.map(values => values.join(' / ')).join('; ');
        case 'enumeration': return question.accepted.join('; ');
    }
}
export function scoreQuiz(content: QuizContent, answers: Answers, onlyIds?: string[]) {
    const questions = onlyIds ? content.questions.filter(question => onlyIds.includes(question.id)) : content.questions;
    const details = questions.map(question => ({
        id: question.id, correct: isCorrect(question, answers[question.id]), points: question.points, expected: expectedAnswer(question)
    }));
    return { score: details.reduce((sum, item) => sum + (item.correct ? item.points : 0), 0), max: details.reduce((sum, item) => sum + item.points, 0), details };
}
export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
}
