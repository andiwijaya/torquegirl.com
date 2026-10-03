/** Alternating production-browser benchmark. Fixtures are generated once outside
 * timers. Worker round-trip includes queue/transfer; UI wall time includes automation.
 * Usage: node --import tsx scripts/benchmark-program-browser.mjs <output-json>
 */
import { chromium, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { demoCsv } from '../lib/obd/demo.ts';
import { driveCsv } from '../lib/obd/drive-demo.ts';
const output = process.argv[2];
if (!output) throw new Error('Expected output JSON');
const samples = [], fixtures = {
  demo: Buffer.from(demoCsv(200_000)),
  a: Buffer.from(driveCsv({ mode: 'cruise', rows: 200_000 })),
  b: Buffer.from(driveCsv({ mode: 'cruise', rows: 200_000, trim: 4.3 })),
};
const nativeFiles = process.env.BENCHMARK_NATIVE_FILES === '1';
const paths = Object.fromEntries(Object.entries(fixtures).map(([key, value]) => {
  const path = join(dirname(resolve(output)), `benchmark-${key}.csv`); if (nativeFiles) writeFileSync(path, value); return [key, path];
}));
const browser = await chromium.launch(process.env.BENCHMARK_BROWSER_PATH ? { executablePath: process.env.BENCHMARK_BROWSER_PATH } : {});
try {
  for (let iteration = -2; iteration < Number(process.env.BENCHMARK_ITERATIONS ?? 7); iteration++) {
    for (const label of iteration % 2 === 0 ? ['current', 'baseline'] : ['baseline', 'current']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.addInitScript(() => {
        const NativeWorker = window.Worker;
        window.measurements = { workers: [], longTasks: [], ticks: 0, maxTickGap: 0 };
        window.Worker = class extends NativeWorker {
          pending = new Map();
          constructor(url, options) {
            super(url, options);
            this.addEventListener('message', ({ data }) => {
              const pending = this.pending.get(data.id);
              if (pending) window.measurements.workers.push({ kind: pending.kind, run: pending.run, ms: performance.now() - pending.start });
              this.pending.delete(data.id);
            });
          }
          postMessage(message) { this.pending.set(message.id, { kind: message.kind, run: message.run ?? 'A', start: performance.now() }); super.postMessage(message); }
        };
        new PerformanceObserver(list => { window.measurements.longTasks.push(...list.getEntries().map(e => e.duration)); }).observe({ entryTypes: ['longtask'] });
        let previous = performance.now();
        setInterval(() => { const now = performance.now(); window.measurements.ticks++; window.measurements.maxTickGap = Math.max(window.measurements.maxTickGap, now - previous); previous = now; }, 20);
      });
      const page = await context.newPage();
      const base = `http://127.0.0.1:${label === 'baseline' ? 5185 : 5184}`;
      const upload = (name, key, run = 'A') => page.getByLabel(run === 'A' ? 'Choose CSV log' : 'Choose Run B CSV log', { exact: true }).setInputFiles(nativeFiles ? paths[key] : { name, mimeType: 'text/csv', buffer: fixtures[key] });
      await page.goto(`${base}/tools/obd2-log-analyzer`);
      await expect(page.getByLabel('Choose CSV log', { exact: true })).toBeEnabled();
      const t = performance.now();
      await upload('large.csv', 'demo');
      await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
      await expect(page.locator('.obd-chart path').first()).toHaveAttribute('d', /M/);
      const importMs = performance.now() - t;
      await page.getByRole('button', { name: 'Review mapping', exact: true }).click();
      await page.getByLabel('Time interpretation').selectOption('ms');
      await page.getByLabel('Unit for column 3').selectOption('mph');
      const tr = performance.now();
      await page.getByRole('button', { name: 'Update preview', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Analyze log', exact: true })).toBeEnabled();
      const remapMs = performance.now() - tr;
      await expect(page.getByTestId('mapping-duration')).toHaveText('20.0119 s');
      await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
      await page.getByLabel('Log position', { exact: true }).fill('0.01');
      await expect(page.locator('.obd-reading').nth(1)).toContainText('128.59');
      await upload('A.csv', 'a');
      await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
      await expect(page.getByLabel('Phase region A')).toBeVisible();
      await page.getByText('A/B comparison', { exact: true }).click();
      const tb = performance.now();
      await upload('B.csv', 'b', 'B');
      await page.locator('.drive-b-preview').getByRole('button', { name: 'Analyze log', exact: true }).click();
      await expect(page.getByLabel('Phase region B')).toBeVisible();
      await page.getByRole('button', { name: 'Compare selected regions', exact: true }).click();
      await expect(page.getByTestId('change-ltft-bank-1')).toContainText('-6.5');
      const secondImportComparisonMs = performance.now() - tb;
      const metrics = await page.evaluate(() => window.measurements);
      for (const kind of ['load', 'remap', 'compare']) expect(metrics.workers.some(job => job.kind === kind)).toBe(true);
      const sample = { label, iteration, warmup: iteration < 0, importMs, remapMs, secondImportComparisonMs, ...metrics, maxMainThreadGapMs: metrics.maxTickGap, maxLongTaskMs: Math.max(0, ...metrics.longTasks) };
      samples.push(sample); console.log(JSON.stringify(sample));
      writeFileSync(output, JSON.stringify({ browser: browser.version(), nativeFiles, node: process.version, viewport: { width: 1440, height: 1000 }, fixtureBytes: Object.fromEntries(Object.entries(fixtures).map(([k, v]) => [k, v.length])), samples }, null, 2));
      await context.close();
    }
  }
} finally { await browser.close(); }
