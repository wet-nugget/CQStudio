import { useState, type FormEvent } from 'react';
import { questionSchema, type Question } from '../api/model';
import { Message } from '../../../components/Feedback';
export default function QuestionEditor({ initial, onSave, onCancel }: {
    initial?: Question;
    onSave: (question: Question) => void;
    onCancel: () => void;
}) {
    const [type, setType] = useState(initial?.type ?? 'multiple_choice');
    const [error, setError] = useState('');
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const f = new FormData(event.currentTarget);
        const common = {
            id: initial?.id ?? crypto.randomUUID(), type, prompt: f.get('prompt'), points: Number(f.get('points'))
        };
        const lines = (name: string) => String(f.get(name) ?? '').split('\n').map(line => line.trim()).filter(Boolean);
        const sensitive = f.get('case_sensitive') === 'on';
        let value: unknown = common;
        if (type === 'multiple_choice' || type === 'multiple_response') {
            const selected = String(f.get('correct') ?? '').split(',').map(item => Number(item.trim()) - 1);
            value = { ...common, options: lines('options'), ...(type === 'multiple_choice' ? { answer: selected[0] } : { answers: selected }) };
        }
        else if (type === 'matching')
            value = { ...common, pairs: lines('pairs').map(line => {
                    const pair = line.split('=>');
                    return { left: pair[0]?.trim(), right: pair[1]?.trim() };
                }) };
        else if (type === 'true_false')
            value = { ...common, answer: f.get('answer') === 'true' };
        else if (type === 'identification')
            value = { ...common, accepted: String(f.get('accepted') ?? '').split('|').map(item => item.trim()), case_sensitive: sensitive };
        else if (type === 'fill_blank')
            value = { ...common, accepted: lines('accepted').map(line => line.split('|').map(item => item.trim())), case_sensitive: sensitive };
        else
            value = {
                ...common, accepted: lines('accepted'), case_sensitive: sensitive, order_matters: f.get('order_matters') === 'on'
            };
        const parsed = questionSchema.safeParse(value);
        if (!parsed.success) {
            setError(parsed.error.issues.map(issue => issue.message).join('\n'));
            return;
        }
        onSave(parsed.data);
    }
    return <section className="panel section-space"><h2>{initial ? 'Edit question' : 'A new question'}</h2><form onSubmit={submit}><label htmlFor="question-type">Question type</label><select id="question-type" value={type} onChange={event => setType(event.target.value as Question['type'])}>{['multiple_choice', 'multiple_response', 'matching', 'true_false', 'identification', 'fill_blank', 'enumeration'].map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select><label htmlFor="question-prompt">Prompt (Markdown)</label><textarea id="question-prompt" name="prompt" defaultValue={initial?.prompt} required maxLength={20000}/><label htmlFor="question-points">Points</label><input id="question-points" type="number" name="points" min={1} max={100} defaultValue={initial?.points ?? 1} required/><div key={type}>{(type === 'multiple_choice' || type === 'multiple_response') && <><label htmlFor="question-options">Options, one per line</label><textarea id="question-options" name="options" defaultValue={initial && 'options' in initial ? initial.options.join('\n') : ''} required/><label htmlFor="question-correct">Correct option number{type === 'multiple_response' ? 's (comma-separated)' : ''}, starting at 1</label><input id="question-correct" name="correct" defaultValue={initial?.type === 'multiple_choice' ? initial.answer + 1 : initial?.type === 'multiple_response' ? initial.answers.map(index => index + 1).join(', ') : ''} required/></>}{type === 'true_false' && <><label htmlFor="true-answer">Correct answer</label><select id="true-answer" name="answer" defaultValue={initial?.type === 'true_false' ? String(initial.answer) : 'true'}><option value="true">True</option><option value="false">False</option></select></>}{type === 'matching' && <><label htmlFor="question-pairs">Pairs, one per line: left =&gt; right</label><textarea id="question-pairs" name="pairs" required defaultValue={initial?.type === 'matching' ? initial.pairs.map(pair => `${pair.left} => ${pair.right}`).join('\n') : ''}/></>}{['identification', 'fill_blank', 'enumeration'].includes(type) && <><label htmlFor="question-accepted">{type === 'identification' ? 'Accepted alternatives, separated by |' : type === 'fill_blank' ? 'One line per {{1}}, {{2}}, … blank; use | for alternatives' : 'Required items, one per line'}</label><textarea id="question-accepted" name="accepted" required defaultValue={initial && 'accepted' in initial ? initial.type === 'fill_blank' ? initial.accepted.map(values => values.join(' | ')).join('\n') : initial.accepted.join(initial.type === 'identification' ? ' | ' : '\n') : ''}/><label className="checkbox-label"><input type="checkbox" name="case_sensitive" defaultChecked={initial && 'case_sensitive' in initial ? initial.case_sensitive : false}/><span>Case-sensitive answers</span></label>{type === 'enumeration' && <label className="checkbox-label"><input type="checkbox" name="order_matters" defaultChecked={initial?.type === 'enumeration' ? initial.order_matters : false}/><span>Require the listed order</span></label>}</>}</div>{error && <Message error>{error}</Message>}<div className="action-row"><button>Add / update question</button><button type="button" className="button-secondary" onClick={onCancel}>Cancel</button></div></form></section>;
}
