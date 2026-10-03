import { defineConfig } from '@playwright/test';
const browserName = process.env.OBD_TEST_BROWSER ?? 'chromium';
if (browserName !== 'chromium' && browserName !== 'firefox' && browserName !== 'webkit') throw new Error('Unsupported OBD_TEST_BROWSER');
export default defineConfig({
  testDir: './tests/browser', timeout: 60_000, workers: 1,
  reporter: [['list']],
  use: { baseURL: process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184', browserName, screenshot: 'only-on-failure' },
});
