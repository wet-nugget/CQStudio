import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readdirSync('supabase/migrations').sort().map(file=>readFileSync(`supabase/migrations/${file}`,'utf8')).join('\n');
describe('migration safety',()=>{
  it('enables RLS and defines an explicit policy for each application table',()=>{
    const tables=[...sql.matchAll(/create table public\.(\w+)/g)].map(match=>match[1]);
    expect(tables).toHaveLength(17);
    for(const table of tables){expect(sql).toContain(`alter table public.${table} enable row level security`);expect(sql).toMatch(new RegExp(`create policy \\w+ on public\\.${table}\\b`));}
  });
  it('sets a fixed search path for all security-definer functions',()=>{
    for(const match of sql.matchAll(/create (?:or replace )?function ([\s\S]*?)\$\$/g)){
      if(match[1]?.includes('security definer'))expect(match[1]).toMatch(/set\s+search_path\s*=\s*''/);
    }
  });
  it('keeps sensitive administrative RPCs service-only',()=>{
    expect(sql).toContain('public.change_member(uuid,uuid,public.member_role,public.member_status) to service_role');
    expect(sql).not.toMatch(/grant execute[^;]*change_member[^;]*to authenticated/s);
    expect(sql).not.toMatch(/grant (?:all|update)[^;]*on public\.profiles[^;]*to authenticated/s);
  });
});
