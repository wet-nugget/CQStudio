import { Avatar } from '../../../components/ui/Avatar';
export default function AvatarPicker({ value, onChange }: {
    value: number;
    onChange: (value: number) => void;
}) {
    return <fieldset className="avatar-field"><legend>Choose a preset avatar</legend><div className="avatar-picker">{Array.from({length:30},(_,index)=>index).map((index) => <button type="button" key={index} aria-label={`Geometric avatar ${index + 1}`} aria-pressed={value === index} className={value === index ? 'selected' : ''} onClick={() => onChange(index)}><Avatar index={index}/></button>)}</div></fieldset>;
}
