import { test, expect, type Page } from '@playwright/test';
import { driveCsv } from '../../lib/obd/drive-demo';

const route = '/tools/obd2-log-analyzer';
const origin = new URL(process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184').origin;
const evidence = 'outputs/next-development-task3';
const viewports = [{ width: 320, height: 740 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }];
test.use({ hasTouch: true, launchOptions: { ignoreDefaultArgs: ['--disable-back-forward-cache'] } });

async function demo(page: Page) {
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await expect(page.locator('.obd-guide-next')).toContainText('check the preview');
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-chart path').first()).toHaveAttribute('d', /M/);
}

async function phase(page: Page, name: string) {
  const select = page.getByLabel('Phase region A', { exact: true });
  const value = await select.locator('option').filter({ hasText: new RegExp(`^${name} `) }).first().getAttribute('value');
  await select.selectOption(value!);
  await expect(page.getByTestId('region-A')).toContainText(name);
}

async function bounds(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const overflow = await page.locator('.obd-guide, .obd-guide p, .obd-guide li, .obd-term-help, .obd-term-help p, .obd-mapping-heading p, .obd-mapping-filter p, .drive-analysis > p, .drive-advanced > p, .obd-observation-prompt, .obd-observation-prompt p').evaluateAll(elements => elements.filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1);
  }).map(el => ({ text: el.textContent?.slice(0, 80), width: el.clientWidth, scroll: el.scrollWidth })));
  expect(overflow).toEqual([]);
}

for (const viewport of viewports) test(`guided demo and contextual help at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize(viewport);
  await page.goto(route);
  const guide = page.getByRole('region', { name: 'Analyzer first-use guidance' });
  await expect(guide).toContainText('Start with a file or demo');
  const summary = guide.locator('summary');
  await summary.focus();
  await summary.press('Enter');
  await expect(guide.locator('details')).toHaveAttribute('open', '');
  await expect(guide.locator('li')).toHaveCount(10);
  expect(await summary.evaluate(el => ({ height: el.getBoundingClientRect().height, outline: getComputedStyle(el).outlineStyle }))).toMatchObject({ height: 44, outline: 'solid' });
  await bounds(page);
  await guide.screenshot({ path: `${evidence}/${viewport.width}x${viewport.height}-guide.png` });
  await summary.press('Space');
  await page.getByRole('button', { name: 'Explore demo', exact: true }).tap();
  await expect(guide).toContainText('intentionally sparse');
  await expect(page.getByLabel('Time interpretation', { exact: true })).toHaveValue('s');
  await expect(page.locator('.obd-detection')).toContainText('Comma');
  await expect(page.locator('.obd-mapping-filter')).toContainText('PID means parameter ID');
  await bounds(page);
  await page.locator('.obd-mapping-heading').screenshot({ path: `${evidence}/${viewport.width}x${viewport.height}-mapping.png` });
  await page.getByRole('button', { name: 'Analyze log', exact: true }).tap();
  await expect(guide).toContainText('Next: check quality');
  await page.locator('.obd-quality > summary').tap();
  await expect(page.locator('.obd-quality')).toContainText('Cadence is the spacing');
  await page.locator('.obd-quality').screenshot({ path: `${evidence}/${viewport.width}x${viewport.height}-quality.png` });
  await page.locator('.obd-term-help > summary').tap();
  await expect(page.locator('.obd-term-help')).toContainText('LTFT (long-term fuel trim)');
  await page.locator('.obd-signals').screenshot({ path: `${evidence}/${viewport.width}x${viewport.height}-signals.png` });
  await page.locator('.obd-events button').first().tap();
  await expect(page.getByLabel('Cursor time', { exact: true })).toHaveText('01:12.0');
  await page.getByLabel('Log position', { exact: true }).fill('66');
  await expect(page.locator('.obd-reading').first()).toContainText('STALE');
  await page.locator('.obd-state').screenshot({ path: `${evidence}/${viewport.width}x${viewport.height}-state.png` });
  await phase(page, 'idle');
  await page.getByRole('button', { name: 'Inspect this phase in Run A' }).tap();
  await expect(page.getByTestId('current-phase')).toContainText('idle');
  await expect(page.locator('.obd-observation-prompt')).toContainText('Selected Run A region:');
  await page.getByTestId('region-A').locator('summary').tap();
  await page.getByTestId('region-A').screenshot({ path: `${evidence}/${viewport.width}x${viewport.height}-phase.png` });
  await page.locator('.drive-advanced > summary').first().tap();
  await expect(page.locator('.drive-advanced').first()).toContainText('operating-condition match');
  await page.locator('.drive-advanced').first().screenshot({ path: `${evidence}/${viewport.width}x${viewport.height}-ab-help.png` });
  await page.locator('.drive-advanced > summary').last().tap();
  await expect(page.locator('.drive-advanced').last()).toContainText('Pairing tolerance');
  await expect(page.locator('.drive-advanced').last()).toContainText('nonlinear relationship');
  await page.locator('.drive-advanced').last().screenshot({ path: `${evidence}/${viewport.width}x${viewport.height}-relationship-help.png` });
  await page.locator('.obd-observation-prompt').screenshot({ path: `${evidence}/${viewport.width}x${viewport.height}-observation.png` });
  await bounds(page);
  expect(errors).toEqual([]);
});

test('guidance follows replacement imports, failed import, mapping review/reset and empty signals', async ({ page }) => {
  await page.goto(route);
  await demo(page);
  await page.getByLabel('Find a signal', { exact: true }).fill('Coolant');
  await page.getByLabel('Choose CSV log', { exact: true }).setInputFiles({ name: 'fresh.tsv', mimeType: 'text/tab-separated-values', buffer: Buffer.from('Time\tRPM\tSpeed (km/h)\n0\t800\t0\n1\t800\t0\n2\t800\t0\n4\t800\t0') });
  await expect(page.locator('.obd-guide')).not.toContainText('Synthetic demo');
  await expect(page.locator('.obd-detection')).toContainText('Tab');
  await expect(page.getByRole('button', { name: 'Analyze log', exact: true })).toBeDisabled();
  await page.getByLabel('Time interpretation', { exact: true }).selectOption('s');
  await page.getByRole('button', { name: 'Update preview', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.getByLabel('Find a signal', { exact: true })).toHaveValue('');
  while (await page.getByRole('checkbox', { checked: true }).count()) await page.getByRole('checkbox', { checked: true }).first().uncheck();
  await expect(page.locator('.obd-explorer')).toContainText('Select signals to start exploring');
  await page.getByRole('button', { name: 'Review mapping', exact: true }).click();
  await expect(page.locator('.obd-guide-next')).toContainText('check the preview');
  await page.getByRole('button', { name: 'Reset mapping', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Analyze log', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Keep previous analysis', exact: true }).click();
  await expect(page.locator('.obd-guide-next')).toContainText('check quality');
  await page.getByLabel('Choose CSV log', { exact: true }).setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from('') });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.obd-guide-next')).toContainText('Start with a file');
  await demo(page);
  await expect(page.locator('.obd-chart')).toHaveCount(3);
});

test('actual editorial entry, worker disposal and back/forward return clear analysis without transmission', async ({ page }) => {
  const traffic: string[] = [], errors: string[] = [], workers: string[] = [];
  let entered = false;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) entered = new URL(frame.url()).pathname === route; });
  page.on('request', r => { if (entered && (new URL(r.url()).origin !== origin || !['GET', 'HEAD'].includes(r.method()) || r.postData() || /C_PRIVATE|853\.2719/.test(r.url()))) traffic.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('worker', w => workers.push(w.url()));
  await page.addInitScript(() => {
    const Original = window.Worker;
    window.Worker = class extends Original { terminate() { sessionStorage.setItem('c-worker-disposed', 'yes'); super.terminate(); } };
    window.addEventListener('pageshow', event => { if (event.persisted) sessionStorage.setItem('c-cached-return', 'yes'); });
  });
  await page.goto('/technology/how-to-record-and-export-obd2-logs');
  const before = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('link', { name: 'Analyze my log locally', exact: true }).click();
  expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(before);
  await page.getByLabel('Choose CSV log', { exact: true }).setInputFiles({ name: 'C_PRIVATE.csv', mimeType: 'text/csv', buffer: Buffer.from(driveCsv().replace('800.000', '853.2719')) });
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.getByLabel('Phase region A', { exact: true })).toBeVisible();
  await page.locator('.obd-learn a[href="/technology/how-to-record-and-export-obd2-logs"]').click();
  expect(await page.evaluate(() => sessionStorage.getItem('c-worker-disposed'))).toBe('yes');
  await page.goBack();
  await expect(page.locator('.obd-guide-next')).toContainText('Start with a file');
  await expect(page.locator('.obd-chart, .drive-analysis')).toHaveCount(0);
  await demo(page);
  await page.goForward();
  await expect(page.locator('h1')).toContainText('Record and Export');
  await page.goBack();
  await expect(page.locator('.obd-chart, .drive-analysis')).toHaveCount(0);
  await expect(page.locator('script[src*="googletagmanager"],script[src*="cloudflareinsights"],script#ga4')).toHaveCount(0);
  expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/C_PRIVATE|853\.2719|sourceValues/);
  expect(workers.length).toBeGreaterThan(1);
  expect(workers.every(url => new URL(url).origin === origin)).toBe(true);
  expect(traffic).toEqual([]);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ workers, prohibitedRequests: traffic.length, disposedOnExit: true, cachedDocumentReturned: await page.evaluate(() => sessionStorage.getItem('c-cached-return')) }));
});

test('comparison help explains actual percentage point changes without changing results', async ({ page }) => {
  await page.goto(route);
  await page.getByLabel('Choose CSV log', { exact: true }).setInputFiles({ name: 'A.csv', mimeType: 'text/csv', buffer: Buffer.from(driveCsv({ mode: 'cruise' })) });
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await page.locator('.drive-advanced > summary').first().click();
  await page.getByLabel('Choose Run B CSV log').setInputFiles({ name: 'B.csv', mimeType: 'text/csv', buffer: Buffer.from(driveCsv({ mode: 'cruise', trim: 4.3 })) });
  await page.locator('.drive-b-preview').getByRole('button', { name: 'Analyze log', exact: true }).click();
  await page.getByRole('button', { name: 'Compare selected regions', exact: true }).click();
  await expect(page.getByTestId('comparison-result')).toContainText('GOOD MATCH');
  await expect(page.getByTestId('comparison-result')).toContainText('−6 percentage points');
  await expect(page.getByTestId('change-ltft-bank-1')).toContainText('-6.5');
});

test('persisted lifecycle guard disposes the worker and reloads an empty document', async ({ page }) => {
  // Native Back/Forward above is exercised separately. This covers the cached
  // lifecycle branch even when this Chromium environment declines to cache it.
  await page.addInitScript(() => {
    const Original = window.Worker;
    window.Worker = class extends Original { terminate() { sessionStorage.setItem('c-lifecycle-disposed', 'yes'); super.terminate(); } };
  });
  await page.goto(route);
  await demo(page);
  const before = await page.evaluate(() => performance.timeOrigin);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  expect(await page.evaluate(() => sessionStorage.getItem('c-lifecycle-disposed'))).toBe('yes');
  const reloaded = page.waitForNavigation({ waitUntil: 'load' });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await reloaded;
  expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(before);
  await expect(page.locator('.obd-guide-next')).toContainText('Start with a file');
  await expect(page.locator('.obd-chart, .drive-analysis')).toHaveCount(0);
  await demo(page);
  await expect(page.locator('.obd-chart')).toHaveCount(3);
});
