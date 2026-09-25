import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ImportSession } from '../../lib/obd/import-session';
import { nearest } from '../../lib/obd/analysis';
import { detectExporter } from '../../lib/obd/adapters';
import { defaultMapping, sourceHeaders, validateConfig } from '../../lib/obd/mapping';
import { applyTemplate, deleteTemplate, headerFingerprint, readTemplates, renameTemplate, resetTemplates, saveTemplate, TEMPLATE_KEY, type TemplateStorage } from '../../lib/obd/templates';
import type { ColumnMapping, MappingConfig } from '../../lib/obd/mapping-types';
const fixture = (name: string) => readFileSync(new URL(`./fixtures/v2/${name}.csv`, import.meta.url), 'utf8');
const manual = (config: MappingConfig, index: number, patch: Partial<ColumnMapping>) => ({ ...structuredClone(config), columns: config.columns.map(c => c.index === index ? { ...c, state: 'user' as const, via: 'manual' as const, ...patch } : { ...c }) });
const memory = (): TemplateStorage => { const data = new Map<string, string>(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }, removeItem: k => { data.delete(k); } }; };

test('eight representative exporter fixtures detect supported conventions without asserting real-device origin', () => {
  for (const [name, id] of [['torque-iso', 'torque'], ['torque-clock', 'torque'], ['fusion-seconds', 'obd-fusion'], ['fusion-banks', 'obd-fusion'], ['forscan-ms', 'forscan'], ['forscan-mixed', 'forscan'], ['generic-ambiguous', 'generic'], ['generic-tabs', 'generic']]) {
    const session = new ImportSession(), p = session.load(fixture(name));
    assert.equal(p.exporter.id, id); assert.equal(p.info.quality.parsed, 3); assert.equal(p.columns.length, p.headers.length);
    assert.equal(session.log, null); assert.equal(detectExporter(p.headers).id, id);
  }
});
test('exporter aliases preserve banks, sensors, accelerator/throttle and source units', () => {
  const s = new ImportSession(), p = s.load(fixture('forscan-ms')); s.commit(p.revision);
  assert.deepEqual(s.log!.signals.map(c => c.identity), ['rpm', 'speed', 'stft-bank-1', 'ltft-bank-2', 'throttle', 'accelerator', 'o2-voltage-b1s1', 'map-absolute']);
  assert.equal(s.log!.signals[0].originalUnit, '1/min'); assert.equal(s.log!.signals[0].unit, 'RPM');
  assert.match(s.log!.signals[1].provenance!.reason, /FORScan-style.*alias/);
  assert.equal(s.log!.signals[1].sourceValues[1], '10'); assert.equal(s.log!.signals[1].values[1], 16.09344);
});
test('auto provenance uses categorical alias evidence and no numeric confidence', () => {
  const s = new ImportSession(), p = s.load(fixture('fusion-banks'));
  assert.match(p.columns[1].reason, /^AUTO: exact known alias/); assert.ok(!JSON.stringify(p.config).includes('confidence'));
  assert.equal(p.config.columns[5].identity, 'stft-bank-2'); assert.equal(p.config.columns[6].identity, 'o2-voltage-b1s2');
  assert.notEqual(p.config.columns[8].identity, p.config.columns[9].identity);
});
test('missing units and ambiguous pressure remain visible without a guessed physical identity', () => {
  const p = new ImportSession().load(fixture('generic-ambiguous'));
  assert.equal(p.config.columns[2].state, 'custom'); assert.equal(p.config.columns[3].identity, null);
  assert.equal(p.config.columns[3].unit, 'psi'); assert.equal(p.info.quality.rejected, 1);
  assert.ok(p.issues.some(i => i.severity === 'error'));
});
test('manual time and PID mappings normalize from original source', () => {
  const s = new ImportSession(), p = s.load(fixture('generic-ambiguous'));
  const config = manual(p.config, 2, { identity: 'speed', unit: 'mph' });
  config.time = { index: 0, format: 'ms', source: 'user' };
  const mapped = s.remap(config); assert.equal(mapped.info.quality.duration, 2); assert.ok(!mapped.issues.some(i => i.severity === 'error'));
  const accepted = s.commit(mapped.revision); const speed = s.log!.signals.find(c => c.identity === 'speed')!;
  assert.deepEqual(accepted.mapping?.time, { index: 0, format: 'ms', source: 'user' });
  assert.equal(accepted.signals.find(c => c.identity === 'speed')?.provenance?.state, 'user');
  assert.equal(speed.values[0], 96.56064); assert.equal(speed.sourceValues[0], '60'); assert.equal(speed.originalUnit, null);
  assert.equal(speed.provenance!.interpretedUnit, 'mph'); assert.match(speed.provenance!.reason, /USER: explicitly/);
  assert.ok(Math.abs(nearest(speed, 1).value! - 112.65408) < 1e-8);
});
test('time reprocessing changes duration and sampling but leaves prior analysis immutable until acceptance', () => {
  const s = new ImportSession(), first = s.load('Time (s),RPM\n0,800\n1000,1000\n2000,1200');
  s.commit(first.revision); const oldLog = s.log;
  const config = structuredClone(first.config); config.time = { index: 0, format: 'ms', source: 'user' };
  const next = s.remap(config); assert.equal(next.info.quality.duration, 2); assert.equal(s.log!.quality.duration, 2000);
  s.commit(next.revision); assert.equal(oldLog!.quality.duration, 2000); assert.equal(s.log!.quality.intervalMedian, 1);
  assert.deepEqual(s.log!.originalTimes, ['0', '1000', '2000']); assert.equal(nearest(s.log!.signals[0], 1.5).value, 1000);
});
test('unit remaps rebuild from source rather than previously converted values', () => {
  const s = new ImportSession(), first = s.load('Time (s),Coolant (F)\n0,212\n1,214'); s.commit(first.revision);
  const old = s.log!.signals[0], p = s.remap(manual(first.config, 1, { identity: 'coolant', unit: '°C' })); s.commit(p.revision);
  assert.equal(old.values[0], 100); assert.equal(s.log!.signals[0].values[0], 212); assert.equal(s.log!.signals[0].originalUnit, 'F');
  const restored = s.remap(first.config); s.commit(restored.revision); assert.equal(s.log!.signals[0].values[0], 100);
});
test('physically incompatible units/signals are rejected even if unit is unset', () => {
  const s = new ImportSession(), p = s.load('Time (s),O2 B1 S1 (V),MAP (kPa)\n0,0.8,30');
  assert.throws(() => s.remap(manual(p.config, 1, { identity: 'afr', unit: 'ratio' })), /dimension/);
  assert.throws(() => s.remap(manual(p.config, 1, { identity: 'afr', unit: null })), /dimension/);
  assert.throws(() => s.remap(manual(p.config, 2, { identity: 'map-absolute', unit: 'mph' })), /dimension/);
});
test('explicit ambiguous pressure mapping preserves MAP/boost/fuel-reference separation', () => {
  const s = new ImportSession(), p = s.load('Time (s),Pressure(psi),Boost pressure(bar),Fuel pressure(kPa)\n0,14.7,1,300');
  let config = manual(p.config, 1, { identity: 'map-absolute', unit: 'psi' });
  config = manual(config, 3, { identity: 'fuel-pressure-differential', unit: 'kPa' });
  const ready = s.remap(config); s.commit(ready.revision);
  assert.equal(s.log!.signals[0].identity, 'map-absolute'); assert.equal(s.log!.signals[1].identity, 'boost-gauge');
  assert.equal(s.log!.signals[2].identity, 'fuel-pressure-differential'); assert.equal(s.log!.signals[1].values[0], 100);
});
test('ignore and intentional custom keep raw source recoverable', () => {
  const s = new ImportSession(), p = s.load('Time (s),RPM,Speed (mph),Custom\n0,800,60,secret');
  let config = manual(p.config, 2, { state: 'ignore', identity: null }); config = manual(config, 1, { state: 'custom', identity: null });
  const ready = s.remap(config); s.commit(ready.revision); assert.equal(s.log!.signals.length, 2);
  assert.equal(s.log!.signals[0].identity, null); assert.equal(s.log!.signals[1].sourceValues[0], 'secret');
  const reset = s.remap(p.config); s.commit(reset.revision); assert.equal(s.log!.signals[1].values[0], 96.56064);
});
test('duplicate semantic mappings warn without blocking useful charts', () => {
  const s = new ImportSession(), p = s.load('Time (s),RPM,RPM\n0,800,900');
  assert.ok(p.issues.some(i => /Duplicate semantic/.test(i.message))); assert.ok(!p.issues.some(i => i.severity === 'error'));
  s.commit(p.revision); assert.equal(s.log!.signals.length, 2);
});
test('zero numeric, mostly empty and missing usable time validation', () => {
  const s = new ImportSession(), p = s.load('Time,RPM,STFT Bank 1 (%)\n' + Array.from({ length: 20 }, (_, i) => `${i},${i ? '' : 800},text`).join('\n'));
  assert.throws(() => s.commit(p.revision), /blocking/);
  const config = structuredClone(p.config); config.time = { index: 0, format: 's', source: 'user' };
  const next = s.remap(config); assert.ok(next.issues.some(i => /90%/.test(i.message))); assert.ok(next.issues.some(i => /No numeric/.test(i.message)));
  s.commit(next.revision);
});
test('strict time interpretations do not reinterpret ISO as clock or bare epoch as automatic', () => {
  const s = new ImportSession(), p = s.load('Time,RPM\n2026-09-25T12:00:00Z,800\n2026-09-25T12:00:02Z,900');
  const c = structuredClone(p.config); c.time = { index: 0, format: 'clock', source: 'user' }; assert.ok(s.remap(c).issues.some(i => i.severity === 'error'));
  c.time.format = 'iso'; assert.equal(s.remap(c).info.quality.duration, 2);
  assert.ok(new ImportSession().load('Timestamp,RPM\n1750000000,800').issues.some(i => i.severity === 'error'));
});
test('malformed configs, forged AUTO and stale preview acceptance fail safely', () => {
  const s = new ImportSession(), p = s.load('Time (s),RPM\n0,800\n1,900'); s.commit(p.revision);
  for (const bad of [{ ...p.config, version: 2 }, { ...p.config, logData: 'secret' }, { ...p.config, columns: [] }, { ...p.config, columns: [...p.config.columns].reverse() }]) assert.throws(() => s.remap(bad), /mapping|columns/i);
  const forged = structuredClone(p.config); forged.columns[1].unit = 'mph'; assert.throws(() => s.remap(forged), /AUTO/);
  assert.throws(() => s.commit(p.revision), /Preview changed/); assert.equal(s.log!.signals[0].values[0], 800);
  const review = s.review(); assert.equal(review.config.columns[1].unit, 'RPM');
});
test('local template save/apply/rename/delete/reset contain configuration only', async () => {
  const storage = memory(), headers = sourceHeaders(fixture('generic-ambiguous')).headers;
  const config = defaultMapping(headers); config.time = { index: 0, format: 'ms', source: 'user' };
  const saved = await saveTemplate(storage, 'My units', headers, manual(config, 2, { identity: 'speed', unit: 'mph' }));
  const text = storage.getItem(TEMPLATE_KEY)!;
  for (const forbidden of ['secret-row', 'Unknown speed', 'Ticks', '1000', 'sourceValues', 'samples', 'filename']) assert.ok(!text.includes(forbidden), forbidden);
  assert.equal(readTemplates(storage).length, 1); const applied = await applyTemplate(saved, headers);
  assert.equal(applied.columns[2].identity, 'speed'); assert.equal(applied.columns[2].via, 'template'); assert.equal(applied.time.source, 'template');
  renameTemplate(storage, saved.id, 'Renamed'); assert.equal(readTemplates(storage)[0].name, 'Renamed');
  deleteTemplate(storage, saved.id); assert.equal(readTemplates(storage).length, 0); resetTemplates(storage); assert.equal(storage.getItem(TEMPLATE_KEY), null);
});
test('template compatibility requires matching order, units and duplicate positions', async () => {
  const storage = memory(), headers = ['Time (s)', 'RPM', 'Speed(mph)'];
  const saved = await saveTemplate(storage, 'A', headers, defaultMapping(headers));
  await assert.rejects(() => applyTemplate(saved, ['Time (s)', 'Speed(mph)', 'RPM']), /headers do not match/);
  await assert.rejects(() => applyTemplate(saved, ['Time (s)', 'RPM', 'Speed(km\/h)']), /headers do not match/);
  assert.notEqual(await headerFingerprint(['RPM', 'RPM']), await headerFingerprint(['RPM', 'Speed']));
});
test('template schema versions/extra payloads/storage failures are not silently accepted', async () => {
  const storage = memory(); storage.setItem(TEMPLATE_KEY, JSON.stringify({ version: 2, templates: [] })); assert.throws(() => readTemplates(storage), /schema/);
  storage.setItem(TEMPLATE_KEY, JSON.stringify({ version: 1, templates: [], log: 'private' })); assert.throws(() => readTemplates(storage), /schema/);
  const denied: TemplateStorage = { ...memory(), setItem: () => { throw new Error('Storage denied'); } };
  await assert.rejects(() => saveTemplate(denied, 'A', ['Time (s)', 'RPM'], defaultMapping(['Time (s)', 'RPM'])), /Storage denied/);
});
test('invalid mapping index is rejected before accessing source columns', () => {
  const headers = ['Time (s)', 'RPM'], c = defaultMapping(headers); c.time.index = 127;
  assert.throws(() => validateConfig(c, headers), /positions/);
});
test('mixed ISO/clock time is a blocking V2 ambiguity until explicitly resolved', () => {
  const s = new ImportSession(), p = s.load('Time,RPM\n2026-09-25T12:00:00Z,800\n12:00:01,900');
  assert.ok(p.issues.some(i => i.severity === 'error' && /Mixed ISO/.test(i.message)));
  assert.throws(() => s.commit(p.revision), /blocking/);
  const c = structuredClone(p.config); c.time = { index: 0, format: 'iso', source: 'user' };
  const corrected = s.remap(c); assert.equal(corrected.time.detectedFormat, 'ISO date/time'); assert.equal(corrected.info.quality.missingTimes, 1);
  s.commit(corrected.revision);
});
