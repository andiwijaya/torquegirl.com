import { test, expect, type Page } from '@playwright/test';
import { obd2Article, obd2ComparisonArticle, obd2DtcArticle, obd2LiveDataArticle, obd2RecordingArticle, getLatestArticles } from '../../lib/torquegirl-content';
import { driveCsv } from '../../lib/obd/drive-demo';

const origin = new URL(process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184').origin;
const learning = [obd2Article, obd2ComparisonArticle, obd2DtcArticle, obd2LiveDataArticle, obd2RecordingArticle];
const analyzer = '/tools/obd2-log-analyzer';
const evidence = 'outputs/next-development-task2';
const viewports = [{ width: 320, height: 740 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }];

function watch(page: Page) {
  const errors: string[] = [], resources: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (new URL(r.url()).origin === origin && r.status() >= 400) resources.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', r => { if (new URL(r.url()).origin === origin) resources.push(r.url()); });
  return { errors, resources };
}

for (const viewport of [viewports[0], viewports[5]]) test(`complete OBD learning journey and private real-worker entry at ${viewport.width} x ${viewport.height}`, async ({ page }) => {
  test.setTimeout(120_000);
  const observed = watch(page);
  const requests: string[] = [], workers: string[] = [];
  let entered = false;
  page.on('worker', w => workers.push(w.url()));
  // Entry means the fresh analyzer document has committed. The source article may
  // finish its own editorial page-view beacon while the navigation request is in flight.
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) entered = new URL(frame.url()).pathname === analyzer;
  });
  page.on('request', r => {
    if (entered && (new URL(r.url()).origin !== origin || !['GET', 'HEAD'].includes(r.method()) || r.postData() || /TASK2_PRIVATE_SENTINEL|853\.2719/.test(r.url()))) requests.push(r.url());
  });
  await page.setViewportSize(viewport);
  await page.goto(obd2Article.path);
  for (const article of [obd2ComparisonArticle, obd2DtcArticle, obd2LiveDataArticle, obd2RecordingArticle]) {
    await page.locator(`.article-body a[href="${article.path}"]`).first().click();
    await expect(page).toHaveURL(origin + article.path);
    await expect(page.locator('h1')).toHaveText(article.title);
  }
  const before = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('link', { name: 'Analyze my log locally', exact: true }).click();
  await expect(page).toHaveURL(origin + analyzer);
  expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(before);
  await expect(page.locator('script[src*="googletagmanager"],script[src*="cloudflareinsights"],script#ga4')).toHaveCount(0);
  expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
  const csv = driveCsv().replace('800.000', '853.2719');
  expect(csv).toContain('853.2719');
  await page.getByLabel('Choose CSV log', { exact: true }).setInputFiles({ name: 'TASK2_PRIVATE_SENTINEL.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-chart path').first()).toHaveAttribute('d', /M/);
  await expect(page.getByTestId('current-phase')).toContainText('stopped');
  await page.waitForTimeout(1000);
  expect(workers.length).toBeGreaterThan(0);
  expect(workers.every(url => new URL(url).origin === origin)).toBe(true);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/TASK2_PRIVATE_SENTINEL|853\.2719|sourceValues/);
  expect(observed).toEqual({ errors: [], resources: [] });
  console.log(JSON.stringify({ viewport, freshDocument: true, workers, offOriginOrContentRequests: requests.length }));
  entered = false;
  await page.locator(`.obd-learn a[href="${obd2RecordingArticle.path}"]`).click();
  await expect(page.locator('h1')).toHaveText(obd2RecordingArticle.title);
  await page.locator(`.article-body a[href="${obd2LiveDataArticle.path}"]`).first().click();
  const liveBefore = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('link', { name: 'Analyze my log locally', exact: true }).click();
  expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(liveBefore);
  await expect(page.getByLabel('Choose CSV log', { exact: true })).toBeVisible();
  await expect(page.locator('.obd-chart')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-chart path').first()).toHaveAttribute('d', /M/);
  await page.waitForTimeout(500);
  expect(requests).toEqual([]);
  expect(observed).toEqual({ errors: [], resources: [] });
});

test('learning content, internal links, metadata and publication freshness agree', async ({ page, request }) => {
  test.setTimeout(120_000);
  const checked = new Set<string>();
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  expect(new Set(locations).size).toBe(19);
  expect(locations.length).toBe(19);
  for (const article of learning) {
    expect((await page.goto(article.path))!.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://torquegirl.com${article.path}`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /OBD2/);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://torquegirl.com${article.path}`);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `https://torquegirl.com${article.heroImage}`);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', `https://torquegirl.com${article.heroImage}`);
    await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute('content', article.date);
    if (article.updatedDate) await expect(page.locator('meta[property="article:modified_time"]')).toHaveAttribute('content', article.updatedDate);
    const json = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(json.datePublished).toBe(article.date);
    expect(json.dateModified).toBe(article.updatedDate ?? article.date);
    expect(sitemap).toContain(`<loc>https://torquegirl.com${article.path}</loc><lastmod>${article.updatedDate ?? article.date}</lastmod>`);
    if (article !== obd2LiveDataArticle && article !== obd2RecordingArticle) await expect(page.locator(`.article-body a[href="${obd2LiveDataArticle.path}"]`)).toHaveCount(1);
    const links = await page.locator('a[href^="/"]').evaluateAll(a => a.map(el => el.getAttribute('href')!));
    for (const href of new Set(links)) {
      if (checked.has(href)) continue;
      checked.add(href);
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
      const fragment = new URL(href, origin).hash;
      if (fragment) expect(await response.text()).toContain(`id="${fragment.slice(1)}"`);
    }
  }
  await page.goto(obd2RecordingArticle.path);
  const body = page.locator('.article-body');
  for (const id of ['safe-setup', 'channels', 'conditions', 'cadence', 'time-units', 'export', 'preserve', 'privacy', 'analyze']) await expect(page.locator('h2#' + id)).toBeVisible();
  for (const text of ['Do not operate a phone', 'stationary idle', 'Cold or warming up', 'Warm idle', 'Steady cruise', 'Acceleration and deceleration', 'no universal duration', 'timezone', 'milliseconds', 'TSV if your software supports it', 'Do not delete inconvenient spikes', 'untouched export', 'without uploading', 'not an automatic diagnosis']) await expect(body).toContainText(text);
  await expect(body).not.toContainText('Notebook');
  await page.goto('/');
  expect(await page.locator('#latest .latest-card').evaluateAll(a => a.map(el => el.getAttribute('href')))).toEqual(getLatestArticles().map(a => a.path));
  await page.locator(`#latest a[href="${obd2RecordingArticle.path}"]`).click();
  await expect(page.locator('h1')).toHaveText(obd2RecordingArticle.title);
  await page.goto('/technology');
  await page.locator(`a.article-card[href="${obd2RecordingArticle.path}"]`).click();
  await expect(page.locator('h1')).toHaveText(obd2RecordingArticle.title);
  console.log(JSON.stringify({ sitemapEntries: locations.length, checkedInternalLinks: checked.size, learningArticles: learning.length }));
});

test('recording guide shares only its canonical article URL', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { copied: string }).copied = text; } } });
  });
  await page.goto(obd2RecordingArticle.path);
  await page.getByRole('button', { name: 'COPY LINK', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'LINK COPIED', exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(`https://torquegirl.com${obd2RecordingArticle.path}`);
  for (const link of await page.locator('.article-share-actions a').all()) {
    expect(decodeURIComponent((await link.getAttribute('href'))!)).toContain(`https://torquegirl.com${obd2RecordingArticle.path}`);
  }
});

for (const viewport of viewports) test(`changed OBD articles and CTAs at ${viewport.width} x ${viewport.height}`, async ({ page }) => {
  test.setTimeout(120_000);
  const observed = watch(page);
  await page.setViewportSize(viewport);
  for (const article of learning) {
    await page.goto(article.path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const clipped = await page.locator('.article-intro, .article-intro h1, .article-body, .article-body h2, .article-body p, .article-figure img, .recap-item, .related-article, .related-article a').evaluateAll(elements => elements.filter(el => {
      const box = el.getBoundingClientRect();
      // Existing phone figures bleed into article padding while staying inside the viewport.
      // Measure their actual bounds and every text container; that intentional bleed increases body scrollWidth.
      const textOverflow = !el.classList.contains('article-body') && el.scrollWidth > el.clientWidth + 1;
      return box.width > 0 && (box.left < -1 || box.right > innerWidth + 1 || textOverflow);
    }).map(el => `${el.tagName}.${el.className}: ${el.textContent?.slice(0, 60)}`));
    expect(clipped, article.path).toEqual([]);
    const name = `${viewport.width}x${viewport.height}-${article.slug}`;
    await page.screenshot({ path: `${evidence}/${name}-intro.png` });
    const cta = page.locator(`.article-body a[href="${analyzer}"]`).first();
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toBeVisible();
    await page.screenshot({ path: `${evidence}/${name}-cta.png` });
    if (article === obd2RecordingArticle) {
      for (const section of ['safe-setup', 'channels', 'conditions', 'cadence', 'time-units', 'export', 'preserve', 'privacy']) {
        await page.locator('#' + section).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${evidence}/${name}-${section}.png` });
      }
      const bounds = (await cta.boundingBox())!;
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      await cta.focus();
      expect(await cta.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
    }
  }
  await page.goto(analyzer);
  await page.locator('.obd-learn').scrollIntoViewIfNeeded();
  await expect(page.locator(`.obd-learn a[href="${obd2RecordingArticle.path}"]`)).toBeVisible();
  expect(await page.locator('.obd-learn').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: `${evidence}/${viewport.width}x${viewport.height}-analyzer-reciprocal.png` });
  expect(observed).toEqual({ errors: [], resources: [] });
});
