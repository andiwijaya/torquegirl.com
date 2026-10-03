import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { driveCsv } from '../../lib/obd/drive-demo';
import { emptyNotebook, exportNotebookJson } from '../../lib/notebook/model';
import { NOTEBOOK_KEY } from '../../lib/notebook/storage';
import { BROWSER_CALL_RESOURCES, installPrivateDocumentNetworkProbe, PRIVATE_INITIATORS_KEY } from './privacy-probe';

const origin = process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184';
const route = '/tools/obd2-log-analyzer';
const time = '2026-10-03T12:00:00.000Z';
const viewports = [{ width: 320, height: 740 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }, { width: 768, height: 1024 }];
const raw = (page: Page) => page.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY);
const backup = (id: string, observation: string) => exportNotebookJson({ ...emptyNotebook(), records: [{ id, createdAt: time, updatedAt: time, observation }] });
async function uploadBackup(page: Page, json: string) {
  await page.getByLabel('Choose notebook JSON', { exact: true }).setInputFiles({ name: 'local.json', mimeType: 'application/json', buffer: Buffer.from(json) });
}
async function bounds(page: Page) {
  const violations = await page.locator('.obd-guide,.obd-mapping-card,.obd-chart,.obd-reading,.drive-region,.drive-stat-grid article,.drive-result,.notebook-editor,.notebook-cards article,.notebook-import-preview,.notebook-dialog[open],.tp-panel,.tp-readout,.tp-numeric li').evaluateAll(els => els.filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 2);
  }).map(el => `${el.tagName}.${el.className}`));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function contrast(page: Page) {
  const result = await page.evaluate(() => {
    type RGB = number[];
    const rgb = (text: string): RGB => text.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0];
    const mix = (a: RGB, b: RGB): RGB => a.slice(0, 3).map((c, i) => c * (a[3] ?? 1) + b[i] * (1 - (a[3] ?? 1)));
    function background(el: Element | null): RGB {
      if (!el) return [255, 255, 255];
      const c = rgb(getComputedStyle(el).backgroundColor);
      return mix(c, background(el.parentElement));
    }
    const lum = (c: RGB) => c.slice(0, 3).map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
    const checks: { text: string; ratio: number; minimum: number }[] = [];
    for (const el of document.querySelectorAll('main *')) {
      if (!(el instanceof HTMLElement) || !el.checkVisibility() || el.closest('[disabled]') || getComputedStyle(el).opacity !== '1') continue;
      const text = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent?.trim()).join(' ');
      if (!text || getComputedStyle(el).backgroundImage !== 'none') continue;
      const style = getComputedStyle(el), bg = background(el), fg = mix(rgb(style.color), bg);
      const a = lum(bg), b = lum(fg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const large = parseFloat(style.fontSize) >= 24 || parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700;
      checks.push({ text: text.slice(0, 65), ratio, minimum: large ? 3 : 4.5 });
    }
    return { count: checks.length, minimumRatio: Math.min(...checks.map(c => c.ratio)), failures: checks.filter(c => c.ratio + .01 < c.minimum) };
  });
  console.log(JSON.stringify({ contrast: result }));
  expect(result.count).toBeGreaterThan(15); expect(result.failures).toEqual([]);
}

for (const viewport of viewports) test(`complete interrupted/error/dialog states ${viewport.width}x${viewport.height}`, async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ viewport, hasTouch: true }); const page = await context.newPage();
  try {
    await page.addInitScript(key => {
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, v) { if (k === key && (window as unknown as { quota: boolean }).quota) throw new DOMException('quota', 'QuotaExceededError'); write.call(this, k, v); };
    }, NOTEBOOK_KEY);
    await page.goto(origin + route);
    await expect(page.getByLabel('Choose CSV log', { exact: true })).toBeEnabled();
    await page.getByLabel('Choose CSV log', { exact: true }).setInputFiles({ name: 'broken.csv', mimeType: 'text/csv', buffer: Buffer.from('not a log') });
    await expect(page.getByRole('alert')).toContainText('header'); await bounds(page);
    await page.getByRole('button', { name: 'Explore demo', exact: true }).tap();
    await expect(page.getByRole('heading', { name: 'Understand before you analyze.' })).toBeVisible(); await bounds(page);
    await page.getByRole('button', { name: 'Analyze log', exact: true }).tap();
    await expect(page.getByTestId('region-A')).toBeVisible();
    await page.getByRole('button', { name: 'Play', exact: true }).tap(); await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.getByRole('slider', { name: 'Inspect Engine RPM (rpm)', exact: true }).press('ArrowRight');
    const touchControls = await page.locator('.obd-search input,.obd-playback input,.obd-playback select').evaluateAll(els => els.map(el => el.getBoundingClientRect().height));
    expect(touchControls.every(height => height >= 44)).toBe(true);
    await expect(page.getByRole('slider', { name: 'Inspect Engine RPM (rpm)', exact: true })).toBeFocused();
    expect(await page.getByRole('slider', { name: 'Inspect Engine RPM (rpm)', exact: true }).evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
    await page.locator('.obd-quality > summary').tap();
    await expect(page.getByRole('table')).toContainText('Original'); await bounds(page);
    await page.locator('.obd-quality > summary').tap();
    await page.getByText('A/B comparison', { exact: true }).tap();
    await page.getByLabel('Choose Run B CSV log').setInputFiles({ name: 'B.csv', mimeType: 'text/csv', buffer: Buffer.from(driveCsv()) });
    await page.locator('.drive-b-preview').getByRole('button', { name: 'Analyze log', exact: true }).tap(); await expect(page.getByTestId('region-B')).toBeVisible();
    await page.getByRole('button', { name: 'Compare selected regions', exact: true }).tap(); await expect(page.getByTestId('comparison-result')).toBeVisible();
    await page.getByText('PID relationship explorer', { exact: true }).tap();
    await page.getByLabel('Relationship X').selectOption('column-1'); await page.getByLabel('Relationship Y').selectOption('column-2');
    await page.getByRole('button', { name: 'Explore relationship', exact: true }).tap(); await expect(page.getByTestId('relationship-result')).toContainText('Pearson'); await bounds(page);
    await page.getByLabel('Observation', { exact: true }).fill('Draft survives replacement');
    await page.getByRole('button', { name: 'Explore demo', exact: true }).tap(); await expect(page.getByLabel('Observation', { exact: true })).toHaveValue('Draft survives replacement');
    await page.getByRole('button', { name: 'Analyze log', exact: true }).tap(); await expect(page.getByTestId('region-A')).toBeVisible();
    await page.getByRole('button', { name: 'Capture current evidence' }).tap();
    await page.getByRole('button', { name: 'Save note', exact: true }).tap(); await expect(page.getByTestId('notebook-record')).toHaveCount(1);
    const saved = (await raw(page))!;
    await page.getByLabel('Observation', { exact: true }).fill('Keep unsaved edits');
    await uploadBackup(page, '{malformed'); await expect(page.locator('#observation-notebook').getByRole('alert')).toBeVisible(); expect(await raw(page)).toBe(saved); await bounds(page);
    await page.evaluate(() => Object.assign(window, { quota: true }));
    await page.getByRole('button', { name: 'Save changes', exact: true }).tap(); await expect(page.locator('#observation-notebook').getByRole('alert')).toContainText('could not be saved'); expect(await raw(page)).toBe(saved);
    await page.evaluate(() => Object.assign(window, { quota: false }));
    const doc = JSON.parse(saved); doc.records[0].observation = 'Conflicting import';
    await uploadBackup(page, JSON.stringify(doc)); await expect(page.getByTestId('notebook-import-preview')).toContainText('1 conflicting IDs skipped');
    await page.getByRole('button', { name: 'Apply merge import' }).tap(); expect(await raw(page)).toBe(saved);
    await page.getByLabel('Import mode').selectOption('replace'); await uploadBackup(page, backup('replacement', 'Retest'));
    await page.getByRole('button', { name: 'Apply replace import' }).tap();
    const dialog = page.getByRole('dialog'); await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.keyboard.press('Tab'); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Tab'); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await bounds(page); await contrast(page);
    const dialogBounds = await dialog.evaluate(el => {
      const box = el.getBoundingClientRect(), heading = el.querySelector('h3')!.getBoundingClientRect();
      return { fits: box.top >= 0 && box.bottom <= innerHeight && heading.top >= box.top && heading.bottom <= box.bottom, scrollTop: el.scrollTop };
    });
    expect(dialogBounds).toEqual({ fits: true, scrollTop: 0 });
    // Capture the viewport: locator screenshots can scroll a fixed top-layer
    // dialog between measurement and clipping, producing a misleading crop.
    await page.screenshot({ path: `outputs/next-development-task9/${viewport.width}x${viewport.height}-replace.png` });
    await page.keyboard.press('Escape'); expect(await raw(page)).toBe(saved);
    await page.getByRole('button', { name: 'Apply replace import' }).tap(); await dialog.getByRole('button', { name: 'Replace saved notebook', exact: true }).tap();
    await expect(page.getByTestId('notebook-record')).toContainText('Retest'); await expect(page.getByLabel('Observation', { exact: true })).toHaveValue('Keep unsaved edits');
    await page.getByRole('button', { name: 'Clear all saved notes' }).tap(); await dialog.getByRole('button', { name: 'Cancel', exact: true }).tap();
    await expect(page.getByTestId('notebook-record')).toHaveCount(1); await bounds(page);
    await page.locator('#observation-notebook').screenshot({ path: `outputs/next-development-task9/${viewport.width}x${viewport.height}-notebook.png` });
    await page.getByRole('button', { name: 'New / discard draft' }).tap(); await page.keyboard.press('Escape'); await expect(page.getByLabel('Observation', { exact: true })).toHaveValue('Keep unsaved edits');
    await page.getByRole('button', { name: 'New / discard draft' }).tap(); await dialog.getByRole('button', { name: 'Discard unsaved edits', exact: true }).tap();
    await page.evaluate(key => localStorage.setItem(key, '{broken'), NOTEBOOK_KEY); await page.getByRole('button', { name: 'Reload saved notes (keep draft)' }).tap();
    await expect(page.locator('#observation-notebook').getByRole('alert')).toBeVisible(); expect(await raw(page)).toBe('{broken');
    await expect(page.getByRole('button', { name: 'Save note', exact: true })).toBeDisabled();
    await expect(page.getByLabel('Choose notebook JSON', { exact: true })).toBeDisabled();
    await page.evaluate(({ key, saved }) => localStorage.setItem(key, saved), { key: NOTEBOOK_KEY, saved });
    await page.getByRole('button', { name: 'Reload saved notes (keep draft)' }).tap();
    await expect(page.getByRole('button', { name: 'Save note', exact: true })).toBeEnabled();
  } finally { await context.close(); }
});

for (const viewport of viewports) test(`Explorer repeated 200-point/error/mobile states ${viewport.width}x${viewport.height}`, async ({ browser }) => {
  const context = await browser.newContext({ viewport, hasTouch: true }); const page = await context.newPage();
  try {
    await page.goto(origin + '/tools/torque-power-explorer');
    await page.locator('#tp-torque').fill('invalid'); await page.getByRole('button', { name: 'Calculate point' }).tap(); await expect(page.locator('#tp-torque')).toBeFocused();
    await expect(page.locator('#tp-torque')).toHaveAttribute('aria-invalid', 'true'); await contrast(page);
    await page.locator('#tp-torque').fill('100'); await page.getByRole('button', { name: 'Calculate point' }).tap(); await expect(page.locator('.tp-point-result')).toContainText('31.415927');
    const rows = Array.from({ length: 200 }, (_, i) => `${(i + 1) * 500},${100 + i}`).join('\n');
    await page.locator('#tp-curve-text').fill(rows); await page.getByRole('button', { name: 'Plot curve', exact: true }).tap();
    await expect(page.locator('.tp-plot circle')).toHaveCount(400);
    const times = await page.evaluate(async () => {
      const button = [...document.querySelectorAll<HTMLButtonElement>('.tp-panel button')].find(b => b.textContent === 'Plot curve')!;
      const samples: number[] = [];
      for (let i = 0; i < 10; i++) { const t = performance.now(); button.click(); await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))); samples.push(performance.now() - t); }
      return samples;
    });
    await page.getByRole('slider').focus(); await page.keyboard.press('End'); await expect(page.getByTestId('curve-readout')).toContainText('100,000 RPM');
    await page.locator('.tp-numeric summary').tap(); await expect(page.locator('.tp-numeric li')).toHaveCount(200); await bounds(page); await contrast(page);
    await page.locator('.tp-plots').screenshot({ path: `outputs/next-development-task9/${viewport.width}x${viewport.height}-200-points.png` });
    await page.locator('#tp-curve-text').fill('1000,100\n1000,200'); await page.getByRole('button', { name: 'Plot curve', exact: true }).tap();
    await expect(page.locator('#tp-curve-error')).toContainText('Duplicate'); await expect(page.locator('#tp-curve-text')).toBeFocused(); await expect(page.locator('.tp-plot')).toHaveCount(0); await bounds(page);
    console.log(JSON.stringify({ viewport, explorerRepeatedTwoFrameMs: times }));
  } finally { await context.close(); }
});

test('bounded notebook near 512k and 100 records measures real validation/write, then preserves data at limit', async ({ page }) => {
  const doc = { ...emptyNotebook(), records: Array.from({ length: 99 }, (_, i) => ({ id: `bounded-${i}`, createdAt: time, updatedAt: time, notes: 'x'.repeat(4900) })) };
  const json = exportNotebookJson(doc);
  expect(Buffer.byteLength(json)).toBeGreaterThan(490_000); expect(Buffer.byteLength(json)).toBeLessThan(512_000);
  await page.addInitScript(({ key, json }) => { localStorage.setItem(key, json); const set = Storage.prototype.setItem; Object.assign(window, { writes: [] }); Storage.prototype.setItem = function(k, v) { const t = performance.now(); set.call(this, k, v); if (k === key) (window as unknown as { writes: number[] }).writes.push(performance.now() - t); }; }, { key: NOTEBOOK_KEY, json });
  await page.setViewportSize({ width: 320, height: 740 }); await page.goto(route); await expect(page.getByTestId('notebook-record')).toHaveCount(99);
  await page.getByLabel('Observation', { exact: true }).fill('Bounded final note');
  const timings = await page.evaluate(async () => {
    const start = performance.now(); document.querySelector<HTMLFormElement>('.notebook-editor form')!.requestSubmit();
    await new Promise<void>(done => { const observer = new MutationObserver(() => { if (document.querySelectorAll('[data-testid=notebook-record]').length === 100) { observer.disconnect(); done(); } }); observer.observe(document.querySelector('.notebook-saved')!, { childList: true, subtree: true }); });
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    return { saveThroughRenderMs: performance.now() - start, writes: (window as unknown as { writes: number[] }).writes };
  });
  const saved = (await raw(page))!; expect(Buffer.byteLength(saved)).toBeLessThan(512_000); await bounds(page);
  await page.getByRole('button', { name: 'New / discard draft' }).click(); await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.locator('#observation-notebook').getByRole('alert')).toContainText('100'); expect(await raw(page)).toBe(saved);
  console.log(JSON.stringify({ notebookBytes: Buffer.byteLength(saved), notebookRecords: 100, ...timings }));
});

test('delayed client scripts protect first form edits and file selection until ready', async ({ browser }) => {
  for (const path of ['/tools/torque-power-explorer', route]) {
    const context = await browser.newContext(), page = await context.newPage();
    let release!: () => void;
    const gate = new Promise<void>(done => { release = done; });
    await page.route(/\.js(?:\?|$)/, async request => { await gate; await request.continue(); });
    try {
      await page.goto(origin + path, { waitUntil: 'commit' });
      const input = path === route ? page.getByLabel('Observation', { exact: true }) : page.locator('#tp-torque');
      await expect(input).toBeDisabled();
      if (path === route) await expect(page.getByLabel('Choose CSV log', { exact: true })).toBeDisabled();
      release(); await expect(input).toBeEnabled();
      if (path === route) {
        expect(await raw(page)).toBeNull();
        await input.fill('First edit after readiness'); await page.getByRole('button', { name: 'Save note', exact: true }).click();
        await expect(page.getByTestId('notebook-record')).toContainText('First edit after readiness');
        await expect(page.getByLabel('Choose CSV log', { exact: true })).toBeEnabled();
        await page.getByLabel('Choose CSV log', { exact: true }).setInputFiles({ name: 'broken.csv', mimeType: 'text/csv', buffer: Buffer.from('not a log') });
        await expect(page.getByRole('alert')).toContainText('header'); await expect(page.getByTestId('notebook-record')).toHaveCount(1);
      } else {
        await input.fill('invalid'); await page.getByRole('button', { name: 'Calculate point' }).click();
        await expect(input).toHaveValue('invalid'); await expect(input).toHaveAttribute('aria-invalid', 'true'); await expect(input).toBeFocused();
      }
    } finally { release(); await context.close(); }
  }
});

test('privacy sentinels, real history, worker/object URL cleanup and synthetic cached Explorer guard', async ({ page }) => {
  const marker = 'TASK9_PRIVATE_8c1b'; const requests: string[] = [], prohibited: string[] = [], errors: string[] = [];
  let protectedDocument = false;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) protectedDocument = new URL(frame.url()).pathname.startsWith('/tools/obd2-log-analyzer') || new URL(frame.url()).pathname.startsWith('/tools/torque-power-explorer'); });
  page.on('request', r => {
    const entry = `${r.method()} ${r.url()} ${r.postData() ?? ''}`; requests.push(entry);
    // Fetch/beacon initiators are checked below in their owning document.
    // An editorial page can finish its own unload beacon after navigation.
    if (protectedDocument && !BROWSER_CALL_RESOURCES.includes(r.resourceType()) && (new URL(r.url()).origin !== new URL(origin).origin || !['GET', 'HEAD'].includes(r.method()) || r.postData())) prohibited.push(entry);
  }); page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(installPrivateDocumentNetworkProbe);
  await page.addInitScript(() => {
    const Native = Worker, create = URL.createObjectURL, revoke = URL.revokeObjectURL;
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (payload: ShareData) => { Object.assign(window, { sharePayload: payload }); } });
    const stats = { created: 0, terminated: 0, urls: 0, revoked: 0 };
    Object.assign(window, { lifecycle: stats });
    window.Worker = class extends Native { constructor(url: string | URL, options?: WorkerOptions) { super(url, options); stats.created++; } terminate() { stats.terminated++; super.terminate(); const previous = JSON.parse(sessionStorage.getItem('task9-lifecycle') ?? '{}'); sessionStorage.setItem('task9-lifecycle', JSON.stringify({ ...previous, ...stats })); } };
    URL.createObjectURL = value => { stats.urls++; return create(value); }; URL.revokeObjectURL = value => { stats.revoked++; revoke(value); };
    addEventListener('pagehide', e => sessionStorage.setItem('task9-lifecycle', JSON.stringify({ ...stats, nativePersisted: e.persisted })));
    addEventListener('pageshow', e => {
      if (e.persisted && e.isTrusted) sessionStorage.setItem('task9-native-cache', JSON.stringify([...(JSON.parse(sessionStorage.getItem('task9-native-cache') ?? '[]')), location.pathname]));
    });
  });
  await page.goto('/technology/how-to-record-and-export-obd2-logs'); const before = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('link', { name: 'Analyze my log locally', exact: true }).click(); expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(before);
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click(); await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await page.getByLabel('Observation', { exact: true }).fill(marker); await page.getByRole('button', { name: 'Save note', exact: true }).click();
  for (const name of ['Download notebook backup', 'Download draft backup']) { const pending = page.waitForEvent('download'); await page.getByRole('button', { name, exact: true }).click(); const file = await pending; expect(await readFile((await file.path())!, 'utf8')).toContain(marker); }
  await expect.poll(async () => page.evaluate(() => { const s = (window as unknown as { lifecycle: { urls: number; revoked: number } }).lifecycle; return s.urls === s.revoked; })).toBe(true);
  await uploadBackup(page, backup('private-import', marker)); await page.getByRole('button', { name: 'Apply merge import' }).click();
  await page.getByRole('button', { name: 'Share TorqueGirl OBD2 Log Analyzer', exact: true }).click(); expect(page.url()).not.toContain(marker);
  expect(await page.evaluate(() => (window as unknown as { sharePayload: ShareData }).sharePayload.url)).toBe('https://torquegirl.com/tools/obd2-log-analyzer');
  await page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'Tools', exact: true }).click();
  const lifecycle = await page.evaluate(() => JSON.parse(sessionStorage.getItem('task9-lifecycle')!)); expect(lifecycle.created).toBe(1); expect(lifecycle.terminated).toBe(1); expect(lifecycle.urls).toBe(2); expect(lifecycle.revoked).toBe(2);
  await page.goBack(); await expect(page.locator('.obd-chart')).toHaveCount(0); await expect(page.getByTestId('notebook-record')).toHaveCount(2);
  await expect(page.getByLabel('Observation', { exact: true })).toHaveValue('');
  await page.goForward(); await expect(page.locator('h1')).toContainText('Understand');
  await page.getByRole('link', { name: 'Open Torque-Power Explorer', exact: true }).click();
  await page.locator('#tp-torque').fill(marker); await page.getByRole('button', { name: 'Calculate point' }).click();
  await page.locator('#tp-curve-text').fill('1000,853.2719\n3000,100'); await page.getByRole('button', { name: 'Plot curve', exact: true }).click();
  await expect(page.locator('script[src*=googletagmanager],script[src*=cloudflareinsights]')).toHaveCount(0); expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
  await page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'Tools', exact: true }).click();
  await page.goBack(); await expect(page.locator('#tp-curve-text')).toHaveValue(''); await expect(page.locator('.tp-plot')).toHaveCount(0);
  await page.goForward(); await expect(page.locator('h1')).toContainText('Understand');
  await page.goBack(); await expect(page.locator('#tp-curve-text')).toHaveValue('');
  await page.locator('#tp-curve-text').fill('1000,853.2719\n3000,100'); await page.getByRole('button', { name: 'Plot curve', exact: true }).click();
  const previous = await page.evaluate(() => performance.timeOrigin);
  await Promise.all([page.waitForEvent('framenavigated'), page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))]);
  await expect(page.locator('#tp-curve-text')).toHaveValue(''); expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(previous);
  expect(requests.join('\n')).not.toMatch(/TASK9_PRIVATE_8c1b|853\.2719/); expect(prohibited).toEqual([]); expect(errors).toEqual([]);
  expect(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key) ?? '[]'), PRIVATE_INITIATORS_KEY)).toEqual([]);
  console.log(JSON.stringify({ actualPagehide: lifecycle, nativeCachedRestores: await page.evaluate(() => JSON.parse(sessionStorage.getItem('task9-native-cache') ?? '[]')), syntheticExplorerPageshow: true }));
});
