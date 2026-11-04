import { describe, expect, it } from 'vitest';
import { isCorrect, quizContentSchema, scoreQuiz, shuffled, type Question } from '../api/model';
export const samples: Question[] = [
    {
        id: 'mc', type: 'multiple_choice', prompt: 'Choose', points: 1, options: ['A', 'B'], answer: 1
    },
    {
        id: 'mr', type: 'multiple_response', prompt: 'Choose all', points: 2, options: ['A', 'B', 'C'], answers: [0, 2]
    },
    {
        id: 'match', type: 'matching', prompt: 'Match', points: 2, pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }]
    },
    {
        id: 'tf', type: 'true_false', prompt: 'True?', points: 1, answer: false
    },
    {
        id: 'id', type: 'identification', prompt: 'Name it', points: 1, accepted: ['Mitochondrion', 'Mitochondria'], case_sensitive: false
    },
    {
        id: 'blank', type: 'fill_blank', prompt: 'The {{1}} has {{2}}.', points: 2, accepted: [['cell'], ['DNA', 'genetic material']], case_sensitive: false
    },
    {
        id: 'enum', type: 'enumeration', prompt: 'List', points: 3, accepted: ['nucleus', 'membrane'], case_sensitive: false, order_matters: false
    },
];
describe('all seven quiz types', () => {
    it('scores correct answers and preserves point weighting', () => {
        const content = quizContentSchema.parse({ format_version: 1, questions: samples });
        const result = scoreQuiz(content, {
            mc: 1, mr: [2, 0], match: { '0': '0', '1': '1' }, tf: false, id: '  MITOCHONDRIA ', blank: ['Cell', 'genetic   material'], enum: ['membrane', 'nucleus']
        });
        expect(result.score).toBe(12);
        expect(result.max).toBe(12);
        expect(result.details.every(detail => detail.correct)).toBe(true);
    });
    it('rejects partial, duplicated, missing and incorrect responses', () => {
        const result = scoreQuiz({ format_version: 1, questions: samples }, {
            mc: 0, mr: [0, 0], match: { '0': '0' }, tf: true, id: 'chloroplast', blank: ['cell', 'RNA'], enum: ['nucleus', 'nucleus']
        });
        expect(result.score).toBe(0);
        expect(result.details).toHaveLength(7);
    });
    it('handles case-sensitive and ordered answers', () => {
        expect(isCorrect({
            ...samples[4]!, type: 'identification', accepted: ['DNA'], case_sensitive: true
        }, 'dna')).toBe(false);
        expect(isCorrect({
            ...samples[6]!, type: 'enumeration', accepted: ['first', 'second'], case_sensitive: false, order_matters: true
        }, ['second', 'first'])).toBe(false);
    });
    it('validates question IDs, options and sequential blank markers', () => {
        expect(quizContentSchema.safeParse({ format_version: 1, questions: [samples[0], samples[0]] }).success).toBe(false);
        expect(quizContentSchema.safeParse({ format_version: 1, questions: [{ ...samples[0], answer: 99 }] }).success).toBe(false);
        expect(quizContentSchema.safeParse({ format_version: 1, questions: [{ ...samples[5], prompt: '{{2}} {{1}}' }] }).success).toBe(false);
    });
    it('scores missed-question retakes against only their selected questions', () => {
        const result = scoreQuiz({ format_version: 1, questions: samples }, { mc: 1 }, ['mc']);
        expect(result).toMatchObject({ score: 1, max: 1 });
        expect(shuffled([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
    });
});
