import { expect,it } from 'vitest';
import { mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

it('backs up signed bytes, resumes from checksums, and rejects corruption or traversal',()=>{
  const root=mkdtempSync(join(tmpdir(),'cq-backup-test-'));
  try{
    const id='09000000-0000-4000-8000-000000000001',date='2026-11-01T00:00:00Z';
    const file={id,folder_id:null,path:'ready/test.txt',name:'test.txt',mime:'text/plain',size:5,description:'',purpose:'vault',state:'ready',created_by:null,created_at:date,expires_at:date,ready_at:date};
    const snapshot={format_version:1,exported_at:date,settings:{},classes:[],lessons:[],notes:[],folders:[],files:[file],quizzes:[],quiz_versions:[],quiz_reviews:[],chat_messages:[],activity_log:[]};
    const source=join(root,'workspace.json'),output=join(root,'objects'),harness=join(root,'mock.mjs');
    writeFileSync(source,JSON.stringify(snapshot));
    writeFileSync(harness,"globalThis.fetch=async url=>String(url).includes('/functions/')?new Response(JSON.stringify({url:'https://backup-fixture.supabase.co/storage/v1/object/sign/cq-vault/ready/test.txt?token=fixture',expires_in:60}),{headers:{'content-type':'application/json'}}):new Response('hello');");
    const token=`test.${Buffer.from('{"role":"authenticated"}').toString('base64url')}.test`;
    const run=()=>spawnSync(process.execPath,['--import',pathToFileURL(harness).href,resolve('scripts/backup-storage.mjs'),source,output],{encoding:'utf8',env:{...process.env,SUPABASE_URL:'https://backup-fixture.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_fixture_only',CQ_BACKUP_ACCESS_TOKEN:token}});
    expect(run().status).toBe(0);expect(readFileSync(join(output,'ready/test.txt'),'utf8')).toBe('hello');
    const manifest=JSON.parse(readFileSync(join(output,'cqstudio-manifest.json'),'utf8'));
    expect(manifest.files).toEqual([{path:'ready/test.txt',size:5,sha256:createHash('sha256').update('hello').digest('hex')}]);
    writeFileSync(harness,"globalThis.fetch=async()=>{throw new Error('Resumed files must not be downloaded again')};");
    expect(run().status).toBe(0);
    writeFileSync(join(output,'ready/test.txt'),'wrong');const failure=run();expect(failure.status).toBe(1);expect(failure.stderr).not.toContain(token);
    writeFileSync(source,JSON.stringify({...snapshot,files:[{...file,path:'../escape.txt'}]}));expect(run().status).toBe(1);expect(existsSync(join(root,'escape.txt'))).toBe(false);
  }finally{rmSync(root,{recursive:true,force:true});}
});
