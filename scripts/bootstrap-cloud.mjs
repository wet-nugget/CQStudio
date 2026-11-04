import { cloudProblems } from './lib/cloud.mjs';

const problems = cloudProblems(process.env, true);
if (problems.length) {
  console.error(problems.map(message => `- ${message}`).join('\n'));
  process.exit(1);
}
const response = await fetch(new URL('/functions/v1/bootstrap-admin', process.env.VITE_SUPABASE_URL), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-bootstrap-token': process.env.CQ_BOOTSTRAP_TOKEN },
  body: JSON.stringify({ email: process.env.FIRST_ADMIN_EMAIL.trim().toLowerCase() }),
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) {
  console.error(`First-admin invitation failed (HTTP ${response.status}). Inspect Supabase function/SMTP logs; no provider body or recipient was printed.`);
  process.exitCode = 1;
} else console.log('First-admin invitation sent. Open the intended inbox, accept the policy, choose your own password and enable MFA.');
