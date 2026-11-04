import {execFileSync} from 'node:child_process';
import {createHmac} from 'node:crypto';
const uid='03000000-0000-4000-8000-000000000001',sid='13000000-0000-4000-8000-000000000001';
const sql=(input)=>execFileSync('podman',['exec','-i','cqstudio-db-test','psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input,encoding:'utf8'});
const sign=(role)=>{const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');const payload=Buffer.from(JSON.stringify({role,...(role==='authenticated'?{sub:uid,session_id:sid,aal:'aal1',aud:'authenticated'}:{}),exp:Math.floor(Date.now()/1000)+300})).toString('base64url');const body=`${header}.${payload}`;return `${body}.${createHmac('sha256','cqstudio-disposable-test-signing-key-only').update(body).digest('base64url')}`;};
let file;
try{
  sql(`insert into auth.users(id,email,email_confirmed_at)values('${uid}','storage-api@example.test',now());insert into auth.sessions(id,user_id,created_at,updated_at)values('${sid}','${uid}',now(),now());insert into public.profiles(id,username,display_name,policy_version,policy_accepted_at)values('${uid}','storage_api_test','Storage API test','2026-11-01',now());`);
  const output=sql(`begin;set local role authenticated;select set_config('request.jwt.claims','{"sub":"${uid}","session_id":"${sid}","aal":"aal1"}',true);select row_to_json(r) from public.request_upload('integration.txt',5,'text/plain') r;commit;`);
  file=JSON.parse(output.split('\n').find(line=>line.startsWith('{"id":')));
  const code=`const upload=await fetch('http://127.0.0.1:5000/object/cq-vault/'+${JSON.stringify(file.path)},{method:'POST',headers:{authorization:'Bearer '+${JSON.stringify(sign('authenticated'))},'content-type':'text/plain','cache-control':'max-age=3600','x-upsert':'false'},body:new TextEncoder().encode('hello')});if(!upload.ok){console.log('Upload status:',upload.status,await upload.text());process.exit(1);}const direct=await fetch('http://127.0.0.1:5000/object/authenticated/cq-vault/'+${JSON.stringify(file.path)},{headers:{authorization:'Bearer '+${JSON.stringify(sign('authenticated'))}}});if(direct.ok)throw new Error('Raw download must be denied');console.log('Real Storage upload accepted matching reservation; raw authenticated download denied.');`;
  console.log(execFileSync('podman',['exec','-i','cqstudio-storage-test','node','--input-type=module'],{input:code,encoding:'utf8'}));
  const finalPath=`ready/${file.id}.txt`;
  const move=`const headers={authorization:'Bearer '+${JSON.stringify(sign('service_role'))},'content-type':'application/json'};const r=await fetch('http://127.0.0.1:5000/object/copy',{method:'POST',headers,body:JSON.stringify({bucketId:'cq-vault',sourceKey:${JSON.stringify(file.path)},destinationKey:${JSON.stringify(finalPath)}})});if(!r.ok)throw new Error(await r.text());const d=await fetch('http://127.0.0.1:5000/object/cq-vault',{method:'DELETE',headers,body:JSON.stringify({prefixes:[${JSON.stringify(file.path)}]})});if(!d.ok)throw new Error('Original cleanup failed');`;
  console.log('Before adoption, owner:',sql(`select owner_id='${uid}' from storage.objects where bucket_id='cq-vault' and name='${file.path}';`).trim());
  execFileSync('podman',['exec','-i','cqstudio-storage-test','node','--input-type=module'],{input:move,encoding:'utf8'});
  file.path=finalPath;
  if(sql(`select coalesce(owner_id,'')='' from storage.objects where bucket_id='cq-vault' and name='${finalPath}';`).trim()!=='t')throw new Error('Service adoption must clear member ownership');
  sql(`select public.finalize_upload('${file.id}','${uid}');`);
  console.log('Finalization verified size, MIME, and ownerless shared storage for account deletion.');
  const signed=`const r=await fetch('http://127.0.0.1:5000/object/sign/cq-vault/'+${JSON.stringify(file.path)},{method:'POST',headers:{authorization:'Bearer '+${JSON.stringify(sign('service_role'))},'content-type':'application/json'},body:JSON.stringify({expiresIn:60})});if(!r.ok)throw new Error('Signing failed');const data=await r.json();const url=new URL(data.signedURL,'http://127.0.0.1:5000');url.searchParams.set('download','integration.txt');const download=await fetch(url);if(!download.ok||await download.text()!=='hello'||!download.headers.get('content-disposition')?.startsWith('attachment'))throw new Error('Signed attachment delivery failed');console.log('Short-lived signed attachment downloads correctly without raw Storage SELECT access.');`;
  console.log(execFileSync('podman',['exec','-i','cqstudio-storage-test','node','--input-type=module'],{input:signed,encoding:'utf8'}));
}finally{
  if(file){
    const code=`const response=await fetch('http://127.0.0.1:5000/object/cq-vault',{method:'DELETE',headers:{authorization:'Bearer '+${JSON.stringify(sign('service_role'))},'content-type':'application/json'},body:JSON.stringify({prefixes:[${JSON.stringify(file.path)}]})});if(!response.ok)throw new Error('Test object cleanup failed');`;
    execFileSync('podman',['exec','-i','cqstudio-storage-test','node','--input-type=module'],{input:code});
    sql(`delete from public.files where id='${file.id}';`);
  }
  sql(`delete from auth.users where id='${uid}';`);
}
