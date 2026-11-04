// A separate test artifact with fake browser-safe values. Production dist and
// environment files remain untouched. Playwright intercepts every fixture URL.
import { build } from 'vite';
import { execFileSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
process.env.VITE_APP_ORIGIN='http://127.0.0.1:4173';
process.env.VITE_QUIZ_RUNNER_ORIGIN='https://127.0.0.1:4174';
process.env.VITE_SUPABASE_URL='';
process.env.VITE_SUPABASE_ANON_KEY='';
await build({build:{outDir:'/tmp/cqstudio-setup-dist',emptyOutDir:true}});
process.env.VITE_SUPABASE_URL='https://cq-fixture.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY='sb_publishable_cqstudio_test_fixture_only';
await build({build:{outDir:'/tmp/cqstudio-fixture-dist',emptyOutDir:true}});
execFileSync(process.execPath,['runner/build.mjs','--test'],{stdio:'inherit',env:{...process.env,APP_ORIGIN:'http://127.0.0.1:4173'}});
// Exercise the real app's HTTPS-only runner check, including in built fixtures.
// These short-lived test TLS files stay outside all served/deployed directories.
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout','/tmp/cqstudio-smoke-tls.key','-out','/tmp/cqstudio-smoke-tls.crt','-days','2','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost'],{stdio:'ignore'});
chmodSync('/tmp/cqstudio-smoke-tls.key',0o600);
