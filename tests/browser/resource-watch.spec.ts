import { test, expect } from '@playwright/test';
import { watch } from './resource-watch';

test('resource observer retains current-document aborts, HTTP failures and console errors', async ({ page }) => {
  const origin = new URL(process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184').origin;
  const observed = watch(page, origin);
  // Intercepted probes never reach the server. A same-document abort must not
  // be mistaken for an expected outgoing-document navigation cancellation.
  await page.route(`${origin}/__release_probe_abort`, route => route.abort('aborted'));
  await page.route(`${origin}/__release_probe_http`, route => route.fulfill({ status: 503, body: 'controlled failure' }));
  await page.setContent(`<img src="${origin}/__release_probe_abort"><img src="${origin}/__release_probe_http">`);
  await expect.poll(() => observed.resources.some(value => value.endsWith('/__release_probe_abort'))).toBe(true);
  await expect.poll(() => observed.resources.includes(`503 ${origin}/__release_probe_http`)).toBe(true);
  await page.evaluate(() => console.error('controlled observer error'));
  await expect.poll(() => observed.errors.includes('controlled observer error')).toBe(true);
});
