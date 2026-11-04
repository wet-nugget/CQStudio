import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const environmentModule = new URL('../scripts/lib/environment.mjs', import.meta.url).href;
const operatorModule = new URL('../scripts/lib/operator.mjs', import.meta.url).href;
const liveModule = new URL('../scripts/check-live.mjs', import.meta.url).href;
function evaluate(code: string) {
    return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' }));
}
describe('production launch checks', () => {
    it('rejects missing settings, service credentials and a same-origin quiz runner', () => {
        const result = evaluate(`import {deploymentProblems} from ${JSON.stringify(environmentModule)};
          const base={VITE_SUPABASE_URL:'https://cq-live.supabase.co',VITE_APP_ORIGIN:'https://cq-live.vercel.app',VITE_QUIZ_RUNNER_ORIGIN:'https://cq-runner.vercel.app',VITE_SUPABASE_ANON_KEY:'sb_publishable_12345678901234567890'};
          console.log(JSON.stringify([deploymentProblems({}),deploymentProblems(base),deploymentProblems({...base,VITE_SUPABASE_ANON_KEY:'sb_secret_private'}),deploymentProblems({...base,VITE_QUIZ_RUNNER_ORIGIN:base.VITE_APP_ORIGIN})]));`);
        expect(result[0]).toHaveLength(4);
        expect(result[1]).toEqual([]);
        expect(result[2].join(' ')).toContain('browser-safe');
        expect(result[3].join(' ')).toContain('different origins');
    });
    it('rejects URLs containing credentials or hidden paths and launch placeholders', () => {
        const result = evaluate(`import {publicOrigin} from ${JSON.stringify(environmentModule)};
          console.log(JSON.stringify(['https://user:password@cq-live.vercel.app','https://cq-live.vercel.app/path','https://YOUR_APP.vercel.app','http://localhost:5173','https://$CQ_HOST'].map(value=>{try{publicOrigin(value,'App',{production:true});return false}catch{return true}})));`);
        expect(result).toEqual([true, true, true, true, true]);
    });
    it('uses production env-file precedence while preserving supplied deployment values', () => {
        const directory = mkdtempSync(resolve(tmpdir(), 'cqstudio-env-test-'));
        try {
            for (const [index, name] of ['.env', '.env.local', '.env.production', '.env.production.local'].entries())
                writeFileSync(resolve(directory, name), `CQ_FILE=${index}\nCQ_OVERRIDE=file\n`);
            const result = evaluate(`import {deploymentEnvironment} from ${JSON.stringify(environmentModule)};console.log(JSON.stringify(deploymentEnvironment(${JSON.stringify(directory)},{CQ_OVERRIDE:'hosted'})));`);
            expect(result).toEqual({ CQ_FILE: '3', CQ_OVERRIDE: 'hosted' });
        } finally { rmSync(directory, { recursive: true, force: true }); }
    });
    it('refuses to certify unreviewed policies or incomplete operator disclosures', () => {
        const result = evaluate(`import {operatorProblems} from ${JSON.stringify(operatorModule)};console.log(JSON.stringify(operatorProblems({minimumAge:18,reviewed:false})));`);
        expect(result.some((message: string) => message.includes('Operator name'))).toBe(true);
        expect(result.some((message: string) => message.includes('Review the actual'))).toBe(true);
    });
    it('detects broken deployed isolation headers even when every endpoint returns 200', () => {
        function monitor(broken: boolean) {
            return execFileSync(process.execPath, ['--input-type=module', '-e', `
              Object.assign(process.env,{VITE_SUPABASE_URL:'https://cq-live.supabase.co',VITE_APP_ORIGIN:'https://cq-live.vercel.app',VITE_QUIZ_RUNNER_ORIGIN:'https://cq-runner.vercel.app',VITE_SUPABASE_ANON_KEY:'sb_publishable_12345678901234567890'});
              globalThis.fetch=async input=>{
                const url=new URL(String(input));
                if(url.pathname.includes('/functions/'))return new Response('{}',{status:401});
                if(url.pathname.includes('/rpc/'))return Response.json({policy_version:'2026-11-01'});
                if(url.pathname==='/health.json')return Response.json({app:'CQStudio',component:'frontend',status:'ok'});
                if(url.pathname.startsWith('/assets/'))return new Response('export{}',{headers:{'content-type':'application/javascript','cache-control':'public,max-age=31536000,immutable'}});
                if(url.hostname==='cq-runner.vercel.app')return new Response('<meta name="cq-app-origin" content="https://cq-live.vercel.app">',{headers:{'content-security-policy':${JSON.stringify(broken ? "frame-ancestors *; connect-src *; frame-src blob:" : "frame-ancestors https://cq-live.vercel.app; connect-src 'none'; frame-src blob:")}}});
                return new Response('<script src="/assets/index.js"></script>',{headers:{'content-security-policy':"script-src 'self'; frame-src https://cq-runner.vercel.app; connect-src 'self' https://cq-live.supabase.co",'x-content-type-options':'nosniff','x-robots-tag':'noindex','strict-transport-security':'max-age=100','cache-control':'no-cache'}});
              };
              await import(${JSON.stringify(liveModule)});`], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        }
        expect(monitor(false)).toContain('Live availability checks passed.');
        expect(() => monitor(true)).toThrow();
    });
});
