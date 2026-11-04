import { readdirSync, readFileSync } from 'node:fs';
const skip=new Set(['node_modules','dist','.git','.agents','.codex','.aws','test-results','playwright-report','backups']);
function walk(path){return readdirSync(path,{withFileTypes:true}).flatMap(item=>skip.has(item.name)||(item.name.startsWith('.env')&&item.name!=='.env.example')?[]:item.isDirectory()?walk(`${path}/${item.name}`):[`${path}/${item.name}`]);}
const failures=[];
for(const file of walk('.')){
  if(file.endsWith('package-lock.json'))continue;
  const value=readFileSync(file,'utf8');
  if(/sb_secret_[a-zA-Z0-9_-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[A-Z0-9]{16}\b/.test(value))failures.push(file);
  for(const jwt of value.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)){
    try{const payload=JSON.parse(Buffer.from(jwt[0].split('.')[1],'base64url'));if(payload.role==='service_role')failures.push(file);}catch{/* Not a JWT. */}
  }
}
if(failures.length)throw new Error(`Potential credentials in: ${[...new Set(failures)].join(', ')}`);
console.log('No recognized service-role keys, private keys, or cloud access keys found.');
