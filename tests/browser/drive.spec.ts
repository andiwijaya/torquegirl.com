import { test, expect, type Page } from '@playwright/test';
const testOrigin = new URL(process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184').origin;
import { driveCsv } from '../../lib/obd/drive-demo';
test.use({ hasTouch: true });
async function loadA(page: Page, csv = driveCsv()) {
  await page.goto('/tools/obd2-log-analyzer');
  await page.getByLabel('Choose CSV log', { exact: true }).setInputFiles({ name: 'synthetic-A.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.getByLabel('Phase region A')).toBeVisible();
}
async function loadB(page: Page, csv = driveCsv({ trim: 4.3, start: 900000 })) {
  const panel = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: /^A\/B comparison$/ }) });
  if ((await panel.getAttribute('open')) === null) await panel.locator('summary').first().click();
  await page.getByLabel('Choose Run B CSV log').setInputFiles({ name: 'synthetic-B.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.locator('.drive-b-preview').getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.getByLabel('Phase region B')).toBeVisible();
}
async function selectPhase(page: Page, run: 'A' | 'B', phase: string) {
  const select = page.getByLabel(`Phase region ${run}`, { exact: true });
  const value = await select.locator('option').filter({ hasText: new RegExp(`^${phase} ·`) }).first().getAttribute('value');
  await select.selectOption(value!);
}
async function compare(page: Page) {
  await page.getByRole('button', { name: 'Compare selected regions', exact: true }).tap();
  await expect(page.getByTestId('comparison-result')).toBeVisible();
}

test('A/B true numeric changes, independent time origins, conditions, snapshot phase and privacy', async ({ page }) => {
  const remote: string[] = [], errors: string[] = [];
  page.on('request', r => { if (new URL(r.url()).origin !== testOrigin) remote.push(r.url()); }); page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 }); await loadA(page); await loadB(page);
  await selectPhase(page, 'A', 'cruise'); await selectPhase(page, 'B', 'cruise'); await compare(page);
  await expect(page.getByTestId('comparison-result')).toContainText('GOOD MATCH');
  await expect(page.getByTestId('change-ltft-bank-1')).toContainText('Median A 10.8 → B 4.3 %');
  await expect(page.getByTestId('change-ltft-bank-1')).toContainText('− A: -6.5');
  await page.getByLabel('Comparison signal').selectOption('ltft-bank-1'); await page.getByRole('button', { name: 'Show side-by-side traces' }).click();
  await expect(page.getByRole('img', { name: 'Run A relative-time trace' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Run B relative-time trace' }).locator('path').last()).toHaveAttribute('d', /M/);
  await page.getByRole('button', { name: 'Inspect this phase in Run A' }).click();
  await expect(page.getByTestId('current-phase')).toContainText('Phase: cruise');
  await page.locator('.drive-result').screenshot({ path: 'outputs/obd-v3-desktop-comparison.png' });
  await selectPhase(page, 'B', 'idle'); await expect(page.getByTestId('comparison-result')).toHaveCount(0); await compare(page);
  await expect(page.getByTestId('comparison-result')).toContainText('CONDITIONS DIFFER'); await expect(page.getByTestId('change-ltft-bank-1')).toHaveCount(0);
  await page.getByRole('button', { name: 'Review Run B mapping' }).click();
  await page.locator('.drive-b-preview').getByLabel('Time interpretation', { exact: true }).selectOption('ms');
  await page.locator('.drive-b-preview').getByRole('button', { name: 'Update preview', exact: true }).click();
  await page.locator('.drive-b-preview').getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.getByTestId('region-B')).toContainText('unclassified'); await expect(page.getByTestId('region-A')).toContainText('cruise');
  expect(remote).toEqual([]); expect(errors).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('torquegirl.obd')))).toEqual([]);
});

test('relationship scatter uses actual asynchronous pairs and tolerance; B runs independently', async ({ page }) => {
  const text = 'Time (s),Speed (km/h),RPM,MAF (g/s)\n' + Array.from({ length: 21 }, (_, i) => `${i},60,${1000 + i * 100},\n${i + 0.2},,,${2 + i * 2}`).join('\n');
  await loadA(page, text); await page.getByText('PID relationship explorer', { exact: true }).click();
  await page.getByLabel('Relationship X').selectOption('column-2'); await page.getByLabel('Relationship Y').selectOption('column-3');
  await page.getByRole('button', { name: 'Explore relationship', exact: true }).click();
  await expect(page.getByTestId('relationship-result')).toContainText('Pearson r: 1');
  await expect(page.getByTestId('relationship-result')).toContainText('20 paired / 21');
  await expect(page.getByTestId('relationship-result')).toContainText('Maximum |Δt| 0.2 s');
  await page.getByLabel('Pairing tolerance').fill('0.1'); await page.getByRole('button', { name: 'Explore relationship', exact: true }).click();
  await expect(page.getByTestId('relationship-result')).toContainText('0 paired'); await expect(page.getByTestId('relationship-result')).toContainText('Pearson r: —');
  await loadB(page, driveCsv({ mode: 'cruise' })); await page.getByLabel('Relationship run').selectOption('B');
  await page.getByLabel('Relationship X').selectOption('column-2'); await page.getByLabel('Relationship Y').selectOption('column-7');
  await page.getByRole('button', { name: 'Explore relationship', exact: true }).click(); await expect(page.getByTestId('relationship-result')).toContainText('161 paired');
  await page.getByRole('button', { name: 'Remove Run B' }).click(); await expect(page.getByLabel('Phase region B')).toHaveCount(0); await expect(page.getByLabel('Phase region A')).toBeVisible();
});

for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`mobile comparison and relationship ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await loadA(page); await loadB(page);
    await page.locator('.drive-analysis > .drive-controls').first().screenshot({ path: `outputs/obd-v3-regions-${viewport.width}.png` });
    await selectPhase(page, 'A', 'cruise'); await selectPhase(page, 'B', 'cruise'); await compare(page);
    await expect(page.getByTestId('change-ltft-bank-1')).toContainText('-6.5');
    await page.getByRole('button', { name: 'Show side-by-side traces' }).click();
    await expect(page.getByRole('img', { name: 'Run B relative-time trace' })).toBeVisible();
    await page.locator('.drive-result').scrollIntoViewIfNeeded(); await page.screenshot({ path: `outputs/obd-v3-comparison-${viewport.width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await selectPhase(page, 'A', 'acceleration'); await page.getByText('PID relationship explorer', { exact: true }).click();
    await page.getByLabel('Relationship X').selectOption('column-2'); await page.getByLabel('Relationship Y').selectOption('column-7');
    await page.getByRole('button', { name: 'Explore relationship', exact: true }).click();
    await expect(page.getByTestId('relationship-result')).toContainText('Pearson r: 1');
    await page.getByRole('img', { name: 'PID relationship scatter' }).scrollIntoViewIfNeeded(); await page.screenshot({ path: `outputs/obd-v3-scatter-${viewport.width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('two 200k logs compare off-thread; cancellation releases both and fresh import recovers', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const Original = window.Worker, stats = { created: 0, terminated: 0 }; Object.assign(window, { v3Workers: stats });
    window.Worker = class extends Original { constructor(url: string | URL, options?: WorkerOptions) { super(url, options); stats.created++; } terminate() { stats.terminated++; super.terminate(); } };
  });
  await loadA(page, driveCsv({ mode: 'cruise', rows: 200_000 }));
  await page.evaluate(() => { Object.assign(window, { v3Ticks: 0 }); setInterval(() => { (window as unknown as { v3Ticks: number }).v3Ticks++; }, 20); });
  const started = Date.now(); await loadB(page, driveCsv({ mode: 'cruise', rows: 200_000, trim: 4.3 })); await compare(page);
  await expect(page.getByTestId('change-ltft-bank-1')).toContainText('-6.5');
  const ticks = await page.evaluate(() => (window as unknown as { v3Ticks: number }).v3Ticks);
  console.log(JSON.stringify({ browserSecond200kImportAndComparisonMs: Date.now() - started, uiTimerTicks: ticks })); expect(ticks).toBeGreaterThan(5);
  await page.getByText('PID relationship explorer', { exact: true }).click();
  await page.getByLabel('Relationship X').selectOption('column-2'); await page.getByLabel('Relationship Y').selectOption('column-7'); await page.getByRole('button', { name: 'Explore relationship', exact: true }).click();
  await expect(page.getByTestId('relationship-result')).toContainText('200,000 paired');
  // Put a large re-import in flight, then terminate the single owner of both logs.
  await page.getByLabel('Choose Run B CSV log').setInputFiles({ name: 'cancel-B.csv', mimeType: 'text/csv', buffer: Buffer.from(driveCsv({ mode: 'cruise', rows: 200_000 })) });
  await page.getByRole('button', { name: 'Cancel analysis and clear both runs' }).click();
  await expect(page.locator('.drive-analysis')).toHaveCount(0); await expect(page.locator('.obd-chart')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { v3Workers: unknown }).v3Workers)).toEqual({ created: 1, terminated: 1 });
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click(); await page.getByRole('button', { name: 'Analyze log', exact: true }).click(); await expect(page.locator('.obd-chart')).toHaveCount(3);
});
