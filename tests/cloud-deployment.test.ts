import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { appHeaders } from '../scripts/lib/headers.mjs';
import { runnerHeaders } from '../runner/config.mjs';
import { outputConfig } from '../runner/output.mjs';
import { cloudProblems, edgeSecretFile } from '../scripts/lib/cloud.mjs';

const env = {
    VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'sb_publishable_12345678901234567890',
    VITE_APP_ORIGIN: 'https://cq-cloud.vercel.app',
    VITE_QUIZ_RUNNER_ORIGIN: 'https://cq-cloud-runner.vercel.app',
    SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
    SUPABASE_ACCESS_TOKEN: 'test-management-access-only',
    SUPABASE_DB_PASSWORD: 'test-database-password-only',
    MAINTENANCE_TOKEN: 'a'.repeat(64),
    CQ_BOOTSTRAP_TOKEN: 'b'.repeat(64),
    FIRST_ADMIN_EMAIL: 'admin@cq.test',
};
describe('GitHub-sourced cloud deployment', () => {
    it('excludes generated hosting output and private data from the pushed source manifest', () => {
        const files = JSON.parse(readFileSync('setup/required-files.json', 'utf8')).files as string[];
        for (const path of files)
            expect(path.split('/').some(part => ['.vercel', '.cq-deployment', 'node_modules', 'dist', 'private', 'backups'].includes(part)), path).toBe(false);
        expect(files).toContain('runner/vercel.json');
        expect(files).toContain('.github/workflows/deploy-supabase.yml');
    });
    it('generates exact-origin app headers and asset caching at build time', () => {
        const config = outputConfig(appHeaders(env).headers, true);
        expect(config.version).toBe(3);
        const asset = config.routes.find(route => route.src === '/assets/(.*)')!;
        expect(asset.headers?.['Cache-Control']).toContain('immutable');
        expect(asset.headers?.['Content-Security-Policy']).toContain(`frame-src ${env.VITE_QUIZ_RUNNER_ORIGIN};`);
        const global = config.routes.find(route => route.src === '/((?!assets/).*)')!;
        expect(global.headers?.['Cache-Control']).toBe('no-cache');
        expect(global.headers?.['Content-Security-Policy']).toContain("script-src 'self';");
    });
    it('serves existing files first and never rewrites missing assets/health to HTML', () => {
        const routes = outputConfig(appHeaders(env).headers, true).routes;
        const fallback = routes.find(route => route.dest === '/index.html')!;
        expect(routes.findIndex(route => route.handle === 'filesystem')).toBeLessThan(routes.indexOf(fallback));
        const pattern = new RegExp(`^${fallback.src}$`);
        expect(pattern.test('/classes/some-class')).toBe(true);
        for (const path of ['/assets/missing.js', '/robots.txt', '/health.json', '/favicon.svg'])
            expect(pattern.test(path), path).toBe(false);
    });
    it('emits a restricted separate runner with no SPA fallback', () => {
        const config = outputConfig(runnerHeaders(env.VITE_APP_ORIGIN, true).headers);
        const csp = config.routes[0]?.headers?.['Content-Security-Policy'];
        expect(csp).toContain(`frame-ancestors ${env.VITE_APP_ORIGIN}`);
        expect(csp).toContain("connect-src 'none'");
        expect(config.routes.some(route => route.dest)).toBe(false);
        expect(() => runnerHeaders(undefined, true)).toThrow();
        expect(() => runnerHeaders('http://localhost:4173', true)).toThrow();
        expect(() => runnerHeaders('https://cq-cloud.vercel.app/path', true)).toThrow();
    });
    it('rejects a wrong project and missing production credentials before remote operations', () => {
        expect(cloudProblems(env)).toEqual([]);
        expect(cloudProblems({ ...env, SUPABASE_PROJECT_REF: 'differentprojectrefxx' }).join(' ')).toContain('different projects');
        expect(cloudProblems({ ...env, SUPABASE_ACCESS_TOKEN: '', GITHUB_REF_NAME: 'main' }).join(' ')).toContain('CQ_PROD_SUPABASE_ACCESS_TOKEN');
        expect(cloudProblems({ ...env, MAINTENANCE_TOKEN: 'a'.repeat(40) + '\nINJECT=value' }).join(' ')).toContain('MAINTENANCE_TOKEN');
    });
    it('does not recreate bootstrap access during normal deployments', () => {
        const regular = edgeSecretFile(env);
        expect(regular).toContain(`APP_ORIGIN=${env.VITE_APP_ORIGIN}`);
        expect(regular).toContain(`MAINTENANCE_TOKEN=${env.MAINTENANCE_TOKEN}`);
        expect(regular).not.toContain('BOOTSTRAP');
        expect(edgeSecretFile(env, true)).toBe(`BOOTSTRAP_TOKEN=${env.CQ_BOOTSTRAP_TOKEN}\n`);
    });
    it('selects secret names by branch without falling back to development values', () => {
        for (const name of ['deploy-supabase.yml', 'bootstrap-admin.yml']) {
            const text = readFileSync(`.github/workflows/${name}`, 'utf8');
            expect(text).toContain("secrets[format('CQ_{0}_SUPABASE_ACCESS_TOKEN'");
            expect(text).not.toMatch(/&&\s*secrets\.CQ_PROD_.*\|\|\s*secrets\.CQ_DEV_/);
            expect(text).toContain("github.ref == 'refs/heads/main' || github.ref == 'refs/heads/development'");
        }
        const bootstrap = readFileSync('.github/workflows/bootstrap-admin.yml', 'utf8');
        expect(bootstrap).toContain('supabase secrets unset BOOTSTRAP_TOKEN');
        expect(bootstrap).toContain("if: always() && steps.bootstrap-secret.outcome != 'skipped' && steps.bootstrap-secret.outcome != ''");
    });
});
