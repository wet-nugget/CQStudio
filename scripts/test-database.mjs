import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

// Run ONLY against the disposable container created for tests. This script
// deliberately cannot accept a database URL or a production container name.
const name='cqstudio-db-test';
const run=(sql)=>execFileSync('podman',['exec','-i',name,'psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:sql,encoding:'utf8'});
const exists=run("select count(*) from information_schema.tables where table_schema='public' and table_name='profiles';");
if(exists.trim()==='0'){
  run("do $$ begin if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if; end $$;");
  for(const file of readdirSync('supabase/migrations').sort()){
    console.log(`Applying ${file}`);
    run(`begin;\n${readFileSync(`supabase/migrations/${file}`,'utf8')}\ncommit;`);
  }
}
for(const file of readdirSync('supabase/tests/database').sort()){
  const result=run(readFileSync(`supabase/tests/database/${file}`,'utf8'));
  console.log(result);
  if(/not ok|Looks like you|planned \d+ tests but ran/.test(result))throw new Error(`Database test failed: ${file}`);
}
