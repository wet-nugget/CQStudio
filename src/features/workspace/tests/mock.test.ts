import { expect, it } from 'vitest';
import { createMockAccess } from '../api/mock';
import { quizContentSchema } from '../../quizzes/api/model';
it('preview quizzes use the real validated seven-type content format', async () => { const data = await createMockAccess().read(); for (const quiz of data.quizzes)
    expect(quizContentSchema.safeParse(quiz.content).success).toBe(true); expect(new Set(data.quizzes[0]!.content.questions.map(q => q.type)).size).toBe(7); });
it('isolates preview instances and protects the last approved admin', async () => { const access = createMockAccess(); await expect(access.setMember('alex', 'Member', 'Approved')).rejects.toThrow('Appoint another'); await access.createClass({ name: 'Chemistry', subject: 'Science', description: 'Shared lab notes', icon: 'flask', color: 'teal' }); expect((await access.read()).classes).toHaveLength(5); expect((await createMockAccess().read()).classes).toHaveLength(4); });
