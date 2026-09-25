import { test, expect } from '@playwright/test';
import { driveCsv } from '../../lib/obd/drive-demo';
const origin = new URL(process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184').origin;
const routes = ['/', '/engines', '/engines/how-a-nascar-v8-engine-works', '/engines/toyota-2jz-gte-tuning-legend', '/engines/turbocharger-vs-supercharger', '/technology', '/technology/how-formula-1-car-creates-downforce', '/technology/what-is-an-obd2-scanner', '/technology/obd2-scanner-vs-code-reader', '/technology/how-to-read-obd2-codes', '/technology/how-to-analyze-obd2-live-data-and-logs', '/off-track', '/off-track/golf-day', '/tools', '/tools/obd2-log-analyzer', '/privacy', '/terms'];

test('release routes, canonical URLs, editorial links and preserved image assets', async ({ page, request }) => {
  test.setTimeout(180_000);
  const statuses: Record<string, number> = {};
  for (const path of routes) {
    const response = await page.goto(path); statuses[path] = response!.status(); expect(response!.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://torquegirl.com${path === '/' ? '' : path}`);
  }
  const sitemap = await request.get('/sitemap.xml'); expect(sitemap.status()).toBe(200);
  for (const path of routes.filter(p => p !== '/')) expect(await sitemap.text()).toContain(`https://torquegirl.com${path}`);
  for (const name of ['golf1','golf2','golf3','meter1','meter2','meter3']) expect((await request.get(`/images/articles/${name}.webp`)).status()).toBe(200);
  expect((await request.get('/tools/')).status()).toBe(200);
  for (const slug of ['how-to-analyze-obd2-live-data-and-logs','what-is-an-obd2-scanner','obd2-scanner-vs-code-reader','how-to-read-obd2-codes']) {
    await page.goto(`/technology/${slug}`); await expect(page.locator('.article-body a[href="/tools/obd2-log-analyzer"]').first()).toBeVisible();
  }
  await page.goto('/tools/obd2-log-analyzer'); await expect(page.locator('.obd-learn a[href="/technology/how-to-analyze-obd2-live-data-and-logs"]')).toBeVisible();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    for (const path of ['/', '/technology', '/off-track/golf-day', '/technology/how-to-analyze-obd2-live-data-and-logs']) {
      await page.goto(path); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (path === '/technology') expect(await page.locator('.category-hero h1').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: `outputs/release-editorial-${viewport.width}-${path.replaceAll('/', '_') || 'home'}.png` });
    }
  }
  console.log(JSON.stringify({ releaseOrigin: origin, routeStatuses: statuses, sitemap: 200, editorialImages: 6 }));
});

test('fresh release analyzer uses a real worker and sends no analysis requests', async ({ page }) => {
  const network: { url: string; method: string; body: string | null }[] = [], errors: string[] = [], workers: string[] = [];
  page.on('request', r => network.push({ url: r.url(), method: r.method(), body: r.postData() }));
  page.on('pageerror', e => errors.push(e.message)); page.on('worker', w => workers.push(w.url()));
  await page.goto('/tools/obd2-log-analyzer');
  await page.getByLabel('Choose CSV log', { exact: true }).setInputFiles({ name: 'SYNTHETIC_RELEASE_SENTINEL.csv', mimeType: 'text/csv', buffer: Buffer.from(driveCsv()) });
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-chart path').first()).toHaveAttribute('d', /M/);
  await expect(page.getByTestId('current-phase')).toContainText('stopped');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(async () => Number(await page.getByLabel('Log position', { exact: true }).inputValue())).toBeGreaterThan(0.1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Review mapping', exact: true }).click();
  await page.getByLabel('Template name', { exact: true }).fill('Release mapping');
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  const stored = await page.evaluate(() => localStorage.getItem('torquegirl.obd.mapping-templates.v1'));
  expect(stored).not.toContain('SYNTHETIC_RELEASE_SENTINEL'); expect(stored).not.toContain('sourceValues'); expect(stored).not.toContain('samples');
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await page.waitForTimeout(1500);
  expect(workers.length).toBeGreaterThan(0); expect(workers.every(url => new URL(url).origin === origin)).toBe(true);
  expect(network.filter(r => new URL(r.url).origin !== origin)).toEqual([]);
  expect(network.filter(r => !['GET','HEAD'].includes(r.method))).toEqual([]);
  expect(network.some(r => r.url.includes('SYNTHETIC_RELEASE_SENTINEL') || r.body?.includes('SYNTHETIC_RELEASE_SENTINEL'))).toBe(false);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ releaseOrigin: origin, workerAssets: workers, offOriginRequests: 0, nonReadRequests: 0, runtimeErrors: errors.length }));
});


test('editorial links navigate into a fresh analytics-free analyzer document', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  for (const path of ['/tools', '/technology', '/technology/how-to-analyze-obd2-live-data-and-logs', '/technology/what-is-an-obd2-scanner', '/technology/obd2-scanner-vs-code-reader', '/technology/how-to-read-obd2-codes', '/privacy']) {
    await page.goto(path);
    const before = await page.evaluate(() => performance.timeOrigin);
    await page.locator('a[href="/tools/obd2-log-analyzer"]').first().click();
    await expect(page).toHaveURL(`${origin}/tools/obd2-log-analyzer`);
    await expect(page.getByLabel('Choose CSV log', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(before);
    await expect(page.locator('script[src*="googletagmanager"],script[src*="cloudflareinsights"]')).toHaveCount(0);
  }
  const requests: string[] = [];
  page.on('request', r => { if (new URL(r.url()).origin !== origin) requests.push(r.url()); });
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-chart path').first()).toHaveAttribute('d', /M/);
  await page.waitForTimeout(1000);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
