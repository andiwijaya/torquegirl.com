import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 60_000, workers: 1,
  reporter: [['list']],
  use: { baseURL: process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184', browserName: 'chromium', screenshot: 'only-on-failure' },
});
