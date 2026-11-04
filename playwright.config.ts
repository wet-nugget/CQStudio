import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/smoke',fullyParallel:false,forbidOnly:Boolean(process.env.CI),retries:process.env.CI?1:0,
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure',ignoreHTTPSErrors:true,contextOptions:{reducedMotion:'reduce'}},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:{command:'node scripts/serve-smoke.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
});
