import operator from '../config/operator.json';
export { operator };
export function policyDetail(field: Exclude<keyof typeof operator, 'minimumAge' | 'reviewed'>): string {
    return operator[field].trim() || `[${field.replace(/([A-Z])/g, ' $1').toUpperCase()} — TO BE COMPLETED]`;
}
