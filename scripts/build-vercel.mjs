import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { outputConfig } from '../runner/output.mjs';

execFileSync('npm', ['run', 'build'], { stdio: 'inherit', env: { ...process.env, CQ_DEPLOYMENT: 'production' } });
const output = '.vercel/output';
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync('dist', `${output}/static`, { recursive: true });
const headers = JSON.parse(readFileSync('.cq-deployment/app.json', 'utf8')).headers;
writeFileSync(`${output}/config.json`, JSON.stringify(outputConfig(headers, true), null, 2) + '\n');
console.log('Vercel output ready. Headers and SPA routes were generated from this cloud build environment.');
