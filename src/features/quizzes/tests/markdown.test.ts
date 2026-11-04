import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MarkdownImportError, parseQuizMarkdown } from '../api/markdown';
describe('Markdown quiz import', () => {
    it('parses the documented seven-type sample', () => {
        const quiz = parseQuizMarkdown(readFileSync('docs/samples/quiz.md', 'utf8'));
        expect(quiz.title).toBe('A little biology');
        expect(quiz.content.questions).toHaveLength(7);
    });
    it('returns line-numbered syntax and answer errors', () => {
        try {
            parseQuizMarkdown('# Quiz: Test\n## true_false\nA statement\nAnswer: maybe');
            throw new Error('Expected validation failure');
        }
        catch (error) {
            expect(error).toBeInstanceOf(MarkdownImportError);
            expect((error as MarkdownImportError).issues.some(issue => issue.line === 4)).toBe(true);
        }
    });
    it('does not treat all checked multiple-choice choices as one answer', () => {
        expect(() => parseQuizMarkdown('# Quiz: Test\n## multiple_choice\nPick one\n- [x] A\n- [x] B')).toThrow('exactly one');
    });
});
