import { readFileSync, writeFileSync } from 'node:fs';
import { deploymentEnvironment, publicOrigin } from './lib/environment.mjs';

const env = deploymentEnvironment();

function origin(value, fallback) {
  return publicOrigin(value || fallback, 'Deployment origin');
}
const supabase = origin(env.VITE_SUPABASE_URL, 'https://YOUR_DEV_PROJECT.supabase.co');
const runner = origin(env.VITE_QUIZ_RUNNER_ORIGIN, 'https://YOUR_RUNNER.vercel.app');
const app = origin(env.VITE_APP_ORIGIN, 'http://localhost:5173');
if (runner === app) throw new Error('The quiz runner must have a different origin.');
const csp = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${supabase}; connect-src 'self' ${supabase} ${supabase.replace('https:', 'wss:').replace('http:', 'ws:')}; frame-src ${runner}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`;
const headers = [
  ['Content-Security-Policy', csp], ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
  ['X-Content-Type-Options','nosniff'], ['Referrer-Policy','strict-origin-when-cross-origin'],
  ['Permissions-Policy','camera=(), microphone=(), geolocation=()'], ['Cross-Origin-Opener-Policy','same-origin'],
  ['X-Robots-Tag','noindex, nofollow'],
].map(([key,value])=>({key,value}));
const config = JSON.stringify({
  framework: 'vite', buildCommand: 'npm run build', outputDirectory: 'dist',
  rewrites: [{ source: '/((?!assets/|robots.txt|favicon.svg|health.json).*)', destination: '/index.html' }],
  headers: [
    { source: '/(.*)', headers: [...headers, {key:'Cache-Control',value:'no-cache'}] },
    { source: '/assets/(.*)', headers: [{key:'Cache-Control',value:'public, max-age=31536000, immutable'}] },
    { source: '/sw.js', headers: [{key:'Cache-Control',value:'no-cache'}] },
  ],
}, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync('vercel.json','utf8') !== config) throw new Error('Deployment origins changed. Run npm run headers before creating the Vercel deployment; Vercel reads vercel.json before build.');
  console.log('Verified deployment headers match environment origins.');
} else {
  writeFileSync('vercel.json', config);
  console.log('Prepared deployment headers for app and isolated quiz origin.');
}
