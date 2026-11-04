import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cloudProblems, edgeSecretFile } from './lib/cloud.mjs';

const bootstrap = process.argv.includes('--bootstrap');
const problems = cloudProblems(process.env, bootstrap);
if (problems.length) {
  console.error('Cloud deployment configuration is incomplete:\n' + problems.map(message => `- ${message}`).join('\n'));
  process.exit(1);
}
if (process.argv.includes('--write-secrets')) {
  if (!process.env.RUNNER_TEMP || process.env.GITHUB_ACTIONS !== 'true')
    throw new Error('Secret-file creation is restricted to the GitHub Actions temporary directory.');
  mkdirSync(process.env.RUNNER_TEMP, { recursive: true });
  const file = join(process.env.RUNNER_TEMP, bootstrap ? 'cqstudio-bootstrap.env' : 'cqstudio-edge.env');
  writeFileSync(file, edgeSecretFile(process.env, bootstrap), { mode: 0o600 });
}
console.log('Cloud configuration validated. No credential values printed.');
