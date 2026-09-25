import { test, expect } from '@playwright/test';
import { demoCsv } from '../../lib/obd/demo';

test('production worker import, normalization, synchronized cursor, playback, source quality and privacy', async ({ page }) => {
  const errors: string[] = [], outbound: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:5184')) outbound.push(r.url()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/tools/obd2-log-analyzer');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://torquegirl.com/tools/obd2-log-analyzer');
  await page.screenshot({ path: 'outputs/obd-desktop-empty.png', fullPage: true });
  await page.getByLabel('Choose CSV log').setInputFiles({ name: 'private-engine.csv', mimeType: 'text/csv', buffer: Buffer.from('Time (s),RPM,Vehicle speed (mph),Coolant temperature (F),Custom\n0,800,10,212,hello\n1,1000,20,,world\n2,2000,30,214,test\n20,2500,40,,end') });
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What happened here?' })).toBeVisible();
  await expect(page.locator('.obd-chart')).toHaveCount(3);
  await expect(page.locator('.obd-reading').nth(1)).toContainText('16.09');
  await expect(page.locator('.obd-reading').nth(2)).toContainText('100');
  await page.getByLabel('Log position', { exact: true }).fill('10');
  await expect(page.locator('.obd-reading').first()).toContainText('STALE');
  await expect(page.locator('.obd-reading').first()).toContainText('2,000');
  await expect(page.locator('.obd-reading').first()).toContainText('−8'.replace('−', '-'));
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect.poll(async () => Number(await page.getByLabel('Log position', { exact: true }).inputValue())).toBeGreaterThan(10.2);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const current = Number(await page.getByLabel('Log position', { exact: true }).inputValue());
  expect(current).toBeLessThan(13); // No skipping the recording gap.
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('slider', { name: 'Inspect RPM', exact: true }).press('ArrowRight');
  await expect(page.getByLabel('Cursor time', { exact: true })).not.toHaveText('00:00.0');
  await page.getByText('Import quality & source mapping', { exact: false }).click();
  await expect(page.getByRole('table')).toContainText('mph → km/h');
  await expect(page.getByRole('table')).toContainText('Custom / unknown');
  await page.getByText('Import quality & source mapping', { exact: false }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.screenshot({ path: 'outputs/obd-desktop-loaded.png', fullPage: true });
  expect(outbound).toEqual([]); expect(errors).toEqual([]);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 740 }]) {
  test(`responsive ${viewport.width}×${viewport.height}, tap, selection and no overflow`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('/tools/obd2-log-analyzer');
    await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
    await expect(page.locator('.obd-chart')).toHaveCount(3);
    await expect(page.locator('.obd-chart path').first()).toHaveAttribute('d', /M/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('checkbox', { name: /Coolant temperature/ }).check();
    await expect(page.locator('.obd-chart')).toHaveCount(4);
    const chart = page.getByRole('slider', { name: 'Inspect Engine RPM (rpm)', exact: true });
    await chart.click({ position: { x: 160, y: 55 } });
    await expect.poll(async () => Number(await page.getByLabel('Log position', { exact: true }).inputValue())).toBeGreaterThan(1);
    await expect(page.locator('.obd-reading')).toHaveCount(4);
    await page.screenshot({ path: `outputs/obd-${viewport.width}x${viewport.height}.png`, fullPage: true });
    await chart.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `outputs/obd-chart-${viewport.width}x${viewport.height}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('large local file remains interactive; replace and cancel release workers', async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.Worker, stats = { created: 0, terminated: 0 };
    Object.assign(window, { workerStats: stats });
    window.Worker = class extends Original {
      constructor(url: string | URL, options?: WorkerOptions) { super(url, options); stats.created++; }
      terminate() { stats.terminated++; super.terminate(); }
    };
  });
  await page.goto('/tools/obd2-log-analyzer');
  await page.evaluate(() => { (window as unknown as { ticks: number }).ticks = 0; setInterval(() => { (window as unknown as { ticks: number }).ticks++; }, 20); });
  const started = Date.now();
  await page.getByLabel('Choose CSV log').setInputFiles({ name: 'large.csv', mimeType: 'text/csv', buffer: Buffer.from(demoCsv(200_000)) });
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-import')).toContainText('200,000 records');
  await expect(page.locator('.obd-chart path').first()).toHaveAttribute('d', /M/);
  const elapsed = Date.now() - started;
  const ticks = await page.evaluate(() => (window as unknown as { ticks: number }).ticks);
  console.log(JSON.stringify({ browserLargeLogImportMs: elapsed, uiTimerTicks: ticks }));
  expect(ticks).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-import')).toContainText('1,200 records');
  await page.getByLabel('Choose CSV log').setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from('not a log') });
  await expect(page.getByRole('alert')).toContainText('header row');
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-chart')).toHaveCount(3);
  await page.getByLabel('Choose CSV log').setInputFiles({ name: 'cancel.csv', mimeType: 'text/csv', buffer: Buffer.from(demoCsv(200_000)) });
  await page.getByRole('button', { name: 'Cancel import', exact: true }).click();
  await expect(page.locator('.obd-chart')).toHaveCount(0);
  const stats = await page.evaluate(() => (window as unknown as { workerStats: { created: number; terminated: number } }).workerStats);
  expect(stats.created).toBe(5); expect(stats.terminated).toBe(5);
});

test('existing editorial routes, navigation and sitemap remain available', async ({ page, request }) => {
  for (const path of ['/', '/engines', '/technology', '/technology/how-to-read-obd2-codes', '/technology/what-is-an-obd2-scanner', '/privacy', '/tools']) {
    const response = await page.goto(path); expect(response?.status()).toBe(200); await expect(page.locator('h1')).toBeVisible();
  }
  const sitemap = await request.get('/sitemap.xml'); expect(await sitemap.text()).toContain('https://torquegirl.com/tools/obd2-log-analyzer');
  await page.goto('/'); await expect(page.getByRole('link', { name: 'Tools', exact: true }).first()).toBeVisible();
});

test('touch-screen chart inspection updates the synchronized state', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5184/tools/obd2-log-analyzer');
  await page.getByRole('button', { name: 'Explore demo', exact: true }).tap();
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-chart')).toHaveCount(3);
  await page.getByRole('slider', { name: 'Inspect Engine RPM (rpm)', exact: true }).tap({ position: { x: 180, y: 70 } });
  await expect.poll(async () => Number(await page.getByLabel('Log position', { exact: true }).inputValue())).toBeGreaterThan(30);
  await expect(page.locator('.obd-reading').first()).toContainText('Sample');
  await context.close();
});
