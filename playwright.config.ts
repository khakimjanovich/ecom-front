import { defineConfig, devices } from '@playwright/test';

// The whole journey runs against the real stack (ecom-infra + the ecom app); the dev server is started here.
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'pnpm dev', url: 'http://localhost:5180', reuseExistingServer: true, timeout: 120_000 },
});
