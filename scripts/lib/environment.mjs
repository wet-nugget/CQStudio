import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// Match Vite's production-file precedence. Existing process variables win.
export function deploymentEnvironment(root = process.cwd(), supplied = process.env) {
  const values = {};
  for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    try { Object.assign(values, parseEnv(readFileSync(`${root}/${name}`, 'utf8'))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { ...values, ...supplied };
}

export function publicOrigin(value, label, { production = false } = {}) {
  if (typeof value === 'string' && value.includes('$'))
    throw new Error(`${label} must be a literal origin, without environment-variable interpolation.`);
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label} must be an exact website origin.`); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!['https:', 'http:'].includes(url.protocol) || (url.protocol === 'http:' && !local)
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error(`${label} must be an exact HTTPS origin without a path, query, or credentials.`);
  if (production && (url.protocol !== 'https:' || local || /your_|example|fixture|\.test$|\.local$/i.test(url.hostname)))
    throw new Error(`${label} needs a real public HTTPS address before launch.`);
  return url.origin;
}

export function publicKey(value) {
  if (typeof value !== 'string' || /[\r\n]/.test(value) || /YOUR_|fixture|example/i.test(value)) return false;
  if (/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(value)) return true;
  try { return JSON.parse(Buffer.from(value.split('.')[1], 'base64url')).role === 'anon'; }
  catch { return false; }
}

export function deploymentProblems(env) {
  const problems = [];
  const origins = {};
  for (const name of ['VITE_SUPABASE_URL', 'VITE_APP_ORIGIN', 'VITE_QUIZ_RUNNER_ORIGIN']) {
    try { origins[name] = publicOrigin(env[name], name, { production: true }); }
    catch (error) { problems.push(error.message); }
  }
  if (!publicKey(env.VITE_SUPABASE_ANON_KEY))
    problems.push('VITE_SUPABASE_ANON_KEY must contain a browser-safe publishable or anon key. Never use a service credential.');
  if (origins.VITE_APP_ORIGIN && origins.VITE_APP_ORIGIN === origins.VITE_QUIZ_RUNNER_ORIGIN)
    problems.push('The app and HTML quiz runner must use different origins.');
  return problems;
}
