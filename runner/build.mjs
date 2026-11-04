import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const file=path=>resolve(root,path);
const output=process.argv.includes('--test')?'/tmp/cqstudio-runner-dist':file('runner/dist');
const app=new URL(process.env.APP_ORIGIN||'http://127.0.0.1:4173');
if(app.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(app.hostname))throw new Error('App origin must use HTTPS.');
if(app.username||app.password||app.pathname!=='/'||app.search||app.hash)throw new Error('APP_ORIGIN must be an exact origin without a path or credentials.');
if((process.env.VERCEL_ENV==='production'||process.env.CQ_DEPLOYMENT==='production')&&(!process.env.APP_ORIGIN||app.protocol!=='https:'||/your_|example|fixture|localhost|127\.0\.0\.1|\.test$|\.local$/i.test(app.hostname)))throw new Error('Set APP_ORIGIN to the real HTTPS app address before deploying the runner to production.');
const csp=`default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${app.origin}`;
const headers=[['Content-Security-Policy',csp],['X-Content-Type-Options','nosniff'],['Referrer-Policy','no-referrer'],['Strict-Transport-Security','max-age=63072000; includeSubDomains'],['Permissions-Policy','camera=(), microphone=(), geolocation=()'],['X-Robots-Tag','noindex, nofollow'],['Cache-Control','no-cache']].map(([key,value])=>({key,value}));
mkdirSync(output,{recursive:true});writeFileSync(resolve(output,'index.html'),readFileSync(file('runner/index.html'),'utf8').replace('__APP_ORIGIN__',app.origin));writeFileSync(resolve(output,'robots.txt'),'User-agent: *\nDisallow: /\n');
const config={buildCommand:'node build.mjs --check',outputDirectory:'dist',headers:[{source:'/(.*)',headers}]};
// When the Vercel project root is runner/, run this from the repository before
// deployment with its exact APP_ORIGIN. --check prevents late config changes.
const serialized=JSON.stringify(config,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(file('runner/vercel.json'),'utf8')!==serialized)throw new Error('Prepare runner/vercel.json with its exact app origin before deployment.');}
else writeFileSync(process.argv.includes('--test')?resolve(output,'vercel.smoke.json'):file('runner/vercel.json'),serialized);
console.log('Built isolated runner with no network permission.');
