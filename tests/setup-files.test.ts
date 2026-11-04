import { parseEnv } from 'node:util';
import { describe, expect, it } from 'vitest';
import { setupFiles } from '../scripts/lib/setup-files.mjs';

const values = {
    VITE_SUPABASE_URL: 'https://cq-install.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'sb_publishable_12345678901234567890',
    VITE_APP_ORIGIN: 'https://cq-install.vercel.app',
    VITE_QUIZ_RUNNER_ORIGIN: 'https://cq-install-runner.vercel.app',
};
describe('self-contained installer configuration', () => {
    it('uses the same bootstrap and maintenance tokens in every required destination', () => {
        const files = setupFiles('development', values);
        const edge = parseEnv(files['edge.env']!);
        expect(edge.BOOTSTRAP_TOKEN).toMatch(/^[a-f0-9]{64}$/);
        expect(edge.MAINTENANCE_TOKEN).toMatch(/^[a-f0-9]{64}$/);
        expect(edge.BOOTSTRAP_TOKEN).not.toBe(edge.MAINTENANCE_TOKEN);
        expect(parseEnv(files['bootstrap.env']!).CQ_BOOTSTRAP_TOKEN).toBe(edge.BOOTSTRAP_TOKEN);
        expect(parseEnv(files['github-secrets.env']!).CQ_DEV_MAINTENANCE_TOKEN).toBe(edge.MAINTENANCE_TOKEN);
        expect(JSON.parse(files['vault-secrets.json']!).cqstudio_maintenance_token).toBe(edge.MAINTENANCE_TOKEN);
        expect(parseEnv(files['runner.env']!).APP_ORIGIN).toBe(values.VITE_APP_ORIGIN);
        expect(files['app.env']).not.toContain(edge.BOOTSTRAP_TOKEN);
        expect(files['app.env']).not.toContain(edge.MAINTENANCE_TOKEN);
        expect(files['github-variables.json']).toBeUndefined();
    });
    it('preserves issued tokens on rerun and keeps production monitoring public-only', () => {
        const first = setupFiles('production', values);
        const edge = parseEnv(first['edge.env']!);
        const again = setupFiles('production', values, edge);
        expect(again).toEqual(first);
        expect(again['github-secrets.env']).toBeUndefined();
        const monitoring = JSON.parse(again['github-variables.json']!);
        expect(Object.keys(monitoring)).toHaveLength(4);
        expect(Object.values(monitoring)).not.toContain(edge.BOOTSTRAP_TOKEN);
        expect(Object.values(monitoring)).not.toContain(edge.MAINTENANCE_TOKEN);
    });
    it('does not silently rotate a retired or corrupted token set', () => {
        expect(() => setupFiles('development', values, { MAINTENANCE_TOKEN: 'a'.repeat(64) })).toThrow('not be silently replaced');
        expect(() => setupFiles('development', values, { BOOTSTRAP_TOKEN: 'a'.repeat(64), MAINTENANCE_TOKEN: 'a'.repeat(64) })).toThrow('different tokens');
    });
    it('rejects a service key, a same-origin runner and an invalid target environment', () => {
        expect(() => setupFiles('development', { ...values, VITE_SUPABASE_ANON_KEY: 'sb_secret_private' })).toThrow('browser-safe');
        expect(() => setupFiles('development', { ...values, VITE_SUPABASE_ANON_KEY: values.VITE_SUPABASE_ANON_KEY + '\nOTHER=value' })).toThrow('browser-safe');
        expect(() => setupFiles('development', { ...values, VITE_QUIZ_RUNNER_ORIGIN: values.VITE_APP_ORIGIN })).toThrow('different origins');
        expect(() => setupFiles('../production', values)).toThrow('Choose development or production');
    });
});
