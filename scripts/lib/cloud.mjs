import { deploymentProblems } from './environment.mjs';

export function cloudProblems(env, bootstrap = false) {
  const problems = deploymentProblems(env);
  const ref = env.SUPABASE_PROJECT_REF ?? '';
  if (!/^[a-z0-9]{8,40}$/.test(ref) || /your|example|fixture/i.test(ref))
    problems.push('Add the real SUPABASE_PROJECT_REF repository variable in GitHub.');
  try {
    const host = new URL(env.VITE_SUPABASE_URL).hostname;
    if (host.endsWith('.supabase.co') && host !== `${ref}.supabase.co`)
      problems.push('SUPABASE_PROJECT_REF and VITE_SUPABASE_URL refer to different projects.');
  } catch { /* deploymentProblems reports the invalid URL. */ }
  if (!env.SUPABASE_ACCESS_TOKEN?.trim()) problems.push('Add SUPABASE_ACCESS_TOKEN as a GitHub repository secret.');
  if (bootstrap) {
    if (!validToken(env.CQ_BOOTSTRAP_TOKEN)) problems.push('Add CQ_BOOTSTRAP_TOKEN: a random 32–512 character single-line GitHub repository secret.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.FIRST_ADMIN_EMAIL ?? '')) problems.push('Add the intended FIRST_ADMIN_EMAIL repository secret.');
  } else {
    if (!env.SUPABASE_DB_PASSWORD) problems.push('Add SUPABASE_DB_PASSWORD as a GitHub repository secret.');
    if (!validToken(env.MAINTENANCE_TOKEN)) problems.push('Add MAINTENANCE_TOKEN: a random 32–512 character single-line GitHub repository secret.');
  }
  const prefix = env.GITHUB_REF_NAME === 'main' ? 'CQ_PROD_' : env.GITHUB_REF_NAME === 'development' ? 'CQ_DEV_' : '';
  const labels = { VITE_SUPABASE_URL: 'SUPABASE_URL', VITE_SUPABASE_ANON_KEY: 'SUPABASE_ANON_KEY', VITE_APP_ORIGIN: 'APP_ORIGIN', VITE_QUIZ_RUNNER_ORIGIN: 'RUNNER_ORIGIN', SUPABASE_PROJECT_REF: 'SUPABASE_PROJECT_REF', SUPABASE_ACCESS_TOKEN: 'SUPABASE_ACCESS_TOKEN', SUPABASE_DB_PASSWORD: 'SUPABASE_DB_PASSWORD', MAINTENANCE_TOKEN: 'MAINTENANCE_TOKEN', CQ_BOOTSTRAP_TOKEN: 'BOOTSTRAP_TOKEN', FIRST_ADMIN_EMAIL: 'FIRST_ADMIN_EMAIL' };
  return problems.map(message => {
    if (!prefix) return message;
    return message.replace(/VITE_SUPABASE_ANON_KEY|VITE_SUPABASE_URL|VITE_QUIZ_RUNNER_ORIGIN|VITE_APP_ORIGIN|SUPABASE_PROJECT_REF|SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|CQ_BOOTSTRAP_TOKEN|MAINTENANCE_TOKEN|FIRST_ADMIN_EMAIL/g, name => prefix + labels[name]);
  });
}

export function validToken(value) {
  return typeof value === 'string' && value.length >= 32 && value.length <= 512 && /^[A-Za-z0-9_-]+$/.test(value);
}

export function edgeSecretFile(env, bootstrap = false) {
  const problems = cloudProblems(env, bootstrap);
  if (problems.length) throw new Error(problems.join('\n'));
  return bootstrap
    ? `BOOTSTRAP_TOKEN=${env.CQ_BOOTSTRAP_TOKEN}\n`
    : `APP_ORIGIN=${new URL(env.VITE_APP_ORIGIN).origin}\nMAINTENANCE_TOKEN=${env.MAINTENANCE_TOKEN}\n`;
}
