import { chromium } from '@playwright/test';
import { writeFileSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { emptyNotebook, exportNotebookJson, parseNotebookJson } from '../lib/notebook/model.ts';
import { createNotebookStore } from '../lib/notebook/storage.ts';
const [baseline, output] = process.argv.slice(2);
if (!baseline || !output) throw new Error('Expected baseline directory and output JSON');
const time = '2026-10-03T12:00:00.000Z';
const document = { ...emptyNotebook(), records: Array.from({ length: 99 }, (_, i) => ({ id: `bounded-${i}`, createdAt: time, updatedAt: time, notes: 'x'.repeat(4900) })) };
const json = exportNotebookJson(document), notebook = [];
for (let i = -2; i < 10; i++) {
  let value = json, writes = [];
  const store = createNotebookStore({ getItem: () => value, setItem: (_, next) => { const t = performance.now(); value = next; writes.push(performance.now() - t); } }, { exclusive: task => Promise.resolve(task()), id: () => 'final', now: () => time });
  let t = performance.now(); parseNotebookJson(json); const validateMs = performance.now() - t;
  t = performance.now(); const snapshot = store.read(); const readMs = performance.now() - t;
  t = performance.now(); await store.create(snapshot, { observation: 'Final note' }); const completeSaveMs = performance.now() - t;
  notebook.push({ warmup: i < 0, validateMs, readMs, completeSaveMs, injectedWriteMs: writes[0], bytes: Buffer.byteLength(value) });
}
const browser = await chromium.launch(), bundles = [], browserStorageWrites = [];
try {
  for (const [label, port, route, root] of [
    ['baseline-analyzer', 5185, '/tools/obd2-log-analyzer', baseline],
    ['current-analyzer', 5184, '/tools/obd2-log-analyzer', process.cwd()],
    ['current-explorer', 5184, '/tools/torque-power-explorer', process.cwd()],
  ]) {
    const context = await browser.newContext(), page = await context.newPage();
    const scripts = new Map();
    page.on('response', async response => { if (new URL(response.url()).pathname.endsWith('.js')) { const body = await response.body(); scripts.set(response.url(), { bytes: body.length, gzipBytes: gzipSync(body).length }); } });
    await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' });
    const perf = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { domContentLoadedMs: n.domContentLoadedEventEnd, loadMs: n.loadEventEnd }; });
    const files = [...scripts].map(([url, sizes]) => ({ url: new URL(url).pathname, ...sizes }));
    const emittedJs = JSON.parse(readFileSync(resolve(root, 'dist/server/.vite/manifest.json'), 'utf8'));
    bundles.push({ label, ...perf, files, initialJsBytes: files.reduce((s, f) => s + f.bytes, 0), initialJsGzipBytes: files.reduce((s, f) => s + f.gzipBytes, 0), manifestEntries: Object.keys(emittedJs).length });
    if (label === 'current-analyzer') browserStorageWrites.push(...await page.evaluate(json => {
      const samples = [];
      for (let i = -2; i < 10; i++) {
        const start = performance.now(); localStorage.setItem('task9-bounded-cost', json);
        samples.push({ warmup: i < 0, writeMs: performance.now() - start });
        localStorage.removeItem('task9-bounded-cost');
      }
      return samples;
    }, json));
    await context.close();
  }
} finally { await browser.close(); }
writeFileSync(output, JSON.stringify({ node: process.version, browser: browser.version(), notebook, browserStorageWrites, bundles }, null, 2));
console.log(JSON.stringify({ notebook, browserStorageWrites, bundles }, null, 2));
