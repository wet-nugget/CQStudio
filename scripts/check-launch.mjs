import { readFileSync } from 'node:fs';
import { deploymentEnvironment, deploymentProblems } from './lib/environment.mjs';
import { operatorProblems } from './lib/operator.mjs';

const env = deploymentEnvironment();
if (process.argv.includes('--if-production') && env.VERCEL_ENV !== 'production' && env.CQ_DEPLOYMENT !== 'production')
  process.exit(0);

const problems = deploymentProblems(env);
problems.push(...operatorProblems(JSON.parse(readFileSync('src/config/operator.json', 'utf8'))));
const runner = JSON.parse(readFileSync('runner/vercel.json', 'utf8'));
const runnerCsp = runner.headers?.find(item => item.source === '/(.*)')?.headers?.find(item => item.key === 'Content-Security-Policy')?.value;
if (!env.VITE_APP_ORIGIN || runnerCsp?.match(/(?:^|;\s*)frame-ancestors ([^;]+)/)?.[1] !== env.VITE_APP_ORIGIN.replace(/\/$/, ''))
  problems.push('Prepare runner/vercel.json for the real app origin using npm run deploy:prepare.');

if (problems.length) {
  console.error('Production launch is blocked:\n' + problems.map(message => `- ${message}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Production configuration and policy checks passed. Hosted Auth, database, SMTP, backups and live checks still require verification; see docs/LAUNCH.md.');
}
