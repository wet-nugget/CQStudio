// Destructive ONLY to the two disposable cqstudio-*-test containers. No URL,
// credentials, or container name can be supplied by the caller.
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
const head=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
const body=Buffer.from(JSON.stringify({role:'service_role',exp:Math.floor(Date.now()/1000)+60})).toString('base64url');
const raw=`${head}.${body}`;
const token=`${raw}.${createHmac('sha256','cqstudio-disposable-test-signing-key-only').update(raw).digest('base64url')}`;
const code=`const response=await fetch('http://127.0.0.1:5000/bucket/cq-vault',{method:'DELETE',headers:{authorization:'Bearer '+${JSON.stringify(token)}}});if(!response.ok&&response.status!==404)throw new Error('Disposable bucket must be empty before rebuilding');`;
execFileSync('podman',['exec','-i','cqstudio-storage-test','node','--input-type=module'],{input:code,stdio:['pipe','inherit','inherit']});
execFileSync('podman',['exec','-i','cqstudio-db-test','psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:'drop schema public cascade; drop schema private cascade; create schema public; grant usage on schema public to anon,authenticated,service_role;',stdio:['pipe','inherit','inherit']});
execFileSync(process.execPath,['scripts/test-database.mjs'],{stdio:'inherit'});
