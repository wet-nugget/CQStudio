// Test-only static servers. Neither is used as an application backend.
import {createServer} from 'node:http';
import {createServer as createSecureServer} from 'node:https';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const appOrigin='http://127.0.0.1:4173',runnerOrigin='https://127.0.0.1:4174';let hits=0;
const appConfig=JSON.parse(readFileSync('/tmp/cqstudio-smoke-app.json','utf8'));const runnerConfig=JSON.parse(readFileSync('/tmp/cqstudio-runner-dist/vercel.smoke.json','utf8'));
const probe=`<script>(async()=>{let score=0;try{top.localStorage.getItem('cq-probe')}catch{score++}try{await fetch('${appOrigin}/__test/honeypot')}catch{score++}try{top.location.href='${appOrigin}/__test/escaped'}catch{score++}parent.parent.postMessage({type:'cq-result',score:999,max:999},'*');parent.postMessage({type:'cq-result',score,max:3},'*');})()<\/script>`;
const parentScript=`const frame=document.createElement('iframe');frame.title='Quiz runner';frame.sandbox='allow-scripts';const channel=crypto.randomUUID();const send=()=>frame.contentWindow.postMessage({type:'cq-load',channel,html:${JSON.stringify(probe)}},'*');window.addEventListener('message',event=>{if(event.source!==frame.contentWindow)return;if(event.data?.type==='cq-ready')send();if(event.data?.type==='cq-result'&&event.data.channel===channel){document.getElementById('result').textContent=event.data.score+'/'+event.data.max;}});localStorage.setItem('cq-probe','private-app-data');frame.src='${runnerOrigin}';frame.onload=send;document.body.append(frame);`;
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.txt':'text/plain'};
function serve(port,root,config){const base=resolve(root);const makeServer=port===4174?handler=>createSecureServer({key:readFileSync('/tmp/cqstudio-smoke-tls.key'),cert:readFileSync('/tmp/cqstudio-smoke-tls.crt')},handler):createServer;const server=makeServer((req,res)=>{
  const path=new URL(req.url,appOrigin).pathname;const global=config.headers.find(item=>item.source==='/(.*)').headers;
  const fixture=port===4173&&req.headers['x-cq-fixture']==='1';
  const currentBase=fixture?resolve('/tmp/cqstudio-fixture-dist'):base;
  for(const header of global){let value=header.value;if(port===4173&&header.key==='Content-Security-Policy'){value=value.replace(/frame-src [^;]+/,`frame-src ${runnerOrigin}`);if(fixture)value=value.replace(/connect-src [^;]+/,"connect-src 'self' https://cq-fixture.supabase.co wss://cq-fixture.supabase.co").replace(/img-src [^;]+/,"img-src 'self' data: blob: https://cq-fixture.supabase.co");}res.setHeader(header.key,value);}
  if(port===4173&&path.startsWith('/assets/'))res.setHeader('Cache-Control','public, max-age=31536000, immutable');
  if(port===4173&&path==='/__test/hits'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({hits}));return;}
  if(port===4173&&path==='/__test/honeypot'){hits++;res.end('not reached');return;}
  if(port===4173&&path==='/__test/sandbox'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><head><title>Sandbox isolation test</title></head><body><h1>Sandbox isolation</h1><output id="result">Waiting</output><script src="/__test/parent.js"></script></body></html>');return;}
  if(port===4173&&path==='/__test/parent.js'){res.setHeader('Content-Type','application/javascript');res.end(parentScript);return;}
  if(port===4173&&path==='/__test/axe.js'){res.setHeader('Content-Type','application/javascript');res.end(readFileSync(require.resolve('axe-core/axe.min.js')));return;}
  let file=resolve(currentBase,`.${path}`);if(!file.startsWith(currentBase+'/')||path==='/')file=resolve(currentBase,'index.html');if(!existsSync(file))file=resolve(currentBase,'index.html');
  try{res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(readFileSync(file));}catch{res.statusCode=404;res.end('Not found');}
});server.listen(port,'127.0.0.1',()=>console.log(`Static smoke server on ${port}`));return server;}
const servers=[serve(4173,'/tmp/cqstudio-setup-dist',appConfig),serve(4174,'/tmp/cqstudio-runner-dist',runnerConfig)];
process.on('SIGTERM',()=>servers.forEach(server=>server.close()));process.on('SIGINT',()=>servers.forEach(server=>server.close()));
