import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { driveCsv } from '../../lib/obd/drive-demo';
import { NOTEBOOK_KEY } from '../../lib/notebook/storage';
import { emptyNotebook, NOTEBOOK_LIMITS, type NotebookDocument } from '../../lib/notebook/model';

test.use({ hasTouch: true });
const route = '/tools/obd2-log-analyzer';
const origin = new URL(process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184').origin;
const time = '2026-10-03T12:00:00.000Z';
const backup = (id = 'incoming', observation = 'Imported observation') => JSON.stringify({ ...emptyNotebook(), records: [{ id, createdAt: time, updatedAt: time, observation }] });
const panel = (page: Page) => page.locator('#observation-notebook');
const saved = (page: Page) => page.getByTestId('notebook-record');
const raw = (page: Page) => page.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY);
async function create(page: Page, text = 'Observed steady readings') {
  await page.getByLabel('Observation', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(panel(page).getByRole('status')).toContainText('Note saved');
}
async function upload(page: Page, json: string) {
  await page.getByLabel('Choose notebook JSON', { exact: true }).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(json) });
}
async function download(page: Page, button = 'Download notebook backup') {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: button, exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toMatch(/^torquegirl-notebook(?:-draft)?\.json$/);
  return JSON.parse(await readFile((await file.path())!, 'utf8')) as NotebookDocument;
}
async function confirm(page: Page, name: string) {
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

test('manual optional record create/edit/reload/export/delete, confirmed cancel and keyboard focus', async ({ page }) => {
  await page.goto(route);
  expect(await raw(page)).toBeNull();
  await expect(page.getByTestId('notebook-storage-state')).toContainText('saving is available');
  await page.getByLabel('Vehicle label', { exact: true }).fill('Daily driver');
  await page.getByLabel('Test date', { exact: true }).fill('2026-10-03');
  await page.getByLabel('Alternative explanation', { exact: true }).fill('Different temperature');
  await page.getByLabel('Next test', { exact: true }).fill('Repeat safely under similar conditions');
  await page.getByLabel('Region start (s)').fill('1'); await page.getByLabel('Region end (s)').fill('9');
  await page.getByLabel('Selected phase', { exact: true }).selectOption('idle');
  await page.getByRole('button', { name: 'Add manual signal' }).click();
  await page.getByLabel('Signal 1 label').fill('RPM'); await page.getByLabel('Signal 1 unit').fill('RPM');
  await create(page);
  const before = JSON.parse((await raw(page))!);
  await expect(saved(page)).toHaveCount(1);
  await page.reload();
  await expect(saved(page)).toContainText('Daily driver');
  await expect(page.locator('.obd-chart, .drive-analysis')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit Daily driver', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Edit saved observation' })).toBeFocused();
  await expect(page.getByLabel('Alternative explanation')).toHaveValue('Different temperature');
  await page.getByLabel('Retest result').fill('The pattern repeated');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(panel(page).getByRole('status')).toContainText('Note saved');
  const exported = await download(page);
  expect(exported.records[0].id).toBe(before.records[0].id);
  expect(exported.records[0].createdAt).toBe(before.records[0].createdAt);
  expect(exported.records[0].retestResult).toBe('The pattern repeated');
  await page.getByRole('button', { name: 'Delete Daily driver', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Delete Daily driver', exact: true })).toBeFocused();
  expect(JSON.parse((await raw(page))!).records).toEqual(exported.records);
  await page.getByRole('button', { name: 'Delete Daily driver', exact: true }).click();
  await confirm(page, 'Delete saved note'); await expect(saved(page)).toHaveCount(0);
});

test('all fields optional and repeated queued saves create one record; clear requires confirmation', async ({ page }) => {
  await page.goto(route);
  await page.getByRole('button', { name: 'Save note', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(saved(page)).toHaveCount(1);
  expect(JSON.parse((await raw(page))!).records[0].observation).toBeUndefined();
  await page.getByRole('button', { name: 'New / discard draft' }).click();
  await create(page, 'Second note');
  await expect(saved(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear all saved notes' }).click();
  const before = await raw(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await raw(page)).toBe(before);
  await page.getByRole('button', { name: 'Clear all saved notes' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear saved notebook', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(saved(page)).toHaveCount(0);
  expect(JSON.parse((await raw(page))!).revision).toBe(3);
});

test('unsaved form discard warning, cancel, unload warning, draft backup and log replacement preserve edits', async ({ page }) => {
  await page.goto(route); await create(page, 'Saved original');
  await page.getByLabel('Observation', { exact: true }).fill('Unsaved private draft');
  await page.getByRole('button', { name: 'New / discard draft' }).click();
  await expect(page.getByRole('dialog')).toContainText('unsaved form edits');
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Observation', { exact: true })).toHaveValue('Unsaved private draft');
  expect((await download(page, 'Download draft backup')).records[0].observation).toBe('Unsaved private draft');
  expect((await download(page)).records[0].observation).toBe('Saved original');
  expect(await page.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; })).toBe(true);
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.getByLabel('Observation', { exact: true })).toHaveValue('Unsaved private draft');
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await expect(page.getByLabel('Observation', { exact: true })).toHaveValue('Unsaved private draft');
  await page.getByRole('button', { name: 'New / discard draft' }).click(); await confirm(page, 'Discard unsaved edits');
  await expect(page.getByLabel('Observation', { exact: true })).toHaveValue('');
});

for (const [name, json] of [
  ['malformed', '{bad'], ['unsupported', JSON.stringify({ ...emptyNotebook(), version: 99 })],
  ['oversize', ' '.repeat(NOTEBOOK_LIMITS.bytes + 1)], ['raw payload', JSON.stringify({ ...emptyNotebook(), rawLog: 'private' })],
]) test(`${name} import preserves saved bytes and unsaved draft`, async ({ page }) => {
  await page.goto(route); await create(page); const before = await raw(page);
  await page.getByLabel('Observation', { exact: true }).fill('Keep this draft');
  await upload(page, json); await expect(panel(page).getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('notebook-import-preview')).toHaveCount(0);
  expect(await raw(page)).toBe(before);
  await expect(page.getByLabel('Observation', { exact: true })).toHaveValue('Keep this draft');
});

test('validated merge/duplicate conflicts, cancelled replacement, confirmed replacement and export roundtrip', async ({ page }) => {
  await page.goto(route); await create(page, 'Local version'); const doc = JSON.parse((await raw(page))!);
  const mixed = { ...doc, records: [{ ...doc.records[0], observation: 'Incoming conflict' }, JSON.parse(backup()).records[0]] };
  await upload(page, JSON.stringify(mixed));
  await expect(page.getByTestId('notebook-import-preview')).toContainText('1 conflicting IDs skipped');
  await expect(saved(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Cancel import preview' }).click(); expect(JSON.parse((await raw(page))!).records).toEqual(doc.records);
  await upload(page, JSON.stringify(mixed)); await page.getByRole('button', { name: 'Apply merge import' }).click();
  await expect(saved(page)).toHaveCount(2); await expect(saved(page).first()).toContainText('Local version');
  const exported = await download(page); await upload(page, JSON.stringify(exported));
  await expect(page.getByTestId('notebook-import-preview')).toContainText('2 identical');
  const before = await raw(page); await page.getByRole('button', { name: 'Apply merge import' }).click();
  await expect(page.getByTestId('notebook-import-preview')).toHaveCount(0); expect(await raw(page)).toBe(before);
  await page.getByLabel('Import mode').selectOption('replace'); await upload(page, backup('replacement'));
  await page.getByRole('button', { name: 'Apply replace import' }).click(); await page.keyboard.press('Escape'); expect(await raw(page)).toBe(before);
  await page.getByRole('button', { name: 'Apply replace import' }).click(); await confirm(page, 'Replace saved notebook');
  await expect(saved(page)).toHaveCount(1); expect(JSON.parse((await raw(page))!).records[0].id).toBe('replacement');
  await expect(page.getByLabel('Observation', { exact: true })).toHaveValue('Local version');
  await expect(panel(page)).toContainText('Unsaved edits');
});

test('quota failures preserve saved data/draft/import plan and allow retry', async ({ page }) => {
  await page.addInitScript(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v) { if (k === key && (window as unknown as { denyNotebookWrite?: boolean }).denyNotebookWrite) throw new DOMException('full', 'QuotaExceededError'); return original.call(this, k, v); };
  }, NOTEBOOK_KEY);
  await page.goto(route); await create(page, 'Original'); const before = await raw(page);
  await page.getByLabel('Observation', { exact: true }).fill('Draft after quota');
  await page.evaluate(() => Object.assign(window, { denyNotebookWrite: true }));
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(panel(page).getByRole('alert')).toContainText('could not be saved'); expect(await raw(page)).toBe(before);
  await expect(page.getByLabel('Observation', { exact: true })).toHaveValue('Draft after quota');
  await upload(page, backup()); await page.getByRole('button', { name: 'Apply merge import' }).click();
  await expect(panel(page).getByRole('alert')).toContainText('could not be saved'); await expect(page.getByTestId('notebook-import-preview')).toBeVisible(); expect(await raw(page)).toBe(before);
  await page.getByRole('button', { name: 'Clear all saved notes' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear saved notebook', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('could not be saved'); await page.keyboard.press('Escape');
  await page.evaluate(() => Object.assign(window, { denyNotebookWrite: false }));
  await page.getByRole('button', { name: 'Apply merge import' }).click(); await expect(saved(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click(); await expect(saved(page).first()).toContainText('Draft after quota');
});

test('cross-tab stale edit/plan/export conflict recovery retains draft as a new note', async ({ page, context }) => {
  await page.goto(route); await create(page, 'Original');
  const other = await context.newPage(); await other.goto(route); await other.getByRole('button', { name: /^Edit / }).click();
  await page.getByLabel('Observation', { exact: true }).fill('Keep local draft');
  await upload(page, backup());
  await other.getByLabel('Observation', { exact: true }).fill('Newer from other tab');
  await other.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(panel(page)).toContainText('Saved notes may be stale');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click(); await expect(panel(page).getByRole('alert')).toContainText('another tab');
  await page.getByRole('button', { name: 'Apply merge import' }).click(); await expect(panel(page).getByRole('alert')).toContainText('another tab');
  await page.getByRole('button', { name: 'Download notebook backup', exact: true }).click(); await expect(panel(page).getByRole('alert')).toContainText('another tab');
  expect(JSON.parse((await raw(page))!).records[0].observation).toBe('Newer from other tab');
  await page.getByRole('button', { name: 'Reload saved notes (keep draft)' }).click();
  await expect(page.getByLabel('Observation', { exact: true })).toHaveValue('Keep local draft');
  await expect(saved(page)).toContainText('Newer from other tab');
  await page.getByRole('button', { name: 'Save note', exact: true }).click(); await expect(saved(page)).toHaveCount(2);
  expect(JSON.parse((await raw(page))!).records.map((r: { observation: string }) => r.observation)).toEqual(['Newer from other tab', 'Keep local draft']);
});

for (const state of ['read-only', 'denied', 'corrupt']) test(`${state} storage explains memory-only drafts and preserves existing data`, async ({ page }) => {
  await page.addInitScript(({ key, state, json }) => {
    if (state === 'read-only') { localStorage.setItem(key, json); Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined }); }
    if (state === 'corrupt') localStorage.setItem(key, '{bad');
    if (state === 'denied') Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });
  }, { key: NOTEBOOK_KEY, state, json: backup('old') });
  await page.goto(route);
  await expect(page.getByTestId('notebook-storage-state')).toContainText(state === 'read-only' ? 'Read-only' : 'Storage unavailable');
  await expect(page.getByRole('button', { name: 'Save note', exact: true })).toBeDisabled();
  await page.getByLabel('Observation', { exact: true }).fill('Memory only'); expect((await download(page, 'Download draft backup')).records[0].observation).toBe('Memory only');
  if (state === 'read-only') expect((await download(page)).records[0].id).toBe('old');
  if (state === 'corrupt') expect(await raw(page)).toBe('{bad');
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click(); await page.getByRole('button', { name: 'Analyze log', exact: true }).click(); await expect(page.locator('.obd-chart')).toHaveCount(3);
});

test('actual editorial entry plus A/B and timeline evidence capture persist only requested compact summaries; zero sensitive network traffic', async ({ page }) => {
  const marker = 'D_PRIVATE_6e27'; const requests: string[] = [], prohibited: string[] = [], errors: string[] = [];
  let entered = false;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) entered = new URL(frame.url()).pathname === route; });
  page.on('request', r => { const content = r.url() + (r.postData() ?? ''); requests.push(content); if (entered && (new URL(r.url()).origin !== origin || !['GET', 'HEAD'].includes(r.method()) || r.postData() || /D_PRIVATE_6e27|853\.2719/.test(content))) prohibited.push(content); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/technology/how-to-record-and-export-obd2-logs'); const before = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('link', { name: 'Analyze my log locally', exact: true }).click(); expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(before);
  const csv = driveCsv({ mode: 'cruise' }).split('\n').map((line, i) => line + (i ? ',853.2719' : ',Private raw channel')).join('\n');
  await page.getByLabel('Choose CSV log', { exact: true }).setInputFiles({ name: `${marker}.csv`, mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click(); await expect(page.getByTestId('region-A')).toBeVisible();
  await page.locator('.drive-advanced > summary').first().click(); await page.getByLabel('Choose Run B CSV log').setInputFiles({ name: `${marker}-B.csv`, mimeType: 'text/csv', buffer: Buffer.from(driveCsv({ mode: 'cruise', trim: 4.3 })) });
  await page.locator('.drive-b-preview').getByRole('button', { name: 'Analyze log', exact: true }).click(); await expect(page.getByTestId('region-B')).toBeVisible();
  await page.getByRole('button', { name: 'Compare selected regions', exact: true }).click(); await expect(page.getByTestId('comparison-result')).toContainText('GOOD MATCH');
  expect(await raw(page)).toBeNull(); expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  // Explicitly choose fuel trim; charts may select operating channels by default.
  await page.locator('.obd-signal-list label').filter({ hasText: 'LTFT' }).locator('input').first().check();
  await page.getByLabel('Run A evidence label').fill('Reviewed baseline'); await page.getByLabel('Run B evidence label').fill('Reviewed retest');
  await page.getByRole('button', { name: 'Capture current evidence' }).click();
  await expect(panel(page).getByTestId('notebook-evidence')).toContainText('Reviewed baseline'); expect(await raw(page)).toBeNull();
  await page.getByLabel('Vehicle label', { exact: true }).fill(marker); await create(page, `${marker} <script>inert</script>`);
  const doc = await download(page); const evidence = doc.records[0].evidence!;
  expect(evidence.runALabel).toBe('Reviewed baseline'); expect(evidence.regionA?.phase).toBe('cruise'); expect(evidence.comparison?.state).toBe('GOOD MATCH');
  expect(evidence.comparison?.changes.find(c => c.identity === 'ltft-bank-1')?.delta).toBeCloseTo(-6.5, 8);
  expect(evidence.signals.length).toBeLessThanOrEqual(16); expect(evidence.statistics?.length).toBeLessThanOrEqual(32);
  expect(JSON.stringify(doc)).not.toMatch(/sourceValues|rawLog|traces|points|\.csv|timestamp|853\.2719/);
  expect(Object.keys(doc.records[0])).not.toContain('log');
  await upload(page, backup('private-import', `${marker} imported`)); await page.getByRole('button', { name: 'Apply merge import' }).click(); await expect(saved(page)).toHaveCount(2);
  await page.getByLabel('Evidence scope').selectOption('timeline'); await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await page.getByRole('button', { name: 'Capture current evidence' }).click();
  const timeline = (await download(page, 'Download draft backup')).records[0].evidence!; expect(timeline.regionA?.end).toBeLessThan(80); expect(timeline.statistics).toBeUndefined(); expect(timeline.comparison).toBeUndefined(); expect(timeline.signals.every(s => s.run === 'A')).toBe(true);
  await expect(page.locator('script[src*="googletagmanager"],script[src*="cloudflareinsights"],script#ga4')).toHaveCount(0); expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://torquegirl.com/tools/obd2-log-analyzer'); expect(page.url()).toBe(origin + route);
  expect(prohibited).toEqual([]); expect(requests.join('\n')).not.toMatch(/D_PRIVATE_6e27|853\.2719/); expect(errors).toEqual([]);
  console.log(JSON.stringify({ notebookPrivacyRequests: requests.length, prohibitedRequests: prohibited.length, runtimeErrors: errors.length, compactBytes: Buffer.byteLength(JSON.stringify(doc)), signalCount: evidence.signals.length, statisticCount: evidence.statistics?.length }));
});

for (const viewport of [{ width: 320, height: 740 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }]) {
  test(`notebook stacked fields/cards, keyboard/touch/dialog ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto(route);
    const prefix = `outputs/next-development-task5/${viewport.width}x${viewport.height}`;
    await panel(page).evaluate(el => el.scrollIntoView({ block: 'start' })); await page.screenshot({ path: `${prefix}-intro.png` });
    await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
    await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
    await expect(page.getByTestId('region-A')).toBeVisible();
    await page.getByRole('button', { name: 'Capture current evidence' }).click();
    const evidence = page.locator('.notebook-editor').getByTestId('notebook-evidence');
    await evidence.getByText('Captured numeric summaries', { exact: true }).click();
    await evidence.screenshot({ path: `${prefix}-evidence.png` });
    await page.getByLabel('Observation', { exact: true }).fill('Observed pattern; alternative explanation and retest needed.');
    await page.getByLabel('Alternative explanation').fill('Temperature may differ'); await page.getByLabel('Next test', { exact: true }).fill('Repeat safely');
    await page.getByLabel('Observation', { exact: true }).scrollIntoViewIfNeeded(); await page.screenshot({ path: `${prefix}-form.png` });
    for (const label of ['Vehicle label', 'Question / goal', 'Conditions', 'Baseline / Run A description', 'Observation', 'Alternative explanation', 'Next test', 'Retest result', 'Free notes']) await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save note', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(saved(page)).toHaveCount(1);
    await saved(page).scrollIntoViewIfNeeded(); await page.screenshot({ path: `${prefix}-card.png` });
    const bounds = await panel(page).locator('input:visible,textarea:visible,select:visible,button:visible,article:visible').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height, tag: node.tagName }; }));
    expect(bounds.every(b => b.left >= 0 && b.right <= viewport.width + 1)).toBe(true);
    expect(bounds.filter(b => b.tag === 'BUTTON' || b.tag === 'INPUT' || b.tag === 'SELECT').every(b => b.height >= 44)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: /^Delete / }).tap();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.screenshot({ path: `${prefix}-dialog.png` });
    const dialogButtons = await page.getByRole('dialog').getByRole('button').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height }; }));
    expect(dialogButtons.every(b => b.height >= 44 && b.left >= 0 && b.right <= viewport.width)).toBe(true);
    await page.keyboard.press('Tab'); await expect(page.getByRole('dialog').getByRole('button', { name: 'Delete saved note', exact: true })).toBeFocused();
    await page.keyboard.press('Escape'); await expect(saved(page)).toHaveCount(1);
    await expect(page.getByRole('button', { name: /^Delete / })).toBeFocused();
  });
}
