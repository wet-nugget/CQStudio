import { lazy, Suspense } from 'react';
import type { Answer, Question } from '../api/model';
const Markdown = lazy(() => import('../../lessons/components/Markdown'));
export default function QuestionInput({ question, answer, onChange, disabled = false, index }: {
    question: Question;
    answer: Answer | undefined;
    onChange: (answer: Answer) => void;
    disabled?: boolean;
    index: number;
}) {
    return <fieldset className="question-panel" disabled={disabled}><legend><span className="eyebrow">QUESTION {index + 1} · {question.points} POINT{question.points === 1 ? '' : 'S'}</span></legend><Suspense fallback={<p>Loading question…</p>}><Markdown source={question.prompt}/></Suspense>{question.type === 'multiple_choice' ? question.options.map((option, i) => <label className="answer-option" key={i}><input type="radio" name={question.id} value={i} checked={answer === i} onChange={() => onChange(i)}/><span>{option}</span></label>) : question.type === 'multiple_response' ? question.options.map((option, i) => <label className="answer-option" key={i}><input type="checkbox" checked={Array.isArray(answer) && answer.includes(i)} onChange={event => {
        const values = Array.isArray(answer) ? answer : [];
        onChange(event.target.checked ? [...values, i] : values.filter(value => value !== i));
    }}/><span>{option}</span></label>) : question.type === 'true_false' ? [true, false].map(value => <label className="answer-option" key={String(value)}><input type="radio" name={question.id} checked={answer === value} onChange={() => onChange(value)}/><span>{value ? 'True' : 'False'}</span></label>) : question.type === 'matching' ? question.pairs.map((pair, i) => <label key={i}>{pair.left}<select value={typeof answer === 'object' && answer && !Array.isArray(answer) ? String(answer[String(i)] ?? '') : ''} onChange={event => onChange({ ...typeof answer === 'object' && !Array.isArray(answer) ? answer : {}, [String(i)]: event.target.value })}><option value="">Choose a match</option>{[...question.pairs].map((right, j) => <option value={j} key={j}>{right.right}</option>).reverse()}</select></label>) : question.type === 'fill_blank' ? question.accepted.map((_values, i) => <label key={i}>Blank {i + 1}<input value={Array.isArray(answer) ? String(answer[i] ?? '') : ''} onChange={event => {
        const values = Array.isArray(answer) ? [...answer] : question.accepted.map(() => '');
        values[i] = event.target.value;
        onChange(values);
    }} maxLength={2000}/></label>) : question.type === 'enumeration' ? <label>Items, one per line<textarea value={Array.isArray(answer) ? answer.join('\n') : ''} maxLength={20000} onChange={event => onChange(event.target.value.split('\n'))}/></label> : <label>Your answer<input value={typeof answer === 'string' ? answer : ''} maxLength={2000} onChange={event => onChange(event.target.value)}/></label>}</fieldset>;
}
