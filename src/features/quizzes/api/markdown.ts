import { quizContentSchema, type Question } from './model';
export interface ImportIssue {
    line: number;
    message: string;
}
export class MarkdownImportError extends Error {
    constructor(public issues: ImportIssue[]) {
        super(issues.map(issue => `Line ${issue.line}: ${issue.message}`).join('\n'));
    }
}
export function parseQuizMarkdown(source: string) {
    if (new TextEncoder().encode(source).length > 2097152)
        throw new MarkdownImportError([{ line: 1, message: 'Markdown must be at most 2 MiB.' }]);
    const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/);
    const issues: ImportIssue[] = [];
    const questions: Question[] = [];
    let title = '';
    let block: {
        type: string;
        points: number;
        line: number;
        lines: {
            value: string;
            line: number;
        }[];
    } | null = null;
    const finish = () => {
        if (!block)
            return;
        const current = block;
        const prompt: string[] = [];
        const choices: string[] = [];
        const selected: number[] = [];
        const accepted: string[] = [];
        const blanks: string[][] = [];
        const pairs: {
            left: string;
            right: string;
        }[] = [];
        let bool: boolean | undefined;
        let sensitive = false;
        let ordered = false;
        for (const entry of current.lines) {
            const line = entry.value;
            const option = line.match(/^- \[([ xX])\] (.+)$/);
            if (option) {
                if (option[1]?.toLowerCase() === 'x')
                    selected.push(choices.length);
                choices.push(option[2]!);
                continue;
            }
            const directive = line.match(/^(Answer|Blank|Item|Pair|Case-sensitive|Order-matters):\s*(.*)$/i);
            if (!directive) {
                prompt.push(line);
                continue;
            }
            const key = directive[1]!.toLowerCase(), value = directive[2]!;
            if (key === 'answer' && current.type === 'true_false') {
                if (!/^(true|false)$/i.test(value))
                    issues.push({ line: entry.line, message: 'Answer must be true or false.' });
                else
                    bool = value.toLowerCase() === 'true';
            }
            else if (key === 'answer' && current.type === 'identification')
                accepted.push(...value.split('|').map(item => item.trim()));
            else if (key === 'item' && current.type === 'enumeration')
                accepted.push(value.trim());
            else if (key === 'blank' && current.type === 'fill_blank')
                blanks.push(value.split('|').map(item => item.trim()));
            else if (key === 'pair' && current.type === 'matching') {
                const parts = value.split('=>');
                if (parts.length !== 2)
                    issues.push({ line: entry.line, message: 'Use Pair: left => right.' });
                else
                    pairs.push({ left: parts[0]!.trim(), right: parts[1]!.trim() });
            }
            else if (key === 'case-sensitive' && ['identification', 'fill_blank', 'enumeration'].includes(current.type)) {
                if (!/^(true|false)$/.test(value))
                    issues.push({ line: entry.line, message: 'Case-sensitive must be true or false.' });
                else
                    sensitive = value === 'true';
            }
            else if (key === 'order-matters' && current.type === 'enumeration') {
                if (!/^(true|false)$/.test(value))
                    issues.push({ line: entry.line, message: 'Order-matters must be true or false.' });
                else
                    ordered = value === 'true';
            }
            else
                issues.push({ line: entry.line, message: `${directive[1]} is not valid for ${current.type}.` });
        }
        const common = {
            id: `q${questions.length + 1}`, type: current.type, prompt: prompt.join('\n').trim(), points: current.points
        };
        let value: unknown = common;
        switch (current.type) {
            case 'multiple_choice':
                if (selected.length !== 1)
                    issues.push({ line: current.line, message: 'Choose exactly one [x] option.' });
                value = { ...common, options: choices, answer: selected[0] };
                break;
            case 'multiple_response':
                value = { ...common, options: choices, answers: selected };
                break;
            case 'matching':
                value = { ...common, pairs };
                break;
            case 'true_false':
                value = { ...common, answer: bool };
                break;
            case 'identification':
                value = { ...common, accepted, case_sensitive: sensitive };
                break;
            case 'fill_blank':
                value = { ...common, accepted: blanks, case_sensitive: sensitive };
                break;
            case 'enumeration':
                value = {
                    ...common, accepted, case_sensitive: sensitive, order_matters: ordered
                };
                break;
        }
        const result = quizContentSchema.shape.questions.element.safeParse(value);
        if (!result.success)
            issues.push(...result.error.issues.map(issue => ({ line: current.line, message: issue.message })));
        else
            questions.push(result.data);
    };
    lines.forEach((value, index) => {
        const line = index + 1;
        const heading = value.match(/^# Quiz:\s*(.+)$/);
        if (heading && !block && !title) {
            title = heading[1]!.trim();
            return;
        }
        const question = value.match(/^## ([a-z_]+)(?:\s*\|\s*(\d+))?\s*$/);
        if (question) {
            finish();
            block = {
                type: question[1]!, points: Number(question[2] ?? 1), line, lines: []
            };
            return;
        }
        if (block)
            block.lines.push({ value, line });
        else if (value.trim())
            issues.push({ line, message: 'Start with # Quiz: title, then ## question_type | points.' });
    });
    finish();
    if (!title || title.length > 200)
        issues.push({ line: 1, message: 'Provide # Quiz: title (at most 200 characters).' });
    const parsed = quizContentSchema.safeParse({ format_version: 1, questions });
    if (!parsed.success)
        issues.push(...parsed.error.issues.map(issue => ({ line: 1, message: issue.message })));
    if (issues.length || !parsed.success)
        throw new MarkdownImportError(issues.slice(0, 100));
    return { title, content: parsed.data };
}
