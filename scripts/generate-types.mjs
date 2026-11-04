import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

// Offline type generation from our migrations. Review official introspection
// output after linking a hosted project; see README.
const sql = readdirSync('supabase/migrations').sort().map((name) => readFileSync(`supabase/migrations/${name}`, 'utf8')).join('\n');
function splitColumns(source) {
  let depth = 0, quoted = false, start = 0;
  const parts = [];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "'" && source[i - 1] !== '\\') quoted = !quoted;
    if (!quoted) {
      if (source[i] === '(') depth++;
      if (source[i] === ')') depth--;
      if (source[i] === ',' && depth === 0) { parts.push(source.slice(start, i).trim()); start = i + 1; }
    }
  }
  parts.push(source.slice(start).trim());
  return parts;
}
const enums = {};
for (const match of sql.matchAll(/create type public\.(\w+) as enum \(([^;]+)\);/g)) enums[match[1]] = match[2].match(/'[^']*'/g).map((value) => JSON.stringify(value.slice(1, -1))).join(' | ');
function typeOf(type) {
  if (type.startsWith('public.')) return `Database['public']['Enums']['${type.slice(7)}']`;
  if (type === 'jsonb' || type === 'json') return 'Json';
  if (type === 'boolean') return 'boolean';
  if (['smallint', 'integer', 'int', 'bigint', 'numeric', 'real', 'double'].includes(type)) return 'number';
  return 'string';
}
const tables = [];
for (const match of sql.matchAll(/create table public\.(\w+) \(([\s\S]*?)\n\);/g)) {
  const fields = splitColumns(match[2]).filter((line) => !/^(primary|unique|check|foreign|constraint)\b/i.test(line));
  const rows = [], inserts = [], updates = [];
  const compositePk = match[2].match(/primary key \(([^)]+)\)/)?.[1].split(',').map((s) => s.trim()) ?? [];
  for (const field of fields) {
    const parts = field.match(/^(\w+)\s+([\w.]+)([\s\S]*)$/);
    if (!parts) throw new Error(`Unrecognized column: ${field}`);
    const [, name, pgType, rest] = parts;
    const nullable = !/\bnot null\b|\bprimary key\b/i.test(rest) && !compositePk.includes(name);
    const type = typeOf(pgType) + (nullable ? ' | null' : '');
    rows.push(`${name}: ${type}`);
    inserts.push(`${name}${nullable || /\bdefault\b|\bgenerated\b/.test(rest) ? '?' : ''}: ${type}`);
    updates.push(`${name}?: ${type}`);
  }
  tables.push(`${match[1]}: { Row: { ${rows.join('; ')} }; Insert: { ${inserts.join('; ')} }; Update: { ${updates.join('; ')} }; Relationships: [] }`);
}
const functions = new Map();
for (const match of sql.matchAll(/create (?:or replace )?function public\.(\w+)\(([\s\S]*?)\)\s+returns\s+(setof\s+public\.\w+|table\([^)]*\)|[\w.]+)/gi)) {
  const [, name, rawArgs, result] = match;
  const args = rawArgs.trim() ? splitColumns(rawArgs).map((arg) => {
    const [key, type] = arg.split(/\s+/);
    return `${key}${/\bdefault\b/i.test(arg) ? '?' : ''}: ${typeOf(type)}${/default null/i.test(arg) ? ' | null' : ''}`;
  }).join('; ') : '';
  let returns = typeOf(result);
  if (result === 'void') returns = 'undefined';
  else if (result.startsWith('setof public.')) returns = `Database['public']['Tables']['${result.slice(13)}']['Row'][]`;
  else if (result.startsWith('table(')) returns = `{ ${splitColumns(result.slice(6, -1)).map((col) => { const [key, type] = col.split(/\s+/); return `${key}: ${typeOf(type)}`; }).join('; ')} }[]`;
  else if (result.startsWith('public.')) returns = `Database['public']['Tables']['${result.slice(7)}']['Row']`;
  functions.set(name, `${name}: { Args: ${args ? `{ ${args} }` : 'Record<PropertyKey, never>'}; Returns: ${returns} }`);
}
const output = `// Generated from supabase/migrations by npm run types:generate. Do not edit.\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\nexport type Database = { public: { Tables: {\n${tables.join(';\n')}\n}; Views: Record<never, never>; Functions: {\n${[...functions.values()].join(';\n')}\n}; Enums: { ${Object.entries(enums).map(([key, type]) => `${key}: ${type}`).join('; ')} }; CompositeTypes: Record<never, never> } };\nexport type TableName = keyof Database['public']['Tables'];\nexport type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];\n`;
if (process.argv.includes('--check')) {
  if (readFileSync('src/lib/database.types.ts', 'utf8') !== output) throw new Error('Schema types are stale. Run npm run types:generate.');
} else writeFileSync('src/lib/database.types.ts', output);
console.log(`Verified ${tables.length} tables and ${functions.size} RPC signatures from SQL migrations.`);
