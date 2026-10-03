import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyNotebook, exportNotebookJson, jsonBytes, NOTEBOOK_LIMITS, NotebookError, parseNotebookJson, validateDraft, validateEvidence, validateNotebook, type NotebookDocument, type NotebookDraft, type NotebookErrorCode, type NotebookSignal } from '../../lib/notebook/model';
import { browserNotebookStore, createNotebookStore, NOTEBOOK_KEY, type NotebookExclusive, type NotebookPlan, type NotebookStorage } from '../../lib/notebook/storage';
import { projectAnalysisEvidence } from '../../lib/notebook/evidence';
import { parseLog } from '../../lib/obd/engine';
import { compare, region, type Segment } from '../../lib/obd/drive';
import { driveCsv } from '../../lib/obd/drive-demo';

const time = '2026-10-03T12:00:00.000Z';
const record = (id = 'note-1', fields: NotebookDraft = {}) => ({ ...fields, id, createdAt: time, updatedAt: time });
const document = (...records: NotebookDocument['records']): NotebookDocument => ({ ...emptyNotebook(), records });
function failure(code: NotebookErrorCode) { return (error: unknown) => error instanceof NotebookError && error.code === code; }
class MemoryStorage implements NotebookStorage {
  values = new Map<string, string>();
  writes = 0;
  denyRead = false;
  denyWrite = false;
  getItem(key: string) { if (this.denyRead) throw new Error('denied'); return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.denyWrite) throw new Error('QuotaExceededError'); this.writes++; this.values.set(key, value); }
}
function sharedLock(): NotebookExclusive {
  let tail: Promise<unknown> = Promise.resolve();
  return task => { const next = tail.then(task); tail = next.catch(() => {}); return next; };
}
function setup(storage = new MemoryStorage(), exclusive = sharedLock()) {
  let next = 0;
  const store = createNotebookStore(storage, { exclusive, now: () => time, id: () => `note-${++next}` });
  return { storage, store };
}
const allFields: NotebookDraft = {
  vehicleLabel: 'Daily driver', vehicleIdentifier: 'optional personal label', question: 'Does the change repeat?', testDate: '2024-02-29', conditions: 'Warm; stationary, ventilated',
  baseline: 'Run A before change', modification: 'Repeat in similar conditions', selectedRegion: { start: 0, end: 10, phase: 'idle' }, selectedSignals: [{ id: 'rpm', label: 'RPM', unit: 'RPM' }],
  observation: 'Recorded values remained steady', alternativeExplanation: 'Different temperature', nextTest: 'Repeat safely', retestResult: 'Same observed pattern', notes: 'Keep the original file separately',
};

test('constructor is inert; empty storage and SSR do not save sessions', () => {
  const storage = new MemoryStorage(); storage.denyRead = true;
  const store = createNotebookStore(storage);
  assert.equal(storage.writes, 0);
  assert.throws(() => store.read(), failure('unavailable'));
  assert.throws(() => browserNotebookStore().read(), failure('unavailable'));
  assert.deepEqual(setup().store.read().document, emptyNotebook());
});

test('every notebook field is optional; complete structured fields roundtrip exactly', () => {
  assert.deepEqual(validateDraft({}), {});
  for (const [key, value] of Object.entries(allFields)) assert.deepEqual(validateDraft({ [key]: value }), { [key]: value });
  assert.deepEqual(parseNotebookJson(exportNotebookJson(document(record('all', allFields)))), document(record('all', allFields)));
});

test('Unicode, combining marks, emoji, RTL and inert markup preserve exact text', () => {
  const notes = '🚗 café e\u0301 日本語 العربية \u202eRTL\u202c\n\t<script>alert(1)</script> https://example.test/{[" \\';
  assert.deepEqual(parseNotebookJson(exportNotebookJson(document(record('unicode', { notes })))).records[0].notes, notes);
  assert.deepEqual(parseNotebookJson('\uFEFF' + exportNotebookJson(document(record()))), document(record()));
  for (const notes of ['\ud800', '\udc00', 'bad\u0000text', 'bad\u001btext', 'bad\u007ftext']) assert.throws(() => validateDraft({ notes }), failure('invalid'));
});

test('date-only values validate real leap days without timezone guessing', () => {
  for (const testDate of ['2024-02-29', '2026-10-03', '0099-01-01']) assert.equal(validateDraft({ testDate }).testDate, testDate);
  for (const testDate of ['2023-02-29', '2026-04-31', '0000-01-01', '10/03/2026', '2026-10-03T12:00:00Z', '2026-13-01', '2026-00-01', '2026-01-00']) assert.throws(() => validateDraft({ testDate }), failure('invalid'));
});

test('metadata timestamps require canonical real UTC dates and ordered edit time', () => {
  for (const createdAt of ['2026-02-30T12:00:00.000Z', '2026-10-03T24:00:00.000Z', '2026-10-03T12:00:00+00:00', '2026-10-03T12:00:00Z', '0000-01-01T00:00:00.000Z']) assert.throws(() => validateNotebook(document({ ...record(), createdAt })), failure('invalid'));
  assert.throws(() => validateNotebook(document({ ...record(), updatedAt: '2025-01-01T00:00:00.000Z' })), failure('invalid'));
});

test('strict allowlists reject raw logs and arbitrary nested payloads everywhere', () => {
  const payloads = ['rawLog', 'rows', 'sourceValues', 'samples', 'audio', 'blob', 'spectra', 'session', 'html', 'filename', 'traces'];
  for (const key of payloads) {
    assert.throws(() => validateDraft({ [key]: [] }), failure('invalid'));
    assert.throws(() => validateDraft({ evidence: { signals: [], [key]: [] } }), failure('invalid'));
    assert.throws(() => validateDraft({ selectedRegion: { start: 0, end: 1, [key]: [] } }), failure('invalid'));
    assert.throws(() => validateDraft({ selectedSignals: [{ id: 'x', label: 'x', [key]: [] }] }), failure('invalid'));
    assert.throws(() => validateNotebook({ ...document(record()), [key]: [] }), failure('invalid'));
  }
});

test('dangerous keys, prototypes, accessors and cyclic runtime values are rejected', () => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    assert.throws(() => parseNotebookJson(`{"schema":"torquegirl.observation-notebook","version":1,"revision":0,"records":[],"${key}":{}}`), failure('invalid'));
    assert.throws(() => validateDraft(JSON.parse(`{"evidence":{"signals":[],"${key}":{}}}`)), failure('invalid'));
  }
  let accessed = false;
  assert.throws(() => validateDraft({ get notes() { accessed = true; return 'bad'; } }), failure('invalid'));
  assert.equal(accessed, false);
  assert.throws(() => validateDraft(Object.create({ notes: 'inherited' })), failure('invalid'));
  const cycle: Record<string, unknown> = {}; cycle.notes = cycle;
  assert.throws(() => validateDraft(cycle), failure('invalid'));
  assert.equal(({} as { polluted?: string }).polluted, undefined);
});

test('unknown versions, malformed and empty JSON never become an empty notebook', () => {
  for (const json of ['', '{', 'null', '[]', '{}', '{"version":1,"records":[]}']) assert.throws(() => parseNotebookJson(json), failure('invalid'));
  for (const version of [0, 2, '1', null]) assert.throws(() => parseNotebookJson(JSON.stringify({ ...emptyNotebook(), version })), failure('version'));
  assert.throws(() => validateNotebook({ ...emptyNotebook(), schema: 'some-other-format' }), failure('invalid'));
});

test('IDs, revisions, types and duplicate record/signal IDs are validated', () => {
  for (const id of ['', 'space id', '__proto__', 'x'.repeat(81)]) assert.throws(() => validateNotebook(document(record(id))), failure('invalid'));
  for (const revision of [-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => validateNotebook({ ...emptyNotebook(), revision }), failure('invalid'));
  assert.throws(() => validateNotebook(document(record(), record())), failure('invalid'));
  assert.throws(() => validateDraft({ question: 123 }), failure('invalid'));
  assert.throws(() => validateDraft({ notes: null }), failure('invalid'));
  assert.throws(() => validateDraft({ selectedSignals: [{ id: 'x', label: 'x' }, { id: 'x', label: 'y', run: 'A' }] }), failure('invalid'));
});

test('UTF-8 byte size and per-field limits reject instead of truncating', () => {
  assert.equal(jsonBytes('🚗'), 4);
  assert.throws(() => validateDraft({ notes: 'x'.repeat(6001) }), failure('invalid'));
  const largeRecord = record('large', { notes: '🚗'.repeat(3000), observation: '🚗'.repeat(2000), retestResult: '🚗'.repeat(2000) });
  assert.throws(() => validateNotebook(document(largeRecord)), failure('limit'));
  const lots = Array.from({ length: 90 }, (_, i) => record(`n-${i}`, { notes: 'x'.repeat(6000) }));
  assert.throws(() => validateNotebook(document(...lots)), failure('limit'));
  assert.throws(() => parseNotebookJson(' '.repeat(NOTEBOOK_LIMITS.bytes + 1)), failure('limit'));
  assert.throws(() => parseNotebookJson('🚗'.repeat(NOTEBOOK_LIMITS.bytes / 4 + 1)), failure('limit'));
  assert.throws(() => validateNotebook(document(...Array.from({ length: 101 }, (_, i) => record(`n-${i}`)))), failure('invalid'));
});

test('depth preflight handles escaped quotes and braces inside text', () => {
  assert.throws(() => parseNotebookJson('['.repeat(1000) + '0' + ']'.repeat(1000)), failure('limit'));
  const notes = '[[[[[[[[[[[[{{{ \\"quoted"}}}]';
  assert.equal(parseNotebookJson(exportNotebookJson(document(record('n', { notes })))).records[0].notes, notes);
  let nested: unknown = {};
  for (let i = 0; i < 15; i++) nested = { child: nested };
  assert.throws(() => validateDraft(nested), failure('limit'));
});

test('regions and numeric evidence reject nonfinite, unbounded or reversed values', () => {
  for (const start of [-1, NaN, Infinity, -Infinity, 1e10]) assert.throws(() => validateDraft({ selectedRegion: { start, end: 10 } }), failure('invalid'));
  assert.throws(() => validateDraft({ selectedRegion: { start: 10, end: 2 } }), failure('invalid'));
  assert.throws(() => validateDraft({ selectedRegion: { start: 0, end: 2, phase: 'diagnosed' } }), failure('invalid'));
  const stat = { run: 'A', signalId: 'x', count: 4, min: 0, max: 2, mean: 1, median: 1, coverage: 0.5, cadence: 1 };
  for (const [field, value] of [['mean', NaN], ['mean', Infinity], ['mean', 1e13], ['count', -1], ['count', 1.5], ['coverage', 1.1], ['cadence', -1], ['min', 3]]) assert.throws(() => validateEvidence({ signals: [{ id: 'x', label: 'x' }], regionA: { start: 0, end: 2 }, statistics: [{ ...stat, [field as string]: value }] }), failure('invalid'));
  assert.throws(() => parseNotebookJson(exportNotebookJson(document(record())).replace('"revision":0', '"revision":1e999')), failure('invalid'));
});

function analysisFixture() {
  const a = parseLog(driveCsv({ mode: 'cruise' })), b = parseLog(driveCsv({ mode: 'cruise', trim: 4.3 }));
  const segment: Segment = { id: 0, start: 0, end: 10, duration: 10, phase: 'cruise', evidence: 'generated', caveat: 'synthetic' };
  const regionA = region(a, segment), regionB = region(b, segment), comparison = compare(a, b, segment, segment);
  const index = a.signals.findIndex(s => s.identity === 'ltft-bank-1');
  const signal = (run: 'A' | 'B'): NotebookSignal => ({ id: a.signals[index].id, label: 'LTFT bank 1', run, identity: 'ltft-bank-1', unit: '%' });
  return { a, b, regionA, regionB, comparison, signals: [signal('A'), signal('B')] };
}

test('real analyzer summaries project only selected compact A/B evidence with known values', () => {
  const input = analysisFixture();
  const evidence = projectAnalysisEvidence({ ...input, runALabel: 'Baseline', runBLabel: 'Retest' });
  assert.equal(evidence.comparison?.state, 'GOOD MATCH');
  assert.equal(evidence.statistics?.length, 2);
  assert.equal(evidence.comparison?.changes.length, 1);
  assert.equal(evidence.statistics?.[0].median, 10.8);
  assert.equal(evidence.statistics?.[1].median, 4.3);
  assert.ok(Math.abs(evidence.comparison!.changes[0].delta - (-6.5)) < 1e-12);
  assert.deepEqual(evidence.regionA, { start: 0, end: 10, phase: 'cruise' });
  assert.deepEqual(parseNotebookJson(exportNotebookJson(document(record('e', { evidence })))).records[0].evidence, evidence);
  assert.ok(jsonBytes(JSON.stringify(evidence)) < 2000);
});

test('projection excludes every raw source property, session and filename even on structural inputs', () => {
  const input = analysisFixture();
  const sentinel = 'PRIVATE_RAW_SENTINEL';
  Object.assign(input.regionA, { rows: [sentinel], sourceValues: [sentinel], audio: sentinel, blob: sentinel, spectra: [sentinel] });
  Object.assign(input.regionA.segment, { evidence: sentinel, caveat: sentinel });
  Object.assign(input.regionA.stats[0], { samples: [sentinel] });
  Object.assign(input.signals[0], { originalName: sentinel, sourceValues: [sentinel], samples: [sentinel] });
  Object.assign(input.comparison, { traces: [sentinel], points: [sentinel], arbitraryPayload: sentinel });
  Object.assign(input, { log: input.a, filename: sentinel, session: sentinel });
  const result = JSON.stringify(projectAnalysisEvidence(input));
  assert.ok(!result.includes(sentinel));
  assert.ok(!/rows|sourceValues|samples|audio|blob|spectra|traces|points|filename|session|originalName/.test(result));
  assert.equal(projectAnalysisEvidence(input).runALabel, undefined);
});

test('projection defaults signal IDs to A and accepts run-scoped same IDs without accidental B capture', () => {
  const input = analysisFixture();
  const result = projectAnalysisEvidence({ ...input, signals: [{ ...input.signals[0], run: undefined }] });
  assert.equal(result.statistics?.length, 1);
  assert.equal(result.statistics?.[0].run, 'A');
  const both = projectAnalysisEvidence(input);
  assert.equal(both.statistics?.length, 2);
  assert.throws(() => projectAnalysisEvidence({ ...input, signals: [input.signals[0], input.signals[0]] }), failure('invalid'));
});

test('projection supports empty/manual or time-only selections without manufacturing statistics', () => {
  assert.deepEqual(projectAnalysisEvidence({ signals: [] }), { signals: [] });
  assert.deepEqual(projectAnalysisEvidence({ signals: [], timeRegionA: { start: 2, end: 3 } }), { signals: [], regionA: { start: 2, end: 3 } });
  const input = analysisFixture();
  assert.deepEqual(projectAnalysisEvidence({ ...input, timeRegionA: { start: 20, end: 30 } }).regionA, { start: 0, end: 10, phase: 'cruise' });
});

test('stale comparison and dangling or duplicate statistics are rejected', () => {
  const input = analysisFixture();
  assert.throws(() => projectAnalysisEvidence({ ...input, regionA: { ...input.regionA, segment: { ...input.regionA.segment, end: 9 } } }), failure('conflict'));
  assert.throws(() => projectAnalysisEvidence({ ...input, regionA: { ...input.regionA, stats: input.regionA.stats.map((s, i) => i === 0 ? { ...s, mean: 999 } : s) } }), failure('conflict'));
  const evidence = projectAnalysisEvidence(input);
  assert.throws(() => validateEvidence({ ...evidence, signals: [] }), failure('invalid'));
  assert.throws(() => validateEvidence({ ...evidence, regionB: undefined }), failure('invalid'));
  assert.throws(() => validateEvidence({ ...evidence, statistics: [evidence.statistics![0], evidence.statistics![0]] }), failure('invalid'));
  assert.throws(() => validateEvidence({ ...evidence, comparison: { ...evidence.comparison, changes: [evidence.comparison!.changes[0], evidence.comparison!.changes[0]] } }), failure('invalid'));
});

test('evidence selection, statistic, change and summary lengths are bounded without truncation', () => {
  const input = analysisFixture();
  assert.throws(() => projectAnalysisEvidence({ signals: Array.from({ length: 17 }, (_, i) => ({ id: `s-${i}`, label: 'x' })) }), failure('invalid'));
  assert.throws(() => projectAnalysisEvidence({ ...input, runALabel: 'x'.repeat(161) }), failure('invalid'));
  assert.throws(() => projectAnalysisEvidence({ ...input, comparison: { ...input.comparison, reasons: Array(9).fill('reason') } }), failure('invalid'));
  assert.throws(() => projectAnalysisEvidence({ ...input, comparison: { ...input.comparison, reasons: ['x'.repeat(401)] } }), failure('invalid'));
  const evidence = projectAnalysisEvidence(input);
  assert.throws(() => validateEvidence({ ...evidence, statistics: Array(33).fill(evidence.statistics![0]) }), failure('invalid'));
  assert.throws(() => validateEvidence({ ...evidence, comparison: { ...evidence.comparison, changes: Array(17).fill(evidence.comparison!.changes[0]) } }), failure('invalid'));
});

test('explicit create/edit/reload preserve stable IDs, optional fields and detached snapshots', async () => {
  const { storage, store } = setup(); const empty = store.read();
  const saved = await store.create(empty, allFields);
  assert.equal(empty.document.records.length, 0);
  assert.equal(saved.document.records[0].id, 'note-1');
  assert.equal(saved.document.revision, 1);
  assert.deepEqual(createNotebookStore(storage).read().document, saved.document);
  const edited = await store.update(saved, 'note-1', { observation: 'retest changed', notes: '' });
  assert.equal(edited.document.records[0].createdAt, time);
  assert.equal(edited.document.records[0].vehicleLabel, undefined);
  assert.equal(edited.document.records[0].notes, '');
  assert.equal(saved.document.records[0].observation, allFields.observation);
  saved.document.records[0].notes = 'tampered UI';
  assert.equal(store.read().document.records[0].notes, '');
});

test('backwards clock preserves update ordering', async () => {
  const storage = new MemoryStorage(); storage.values.set(NOTEBOOK_KEY, exportNotebookJson(document(record())));
  const store = createNotebookStore(storage, { exclusive: sharedLock(), now: () => '2025-01-01T00:00:00.000Z' });
  const saved = await store.update(store.read(), 'note-1', { observation: 'new' });
  assert.equal(saved.document.records[0].updatedAt, time);
});

test('delete and clear are preview-only until confirmed; unrelated storage remains intact', async () => {
  const { storage, store } = setup(); storage.values.set('mapping-templates', 'keep');
  let saved = await store.create(store.read(), { notes: 'one' }); saved = await store.create(saved, { notes: 'two' });
  const before = storage.getItem(NOTEBOOK_KEY), deletion = store.planDelete(saved, 'note-1');
  assert.equal(deletion.removed, 1); assert.equal(storage.getItem(NOTEBOOK_KEY), before);
  await assert.rejects(store.commitPlan(deletion), failure('confirmation'));
  assert.equal(storage.getItem(NOTEBOOK_KEY), before);
  saved = await store.commitPlan(deletion, { confirmed: true });
  assert.deepEqual(saved.document.records.map(r => r.id), ['note-2']);
  const clearing = store.planClear(saved);
  await assert.rejects(store.commitPlan(clearing), failure('confirmation'));
  saved = await store.commitPlan(clearing, { confirmed: true });
  assert.equal(saved.document.records.length, 0);
  assert.equal(saved.document.revision, 4);
  assert.equal(storage.getItem('mapping-templates'), 'keep');
  await assert.rejects(store.commitPlan(clearing, { confirmed: true }), failure('invalid'));
});

test('merge roundtrip is idempotent and preserves local conflicting IDs while adding new records', async () => {
  const { storage, store } = setup(); const saved = await store.create(store.read(), { notes: 'original' });
  const backup = store.export(saved), writes = storage.writes;
  const same = store.planImport(saved, backup);
  assert.equal(same.unchanged, 1); assert.equal(same.added, 0);
  const unchanged = await store.commitPlan(same);
  assert.equal(storage.writes, writes); assert.equal(unchanged.token, saved.token);
  const mixed = exportNotebookJson(document(record('note-1', { notes: 'incoming conflict' }), record('new', { notes: 'imported' })));
  const plan = store.planImport(saved, mixed);
  assert.deepEqual(plan.conflictIds, ['note-1']); assert.equal(plan.added, 1); assert.equal(plan.removed, 0);
  const merged = await store.commitPlan(plan);
  assert.deepEqual(merged.document.records.map(r => r.notes), ['original', 'imported']);
  assert.equal(merged.document.revision, 2);
});

test('replacement requires explicit confirmation and never trusts imported revision', async () => {
  const { storage, store } = setup(); const saved = await store.create(store.read(), { notes: 'original' });
  const json = JSON.stringify({ ...document(record('replacement')), revision: 999 });
  const plan = store.planImport(saved, json, 'replace'); const before = storage.getItem(NOTEBOOK_KEY);
  assert.equal(plan.requiresConfirmation, true); assert.equal(plan.removed, 1);
  await assert.rejects(store.commitPlan(plan), failure('confirmation'));
  assert.equal(storage.getItem(NOTEBOOK_KEY), before);
  const replaced = await store.commitPlan(plan, { confirmed: true });
  assert.deepEqual(replaced.document.records.map(r => r.id), ['replacement']);
  assert.equal(replaced.document.revision, 2);
});

test('plans cannot bypass confirmation or alter candidate by mutating public preview', async () => {
  const { store } = setup(); const saved = await store.create(store.read(), { notes: 'original' });
  const plan = store.planClear(saved);
  Object.assign(plan, { kind: 'merge', requiresConfirmation: false });
  plan.preview.records.push(record('injected'));
  await assert.rejects(store.commitPlan(plan), failure('confirmation'));
  const cleared = await store.commitPlan(plan, { confirmed: true }); assert.equal(cleared.document.records.length, 0);
  await assert.rejects(store.commitPlan({ ...plan } as NotebookPlan, { confirmed: true }), failure('invalid'));
});

test('malformed/unsupported/oversized import and duplicate IDs preserve all saved data', async () => {
  const { storage, store } = setup(); const saved = await store.create(store.read(), { notes: 'private' }); const before = storage.getItem(NOTEBOOK_KEY);
  for (const json of ['{', '', JSON.stringify({ ...emptyNotebook(), version: 2 }), JSON.stringify(document(record(), record())), 'x'.repeat(NOTEBOOK_LIMITS.bytes + 1), JSON.stringify(document(record('bad', { notes: 'x'.repeat(6001) })))]) {
    assert.throws(() => store.planImport(saved, json));
    assert.equal(storage.getItem(NOTEBOOK_KEY), before);
    assert.equal(storage.writes, 1);
  }
});

test('corrupt and unknown-version existing storage never permits create/edit/delete/clear/import recovery writes', async () => {
  for (const raw of ['', '{bad', JSON.stringify({ ...emptyNotebook(), version: 2 }), JSON.stringify({ ...emptyNotebook(), unexpected: 'keep' })]) {
    const { storage, store } = setup(); storage.values.set(NOTEBOOK_KEY, raw);
    assert.throws(() => store.read());
    const guessed = { token: raw, document: emptyNotebook() };
    await assert.rejects(store.create(guessed, {})); await assert.rejects(store.update(guessed, 'x', {}));
    assert.throws(() => store.planDelete(guessed, 'x')); assert.throws(() => store.planClear(guessed));
    assert.throws(() => store.planImport(guessed, exportNotebookJson(emptyNotebook()), 'replace'));
    assert.equal(storage.getItem(NOTEBOOK_KEY), raw); assert.equal(storage.writes, 0);
  }
});

test('quota/write failures preserve saved bytes, snapshots, draft and reusable plans for every mutation', async () => {
  const { storage, store } = setup(); const saved = await store.create(store.read(), { notes: 'existing' });
  const draft = { notes: 'unsaved draft' }, beforeDraft = structuredClone(draft), beforeSnapshot = structuredClone(saved), before = storage.getItem(NOTEBOOK_KEY);
  const plans = [store.planDelete(saved, 'note-1'), store.planClear(saved), store.planImport(saved, exportNotebookJson(document(record('new')))), store.planImport(saved, exportNotebookJson(document(record('replacement'))), 'replace')];
  storage.denyWrite = true;
  await assert.rejects(store.create(saved, draft), failure('write')); await assert.rejects(store.update(saved, 'note-1', draft), failure('write'));
  for (const plan of plans) await assert.rejects(store.commitPlan(plan, { confirmed: true }), failure('write'));
  assert.equal(storage.getItem(NOTEBOOK_KEY), before); assert.deepEqual(saved, beforeSnapshot); assert.deepEqual(draft, beforeDraft); assert.equal(storage.writes, 1);
  storage.denyWrite = false;
  const retry = await store.commitPlan(plans[0], { confirmed: true }); assert.equal(retry.document.records.length, 0);
});

test('denied/unavailable storage and missing locks fail closed without losing data', async () => {
  const { storage, store } = setup(); const saved = await store.create(store.read(), {}); const before = storage.getItem(NOTEBOOK_KEY);
  storage.denyRead = true;
  await assert.rejects(store.create(saved, {}), failure('unavailable'));
  assert.throws(() => store.planClear(saved), failure('unavailable'));
  storage.denyRead = false;
  const readOnly = createNotebookStore(storage);
  assert.equal(readOnly.export(readOnly.read()), before);
  await assert.rejects(readOnly.update(readOnly.read(), 'note-1', {}), failure('unavailable'));
  assert.throws(() => createNotebookStore(undefined).read(), failure('unavailable'));
  assert.equal(storage.getItem(NOTEBOOK_KEY), before);
});

test('cross-tab stale creates, edits, deletes, clears, imports and exports all preserve newer notes', async () => {
  const storage = new MemoryStorage(), lock = sharedLock();
  const a = setup(storage, lock).store, b = setup(storage, lock).store;
  const first = await a.create(a.read(), { notes: 'one' });
  const stale = b.read(), deletion = b.planDelete(stale, 'note-1'), clearing = b.planClear(stale), importing = b.planImport(stale, exportNotebookJson(document(record('new'))));
  const newer = await a.update(first, 'note-1', { notes: 'newer' }), before = storage.getItem(NOTEBOOK_KEY);
  await assert.rejects(b.create(stale, {}), failure('conflict')); await assert.rejects(b.update(stale, 'note-1', {}), failure('conflict'));
  for (const plan of [deletion, clearing, importing]) await assert.rejects(b.commitPlan(plan, { confirmed: true }), failure('conflict'));
  assert.throws(() => b.export(stale), failure('conflict'));
  assert.equal(storage.getItem(NOTEBOOK_KEY), before); assert.deepEqual(b.read().document, newer.document);
});

test('shared lock serializes simultaneous writes: one succeeds, one conflicts, no lost update', async () => {
  const storage = new MemoryStorage(), lock = sharedLock();
  const a = createNotebookStore(storage, { exclusive: lock, now: () => time, id: () => 'a' });
  const b = createNotebookStore(storage, { exclusive: lock, now: () => time, id: () => 'b' });
  const results = await Promise.allSettled([a.create(a.read(), { notes: 'A' }), b.create(b.read(), { notes: 'B' })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const rejected = results.find(r => r.status === 'rejected'); assert.ok(rejected?.status === 'rejected' && failure('conflict')(rejected.reason));
  assert.equal(storage.writes, 1); assert.deepEqual(a.read().document.records.map(r => r.id), ['a']);
  const merged = await b.create(b.read(), { notes: 'B' }); assert.deepEqual(merged.document.records.map(r => r.id), ['a', 'b']);
});

test('check inside lock catches changes after planning/preflight even without storage events', async () => {
  const storage = new MemoryStorage(); let queued: (() => void) | undefined;
  const store = createNotebookStore(storage, { exclusive: task => new Promise((resolve, reject) => { queued = () => { try { resolve(task()); } catch (error) { reject(error); } }; }), now: () => time, id: () => 'new' });
  const pending = store.create(store.read(), {});
  storage.values.set(NOTEBOOK_KEY, exportNotebookJson(document(record('other-tab'))));
  queued!();
  await assert.rejects(pending, failure('conflict'));
  assert.deepEqual(store.read().document.records.map(r => r.id), ['other-tab']); assert.equal(storage.writes, 0);
});

test('clear keeps a revision tombstone so stale initially-empty snapshots cannot overwrite later history', async () => {
  const { store } = setup(); const originallyEmpty = store.read();
  const saved = await store.create(originallyEmpty, {}); const cleared = await store.commitPlan(store.planClear(saved), { confirmed: true });
  assert.equal(cleared.document.records.length, 0); assert.equal(cleared.document.revision, 2);
  await assert.rejects(store.create(originallyEmpty, {}), failure('conflict'));
});

test('missing IDs, ID collisions, invalid drafts and exhausted capacity never write', async () => {
  const { storage, store } = setup(); const saved = await store.create(store.read(), {}), before = storage.getItem(NOTEBOOK_KEY);
  await assert.rejects(store.update(saved, 'missing', {}), failure('conflict')); assert.throws(() => store.planDelete(saved, 'missing'), failure('conflict'));
  const collision = createNotebookStore(storage, { exclusive: sharedLock(), id: () => 'note-1', now: () => time });
  await assert.rejects(collision.create(collision.read(), {}), failure('conflict'));
  await assert.rejects(store.create(saved, { notes: 'x'.repeat(6001) }), failure('invalid'));
  assert.equal(storage.getItem(NOTEBOOK_KEY), before);
  storage.values.set(NOTEBOOK_KEY, exportNotebookJson(document(...Array.from({ length: 100 }, (_, i) => record(`full-${i}`)))));
  await assert.rejects(store.create(store.read(), {}), failure('invalid'));
  assert.throws(() => store.planImport(store.read(), exportNotebookJson(document(record('new')))), failure('invalid'));
  storage.values.set(NOTEBOOK_KEY, JSON.stringify({ ...emptyNotebook(), revision: Number.MAX_SAFE_INTEGER }));
  await assert.rejects(store.create(store.read(), {}), failure('invalid'));
  assert.equal(storage.writes, 1);
});

test('lock acquisition rejection returns a typed unavailable error with no mutation', async () => {
  const storage = new MemoryStorage();
  const store = createNotebookStore(storage, { exclusive: async () => { throw new Error('lock denied'); }, id: () => 'new', now: () => time });
  await assert.rejects(store.create(store.read(), {}), failure('unavailable'));
  assert.equal(storage.writes, 0); assert.equal(storage.getItem(NOTEBOOK_KEY), null);
});

test('browser adapter uses the exact shared Web Lock/key and leaves mapping storage alone', async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const storage = new MemoryStorage(), requests: unknown[] = [];
  storage.values.set('torquegirl.obd.mapping-templates.v1', 'unchanged');
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (name: string, options: unknown, task: () => unknown) => { requests.push({ name, options }); return task(); } } } });
    const store = browserNotebookStore(); assert.equal(requests.length, 0); assert.equal(storage.writes, 0);
    await store.create(store.read(), { notes: 'explicit' });
    assert.deepEqual(requests, [{ name: NOTEBOOK_KEY, options: { mode: 'exclusive' } }]);
    assert.equal(storage.getItem('torquegirl.obd.mapping-templates.v1'), 'unchanged');
    Object.defineProperty(globalThis, 'window', { configurable: true, get() { throw new Error('storage denied'); } });
    assert.throws(() => browserNotebookStore().read(), failure('unavailable'));
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, get() { throw new Error('locks denied'); } });
    const readOnly = browserNotebookStore(); const saved = readOnly.read();
    await assert.rejects(readOnly.create(saved, {}), failure('unavailable'));
    assert.equal(storage.writes, 1);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator); else Reflect.deleteProperty(globalThis, 'navigator');
  }
});

test('nullable unavailable statistics roundtrip, but nested raw/comparison payloads are rejected', () => {
  const input = analysisFixture();
  const evidence = projectAnalysisEvidence(input), s = { ...evidence.statistics![0], count: 0, min: null, max: null, mean: null, median: null, coverage: 0, cadence: null };
  assert.deepEqual(validateEvidence({ ...evidence, statistics: [s] }).statistics, [s]);
  assert.throws(() => validateEvidence({ ...evidence, statistics: [{ ...s, sourceValues: ['private'] }] }), failure('invalid'));
  assert.throws(() => validateEvidence({ ...evidence, comparison: { ...evidence.comparison, traces: [] } }), failure('invalid'));
  for (const delta of [NaN, Infinity, 1e13]) assert.throws(() => validateEvidence({ ...evidence, comparison: { ...evidence.comparison, changes: [{ ...evidence.comparison!.changes[0], delta }] } }), failure('invalid'));
});
