import { test, expect, type Page } from '@playwright/test';

const route = '/tools/torque-power-explorer';
const viewports = [{ width: 320, height: 740 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }];
const point = (page: Page) => page.locator('.tp-point-result');
const text = (page: Page) => page.getByLabel(/^RPM and torque points/);
async function paste(page: Page, value: string) { await text(page).fill(value); await page.getByRole('button', { name: 'Plot curve', exact: true }).click(); }

for (const units of [{ torque: 'Nm', power: 'kW' }, { torque: 'Nm', power: 'hp' }, { torque: 'lb-ft', power: 'kW' }, { torque: 'lb-ft', power: 'hp' }]) {
  test(`point both directions ${units.torque}/${units.power}`, async ({ page }) => {
    await page.goto(route);
    await page.getByLabel('Point torque unit', { exact: true }).selectOption(units.torque);
    await page.getByLabel('Point power unit', { exact: true }).selectOption(units.power);
    await page.getByLabel('RPM', { exact: true }).fill('4000');
    await page.getByLabel(/^Torque \(/).fill(units.torque === 'Nm' ? '271.16358966628008' : '200');
    await page.getByRole('button', { name: 'Calculate point' }).click();
    await expect(point(page)).toContainText('152.319644 mechanical hp');
    await expect(point(page)).toContainText('113.584739 kW');
    await expect(point(page)).toContainText('200 lb-ft');
    await page.getByLabel('Power + RPM → Torque', { exact: true }).check();
    await page.getByLabel(/^Power \(/).fill(units.power === 'kW' ? '113.58473882888302' : '152.3196438104142');
    await page.getByRole('button', { name: 'Calculate point' }).click();
    await expect(point(page)).toContainText('271.16359 Nm');
    await expect(point(page)).toContainText('200 lb-ft');
    await expect(page.locator('#tp-point-error')).toBeEmpty();
  });
}

test('point independent SI reference, zeros and actionable inverse zero', async ({ page }) => {
  await page.goto(route); await page.getByRole('button', { name: 'Calculate point' }).click();
  await expect(point(page)).toContainText('31.415927 kW'); await expect(point(page)).toContainText('42.129451 mechanical hp');
  await page.getByLabel('RPM', { exact: true }).fill('0'); await page.getByRole('button', { name: 'Calculate point' }).click();
  await expect(point(page)).toContainText('0 kW');
  await page.getByLabel('Power + RPM → Torque', { exact: true }).check();
  for (const value of ['0', '100']) {
    await page.getByLabel(/^Power \(/).fill(value); await page.getByRole('button', { name: 'Calculate point' }).click();
    await expect(page.locator('#tp-point-error')).toContainText('Enter RPM greater than zero');
    await expect(page.getByLabel('RPM', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('RPM', { exact: true })).toHaveAttribute('aria-describedby', /tp-point-error/);
    await expect(point(page)).not.toContainText('0 Nm');
  }
  await page.getByLabel('RPM', { exact: true }).fill('6000'); await page.getByLabel(/^Power \(/).fill('100');
  await page.getByRole('button', { name: 'Calculate point' }).click(); await expect(point(page)).toContainText('159.154943 Nm');
});

test('point invalid, empty, overflow, precision and output bounds preserve input', async ({ page }) => {
  await page.goto(route);
  for (const [value, message] of [['', 'empty value is not zero'], ['-1', 'between 0'], ['1,5', 'dot decimal'], ['1e309', 'overflows'], ['1e-999', 'too small'], ['1000001', 'between 0']] as const) {
    await page.getByLabel(/^Torque \(/).fill(value); await page.getByRole('button', { name: 'Calculate point' }).click();
    await expect(page.locator('#tp-point-error')).toContainText(message); await expect(page.getByLabel(/^Torque \(/)).toHaveValue(value);
    await expect(page.getByLabel(/^Torque \(/)).toHaveAttribute('aria-invalid', 'true');
  }
  await page.getByLabel('Power + RPM → Torque', { exact: true }).check(); await page.getByLabel('RPM', { exact: true }).fill('0.001');
  await page.getByLabel(/^Power \(/).fill('1'); await page.getByRole('button', { name: 'Calculate point' }).click();
  await expect(page.locator('#tp-point-error')).toContainText('torque must be between'); await expect(point(page)).not.toContainText('Infinity');
  await expect(page.getByLabel(/^Power \(/)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel(/^Power \(/)).toHaveAttribute('aria-describedby', /tp-point-error/);
  await expect(page.getByLabel(/^Power \(/)).toBeFocused();
});

test('point unit switches convert quantities and reject invalid conversion without relabelling', async ({ page }) => {
  await page.goto(route); await page.getByRole('button', { name: 'Calculate point' }).click();
  await page.getByLabel('Point torque unit', { exact: true }).selectOption('lb-ft');
  expect(Number(await page.getByLabel(/^Torque \(/).inputValue())).toBeCloseTo(73.75621492772654, 10);
  await page.getByLabel('Point power unit', { exact: true }).selectOption('hp'); await expect(point(page)).toContainText('42.129451 mechanical hp');
  await page.getByLabel('Point torque unit', { exact: true }).selectOption('Nm'); expect(Number(await page.getByLabel(/^Torque \(/).inputValue())).toBeCloseTo(100, 10);
  await page.getByLabel(/^Torque \(/).fill('bad'); await page.getByLabel('Point torque unit', { exact: true }).selectOption('lb-ft');
  await expect(page.getByLabel('Point torque unit', { exact: true })).toHaveValue('Nm'); await expect(page.getByLabel(/^Torque \(/)).toHaveValue('bad');
  await page.getByLabel('Power + RPM → Torque', { exact: true }).check(); await page.getByLabel(/^Power \(/).fill('100');
  await page.getByLabel('Point power unit', { exact: true }).selectOption('kW'); expect(Number(await page.getByLabel(/^Power \(/).inputValue())).toBeCloseTo(74.56998715822702, 10);
});

test('curve sample, supplied peaks, numeric fallback and source label', async ({ page }) => {
  await page.goto(route); await page.getByRole('button', { name: 'Load synthetic sample' }).click();
  await expect(page.getByTestId('peak-torque')).toContainText('230 Nm'); await expect(page.getByTestId('peak-torque')).toContainText('3,500 RPM');
  await expect(page.getByTestId('peak-power')).toContainText('119.380521 kW'); await expect(page.getByTestId('peak-power')).toContainText('6,000 RPM');
  await expect(page.locator('.tp-source')).toContainText('not measured engine capability');
  await expect(page.locator('.tp-plot svg')).toHaveCount(2); await expect(page.locator('.tp-plot circle')).toHaveCount(16);
  await page.getByText('All numeric samples (8)', { exact: true }).click(); await expect(page.locator('.tp-numeric li')).toHaveCount(8);
  await expect(page.locator('.tp-numeric li').nth(3)).toContainText('Sampled torque peak'); await expect(page.locator('.tp-numeric li').nth(6)).toContainText('Sampled power peak');
  await expect(page.locator('.tp-context')).toContainText('5252'); await expect(page.locator('.tp-context')).toContainText('metric PS');
});

test('curve paste formats, edits, unit conversion and sampled ties', async ({ page }) => {
  await page.goto(route);
  for (const delimiter of [',', ';', '\t']) {
    await paste(page, `RPM${delimiter}Torque\n1000${delimiter}200\n4000${delimiter}150`);
    await expect(page.getByTestId('peak-power')).toContainText('62.831853 kW');
  }
  await page.getByLabel('Curve torque unit', { exact: true }).selectOption('lb-ft');
  expect((await text(page).inputValue()).split('\n')[1]).toContain('147.512429');
  await expect(page.getByTestId('peak-torque')).toContainText('147.51243 lb-ft');
  await page.getByLabel('Curve power unit', { exact: true }).selectOption('hp'); await expect(page.getByTestId('peak-power')).toContainText('84.258903 mechanical hp');
  await page.getByLabel('Curve torque unit', { exact: true }).selectOption('Nm');
  await paste(page, '1000,100\n2000,100\n3000,50'); await expect(page.getByTestId('peak-torque')).toContainText('first of 2 tied samples');
  await paste(page, '1000,300\n2000,150\n3000,100'); await expect(page.getByTestId('peak-power')).toContainText('first of 3 tied samples');
  await text(page).fill('1000,0\n2000,0'); await expect(page.locator('.tp-curve-results')).toHaveCount(0);
  await page.getByRole('button', { name: 'Plot curve', exact: true }).click(); await expect(page.getByTestId('peak-power')).toContainText('0 mechanical hp');
});

test('curve errors preserve paste, order and unit with row error relationships', async ({ page }) => {
  await page.goto(route);
  for (const [value, message] of [['RPM,Torque\n1000,100\n1000,200', 'Row 3: Duplicate RPM'], ['2000,100\n1000,200', 'Row 2: RPM must increase'], ['1000,100\n2000,', 'Row 2: Enter torque'], ['1000,100\n2000,1e309', 'overflows'], ['1000,100', '2 to 200'], ['1000,100\n2000,100,2', 'exactly two']] as const) {
    await paste(page, value); await expect(page.locator('#tp-curve-error')).toContainText(message); await expect(text(page)).toHaveValue(value);
    await expect(text(page)).toHaveAttribute('aria-invalid', 'true'); await expect(text(page)).toHaveAttribute('aria-describedby', /tp-curve-error/);
    await expect(page.locator('.tp-curve-results')).toHaveCount(0);
  }
  await page.getByLabel('Curve torque unit', { exact: true }).selectOption('lb-ft'); await expect(page.getByLabel('Curve torque unit', { exact: true })).toHaveValue('Nm');
  await expect(text(page)).toHaveValue('1000,100\n2000,100,2');
  await paste(page, Array.from({ length: 201 }, (_, i) => `${i},100`).join('\n')); await expect(page.locator('#tp-curve-error')).toContainText('at most 200');
});

test('keyboard chart inspection, focus, endpoints and numeric disclosure', async ({ page }) => {
  await page.goto(route); await page.getByRole('button', { name: 'Load synthetic sample' }).click();
  const slider = page.getByRole('slider', { name: 'Inspect supplied sample' }); await page.keyboard.press('Tab'); await expect(slider).toBeFocused();
  expect(await slider.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.keyboard.press('ArrowRight'); await expect(page.getByTestId('curve-readout')).toContainText('2,000 RPM');
  await page.keyboard.press('End'); await expect(page.getByTestId('curve-readout')).toContainText('7,000 RPM');
  await expect(slider).toHaveAttribute('aria-valuetext', /Sample 8 of 8.*7,000 RPM/);
  await page.keyboard.press('Home'); await expect(page.getByTestId('curve-readout')).toContainText('1,000 RPM');
  await page.locator('.tp-numeric summary').focus(); await page.keyboard.press('Enter'); await expect(page.locator('.tp-numeric')).toHaveAttribute('open', '');
});

test('explorer SEO sitemap shared shell and content-free network boundary', async ({ page, request }) => {
  const requests: string[] = [], errors: string[] = [];
  await page.goto('/tools'); const previous = await page.evaluate(() => performance.timeOrigin);
  await page.goto(route); expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(previous);
  page.on('request', r => requests.push(`${r.method()} ${r.url()} ${r.postData() ?? ''}`)); page.on('pageerror', e => errors.push(e.message));
  await expect(page).toHaveTitle(/Torque–Power Explorer/); await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /mechanical hp/);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://torquegirl.com${route}`);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://torquegirl.com${route}`);
  await expect(page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'Tools', exact: true })).toHaveAttribute('href', '/tools');
  await expect(page.locator('script[src*="googletagmanager"],script[src*="cloudflareinsights"]')).toHaveCount(0);
  expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
  await paste(page, '1000,853.2719\n4000,777.314159'); await page.getByLabel(/^Torque \(/).fill('PRIVATE_CURVE_SENTINEL'); await page.getByRole('button', { name: 'Calculate point' }).click();
  await page.waitForTimeout(750); expect(requests).toEqual([]); expect(errors).toEqual([]);
  const contentRequests = requests.length;
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.includes('torque')))).toEqual([]);
  const locations = [...(await (await request.get('/sitemap.xml')).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  expect(locations.filter(l => l === `https://torquegirl.com${route}`)).toHaveLength(1); expect(new Set(locations).size).toBe(19);
  await page.reload(); await expect(text(page)).toHaveValue(''); await expect(page.getByLabel(/^Torque \(/)).toHaveValue('100');
  console.log(JSON.stringify({ explorerRequestsWhileEditing: contentRequests, explorerRuntimeErrors: errors.length, sitemapRoutes: locations.length }));
});

test('200 supplied points render and inspect responsively without truncation', async ({ page }) => {
  await page.goto(route); await page.setViewportSize({ width: 390, height: 844 });
  await text(page).fill(Array.from({ length: 200 }, (_, i) => `${(i + 1) * 500},${100 + i}`).join('\n'));
  const started = Date.now(); await page.getByRole('button', { name: 'Plot curve', exact: true }).click(); await expect(page.getByTestId('curve-readout')).toContainText('1 / 200');
  const plotMs = Date.now() - started;
  const renderMs = await page.evaluate(async () => {
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.tp-panel button')).find(b => b.textContent === 'Plot curve')!;
    const start = performance.now(); button.click();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return performance.now() - start;
  });
  await expect(page.locator('.tp-plot circle')).toHaveCount(400); await page.getByRole('slider').focus(); await page.keyboard.press('End'); await expect(page.getByTestId('curve-readout')).toContainText('100,000 RPM');
  await page.locator('.tp-numeric summary').click(); await expect(page.locator('.tp-numeric li')).toHaveCount(200);
  await page.getByLabel('Curve torque unit', { exact: true }).selectOption('lb-ft'); await expect(page.getByTestId('peak-torque')).toContainText('220.531083 lb-ft');
  console.log(JSON.stringify({ explorerPoints: 200, interactionAndReadoutMs: plotMs, inPageSubmitThroughTwoFramesMs: renderMs, renderedMarkers: 400, numericSamples: 200 }));
});

for (const viewport of viewports) test(`explorer usable chart/forms at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
  const context = await browser.newContext({ viewport, hasTouch: true }); const page = await context.newPage();
  try {
    await page.goto((process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184') + route);
    await page.getByRole('button', { name: 'Calculate point' }).tap(); await expect(point(page)).toContainText('31.415927 kW');
    await page.screenshot({ path: `outputs/next-development-task7/${viewport.width}x${viewport.height}-point.png`, fullPage: true });
    await page.getByRole('button', { name: 'Load synthetic sample' }).tap();
    const plot = page.locator('.tp-plot svg').first(); await plot.scrollIntoViewIfNeeded(); const box = (await plot.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width * 0.85, box.y + box.height * 0.5); await expect(page.getByTestId('curve-readout')).not.toContainText('Sample 1 /');
    await page.screenshot({ path: `outputs/next-development-task7/${viewport.width}x${viewport.height}-curve.png`, fullPage: true });
    await page.locator('.tp-curve-results').screenshot({ path: `outputs/next-development-task7/${viewport.width}x${viewport.height}-plots.png` });
    await page.locator('.tp-numeric summary').tap(); await expect(page.locator('.tp-numeric li').last()).toBeVisible();
    await page.locator('.tp-numeric').screenshot({ path: `outputs/next-development-task7/${viewport.width}x${viewport.height}-numeric.png` });
    const clipped = await page.locator('.tp-hero,.tp-panel,.tp-context,.tp-fields,label,.tp-plot,.tp-peaks>div,.tp-readout,.tp-numeric li').evaluateAll(els => els.filter(el => { const b = el.getBoundingClientRect(); return b.width > 0 && (b.left < -1 || b.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1); }).map(el => `${el.tagName}.${el.className}`));
    expect(clipped).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const control of await page.locator('.tp-panel button,.tp-panel input,.tp-panel select,.tp-numeric summary').all()) {
      const b = await control.boundingBox(); if (!b || (await control.getAttribute('type')) === 'radio') continue;
      expect(b.height).toBeGreaterThanOrEqual(44); expect(b.width).toBeGreaterThanOrEqual(44);
    }
    await text(page).fill('1000,100\n1000,200'); await page.getByRole('button', { name: 'Plot curve', exact: true }).tap(); await expect(page.locator('#tp-curve-error')).toContainText('Duplicate RPM');
    await page.screenshot({ path: `outputs/next-development-task7/${viewport.width}x${viewport.height}-error.png`, fullPage: true });
  } finally { await context.close(); }
});
