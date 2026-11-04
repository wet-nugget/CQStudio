// Operator-only download utility. Uses a current approved-admin session and the
// public key; never accepts a service-role key. Run on encrypted storage.
import { z } from 'zod';
import { readFileSync,writeFileSync,mkdirSync,existsSync,renameSync } from 'node:fs';
import { resolve,dirname,sep } from 'node:path';
import { createHash } from 'node:crypto';

const uuid=z.uuid(),date=z.string();
const fileSchema=z.strictObject({id:uuid,folder_id:uuid.nullable(),path:z.string().max(500).regex(/^[a-zA-Z0-9_./-]+$/).refine(value=>value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..')),name:z.string(),mime:z.string(),size:z.number().int().positive().max(52428800),description:z.string(),purpose:z.enum(['vault','html_quiz']),state:z.enum(['pending','ready','deleting']),created_by:uuid.nullable(),created_at:date,expires_at:date,ready_at:date.nullable()});
const exportSchema=z.strictObject({format_version:z.literal(1),exported_at:date,settings:z.unknown(),classes:z.array(z.unknown()),lessons:z.array(z.unknown()),notes:z.array(z.unknown()),folders:z.array(z.unknown()),files:z.array(fileSchema),quizzes:z.array(z.unknown()),quiz_versions:z.array(z.unknown()),quiz_reviews:z.array(z.unknown()),chat_messages:z.array(z.unknown()),activity_log:z.array(z.unknown())});
function role(key){try{return JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role;}catch{return null;}}
try{
  const [source,destination]=process.argv.slice(2);
  if(!source||!destination)throw new Error('Arguments required');
  const project=new URL(process.env.SUPABASE_URL??'');
  const key=process.env.SUPABASE_ANON_KEY??'',token=process.env.CQ_BACKUP_ACCESS_TOKEN??'';
  if(project.protocol!=='https:'||project.pathname!=='/'||(!key.startsWith('sb_publishable_')&&role(key)!=='anon')||role(token)!=='authenticated')throw new Error('Use an HTTPS project, public key, and current member session');
  const metadata=exportSchema.parse(JSON.parse(readFileSync(source,'utf8')));
  const files=metadata.files.filter(file=>file.state==='ready');
  const root=resolve(destination);mkdirSync(root,{recursive:true,mode:0o700});
  const manifestPath=resolve(root,'cqstudio-manifest.json');
  const manifestSchema=z.strictObject({exported_at:z.string(),files:z.array(z.strictObject({path:z.string(),size:z.number(),sha256:z.string()}))});
  const previous=existsSync(manifestPath)?manifestSchema.parse(JSON.parse(readFileSync(manifestPath,'utf8'))):{exported_at:metadata.exported_at,files:[]};
  if(previous.exported_at!==metadata.exported_at)throw new Error('Use a separate directory for a different snapshot');
  const manifest=new Map(previous.files.map(item=>[item.path,item]));let processed=0;
  for(const file of files){
    const target=resolve(root,file.path);
    if(!target.startsWith(root+sep))throw new Error('Unsafe object path');
    let bytes;
    if(existsSync(target)){
      bytes=readFileSync(target);
      const digest=createHash('sha256').update(bytes).digest('hex');
      const old=manifest.get(file.path);
      if(!old||old.size!==bytes.length||old.sha256!==digest||bytes.length!==file.size)throw new Error('Existing file lacks a matching verified manifest');
    }else{
      const signed=await fetch(new URL('/functions/v1/vault',project),{method:'POST',headers:{authorization:`Bearer ${token}`,apikey:key,'content-type':'application/json'},body:JSON.stringify({action:'download',file_id:file.id})});
      if(!signed.ok)throw new Error('Access expired or object unavailable');
      const result=z.strictObject({url:z.url(),expires_in:z.number().positive().max(60)}).parse(await signed.json());
      const url=new URL(result.url);
      if(url.origin!==project.origin||!url.pathname.startsWith('/storage/v1/object/sign/cq-vault/'))throw new Error('Unexpected download origin');
      const response=await fetch(url,{credentials:'omit',cache:'no-store'});
      if(!response.ok)throw new Error('Download failed');
      bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length!==file.size)throw new Error('Object size changed');
      mkdirSync(dirname(target),{recursive:true,mode:0o700});
      writeFileSync(target+'.part',bytes,{flag:'wx',mode:0o600});renameSync(target+'.part',target);
    }
    manifest.set(file.path,{path:file.path,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
    writeFileSync(manifestPath,JSON.stringify({exported_at:metadata.exported_at,files:[...manifest.values()]},null,2),{mode:0o600});
    console.log(`Verified ${++processed}/${files.length} objects.`);
  }
  if(!files.length)writeFileSync(manifestPath,JSON.stringify({exported_at:metadata.exported_at,files:[]},null,2),{mode:0o600});
  console.log('Storage download complete. Retain the JSON export, database dump, and manifest together.');
}catch{
  console.error('Backup stopped. Check arguments, public settings, admin session/MFA, quota, and manifest. No credential or signed URL is printed. Keep verified files and refresh the session before retrying.');
  process.exitCode=1;
}
