import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const config=JSON.parse(readFileSync('.cq-deployment/app.json','utf8'));
const headers=config.headers.find((entry)=>entry.source==='/(.*)').headers;
for(const name of ['Content-Security-Policy','Strict-Transport-Security','X-Content-Type-Options','Referrer-Policy','Permissions-Policy','Cross-Origin-Opener-Policy','X-Robots-Tag']) {
  if(!headers.some((entry)=>entry.key===name && entry.value)) throw new Error(`Missing ${name}`);
}
const csp=headers.find((entry)=>entry.key==='Content-Security-Policy').value;
if(!csp.includes("script-src 'self';") || !csp.includes("object-src 'none'")) throw new Error('Unsafe app CSP');
if(!config.headers.some((entry)=>entry.source==='/assets/(.*)' && entry.headers.some((h)=>h.value.includes('immutable')))) throw new Error('Missing asset caching headers');
const html=readFileSync('dist/index.html','utf8');
if(/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) throw new Error('Inline app script found');
const assets=readdirSync('dist/assets').filter((file)=>file.endsWith('.js'));
const manifest=JSON.parse(readFileSync('dist/.vite/manifest.json','utf8'));
const initialFiles=new Set();
function visit(key){const entry=manifest[key];if(!entry)throw new Error(`Missing manifest entry ${key}`);if(initialFiles.has(entry.file))return;initialFiles.add(entry.file);for(const dependency of entry.imports??[])visit(dependency);}
for(const[key,entry]of Object.entries(manifest))if(entry.isEntry)visit(key);
let initial=0;
for(const file of assets) {
  const size=gzipSync(readFileSync(`dist/assets/${file}`)).length;
  const isInitial=initialFiles.has(`assets/${file}`);
  if(isInitial) initial+=size;
  if(!isInitial && size>=100*1024) throw new Error(`${file} exceeds 100 KiB gzipped`);
  console.log(`${file}: ${(size/1024).toFixed(1)} KiB gzip`);
}
if(initial>=200*1024) throw new Error('Initial JS exceeds 200 KiB gzipped');
if(readFileSync('dist/robots.txt','utf8').trim()!=='User-agent: *\nDisallow: /') throw new Error('Private robots configuration missing');
console.log(`Build headers passed; initial JS ${(initial/1024).toFixed(1)} KiB gzip.`);
