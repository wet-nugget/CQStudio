import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deploymentEnvironment } from './lib/environment.mjs';
import { appHeaders } from './lib/headers.mjs';
const path = '.cq-deployment/app.json';
const config = JSON.stringify(appHeaders(deploymentEnvironment()), null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== config) throw new Error('Generated headers do not match this build environment. Run npm run headers or rebuild.');
  console.log('Verified generated deployment headers.');
} else {
  mkdirSync('.cq-deployment', { recursive: true });
  writeFileSync(path, config);
  console.log('Generated exact-origin headers for this build; repository configuration was not changed.');
}
