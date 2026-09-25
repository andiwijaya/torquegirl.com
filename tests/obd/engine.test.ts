import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLog, describe } from '../../lib/obd/engine';
import { identify } from '../../lib/obd/signals';
import { parseTime } from '../../lib/obd/time';
import { records, detectDelimiter, numeric, LIMITS } from '../../lib/obd/csv';
import { comparisonPairs, nearest, reduceSamples, trace } from '../../lib/obd/analysis';
import { LogWorkerClient, type WorkerPort } from '../../lib/obd/worker-client';
import type { Request } from '../../lib/obd/protocol';
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}.csv`, import.meta.url), 'utf8');
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('clean generic import and canonical identities', () => {
  const log = parseLog(fixture('clean'));
  assert.equal(log.delimiter, ','); assert.equal(log.quality.parsed, 3); assert.equal(log.quality.duration, 2);
  assert.deepEqual(log.signals.map(s => s.identity), ['rpm', 'speed', 'throttle', 'coolant']);
  assert.equal(log.signals[0].sourceValues[0], '800'); assert.equal(log.quality.intervalMedian, 1);
});
test('Torque header convention and ISO clock spacing', () => {
  const log = parseLog(fixture('torque'));
  assert.match(log.format, /Torque/); close(log.times[1]!, 0.2);
  assert.equal(log.signals[1].identity, 'speed'); assert.equal(log.signals[3].identity, null);
});
test('FORScan header convention explicitly qualified', () => {
  const log = parseLog('time(ms),RPM\n100,800\n200,900');
  assert.match(log.format, /FORScan-style/); close(log.times[1]!, 0.1);
});
test('BOM, CRLF, escaped quotes, quoted delimiters and multiline fields', () => {
  const rows = [...records('\ufeffTime (s),"Custom, label"\r\n0,"a\r\nb"\r\n1,"a""b"\r\n', ',')];
  assert.equal(rows.length, 3); assert.equal(rows[1].fields[1], 'a\r\nb'); assert.equal(rows[2].fields[1], 'a"b');
  assert.equal(parseLog('\ufeffTime (s)\tRPM\r\n0\t800\r\n1\t900').delimiter, '\t');
});
test('alternate delimiter, decimal commas and honest mixed-unit normalization', () => {
  const log = parseLog(fixture('mixed'));
  assert.equal(detectDelimiter(fixture('mixed')), ';');
  close(log.signals[0].values[0]!, 96.56064); close(log.signals[1].values[0]!, 100);
  close(log.signals[2].values[0]!, 14.7 * 6.894757293); assert.equal(log.signals[3].values[0], 100);
  assert.equal(log.signals[2].identity, 'map-absolute'); assert.equal(log.signals[3].identity, 'boost-gauge');
  assert.equal(log.signals[4].values[0], 12.5); assert.equal(log.signals[5].values[0], 0.85);
  assert.equal(log.signals[5].identity, 'o2-voltage-b1s1'); assert.equal(log.signals[6].identity, 'lambda');
  assert.equal(log.signals[7].sourceValues[0], 'quoted; field'); assert.equal(log.signals[7].values[0], null);
  assert.equal(log.signals[0].originalUnit, 'mph'); assert.equal(log.signals[0].sourceValues[0], '60');
});
test('no fabricated units, AFR, pressure semantics or custom identities', () => {
  assert.equal(identify('Speed').unit, null); assert.ok(identify('Speed').ambiguity);
  assert.equal(identify('MAP (V)').convert(2.1), 2.1); assert.ok(identify('MAP (V)').ambiguity);
  assert.equal(identify('O2 B1 S1 (V)').identity, 'o2-voltage-b1s1');
  assert.equal(identify('Manifold pressure (psi)').identity, null);
  assert.equal(identify('Fuel pressure (bar)').identity, 'fuel-pressure-unspecified');
  assert.notEqual(identify('STFT Bank 1 (%)').identity, identify('STFT Bank 2 (%)').identity);
  assert.equal(identify('Custom RPM correction (rpm)').identity, null);
});
test('irregular, duplicate, backwards, missing time and malformed quality', () => {
  const log = parseLog(fixture('irregular')), q = log.quality;
  assert.equal(q.parsed, 8); assert.equal(q.rejected, 1); assert.equal(q.missingTimes, 1);
  assert.equal(q.duplicateTimes, 1); assert.equal(q.backwardsTimes, 1); assert.equal(q.gaps, 1); assert.equal(q.irregular, true);
  close(q.duration, 12.3); assert.equal(log.originalTimes[3], '50'); assert.equal(log.times[4], null);
  assert.equal(log.signals[2].originalName, log.signals[3].originalName); assert.notEqual(log.signals[2].id, log.signals[3].id);
  assert.equal(log.signals[3].sourceValues[0], 'A'); assert.equal(log.signals[3].invalid, 8);
  assert.equal(log.signals[0].samples.length, 7); assert.equal(log.events[0].kind, 'time-gap');
});
test('malformed quote records are rejected, not partially interpreted', () => {
  const log = parseLog('Time (s),RPM\n0,800\n1,"900"x\n2,"unclosed');
  assert.equal(log.quality.parsed, 1); assert.equal(log.quality.rejected, 2);
});
test('entirely missing delimited records count; blank physical lines do not', () => {
  const log = parseLog('Time (s),RPM\n0,800\n,\n\n');
  assert.equal(log.quality.parsed, 2); assert.equal(log.quality.missingTimes, 1); assert.equal(log.quality.missingValues, 1);
});
test('ambiguous timestamps and localized dates are not guessed', () => {
  const log = parseLog('Time,RPM\n1000,800\n2000,900');
  assert.deepEqual(log.times, [null, null]); assert.equal(log.signals[0].samples.length, 0);
  assert.equal(parseTime('09/10/2026 12:00:00', 'date', false), null);
  assert.equal(parseTime('2026-02-30T00:00:00Z', 'date', false), null);
  assert.equal(parseTime('12:60:01', 'date', false), null);
  close(parseTime('2026-01-01T08:00:00+08:00', 'date', false)!, parseTime('2026-01-01 00:00:00', 'date', false)!);
});
test('HH:MM:SS time and negative elapsed origin; no fake midnight repair', () => {
  assert.deepEqual(parseLog('Time,RPM\n12:00:00.5,800\n12:00:02.5,900').times, [0, 2]);
  assert.deepEqual(parseLog('Time (s),RPM\n-2,800\n0,900').times, [0, 2]);
  assert.equal(parseLog('Time,RPM\n23:59:59,800\n00:00:01,900').quality.backwardsTimes, 1);
});
test('nearest lookup, ties, duplicates, missing samples and staleness', () => {
  const log = parseLog('Time (s),RPM,Coolant (C)\n0,800,80\n1,900,\n2,1000,81\n2,2000,82\n20,1200,');
  assert.equal(nearest(log.signals[0], 0.5).value, 800);
  assert.equal(nearest(log.signals[0], 2).value, 1000);
  assert.equal(nearest(log.signals[1], 1.5).time, 2); assert.equal(nearest(log.signals[1], 1.5).offset, 0.5);
  assert.equal(nearest(log.signals[1], 20).stale, true); assert.equal(nearest(log.signals[1], 20).source, '81');
  assert.equal(nearest(parseLog('Time (s),Custom\n0,text').signals[0], 0).value, null);
});
test('sample statistics and extrema-preserving bounded reduction', () => {
  const points = Array.from({ length: 10_000 }, (_, row) => ({ time: row * 0.1, value: row === 5555 ? 99999 : row % 30, row }));
  const reduced = reduceSamples(points, 0, 999.9, 100);
  assert.ok(reduced.length <= 400); assert.ok(reduced.some(p => p.value === 99999)); assert.equal(reduced[0].row, 0); assert.equal(reduced.at(-1)?.row, 9999);
  const log = parseLog(fixture('clean')), view = trace(log.signals[0], 0, 2);
  assert.equal(view.min, 800); assert.equal(view.max, 2400); assert.equal(view.average, 1600); assert.equal(view.count, 3);
});
test('visual gaps survive downsampling without altering analysis', () => {
  const s = parseLog('Time (s),RPM\n0,800\n1,\n2,1000\n30,1200').signals[0];
  const t = trace(s, 0, 30, 1); assert.ok(t.points.some(p => p.value === null)); assert.equal(t.count, 3); assert.equal(s.values[1], null);
});
test('comparison uses time anchors and compatible unique signal semantics', () => {
  const a = parseLog(fixture('clean')), b = parseLog('Time (s),RPM,Vehicle speed (mph),Fuel pressure (psi)\n5,800,10,20');
  const pairs = comparisonPairs(a, b, { aAnchorSeconds: 1, bAnchorSeconds: 0, context: 'Throttle opening, same route' });
  assert.equal(pairs.length, 2); assert.equal(pairs[1].unit, 'km/h'); assert.equal(pairs[1].bTimeOffset, 1);
  assert.throws(() => comparisonPairs(a, b, { aAnchorSeconds: NaN, bAnchorSeconds: 0, context: '' }));
  assert.equal(comparisonPairs(a, parseLog('Time (s),RPM,RPM\n0,1,2'), { aAnchorSeconds: 0, bAnchorSeconds: 0, context: 'test' }).length, 0);
});
test('source-free descriptions and bounded warnings', () => {
  const log = parseLog('Time (s),RPM\n0,800\n' + 'bad\n'.repeat(100));
  assert.equal(log.quality.rejected, 100); assert.equal(log.quality.warnings.length, 50);
  assert.equal('sourceValues' in describe(log).signals[0], false);
});
test('resource limits and strict numeric parsing', () => {
  assert.throws(() => parseLog('x'.repeat(LIMITS.bytes + 1)), /25 MiB/);
  assert.throws(() => parseLog(Array.from({ length: 129 }, () => 'x').join(',') + '\n'), /128|header/);
  assert.equal(numeric('Infinity', false), null); assert.equal(numeric('800rpm', false), null); assert.equal(numeric('1,000', false), null);
  assert.equal(numeric('1,234', true), null); assert.equal(numeric('0,123', true), 0.123);
  assert.equal(numeric('1e308', false), null);
});
test('empty logs, cell cap and record cap fail explicitly', () => {
  assert.throws(() => parseLog('Time (s),RPM\n'), /No valid/);
  assert.throws(() => parseLog('Time (s),RPM\n' + '0,1\n'.repeat(LIMITS.rows + 1)), /records supported/);
  const header = ['Time (s)', ...Array.from({ length: 127 }, (_, i) => `Custom ${i}`)].join(',');
  const row = Array.from({ length: 128 }, () => '0').join(',');
  assert.throws(() => parseLog(header + '\n' + (row + '\n').repeat(Math.floor(LIMITS.cells / 128) + 1)), /2 million cells/);
});
test('all advertised canonical families and compatible base units', () => {
  for (const [header, identity, unit] of [
    ['Accelerator position (%)', 'accelerator', '%'], ['IAT (C)', 'intake-temperature', '°C'],
    ['LTFT Bank 2 (%)', 'ltft-bank-2', '%'], ['MAF (g/s)', 'maf', 'g/s'],
    ['Ignition timing (deg)', 'timing', '°'], ['Engine load (%)', 'load', '%'],
    ['Control module voltage (V)', 'voltage', 'V'], ['Fuel level (%)', 'fuel-level', '%'],
    ['Commanded equivalence ratio (ratio)', 'commanded-equivalence', 'ratio'], ['AFR (ratio)', 'afr', 'ratio'],
  ]) { const signal = identify(header); assert.equal(signal.identity, identity); assert.equal(signal.unit, unit); assert.equal(signal.ambiguity, null); }
});
test('worker cleanup rejects in-flight requests and prevents reuse', async () => {
  let terminations = 0, sent: Request | undefined;
  const port: WorkerPort = { onmessage: null, onerror: null, postMessage: data => { sent = data; }, terminate: () => { terminations++; } };
  const client = new LogWorkerClient(port), pending = client.request({ kind: 'inspect', time: 0 });
  assert.equal(sent?.kind, 'inspect'); client.dispose(); client.dispose();
  await assert.rejects(pending, /cancelled/); await assert.rejects(client.request({ kind: 'inspect', time: 1 }), /cancelled/);
  assert.equal(terminations, 1); assert.equal(port.onmessage, null);
});
