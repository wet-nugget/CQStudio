import { describe, it, expect } from 'vitest';
import { plural } from '../../../lib/plural';
describe('plural labels', () => { it('handles zero, one, and many including irregular endings', () => { expect(plural(1, 'quiz', 'quizzes')).toBe('1 quiz'); expect(plural(2, 'quiz', 'quizzes')).toBe('2 quizzes'); expect(plural(0, 'material')).toBe('0 materials'); expect(plural(1, 'material')).toBe('1 material'); }); });
