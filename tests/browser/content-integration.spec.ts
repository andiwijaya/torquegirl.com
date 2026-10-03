import { test, expect, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { relative } from 'node:path';
import { allArticles, nascarV8Article, toyota2JzArticle, turboVsSuperchargerArticle, obd2Article, obd2ComparisonArticle, obd2DtcArticle, obd2LiveDataArticle, obd2RecordingArticle, tools } from '../../lib/torquegirl-content';
import { NOTEBOOK_KEY } from '../../lib/notebook/storage';
import { watch as watchResources } from './resource-watch';

test.use({ hasTouch: true });
const origin = new URL(process.env.OBD_TEST_URL ?? 'http://127.0.0.1:5184').origin;
const analyzer = '/tools/obd2-log-analyzer', explorer = '/tools/torque-power-explorer';
const engines = [nascarV8Article, toyota2JzArticle, turboVsSuperchargerArticle];
const viewports = [{ width: 320, height: 740 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }, { width: 768, height: 1024 }];
const evidence = 'outputs/next-development-task8';
const oldRoutes = ['/', '/engines', '/engines/how-a-nascar-v8-engine-works', '/engines/toyota-2jz-gte-tuning-legend', '/engines/turbocharger-vs-supercharger', '/technology', '/technology/how-formula-1-car-creates-downforce', '/technology/what-is-an-obd2-scanner', '/technology/obd2-scanner-vs-code-reader', '/technology/how-to-read-obd2-codes', '/technology/how-to-analyze-obd2-live-data-and-logs', '/off-track', '/off-track/golf-day', '/tools', analyzer, '/privacy', '/terms'];

function watch(page: Page) {
  return watchResources(page, origin);
}
async function privateDocument(page: Page, previous: number) {
  expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(previous);
  await expect(page.locator('script[src*="googletagmanager"],script[src*="cloudflareinsights"],script#ga4')).toHaveCount(0);
  expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
}

for (const viewport of [viewports[0], viewports[5]]) test(`homepage and Tools discovery by real clicks at ${viewport.width}`, async ({ page }) => {
  test.setTimeout(120_000);
  const observed = watch(page);
  await page.setViewportSize(viewport);
  for (const tool of tools) {
    await page.goto('/');
    // Let the document finish its active loads before deliberately leaving it;
    // Firefox reports cancelled image/module loads as console/resource errors.
    await page.waitForLoadState('networkidle');
    const before = await page.evaluate(() => performance.timeOrigin);
    await page.locator(`#tools a[href="${tool.path}"]`).click();
    await expect(page).toHaveURL(origin + tool.path); await privateDocument(page, before);
    await expect(page.getByRole('button', { name: tool.path === analyzer ? 'Explore demo' : 'Calculate point', exact: true })).toBeEnabled();
    await page.waitForLoadState('networkidle');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator(`#explore a[href="${tool.path}"]`).tap();
    await expect(page).toHaveURL(origin + tool.path);
    await expect(page.getByRole('button', { name: tool.path === analyzer ? 'Explore demo' : 'Calculate point', exact: true })).toBeEnabled();
    await page.waitForLoadState('networkidle');
    await page.getByRole('navigation', { name: 'Footer navigation', exact: true }).getByRole('link', { name: 'Tools', exact: true }).click();
    await expect(page).toHaveURL(origin + '/tools');
    await expect(page.locator('.tool-index-card')).toHaveCount(2);
    await page.waitForLoadState('networkidle');
    const fromIndex = await page.evaluate(() => performance.timeOrigin);
    await page.getByRole('link', { name: `Open ${tool.title}`, exact: true }).tap();
    await expect(page).toHaveURL(origin + tool.path); await privateDocument(page, fromIndex);
    await expect(page.getByRole('button', { name: tool.path === analyzer ? 'Explore demo' : 'Calculate point', exact: true })).toBeEnabled();
    await page.waitForLoadState('networkidle');
  }
  await page.goto('/tools');
  await page.getByRole('link', { name: 'local observation notebook', exact: true }).click();
  await expect(page).toHaveURL(origin + analyzer + '#observation-notebook');
  await expect(page.locator('#observation-notebook')).toBeInViewport();
  await expect(page.getByLabel('Observation', { exact: true })).toBeVisible();
  expect(observed).toEqual({ errors: [], resources: [] });
});

for (const article of engines) test(`${article.slug} has a contextual reciprocal Explorer journey`, async ({ page }) => {
  const observed = watch(page);
  await page.goto(article.path);
  await expect(page.locator('.article-body')).not.toContainText('future TorqueGirl feature');
  const before = await page.evaluate(() => performance.timeOrigin);
  await page.locator(`.article-body a[href="${explorer}"]`).click();
  await expect(page).toHaveURL(origin + explorer); await privateDocument(page, before);
  await page.getByRole('button', { name: 'Calculate point', exact: true }).click();
  await expect(page.locator('.tp-point-result')).toContainText('31.415927 kW');
  await page.getByRole('button', { name: 'Load synthetic sample', exact: true }).click();
  await expect(page.locator('.tp-source')).toContainText('not measured engine capability');
  await page.locator(`.tp-reading a[href="${article.path}"]`).click();
  await expect(page).toHaveURL(origin + article.path); await expect(page.locator('h1')).toHaveText(article.title);
  expect(observed).toEqual({ errors: [], resources: [] });
});

for (const viewport of [viewports[0], viewports[5]]) test(`learn prepare analyze observe save and retest path at ${viewport.width}`, async ({ page }) => {
  test.setTimeout(120_000);
  const observed = watch(page), prohibited: string[] = [];
  let inAnalyzer = false;
  page.on('framenavigated', f => { if (f === page.mainFrame()) inAnalyzer = new URL(f.url()).pathname === analyzer; });
  page.on('request', r => { if (inAnalyzer && (new URL(r.url()).origin !== origin || !['GET', 'HEAD'].includes(r.method()) || r.postData() || r.url().includes('TASK8_PRIVATE_NOTE'))) prohibited.push(r.url()); });
  await page.setViewportSize(viewport); await page.goto('/');
  await page.locator('#explore a[href="/technology"]').click();
  await page.locator(`.category-article-card[href="${obd2Article.path}"], .category-card[href="${obd2Article.path}"], a[href="${obd2Article.path}"]`).first().click();
  for (const article of [obd2ComparisonArticle, obd2DtcArticle, obd2LiveDataArticle, obd2RecordingArticle]) {
    await page.locator(`.article-body a[href="${article.path}"]`).first().click();
    await expect(page.locator('h1')).toHaveText(article.title);
  }
  const before = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('link', { name: 'Analyze my log locally', exact: true }).click();
  await privateDocument(page, before);
  await page.getByText('How to use this analyzer', { exact: true }).click();
  await expect(page.locator('.obd-guide li')).toHaveCount(10);
  await expect(page.locator('.obd-guide li').last()).toContainText('local notebook');
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await expect(page.locator('.obd-guide-next')).toContainText('check the preview');
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.locator('.obd-chart path').first()).toHaveAttribute('d', /M/);
  const phase = page.getByLabel('Phase region A', { exact: true });
  const idle = await phase.locator('option').filter({ hasText: /^idle / }).first().getAttribute('value');
  await phase.selectOption(idle!); await expect(page.getByTestId('region-A')).toContainText('idle');
  await page.getByRole('button', { name: 'Capture current evidence', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_KEY)).toBeNull();
  await page.getByLabel('Observation', { exact: true }).fill('TASK8_PRIVATE_NOTE: synthetic idle readings');
  await page.getByLabel('Alternative explanation', { exact: true }).fill('Polling cadence may affect the pattern');
  await page.getByLabel('Next test', { exact: true }).fill('Repeat a safe stationary recording under similar conditions');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByTestId('notebook-record')).toHaveCount(1);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook backup', exact: true }).click();
  expect((await pending).suggestedFilename()).toBe('torquegirl-notebook.json');
  await page.reload();
  await expect(page.getByTestId('notebook-record')).toContainText('TASK8_PRIVATE_NOTE');
  await expect(page.locator('.obd-chart')).toHaveCount(0);
  await page.getByTestId('notebook-record').getByRole('button', { name: /^Edit / }).click();
  await page.getByLabel('Retest result', { exact: true }).fill('Needs another recording; no diagnosis inferred');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByTestId('notebook-record').getByText('All saved details', { exact: true }).click();
  await expect(page.getByTestId('notebook-record')).toContainText('Needs another recording');
  expect(prohibited).toEqual([]); expect(observed).toEqual({ errors: [], resources: [] });
  await page.locator(`.obd-learn a[href="${obd2LiveDataArticle.path}"]`).click();
  await page.locator(`.article-body a[href="${analyzer}#observation-notebook"]`).click();
  await expect(page.locator('#observation-notebook')).toBeInViewport();
  await expect(page.getByTestId('notebook-record')).toHaveCount(1);
  await expect(page.locator('.obd-chart')).toHaveCount(0);
  console.log(JSON.stringify({ viewport, clickedLearningStages: 7, savedNote: true, rawSessionRestored: false, prohibitedRequests: prohibited.length }));
});

test('complete route sitemap metadata internal anchor and asset crawl', async ({ page, request }) => {
  test.setTimeout(240_000);
  const observed = watch(page);
  const sitemapResponse = await request.get('/sitemap.xml'); expect(sitemapResponse.status()).toBe(200);
  const sitemap = await sitemapResponse.text();
  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => ({ url: /<loc>(.*?)<\/loc>/.exec(m[1])![1], date: /<lastmod>(.*?)<\/lastmod>/.exec(m[1])?.[1] }));
  const routes = entries.map(e => new URL(e.url).pathname);
  const fileRoutes = readdirSync('app', { recursive: true, withFileTypes: true }).filter(f => f.isFile() && f.name === 'page.tsx').map(f => '/' + relative('app', f.parentPath).replaceAll('\\', '/')).sort();
  expect([...routes].sort()).toEqual(fileRoutes);
  expect(entries).toHaveLength(19); expect(new Set(routes).size).toBe(19);
  for (const path of oldRoutes) expect(routes).toContain(path);
  const links = new Set<string>(), assets = new Set<string>(), ids = new Map<string, string[]>();
  for (const entry of entries) {
    const path = new URL(entry.url).pathname;
    expect(entry.url).toBe(`https://torquegirl.com${path}`);
    expect((await page.goto(path))!.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://torquegirl.com${path === '/' ? '' : path}`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S.{20}/);
    ids.set(path, await page.locator('[id],a[name]').evaluateAll(nodes => nodes.flatMap(n => [n.id, n.getAttribute('name') ?? '']).filter(Boolean)));
    for (const href of await page.locator('a[href]').evaluateAll(nodes => nodes.map(n => (n as HTMLAnchorElement).href))) {
      const url = new URL(href); if ([origin, 'https://torquegirl.com'].includes(url.origin)) links.add(url.pathname + url.search + url.hash);
    }
    for (const src of await page.locator('img[src],script[src],link[href]').evaluateAll(nodes => nodes.map(n => (n as HTMLImageElement).src || (n as HTMLLinkElement).href))) {
      const url = new URL(src); if (url.origin === origin && !routes.includes(url.pathname)) assets.add(url.pathname + url.search);
    }
    const article = allArticles.find(a => a.path === path);
    if (article) {
      const json = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
      expect(json.datePublished).toBe(article.date); expect(json.dateModified).toBe(article.updatedDate ?? article.date);
      expect(entry.date).toBe(article.updatedDate ?? article.date);
      if (engines.includes(article)) {
        await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute('content', article.date);
        await expect(page.locator('meta[property="article:modified_time"]')).toHaveAttribute('content', article.updatedDate!);
      }
    }
    if (['/', '/tools', analyzer, explorer, '/privacy'].includes(path)) expect(entry.date).toBe('2026-10-03');
    if (path === '/privacy') {
      await expect(page.locator('.legal-updated')).toHaveText('Last updated: October 3, 2026');
      for (const text of ['explicit save or a reviewed backup import', 'Browser localStorage', 'Raw logs, source rows, sample arrays, traces and analysis sessions are never saved or restored', 'Web Locks', 'unsaved edits need the separate draft backup', 'do not initialize site analytics']) await expect(page.locator('.legal-body')).toContainText(text);
    }
    if (path === explorer || path === obd2RecordingArticle.path) await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', entry.url);
  }
  for (const href of links) {
    const url = new URL(href, origin), path = url.pathname.replace(/\/$/, '') || '/';
    expect(routes, href).toContain(path);
    if (url.hash) expect(ids.get(path), href).toContain(decodeURIComponent(url.hash.slice(1)));
  }
  for (const src of assets) expect((await request.get(src)).status(), src).toBe(200);
  expect(observed).toEqual({ errors: [], resources: [] });
  console.log(JSON.stringify({ routeCount: routes.length, oldRoutesPreserved: oldRoutes.length, internalDestinations: links.size, linkedAssets: assets.size, brokenLinks: 0, brokenAssets: 0 }));
});

for (const viewport of viewports) test(`integration layouts and keyboard touch menus at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  test.setTimeout(180_000);
  const observed = watch(page);
  await page.setViewportSize(viewport);
  const affected = ['/', '/tools', ...engines.map(a => a.path), explorer, obd2LiveDataArticle.path, obd2RecordingArticle.path, analyzer, '/privacy'];
  for (const path of affected) {
    await page.goto(path);
    const stem = `${evidence}/${viewport.width}x${viewport.height}-${path.replaceAll('/', '_') || 'home'}`;
    await page.screenshot({ path: `${stem}-intro.png` });
    const toggle = page.locator('.site-menu-toggle');
    if (viewport.width < 961) {
      await toggle.focus(); await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Tab');
      await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Home', exact: true })).toBeFocused();
      await page.screenshot({ path: `${stem}-menu.png` });
      await page.keyboard.press('Escape'); await expect(toggle).toBeFocused();
      await toggle.tap();
      const toolsLink = page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Tools', exact: true });
      expect((await toolsLink.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await toolsLink.tap(); await expect(page).toHaveURL(origin + '/tools');
      await page.goto(path);
    }
    const focus = path === '/' ? page.locator('#tools') : path === '/tools' ? page.locator('.tool-index-grid') : engines.some(a => a.path === path) ? page.locator(`.article-body a[href="${explorer}"]`) : path === explorer ? page.locator('.tp-reading') : path === analyzer ? page.locator('.obd-learn') : path === '/privacy' ? page.getByRole('heading', { name: 'Local observation and retest notes' }) : page.locator(`.article-body a[href="${analyzer}#observation-notebook"]`);
    await focus.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${stem}-integration.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const clipped = await page.locator('.shared-header,.site-navigation a,.tool-index-card,.tool-index-card h2,.tool-index-journey,.category-hero h1,.tools-context,.tools-spotlight,.tools-spotlight h2,.tools-spotlight h3,.article-intro h1,.article-body p,.article-body h2,.tp-reading,.tp-reading li,.obd-learn p,.legal-body p').evaluateAll(nodes => nodes.filter(n => {
      const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.left < -1 || r.right > innerWidth + 1 || n.scrollWidth > n.clientWidth + 1);
    }).map(n => `${n.tagName}.${n.className}: ${n.textContent?.slice(0, 60)}`));
    expect(clipped, path).toEqual([]);
  }
  expect(observed).toEqual({ errors: [], resources: [] });
});
