import { test, expect, type Page } from '@playwright/test';
const testOrigin = new URL(process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184').origin;
import { demoCsv } from '../../lib/obd/demo';
import { TEMPLATE_KEY } from '../../lib/obd/templates';

const raw = 'ticks,road,Coolant (F),Pressure (psi),STFT Bank 2 (%),O2 B2 S1 (V),Ignored\n0,60,212,14.7,7,0.8,UNIQUE_PRIVATE_SAMPLE\n1000,70,214,15,8,0.7,UNIQUE_PRIVATE_SAMPLE\n2000,80,216,16,9,0.6,UNIQUE_PRIVATE_SAMPLE';
async function upload(page: Page, text = raw) {
  await page.getByLabel('Choose CSV log').setInputFiles({ name: 'private-source.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
  await expect(page.getByRole('heading', { name: 'Understand before you analyze.' })).toBeVisible();
}
async function correct(page: Page) {
  await page.getByLabel('Time column', { exact: true }).selectOption('0');
  await page.getByLabel('Time interpretation', { exact: true }).selectOption('ms');
  await page.getByLabel('Identity for column 2', { exact: true }).selectOption('speed');
  await page.getByLabel('Unit for column 2', { exact: true }).selectOption('mph');
  await page.getByLabel('Identity for column 4', { exact: true }).selectOption('map-absolute');
  await page.getByLabel('State for column 7', { exact: true }).selectOption('ignore');
  await expect(page.getByRole('button', { name: 'Analyze log', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Analyze log', exact: true })).toBeEnabled();
  await expect(page.getByTestId('mapping-duration')).toHaveText('2 s');
}

test('preview/manual correction/template/review propagate real values and preserve privacy', async ({ page }) => {
  const external: string[] = [], errors: string[] = [];
  page.on('request', r => { if (new URL(r.url()).origin !== testOrigin) external.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/tools/obd2-log-analyzer'); await upload(page);
  await expect(page.locator('.obd-chart')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Analyze log', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Identity for column 4')).toHaveValue('');
  await expect(page.getByLabel('Identity for column 6').locator('option[value="afr"]')).toHaveJSProperty('disabled', true);
  await correct(page);
  await expect(page.getByTestId('mapping-column-1')).toContainText('60 → 96.5606');
  await expect(page.getByTestId('mapping-column-2')).toContainText('212 → 100');
  await expect(page.getByTestId('mapping-column-3')).toContainText('14.7 → 101.3529');
  await page.screenshot({ path: 'outputs/obd-v2-desktop-preview.png', fullPage: true });
  await page.getByLabel('Template name', { exact: true }).fill('My confirmed units');
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  await expect(page.getByText('Mapping template saved locally. No log data stored.', { exact: true })).toBeVisible();
  const stored = await page.evaluate(key => localStorage.getItem(key)!, TEMPLATE_KEY);
  for (const forbidden of ['UNIQUE_PRIVATE_SAMPLE', 'private-source.csv', 'sourceValues', 'normalized', 'Coolant (F)', 'ticks', 'samples']) expect(stored).not.toContain(forbidden);
  const template = JSON.parse(stored).templates[0];
  expect(Object.keys(template).sort()).toEqual(['config', 'fingerprint', 'id', 'name', 'version']);
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-reading').first()).toContainText('96.56');
  await expect(page.locator('.obd-reading').nth(1)).toContainText('100');
  await expect(page.locator('.obd-reading').nth(2)).toContainText('101.35');
  await page.getByLabel('Log position', { exact: true }).fill('1');
  await expect(page.locator('.obd-reading').first()).toContainText('112.65');
  await expect(page.locator('.obd-reading').first()).toContainText('Source: 70');
  await page.getByRole('button', { name: 'Review mapping', exact: true }).click();
  await page.getByLabel('Unit for column 2').selectOption('km/h');
  await page.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Analyze log', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Keep previous analysis', exact: true }).click();
  await expect(page.locator('.obd-reading').first()).toContainText('112.65');
  await page.getByRole('button', { name: 'Review mapping', exact: true }).click();
  await expect(page.getByLabel('Unit for column 2')).toHaveValue('mph');
  await page.getByLabel('Unit for column 2').selectOption('km/h');
  await page.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Analyze log', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-reading').first()).toContainText('60');
  await page.getByRole('button', { name: 'Review mapping', exact: true }).click();
  await page.getByLabel('Saved templates', { exact: true }).selectOption(template.id);
  await page.getByRole('button', { name: 'Apply template', exact: true }).click();
  await expect(page.getByText('Applied locally: My confirmed units. Review the updated preview.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Unit for column 2')).toHaveValue('mph');
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-reading').first()).toContainText('96.56');
  await page.getByText('Import quality & source mapping', { exact: false }).click();
  await expect(page.getByRole('table')).toContainText('USER: explicitly applied local template');
  await page.getByRole('button', { name: 'Review mapping', exact: true }).click();
  await page.getByLabel('Saved templates').selectOption(template.id);
  await page.getByLabel('Template name').fill('Renamed profile');
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
  await expect(page.getByLabel('Saved templates')).toContainText('Renamed profile');
  await page.getByRole('button', { name: 'Delete template', exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).templates.length, TEMPLATE_KEY)).toBe(0);
  expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('template is not auto-applied; incompatible header/unit signatures are rejected', async ({ page }) => {
  await page.goto('/tools/obd2-log-analyzer'); await upload(page); await correct(page);
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  await expect(page.getByText('Mapping template saved locally. No log data stored.', { exact: true })).toBeVisible();
  const id = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).templates[0].id, TEMPLATE_KEY);
  await upload(page, raw.replace('Pressure (psi)', 'Pressure (bar)'));
  await expect(page.getByRole('button', { name: 'Analyze log', exact: true })).toBeDisabled();
  await page.getByLabel('Saved templates').selectOption(id);
  await page.getByRole('button', { name: 'Apply template', exact: true }).click();
  await expect(page.locator('.obd-template-notice')).toContainText('Template headers do not match');
  await expect(page.getByLabel('Identity for column 2')).toHaveValue('');
  await page.getByRole('button', { name: 'Reset templates', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), TEMPLATE_KEY)).toBeNull();
});

for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`mapping responsive correction ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('/tools/obd2-log-analyzer'); await upload(page); await correct(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `outputs/obd-v2-mapping-${viewport.width}.png`, fullPage: true });
    await page.getByLabel('Find mapping column').fill('road');
    await expect(page.locator('.obd-mapping-card')).toHaveCount(1);
    await page.getByTestId('mapping-column-1').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `outputs/obd-v2-card-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
    await expect(page.locator('.obd-reading').first()).toContainText('96.56');
  });
}

test('large log remapping stays responsive and updates downstream values', async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.Worker, stats = { created: 0, terminated: 0 };
    Object.assign(window, { remapWorkerStats: stats });
    window.Worker = class extends Original {
      constructor(url: string | URL, options?: WorkerOptions) { super(url, options); stats.created++; }
      terminate() { stats.terminated++; super.terminate(); }
    };
  });
  await page.goto('/tools/obd2-log-analyzer'); await upload(page, demoCsv(200_000));
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await page.getByRole('button', { name: 'Review mapping', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Understand before you analyze.' })).toBeVisible();
  await page.getByLabel('Time interpretation').selectOption('ms');
  await page.getByLabel('Unit for column 3').selectOption('mph');
  await page.evaluate(() => { Object.assign(window, { remapTicks: 0 }); setInterval(() => { (window as unknown as { remapTicks: number }).remapTicks++; }, 20); });
  const before = Date.now();
  await page.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Analyze log', exact: true })).toBeEnabled();
  const ms = Date.now() - before, ticks = await page.evaluate(() => (window as unknown as { remapTicks: number }).remapTicks);
  console.log(JSON.stringify({ browserRemap200kMs: ms, uiTimerTicks: ticks })); expect(ticks).toBeGreaterThan(2);
  await expect(page.getByTestId('mapping-duration')).toHaveText('20.0119 s');
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await page.getByLabel('Log position', { exact: true }).fill('0.01');
  await expect(page.locator('.obd-reading').nth(1)).toContainText('128.59');
  await expect(page.locator('.obd-reading').nth(1)).toContainText('Source: 79.9');
  await expect(page.locator('.obd-reading').nth(1)).toContainText('Interpreted as: mph');
  await page.getByRole('button', { name: 'Review mapping', exact: true }).click();
  await page.getByLabel('Time interpretation').selectOption('s');
  await page.getByRole('button', { name: 'Update preview', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel import', exact: true }).click();
  await expect(page.locator('.obd-chart')).toHaveCount(0);
  await expect(page.locator('.obd-mapping')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { remapWorkerStats: { created: number; terminated: number } }).remapWorkerStats)).toEqual({ created: 1, terminated: 1 });
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-import')).toContainText('1,200 records');
});

test('unavailable local storage does not prevent local mapping and analysis', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage denied'); } }); });
  await page.goto('/tools/obd2-log-analyzer'); await upload(page); await correct(page);
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  await expect(page.locator('.obd-template-notice')).toContainText('Storage denied');
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-reading').first()).toContainText('96.56');
});
