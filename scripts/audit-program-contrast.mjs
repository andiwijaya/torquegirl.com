/** Computed solid-background text contrast for program discovery/link surfaces.
 * Complements visual review; excludes images, hidden/disabled and translucent text.
 * Usage: node scripts/audit-program-contrast.mjs <output-json>
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const output = process.argv[2];
if (!output) throw new Error('Expected output JSON');
const browser = await chromium.launch(), results = [];
try {
  for (const viewport of [{ width: 320, height: 740 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }, { width: 768, height: 1024 }]) {
    const page = await browser.newPage({ viewport });
    for (const path of ['/', '/tools', '/engines/how-a-nascar-v8-engine-works', '/engines/toyota-2jz-gte-tuning-legend', '/engines/turbocharger-vs-supercharger']) {
      await page.goto(`http://127.0.0.1:5184${path}`);
      const checks = await page.evaluate(() => {
        const rgb = text => text.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0];
        const mix = (a, b) => a.slice(0, 3).map((v, i) => v * (a[3] ?? 1) + b[i] * (1 - (a[3] ?? 1)));
        const background = el => el ? mix(rgb(getComputedStyle(el).backgroundColor), background(el.parentElement)) : [255, 255, 255];
        const luminance = color => color.slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
        const roots = [...document.querySelectorAll('.shared-header,.shared-footer,.hero-copy,#explore,#latest,#tools,.tool-index-grid,.tool-index-journey,.article-body a[href="/tools/torque-power-explorer"]')];
        return [...new Set(roots.flatMap(el => [el, ...el.querySelectorAll('*')]))].flatMap(el => {
          if (!(el instanceof HTMLElement) || !el.checkVisibility() || el.closest('[disabled]')) return [];
          const text = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent?.trim()).join(' ');
          const style = getComputedStyle(el);
          if (!text || style.opacity !== '1' || style.backgroundImage !== 'none') return [];
          const bg = background(el), a = luminance(bg), b = luminance(mix(rgb(style.color), bg));
          const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
          const large = parseFloat(style.fontSize) >= 24 || parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700;
          return [{ text: text.slice(0, 70), ratio, minimum: large ? 3 : 4.5 }];
        });
      });
      if (!checks.length) throw new Error(`No contrast checks: ${path}`);
      results.push({ path, viewport, count: checks.length, minimumRatio: Math.min(...checks.map(c => c.ratio)), failures: checks.filter(c => c.ratio + .01 < c.minimum) });
    }
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(output, JSON.stringify({ results }, null, 2));
console.log(JSON.stringify({ combinations: results.length, checkedText: results.reduce((s, r) => s + r.count, 0), failures: results.filter(r => r.failures.length) }, null, 2));
if (results.some(r => r.failures.length)) process.exitCode = 1;
