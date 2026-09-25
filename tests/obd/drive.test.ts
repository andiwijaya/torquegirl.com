import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLog } from '../../lib/obd/engine';
import { phases, derivative, stats, region, compare, comparisonTraces, relationship, phaseSummary, type Segment } from '../../lib/obd/drive';
import { DriveSession } from '../../lib/obd/drive-session';
import { driveCsv } from '../../lib/obd/drive-demo';
const log = (extra = {}) => parseLog(driveCsv(extra));
const whole = (end = 10): Segment => ({ id: 0, start: 0, end, duration: end, phase: 'cruise', evidence: 'test', caveat: 'synthetic' });

test('ground-truth stopped, idle, acceleration, cruise and deceleration phases', () => {
  const a = log(), segments = phases(a);
  assert.deepEqual([...new Set(segments.map(s => s.phase))].sort(), ['acceleration', 'cruise', 'deceleration', 'idle', 'stopped', 'unclassified'].sort());
  for (const [time, expected] of [[5, 'stopped'], [15, 'idle'], [28, 'acceleration'], [45, 'cruise'], [60, 'deceleration']] as const) assert.equal(segments.find(s => s.start <= time && time < s.end)?.phase, expected);
  assert.equal(segments.reduce((sum, s) => sum + s.duration, 0), a.quality.duration);
  assert.ok(segments.every(s => s.evidence && s.caveat));
  assert.equal(phaseSummary(segments).events[0].kind, 'phase-boundary');
});
test('actual-time derivatives reject duplicates, tiny intervals, long gaps and invalid numbers', () => {
  assert.ok(Math.abs(derivative(0, 36, 0.5, 39.6)! - 2) < 1e-12);
  assert.ok(Math.abs(derivative(1, 36, 2.5, 41.4)! - 1) < 1e-10);
  for (const t of [0, 0.01, 3, -1, NaN]) assert.equal(derivative(0, 0, t, 10), null);
});
test('minimum duration suppresses isolated derivative spikes; hysteresis retains small oscillations', () => {
  const speeds = [20, 23.6, 24.68, 28.28, 29.36, 32.96, 34.04];
  const a = parseLog('Time (s),Speed (km/h)\n' + speeds.map((v, i) => `${i},${v}`).join('\n'));
  assert.equal(phases(a)[0].phase, 'acceleration');
  const b = parseLog('Time (s),Speed (km/h)\n0,20\n1,24\n2,20\n3,24\n4,20');
  assert.ok(phases(b).every(s => s.phase === 'unclassified'));
});
test('recording gaps are unclassified and cannot join two cruises', () => {
  const a = parseLog('Time (s),Speed (km/h),RPM\n' + [0,1,2,3,4,20,21,22,23,24].map(t => `${t},60,2400`).join('\n'));
  const segments = phases(a); assert.equal(segments.length, 3); assert.equal(segments[1].phase, 'unclassified'); assert.equal(segments[1].duration, 16);
});
test('irregular timestamps, duplicate first source row and missing speed do not fabricate phases', () => {
  const a = parseLog('Time (s),Speed (km/h)\n0,20\n0,999\n0.5,23.6\n1.5,30.8\n3,41.6\n4,48.8');
  assert.equal(phases(a)[0].phase, 'acceleration'); assert.equal(a.signals[0].sourceValues[1], '999');
  assert.equal(phases(parseLog('Time (s),RPM\n0,800\n10,800'))[0].phase, 'unclassified');
  assert.equal(phases(parseLog('Time (s),Speed (km/h),Speed (km/h)\n0,0,0\n10,0,0'))[0].phase, 'unclassified');
});
test('idle requires fresh bounded RPM; speed without RPM can only support stopped', () => {
  const a = parseLog('Time (s),Speed (km/h),RPM\n0,0,800\n1,0,\n2,0,\n3,0,\n4,0,\n5,0,');
  assert.ok(phases(a).every(s => s.phase !== 'idle'));
  assert.equal(phases(parseLog('Time (s),Speed (km/h)\n0,0\n1,0\n2,0\n3,0\n4,0'))[0].phase, 'stopped');
});
test('full-resolution stats use actual samples, median, cadence and bounded interval coverage', () => {
  const a = parseLog('Time (s),RPM\n0,0\n1,10\n2,20\n10,100');
  const s = stats(a.signals[0], 0, 10);
  assert.equal(s.count, 4); assert.equal(s.mean, 32.5); assert.equal(s.median, 15); assert.equal(s.coverage, 0.2); assert.equal(s.cadence, 1); assert.equal(s.min, 0); assert.equal(s.max, 100);
  const empty = stats(a.signals[0], 3, 5); assert.equal(empty.median, null); assert.equal(empty.count, 0);
});
test('comparable regions match physical context despite unrelated absolute times and different row counts', () => {
  const a = log({ mode: 'cruise', rows: 81 }), b = log({ mode: 'cruise', rows: 101, step: 0.4, start: 30000, trim: 4.3, speedOffset: 2, rpmOffset: 60 });
  const result = compare(a, b, phases(a)[0], phases(b)[0]);
  assert.equal(result.state, 'GOOD MATCH');
  const trim = result.changes.find(s => s.identity === 'ltft-bank-1')!;
  assert.equal(trim.a, 10.8); assert.equal(trim.b, 4.3); assert.ok(Math.abs(trim.delta + 6.5) < 1e-10); assert.equal(trim.countA, 81); assert.equal(trim.countB, 101);
  assert.ok(result.reasons.some(r => r.includes('tolerance 250')));
});
test('different phases and RPM conditions suppress change observations and comparison plots', () => {
  const a = log(), cruise = phases(a).find(s => s.phase === 'cruise')!, idle = phases(a).find(s => s.phase === 'idle')!;
  assert.equal(compare(a, a, cruise, idle).state, 'CONDITIONS DIFFER');
  assert.equal(compare(a, a, cruise, idle).changes.length, 0);
  assert.throws(() => comparisonTraces(a, a, cruise, idle, 'rpm'), /comparable/);
  const b = log({ mode: 'cruise', rpmOffset: 2000 }), c = log({ mode: 'cruise' });
  assert.equal(compare(c, b, phases(c)[0], phases(b)[0]).state, 'CONDITIONS DIFFER');
});
test('missing matching dimensions produce partial or insufficient data, never good match', () => {
  const a = parseLog('Time (s),Speed (km/h),RPM\n' + Array.from({ length: 11 }, (_, i) => `${i},60,2400`).join('\n'));
  assert.equal(compare(a, a, phases(a)[0], phases(a)[0]).state, 'PARTIAL MATCH');
  const b = parseLog('Time (s),Speed (km/h)\n' + Array.from({ length: 11 }, (_, i) => `${i},60`).join('\n'));
  assert.equal(compare(b, b, phases(b)[0], phases(b)[0]).state, 'INSUFFICIENT DATA');
});
test('semantic pairing preserves bank/sensor, MAP/boost, pedal/throttle, pressure references and unknowns', () => {
  const headers = 'Time (s),Speed (km/h),RPM,STFT Bank 1 (%),STFT Bank 2 (%),O2 B1 S1 (V),O2 B2 S1 (V),MAP (kPa),Boost (kPa),Throttle (%),Accelerator position (%),Mystery (kPa),Fuel pressure (kPa),Lambda (ratio),AFR (ratio)';
  const a = parseLog(headers + '\n' + Array.from({ length: 11 }, (_, i) => `${i},60,2400,1,2,0.1,0.2,100,3,20,30,999,400,1,14.7`).join('\n'));
  const result = compare(a, a, phases(a)[0], phases(a)[0]);
  for (const key of ['stft-bank-1','stft-bank-2','o2-voltage-b1s1','o2-voltage-b2s1','map-absolute','boost-gauge','throttle','accelerator','lambda','afr']) assert.ok(result.pairs.some(p => p.identity === key), key);
  assert.ok(result.pairs.every(p => p.identity && !p.identity.includes('unspecified')));
  assert.equal(result.pairs.some(p => p.a === a.signals.find(s => s.originalName.startsWith('Mystery'))!.id), false);
});
test('traces retain separate real-time region origins and full-resolution counts', () => {
  const a = log({ mode: 'cruise' }), b = log({ mode: 'cruise', step: 0.4 });
  const sa = phases(a)[0], sb = phases(b)[0], data = comparisonTraces(a, b, sa, sb, 'rpm');
  assert.equal(data.a.count, 161); assert.equal(data.b.count, 161); assert.equal(data.a.points.at(-1)!.time, 80); assert.equal(data.b.points.at(-1)!.time, 64);
});
test('asynchronous one-to-one timestamp pairing gives known positive Pearson and exposes offsets', () => {
  const a = parseLog('Time (s),RPM,MAF (g/s)\n' + Array.from({ length: 11 }, (_, i) => `${i},${1000 + i * 100},\n${i + 0.2},,${2 + i * 2}`).join('\n'));
  const r = relationship(a, whole(11), a.signals[0].id, a.signals[1].id, 0.25);
  assert.equal(r.count, 11); assert.ok(Math.abs(r.pearson! - 1) < 1e-12); assert.ok(r.maxOffset! < 0.201); assert.equal(r.futurePairs, 11);
  assert.equal(relationship(a, whole(11), a.signals[0].id, a.signals[1].id, 0.1).count, 0);
});
test('negative Pearson, constants, too few samples and bounds are honest', () => {
  const a = parseLog('Time (s),RPM,MAF (g/s),Throttle (%)\n0,1000,3,30\n1,2000,2,30\n2,3000,1,30');
  assert.equal(relationship(a, whole(), 'column-1', 'column-2').pearson, -1);
  assert.equal(relationship(a, whole(), 'column-1', 'column-3').pearson, null);
  assert.equal(relationship(a, whole(1), 'column-1', 'column-2').pearson, null);
  assert.throws(() => relationship(a, whole(), 'column-1', 'column-2', 3), /0–2/);
  assert.throws(() => relationship(a, whole(), 'column-1', 'column-1'), /different/);
});
test('pairing never reuses Y, never pairs outside region, resolves duplicate timestamps deterministically', () => {
  const a = parseLog('Time (s),RPM,MAF (g/s)\n0,1000,1\n0,9999,99\n0.1,1100,\n0.2,1200,\n1,2000,2\n2,3000,3');
  const r = relationship(a, whole(2), 'column-1', 'column-2', 0.5);
  assert.equal(r.count, 3); assert.equal(r.eligible, 5); assert.deepEqual(r.xRange, [1000,3000]);
  assert.equal(relationship(a, { ...whole(0.2), start: 0.1 }, 'column-1', 'column-2').count, 0);
});
test('session isolates A/B mappings, phase indexes and source truth through B remapping and removal', () => {
  const session = new DriveSession(), a = session.load('A', driveCsv({ mode: 'cruise' })); session.commit('A', a.revision);
  const b = session.load('B', driveCsv({ mode: 'cruise', trim: 4.3 })); session.commit('B', b.revision);
  assert.equal(session.compare(0,0).changes.find(c => c.identity === 'ltft-bank-1')!.b, 4.3);
  const config = structuredClone(b.config); config.time.format = 'ms'; config.time.source = 'user';
  const draft = session.remap('B', config); assert.equal(session.log('B').quality.duration, 80);
  session.commit('B', draft.revision); assert.equal(session.log('B').quality.duration, 0.08); assert.equal(session.log('A').quality.duration, 80);
  assert.equal(session.log('A').signals[0].sourceValues[0], '60.000'); assert.equal(session.at('A', 40)?.phase, 'cruise');
  session.clearB(); assert.throws(() => session.compare(0,0)); assert.equal(session.summary('A').total, 1);
});
test('phase pagination bounds metadata while retaining all segments and duration totals', () => {
  const segments = Array.from({ length: 450 }, (_, i) => ({ ...whole(3 * i + 3), id: i, start: i * 3, duration: 3 }));
  const summary = phaseSummary(segments, 200); assert.equal(summary.segments.length, 200); assert.equal(summary.total,450); assert.equal(summary.durations.cruise,1350);
});
test('region stats retain unavailable signals without inventing samples', () => {
  const a = parseLog('Time (s),Speed (km/h),RPM,MAF (g/s)\n0,60,2400,\n1,60,2400,\n2,60,2400,\n3,60,2400,');
  const r = region(a, phases(a)[0]); assert.equal(r.stats.at(-1)!.count, 0); assert.equal(r.stats.at(-1)!.mean, null);
});
test('decimal 10 Hz cadence does not flicker at the 0.1 s floating-point boundary', () => {
  const a = log({ mode: 'cruise', rows: 101, step: 0.1 });
  const s = phases(a); assert.equal(s.length, 1); assert.equal(s[0].phase, 'cruise'); assert.equal(s[0].duration, 10);
});
test('same medians with very different condition ranges do not qualify as a good match', () => {
  const a = log({ mode: 'cruise' }), b = log({ mode: 'cruise' });
  const rpm = b.signals.find(s => s.identity === 'rpm')!; rpm.samples[20].value = 8000;
  const result = compare(a, b, phases(a)[0], phases(b)[0]); assert.equal(result.state, 'CONDITIONS DIFFER'); assert.equal(result.changes.length,0);
});
test('unresolved units and different pressure meanings never auto-pair across runs', () => {
  const a = log({ mode: 'cruise' }), b = log({ mode: 'cruise' });
  b.signals.find(s => s.identity === 'map-absolute')!.identity = 'boost-gauge';
  b.signals.find(s => s.identity === 'maf')!.unit = 'unknown';
  const r = compare(a,b,phases(a)[0],phases(b)[0]); assert.equal(r.pairs.some(p => p.identity === 'map-absolute'),false); assert.equal(r.pairs.some(p => p.identity === 'maf'),false);
});
test('empty-duration and unsupported phases produce no fabricated context or changes', () => {
  assert.equal(phases(parseLog('Time (s),RPM\n0,800')).length,0);
  const a = parseLog('Time (s),RPM\n0,800\n10,800');
  assert.equal(compare(a,a,phases(a)[0],phases(a)[0]).state,'INSUFFICIENT DATA');
});
