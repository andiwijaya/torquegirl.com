/** Distribution guard, deliberately relative to a paired same-environment baseline.
 * Not a device throughput promise. Usage: node scripts/benchmark-program-review.mjs <json>
 */
import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const samples = data.samples.filter(s => !s.warmup);
const quantile = (values, p) => { const sorted = [...values].sort((a, b) => a - b); const index = (sorted.length - 1) * p; const lower = Math.floor(index); return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower); };
const summary = values => ({ n: values.length, min: Math.min(...values), median: quantile(values, .5), p90: quantile(values, .9), max: Math.max(...values) });
const groups = [...new Set(samples.map(s => s.script ?? 'browser'))], rows = [];
const invalidMetrics = [];
for (const group of groups) {
  const selected = samples.filter(s => (s.script ?? 'browser') === group);
  for (const metric of Object.keys(selected[0]).filter(k => k.endsWith('Ms'))) {
    if (selected.some(sample => !Number.isFinite(sample[metric]) || sample[metric] < 0)) invalidMetrics.push({ group, metric });
    const baseline = summary(selected.filter(s => s.label === 'baseline').map(s => s[metric]));
    const current = summary(selected.filter(s => s.label === 'current').map(s => s[metric]));
    rows.push({ group, metric, baseline, current, medianRatio: current.median / baseline.median, p90Ratio: current.p90 / baseline.p90 });
  }
}
const critical = new Set(['parseMs', 'previewMs', 'remapMs', 'twoImportsMs', 'twoRegionStatisticsMs', 'contextMatchingAndChangesMs', 'importMs', 'secondImportComparisonMs']);
const failures = rows.filter(r => critical.has(r.metric) && (r.medianRatio > 1.15 || r.p90Ratio > 1.25));
const sufficientSamples = rows.length > 0 && rows.every(r => r.current.n >= 7 && r.baseline.n >= 7);
const required = { 'benchmark-obd.ts': ['parseMs'], 'benchmark-obd-v2.ts': ['previewMs', 'remapMs'], 'benchmark-obd-v3.ts': ['twoImportsMs', 'twoRegionStatisticsMs', 'contextMatchingAndChangesMs'], browser: ['importMs', 'remapMs', 'secondImportComparisonMs'] };
const missingMetrics = groups.flatMap(group => (required[group] ?? []).filter(metric => !rows.some(row => row.group === group && row.metric === metric)).map(metric => ({ group, metric })));
const responsivenessFailures = data.nativeFiles ? samples.filter(sample => sample.label === 'current' && (!Number.isFinite(sample.maxMainThreadGapMs) || !Number.isFinite(sample.maxLongTaskMs) || sample.maxMainThreadGapMs > 250 || sample.maxLongTaskMs > 250)) : [];
console.log(JSON.stringify({ criteria: 'critical operation median <= baseline * 1.15 and p90 <= baseline * 1.25; at least 7 retained samples per label; native-file current maximum timer gap and long task <= 250 ms', sufficientSamples, rows, failures, invalidMetrics, missingMetrics, responsivenessFailures }, null, 2));
if (failures.length || invalidMetrics.length || missingMetrics.length || responsivenessFailures.length || !sufficientSamples) process.exitCode = 1;
