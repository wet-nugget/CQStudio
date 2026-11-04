import { execFileSync } from 'node:child_process';
import { deploymentEnvironment, deploymentProblems } from './lib/environment.mjs';

const env = deploymentEnvironment();
const problems = deploymentProblems(env);
if (problems.length) {
  console.error('Deployment preparation needs public configuration:\n' + problems.map(message => `- ${message}`).join('\n'));
  process.exitCode = 1;
} else {
  execFileSync(process.execPath, ['scripts/prepare-headers.mjs'], { env, stdio: 'inherit' });
  execFileSync(process.execPath, ['runner/build.mjs'], { env: { ...env, APP_ORIGIN: env.VITE_APP_ORIGIN }, stdio: 'inherit' });
  console.log('Prepared local artifacts. Vercel Git builds generate their own exact-origin headers from dashboard values; no local files need uploading.');
}
