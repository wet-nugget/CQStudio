import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, constants } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { publicOrigin, publicKey } from './lib/environment.mjs';
import { setupFiles } from './lib/setup-files.mjs';

if (process.argv.includes('--help')) {
  console.log('CQStudio local setup wizard\nRun npm run setup in the repository root. It asks for development/production public addresses and a browser-safe key, then generates consistent private setup files. It never contacts GitHub, Supabase or Vercel, deploys anything, or marks policies reviewed. Existing generated tokens are preserved. See setup/README.md.');
  process.exit(0);
}
if (!stdin.isTTY || !stdout.isTTY) {
  console.error('Run npm run setup in an interactive terminal. For file-by-file setup, use setup/README.md and setup/templates/.');
  process.exit(1);
}
if (!existsSync('src/config/operator.json') || !existsSync('supabase/config.toml')) {
  console.error('Open the repository root containing package.json before running setup.');
  process.exit(1);
}
if (!existsSync('.gitignore') || !readFileSync('.gitignore', 'utf8').split(/\r?\n/).includes('/setup/private/')) {
  console.error('Restore the complete .gitignore with /setup/private/ excluded before generating tokens. No files changed.');
  process.exit(1);
}
const prompt = createInterface({ input: stdin, output: stdout });
try {
  console.log('CQStudio local setup. This creates files only; it does not connect to any account.\nUse the real reserved HTTPS addresses. Do not paste a service key or password.');
  let environment;
  while (!environment) {
    const answer = (await prompt.question('Environment [development/production]: ')).trim().toLowerCase();
    if (['development', 'production'].includes(answer)) environment = answer;
    else console.log('Enter development or production.');
  }
  const values = {};
  for (const [name, label] of [
    ['VITE_SUPABASE_URL', 'Supabase project URL'],
    ['VITE_APP_ORIGIN', 'Main app HTTPS origin'],
    ['VITE_QUIZ_RUNNER_ORIGIN', 'Separate HTML runner HTTPS origin'],
  ]) {
    while (!values[name]) {
      const answer = (await prompt.question(`${label}: `)).trim();
      try { values[name] = publicOrigin(answer, label, { production: true }); }
      catch (error) { console.log(error.message); }
      if (name === 'VITE_QUIZ_RUNNER_ORIGIN' && values[name] === values.VITE_APP_ORIGIN) {
        console.log('Use a different origin for the HTML runner.');
        delete values[name];
      }
    }
  }
  while (!values.VITE_SUPABASE_ANON_KEY) {
    const answer = (await prompt.question('Browser-safe publishable/anon key (never a service key): ')).trim();
    if (publicKey(answer)) values.VITE_SUPABASE_ANON_KEY = answer;
    else console.log('Use the publishable or anon key from this project; secret/service keys and placeholders are rejected.');
  }
  const directory = resolve('setup/private', environment);
  const otherEnvironment = environment === 'development' ? 'production' : 'development';
  const otherApp = resolve('setup/private', otherEnvironment, 'app.env');
  if (existsSync(otherApp) && parseEnv(readFileSync(otherApp, 'utf8')).VITE_SUPABASE_URL === values.VITE_SUPABASE_URL)
    throw new Error('Development and production must use different Supabase projects. No files changed.');
  const edgePath = resolve(directory, 'edge.env');
  const previous = existsSync(edgePath) ? parseEnv(readFileSync(edgePath, 'utf8')) : {};
  // A different provider means a different environment, not permission to reuse
  // already-issued credentials. Require deliberate inspection instead of rotation.
  const previousApp = resolve(directory, 'app.env');
  if (existsSync(previousApp) && parseEnv(readFileSync(previousApp, 'utf8')).VITE_SUPABASE_URL !== values.VITE_SUPABASE_URL)
    throw new Error('This environment already names another Supabase project. Inspect/archive its private setup directory before generating for a different project. No files changed.');
  const files = setupFiles(environment, values, previous);
  let replaceLocal = !existsSync('.env.local');
  if (!replaceLocal) replaceLocal = (await prompt.question('Replace existing .env.local with this environment? A private backup will be kept. [y/N]: ')).trim().toLowerCase() === 'y';
  mkdirSync('setup/private', { recursive: true, mode: 0o700 });
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  for (const [name, contents] of Object.entries(files)) {
    const path = resolve(directory, name);
    writeFileSync(path, contents, { mode: 0o600 });
    chmodSync(path, 0o600);
  }
  if (replaceLocal) {
    if (existsSync('.env.local')) {
      const backup = resolve(directory, `previous-local-${Date.now()}.env`);
      copyFileSync('.env.local', backup, constants.COPYFILE_EXCL);
      chmodSync(backup, 0o600);
    }
    writeFileSync('.env.local', files['app.env'], { mode: 0o600 });
    chmodSync('.env.local', 0o600);
  }
  console.log(`Prepared setup/private/${environment}/. No token values were printed.`);
  console.log(replaceLocal ? '.env.local now selects this environment.' : '.env.local was preserved. Select the intended environment before preparing/building deployments.');
  console.log('Next: follow setup/README.md to put each file into its named destination. Complete and review src/config/operator.json, then run npm run deploy:prepare and npm run launch:check.');
  console.log('After successful first-admin acceptance, remove the hosted BOOTSTRAP_TOKEN and delete the local bootstrap token copies as described in the guide. Do not upload setup/private/.');
}
catch (error) {
  console.error(error instanceof Error ? error.message : 'Setup did not complete. Inspect private files before retrying.');
  process.exitCode = 1;
}
finally { prompt.close(); }
