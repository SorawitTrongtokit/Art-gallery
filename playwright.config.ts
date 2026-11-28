import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const port = Number(process.env.DEMO_WEB_PORT ?? '4321');
const baseURL = 'http://127.0.0.1:' + port;

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL, browserName: 'chromium', reducedMotion: 'reduce',
    actionTimeout: 8000, navigationTimeout: 15000,
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port ' + port,
    url: baseURL + '/admin/login',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: { ASTRO_TELEMETRY_DISABLED: '1' },
  },
});
