import { createClient } from '@supabase/supabase-js';
import { deploymentEnvironment, deploymentProblems, publicOrigin } from './lib/environment.mjs';

const env = deploymentEnvironment();
const problems = deploymentProblems(env);
if (problems.length) {
  console.error('Live checks need the real public deployment settings:\n' + problems.map(message => `- ${message}`).join('\n'));
  process.exit(1);
}
const app = publicOrigin(env.VITE_APP_ORIGIN, 'App', { production: true });
const runner = publicOrigin(env.VITE_QUIZ_RUNNER_ORIGIN, 'Runner', { production: true });
const provider = publicOrigin(env.VITE_SUPABASE_URL, 'Supabase', { production: true });
const failures = [];
const timedFetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) });
async function check(label, action) {
  try { await action(); console.log(`PASS ${label}`); }
  catch { failures.push(label); console.error(`FAIL ${label}`); }
}
function expect(value) { if (!value) throw new Error('Check failed'); }
async function page(origin, path) {
  const result = await timedFetch(origin + path, { redirect: 'error', cache: 'no-store' });
  expect(result.ok);
  return result;
}
function directive(csp, name) {
  return csp?.split(';').map(value => value.trim()).find(value => value.startsWith(name + ' '))?.slice(name.length + 1);
}

await check('Frontend health response', async () => {
  const result = await page(app, '/health.json');
  const health = await result.json();
  expect(health.app === 'CQStudio' && health.component === 'frontend' && health.status === 'ok');
});
await check('App routing, security headers and entry asset', async () => {
  const result = await page(app, '/login');
  const html = await result.text();
  const csp = result.headers.get('content-security-policy');
  expect(directive(csp, 'script-src') === "'self'");
  expect(directive(csp, 'frame-src') === runner);
  expect(directive(csp, 'connect-src')?.split(' ').includes(provider));
  expect(result.headers.get('x-content-type-options') === 'nosniff');
  expect(result.headers.get('x-robots-tag')?.includes('noindex'));
  expect(result.headers.get('strict-transport-security'));
  expect(result.headers.get('cache-control')?.includes('no-cache'));
  const entry = html.match(/<script\b[^>]*\bsrc="(\/assets\/[^"<>]+\.js)"/i)?.[1];
  expect(entry);
  const asset = await page(app, entry);
  expect(asset.headers.get('content-type')?.includes('javascript'));
  expect(asset.headers.get('cache-control')?.includes('immutable'));
});
await check('Separate quiz runner origin and isolation headers', async () => {
  const result = await page(runner, '/');
  const html = await result.text();
  const csp = result.headers.get('content-security-policy');
  expect(directive(csp, 'frame-ancestors') === app);
  expect(directive(csp, 'connect-src') === "'none'");
  expect(directive(csp, 'frame-src') === 'blob:');
  expect(html.includes(`name="cq-app-origin" content="${app}"`));
  expect(!html.includes('__APP_ORIGIN__'));
});
await check('Database availability and public policy settings', async () => {
  const client = createClient(provider, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: timedFetch },
  });
  const { data, error } = await client.rpc('public_policy_settings');
  expect(!error && typeof data?.policy_version === 'string' && data.policy_version.length > 0);
});
for (const name of ['admin', 'account', 'vault']) {
  await check(`${name} rejects unauthenticated requests`, async () => {
    const result = await timedFetch(`${provider}/functions/v1/${name}`, {
      method: 'POST', headers: { Origin: app, apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: '{}',
    });
    expect(result.status === 401);
  });
}
if (failures.length) process.exitCode = 1;
else console.log('Live availability checks passed. Real invitation, MFA, upload, quiz, deletion and backup-restore workflows still require the launch checklist.');
