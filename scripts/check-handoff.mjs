import { existsSync, readFileSync } from 'node:fs';
import { deploymentEnvironment, deploymentProblems } from './lib/environment.mjs';
import { operatorProblems } from './lib/operator.mjs';

const errors = [];
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || major === 22 && minor < 12)
  errors.push('Install Node 24.x (minimum supported: 22.12).');
if (!existsSync('setup/required-files.json')) {
  console.error('Missing setup/required-files.json. Obtain the complete repository, not selected files.');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync('setup/required-files.json', 'utf8'));
for (const path of manifest.files) if (!existsSync(path)) errors.push(`Missing source file: ${path}`);
if (errors.length) {
  console.error('Handoff is incomplete:\n' + errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
for (const section of ['dependencies', 'devDependencies']) {
  if (JSON.stringify(pkg[section]) !== JSON.stringify(lock.packages?.['']?.[section]))
    errors.push(`package.json and package-lock.json ${section} differ. Restore the matching lockfile.`);
}
const ignored = readFileSync('.gitignore', 'utf8').split(/\r?\n/);
if (!ignored.includes('/setup/private/')) errors.push('setup/private/ must be ignored before generating tokens.');
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`PASS: all ${manifest.files.length} listed source files are present; dependency lockfile and private-output ignore rule match.`);
console.log('This is an offline source check. It does not certify a hosted deployment.');
if (!existsSync('node_modules')) console.log('NEXT: npm ci --ignore-scripts');
const pending = [...deploymentProblems(deploymentEnvironment()), ...operatorProblems(JSON.parse(readFileSync('src/config/operator.json', 'utf8')))];
if (pending.length) {
  console.log('Hosting/operator configuration still needs completion:');
  for (const message of pending) console.log(`- ${message}`);
  console.log('Follow START-HERE.md and setup/README.md. This pending configuration is expected in a fresh clone.');
} else console.log('Public configuration fields are filled. Next run npm run deploy:prepare and npm run launch:check, then the live acceptance checks.');
