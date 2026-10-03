import { test, expect, type Page } from '@playwright/test';
import { allArticles, getLatestArticles } from '../../lib/torquegirl-content';
import { siteDestinations } from '../../lib/site-navigation';
import { driveCsv } from '../../lib/obd/drive-demo';

const origin = new URL(process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184').origin;
const routes = ['/', '/engines', '/technology', '/tools', '/off-track', '/privacy', '/terms', '/tools/obd2-log-analyzer', ...allArticles.map(a => a.path)];
const viewports = [{ width: 320, height: 740 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }];

function watch(page: Page) {
  const errors: string[] = [], resources: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => { if (new URL(r.url()).origin === origin) resources.push(r.url()); });
  page.on('response', r => { if (r.status() >= 400 && new URL(r.url()).origin === origin) resources.push(`${r.status()} ${r.url()}`); });
  return { errors, resources };
}

async function noClipping(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Root overflow can be hidden; also measure the content and text containers themselves.
  const clipped = await page.locator('.shared-header, .site-navigation a, .shared-footer, .shared-footer nav a, .hero-copy, .hero h1, .home-page .section, .home-page h2, .latest-card, .latest-card h3, .tools-context').evaluateAll(elements => elements.filter(el => {
    const box = el.getBoundingClientRect();
    return box.width > 0 && (box.left < -1 || box.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1);
  }).map(el => `${el.tagName}.${el.className}: ${el.textContent?.slice(0, 50)}`));
  expect(clipped).toEqual([]);
}

test('all registry routes share six destinations and complete legal/contact footers', async ({ page }) => {
  test.setTimeout(120_000);
  const observed = watch(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of routes) {
    expect((await page.goto(route))!.status()).toBe(200);
    const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
    await expect(nav.getByRole('link')).toHaveCount(6);
    for (const { label, href } of siteDestinations) await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
    const footer = page.getByRole('navigation', { name: 'Footer navigation', exact: true });
    for (const { label, href } of [...siteDestinations, { label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }, { label: 'Contact', href: 'mailto:hello@torquegirl.com' }]) {
      await expect(footer.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
    }
  }
  expect(observed).toEqual({ errors: [], resources: [] });
});

test('desktop and narrow menu destinations work by actual repeated clicking', async ({ page }) => {
  test.setTimeout(120_000);
  const observed = watch(page);
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/engines/how-a-nascar-v8-engine-works');
    for (const { label, href } of siteDestinations) {
      const toggle = page.locator('.site-menu-toggle');
      if (viewport.width < 961) await toggle.click();
      await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(origin + href);
      await expect(page.locator('h1')).toBeVisible();
      if (label === 'About') await expect(page.locator('#about')).toBeInViewport();
      if (viewport.width < 961) await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toHaveAttribute('aria-expanded', 'false');
    }
  }
  expect(observed).toEqual({ errors: [], resources: [] });
});

for (const viewport of viewports) test(`homepage and editorial/analyzer menus at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  test.setTimeout(120_000);
  const observed = watch(page);
  await page.setViewportSize(viewport);
  for (const path of ['/', '/technology/how-to-analyze-obd2-live-data-and-logs', '/tools/obd2-log-analyzer']) {
    await page.goto(path);
    await noClipping(page);
    for (const link of await page.locator('.shared-footer nav a, .shared-header .brand, .shared-footer .brand').all()) {
      const bounds = (await link.boundingBox())!;
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.width).toBeGreaterThanOrEqual(44);
    }
    const suffix = `${viewport.width}x${viewport.height}-${path === '/' ? 'home' : path.includes('/technology') ? 'article' : 'analyzer'}`;
    await page.screenshot({ path: `outputs/next-development-task1/${suffix}-closed.png` });
    if (viewport.width < 961) {
      const toggle = page.locator('.site-menu-toggle');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      const controlId = await toggle.getAttribute('aria-controls');
      expect(controlId).toBeTruthy();
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
      await expect(nav).toHaveAttribute('id', controlId!);
      await page.keyboard.press('Tab');
      await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeFocused();
      for (const link of await nav.getByRole('link').all()) {
        await expect(link).toBeVisible();
        const bounds = (await link.boundingBox())!;
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.width).toBeGreaterThanOrEqual(44);
      }
      const focusStyle = await nav.getByRole('link', { name: 'Home', exact: true }).evaluate(el => getComputedStyle(el).outlineStyle);
      expect(focusStyle).not.toBe('none');
      await noClipping(page);
      await page.screenshot({ path: `outputs/next-development-task1/${suffix}-open.png` });
      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle).toBeFocused();
      await toggle.click(); await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    } else {
      await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeHidden();
      await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toBeVisible();
      for (const link of await page.locator('.site-navigation a').all()) {
        const bounds = (await link.boundingBox())!;
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.width).toBeGreaterThanOrEqual(44);
      }
    }
    if (path === '/') {
      for (const id of ['explore', 'tools', 'latest']) {
        await page.locator('#' + id).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `outputs/next-development-task1/${suffix}-${id}.png` });
      }
      await page.locator('.shared-footer').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `outputs/next-development-task1/${suffix}-footer.png` });
    }
  }
  expect(observed).toEqual({ errors: [], resources: [] });
});

test('homepage uses registry Latest and preserves old anchors and working editorial links', async ({ page }) => {
  const observed = watch(page);
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://torquegirl.com/torque-girl-hero.png');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', 'https://torquegirl.com/torque-girl-hero.png');
  const latest = getLatestArticles();
  await expect(page.locator('#latest .latest-card')).toHaveCount(latest.length);
  expect(await page.locator('#latest .latest-card').evaluateAll(links => links.map(a => a.getAttribute('href')))).toEqual(latest.map(a => a.path));
  expect(await page.locator('#latest time').evaluateAll(times => times.map(t => t.getAttribute('datetime')))).toEqual(latest.map(a => a.date));
  for (const id of ['top','explore','how-it-works','featured','latest','engine-legends','technology','obd2','obd2-comparison','obd2-codes','obd2-live-data','about','follow']) await expect(page.locator('#' + id)).toHaveCount(1);
  const contrast = await page.evaluate(() => {
    function luminance(color: string) {
      const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(v => {
        const n = Number(v) / 255;
        return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
      });
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    }
    return [...document.querySelectorAll('.site-navigation a[aria-current], .scroll-note, .category-number, .latest-meta>span, #latest .text-link, .follow-section .eyebrow')].map(el => {
      const background = el.closest('.follow-section') ?? document.body;
      const a = luminance(getComputedStyle(el).color), b = luminance(getComputedStyle(background).backgroundColor);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    });
  });
  expect(contrast.length).toBeGreaterThan(0);
  for (const ratio of contrast) expect(ratio).toBeGreaterThanOrEqual(4.5);
  for (const article of latest) {
    await page.locator(`#latest a[href="${article.path}"]`).click();
    await expect(page).toHaveURL(origin + article.path);
    await expect(page.locator('h1')).toHaveText(article.title);
    await page.goBack();
  }
  await page.locator('#engine-legends a').click();
  await expect(page).toHaveURL(origin + '/engines/toyota-2jz-gte-tuning-legend');
  expect(observed).toEqual({ errors: [], resources: [] });
});

test('homepage spotlight and editorial menu enter fresh analytics-free analysis documents', async ({ page }) => {
  test.setTimeout(120_000);
  const observed = watch(page);
  for (const source of ['/', '/engines/how-a-nascar-v8-engine-works', '/tools/obd2-log-analyzer']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(source);
    if (source === '/tools/obd2-log-analyzer') {
      await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
      await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
      await expect(page.locator('.obd-chart path').first()).toHaveAttribute('d', /M/);
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Tools', exact: true }).click();
    }
    if (source !== '/') {
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Tools', exact: true }).click();
    }
    const before = await page.evaluate(() => performance.timeOrigin);
    const entry = source === '/' ? page.locator('#tools a[href="/tools/obd2-log-analyzer"]') : page.locator('a[href="/tools/obd2-log-analyzer"]').first();
    await entry.click();
    await expect(page).toHaveURL(origin + '/tools/obd2-log-analyzer');
    expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(before);
    await expect(page.locator('script[src*="googletagmanager"],script[src*="cloudflareinsights"],script#ga4')).toHaveCount(0);
    expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
    await expect(page.locator('.obd-chart')).toHaveCount(0); // Leaving the analyzer discards its in-memory session.
    const requests: string[] = [];
    const record = (r: import('@playwright/test').Request) => { if (new URL(r.url()).origin !== origin || !['GET','HEAD'].includes(r.method()) || r.postData()?.includes('TASK1_PRIVATE_SENTINEL') || r.url().includes('TASK1_PRIVATE_SENTINEL')) requests.push(r.url()); };
    page.on('request', record);
    await page.getByLabel('Choose CSV log', { exact: true }).setInputFiles({ name: 'TASK1_PRIVATE_SENTINEL.csv', mimeType: 'text/csv', buffer: Buffer.from(driveCsv()) });
    await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
    await expect(page.locator('.obd-chart path').first()).toHaveAttribute('d', /M/);
    await page.waitForTimeout(1000);
    expect(requests).toEqual([]);
    page.off('request', record);
  }
  expect(observed).toEqual({ errors: [], resources: [] });
});

test('touch navigation, same-page anchor focus, focus leaving and resize dismissal', async ({ browser, page }) => {
  const context = await browser.newContext({ baseURL: origin, viewport: { width: 375, height: 812 }, hasTouch: true });
  const touch = await context.newPage();
  const observed = watch(touch);
  try {
    await touch.goto('/technology');
    const toggle = touch.locator('.site-menu-toggle');
    const bounds = (await toggle.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
    await toggle.tap();
    await touch.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Tools', exact: true }).tap();
    await expect(touch).toHaveURL(origin + '/tools');
    await toggle.tap(); await toggle.tap();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(observed).toEqual({ errors: [], resources: [] });
  } finally { await context.close(); }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('.site-menu-toggle');
  await toggle.click();
  await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.locator('#about')).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await page.locator('.hero-actions a').first().focus();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
