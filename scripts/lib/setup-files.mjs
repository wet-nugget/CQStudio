import { randomBytes } from 'node:crypto';
import { deploymentProblems, publicOrigin } from './environment.mjs';

// Pure preparation: no network, no deployment, no writes. Shared tokens are
// generated once per environment and reused consistently across destinations.
export function setupFiles(environment, values, previousEdge = {}) {
  if (!['development', 'production'].includes(environment))
    throw new Error('Choose development or production.');
  const problems = deploymentProblems(values);
  if (problems.length) throw new Error(problems.join('\n'));
  const app = publicOrigin(values.VITE_APP_ORIGIN, 'App', { production: true });
  const runner = publicOrigin(values.VITE_QUIZ_RUNNER_ORIGIN, 'Runner', { production: true });
  const provider = publicOrigin(values.VITE_SUPABASE_URL, 'Supabase', { production: true });
  const existing = Object.keys(previousEdge).length > 0;
  if (existing && (!/^[a-f0-9]{64}$/.test(previousEdge.BOOTSTRAP_TOKEN ?? '') || !/^[a-f0-9]{64}$/.test(previousEdge.MAINTENANCE_TOKEN ?? '')))
    throw new Error('Existing generated tokens are missing or changed. Inspect the private setup file; they will not be silently replaced.');
  if (existing && previousEdge.BOOTSTRAP_TOKEN === previousEdge.MAINTENANCE_TOKEN)
    throw new Error('Bootstrap and maintenance must have different tokens.');
  const bootstrap = previousEdge.BOOTSTRAP_TOKEN ?? randomBytes(32).toString('hex');
  const maintenance = previousEdge.MAINTENANCE_TOKEN ?? randomBytes(32).toString('hex');
  const appEnv = {
    VITE_SUPABASE_URL: provider,
    VITE_SUPABASE_ANON_KEY: values.VITE_SUPABASE_ANON_KEY,
    VITE_APP_ORIGIN: app,
    VITE_QUIZ_RUNNER_ORIGIN: runner,
  };
  const env = object => Object.entries(object).map(([name, value]) => `${name}=${value}`).join('\n') + '\n';
  const json = object => JSON.stringify(object, null, 2) + '\n';
  const files = {
    'app.env': env(appEnv),
    'runner.env': env({ APP_ORIGIN: app }),
    'edge.env': env({ APP_ORIGIN: app, BOOTSTRAP_TOKEN: bootstrap, MAINTENANCE_TOKEN: maintenance }),
    'bootstrap.env': env({ SUPABASE_URL: provider, CQ_BOOTSTRAP_TOKEN: bootstrap }),
    'vault-secrets.json': json({ cqstudio_maintenance_url: `${provider}/functions/v1/maintenance`, cqstudio_maintenance_token: maintenance }),
  };
  if (environment === 'production')
    files['github-variables.json'] = json({ CQ_PROD_APP_ORIGIN: app, CQ_PROD_RUNNER_ORIGIN: runner, CQ_PROD_SUPABASE_URL: provider, CQ_PROD_SUPABASE_ANON_KEY: values.VITE_SUPABASE_ANON_KEY });
  else
    files['github-secrets.env'] = env({ CQ_DEV_SUPABASE_URL: provider, CQ_DEV_MAINTENANCE_TOKEN: maintenance });
  return files;
}
