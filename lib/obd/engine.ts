import { detectDelimiter, isMissing, LIMITS, numeric, records } from './csv';
import { identify } from './signals';
import { median, parseTime, timeKind } from './time';
import type { Log, LogInfo, Quality, Signal } from './types';
import { timeGapDetector } from './events';
import { mappedColumn, validateConfig } from './mapping';
import type { MappingConfig } from './mapping-types';
import { detectExporter } from './adapters';

export interface FormatAdapter { id: string; matches(headers: string[]): boolean }
export const adapters: FormatAdapter[] = [
  { id: 'Torque-style CSV (header heuristic)', matches: h => h.some(s => /^device time$/i.test(s)) },
  { id: 'FORScan-style CSV (header heuristic)', matches: h => h.some(s => /^time\(ms\)$/i.test(s)) && h.some(s => /^rpm(?:[([]|$)/i.test(s)) },
  { id: 'Generic / OBD Fusion-compatible table', matches: () => true },
];

export function parseLog(text: string, mapping?: MappingConfig): Log {
  if (text.length > LIMITS.bytes) throw new Error('Log exceeds the 25 MiB text limit.');
  const delimiter = detectDelimiter(text), iterator = records(text, delimiter);
  const first = iterator.next().value;
  if (!first || first.error || first.fields.length < 2) throw new Error('A header row and at least two delimited columns are required.');
  const headers: string[] = first.fields.map((s: string) => s.trim());
  const configuration = mapping ? validateConfig(mapping, headers) : null;
  const quality: Quality = { parsed: 0, rejected: 0, missingTimes: 0, duplicateTimes: 0, backwardsTimes: 0, duration: 0, recognized: 0, unknown: 0, missingValues: 0, invalidValues: 0, intervalMin: null, intervalMedian: null, intervalMax: null, irregular: false, warnings: [], warningCount: 0, gaps: 0 };
  const warn = (s: string) => { quality.warningCount++; if (quality.warnings.length < 50) quality.warnings.push(s); };
  const timeColumns = headers.map((h, i) => timeKind(h) ? i : -1).filter(i => i >= 0);
  const ti = configuration ? configuration.time.index ?? -1 : timeColumns[0] ?? -1;
  if (ti < 0) warn('No supported time column. Source data is preserved, but time charts are unavailable. Use Time (s) or Time (ms).');
  if (timeColumns.length > 1) warn(`Multiple time columns: using “${headers[ti]}”; other columns are retained.`);
  const kind = ti < 0 ? null : configuration ? configuration.time.format === 'auto' ? 'unspecified' : configuration.time.format : timeKind(headers[ti]);
  if (kind === 'unspecified' || kind === 'date') warn('Bare numeric timestamps have no inferred unit. ISO dates and HH:MM:SS are accepted; offset-free ISO dates use UTC.');
  const columns = headers.map((name, i) => ({ i, info: configuration ? mappedColumn(name, configuration, i, headers) : { ...identify(name), provenance: undefined } })).filter(c => c.i !== ti && (!configuration || configuration.columns[c.i].state !== 'ignore'));
  const signals: Signal[] = columns.map(({ i, info }) => ({ id: `column-${i}`, originalName: headers[i] || `Unnamed column ${i + 1}`, originalUnit: info.originalUnit, identity: info.identity, unit: info.unit, ambiguity: info.ambiguity, provenance: info.provenance, sourceValues: [], values: [], samples: [], missing: 0, invalid: 0, cadence: null }));
  for (const signal of signals) {
    if (signal.identity) quality.recognized++; else quality.unknown++;
    if (signal.ambiguity) warn(`${signal.originalName}: ${signal.ambiguity}`);
  }
  if (new Set(headers).size !== headers.length) warn('Duplicate headers retained as separate columns with unique IDs.');
  // Decimal commas are accepted only for semicolon/tab records; comma-delimited values remain ambiguous.
  const decimal = delimiter !== ',';
  if (decimal) warn('Semicolon/tab numeric fields accept decimal commas; ambiguous groups such as 1,234 and thousands separators are rejected.');
  const log: Log = { format: configuration ? detectExporter(headers).label : adapters.find(a => a.matches(headers))!.id, delimiter, signals, originalTimes: [], times: [], quality, events: [], mapping: configuration ?? undefined };
  let previous: number | null = null, minimum = Infinity, maximum = -Infinity;
  const seen = new Set<number>();
  for (const record of iterator) {
    if (quality.parsed + quality.rejected >= LIMITS.rows) throw new Error(`Maximum ${LIMITS.rows.toLocaleString()} records supported; split this log.`);
    if (record.error || record.fields.length !== headers.length) { quality.rejected++; warn(`Line ${record.line}: ${record.error ?? `expected ${headers.length} fields, got ${record.fields.length}`}. Record rejected.`); continue; }
    if ((quality.parsed + 1) * headers.length > LIMITS.cells) throw new Error('Maximum 2 million cells supported; split this log or export fewer signals.');
    const original = ti < 0 ? '' : record.fields[ti];
    const time = parseTime(original, kind, decimal);
    log.originalTimes.push(original); log.times.push(time);
    if (time === null) quality.missingTimes++;
    else {
      if (seen.has(time)) quality.duplicateTimes++; seen.add(time);
      if (previous !== null && time < previous) quality.backwardsTimes++;
      previous = time; minimum = Math.min(minimum, time); maximum = Math.max(maximum, time);
    }
    signals.forEach((signal, j) => {
      const raw = record.fields[columns[j].i], value = numeric(raw, decimal);
      signal.sourceValues.push(raw); signal.values.push(value === null ? null : columns[j].info.convert(value));
      if (isMissing(raw)) { signal.missing++; quality.missingValues++; }
      else if (value === null) { signal.invalid++; quality.invalidValues++; }
    });
    quality.parsed++;
  }
  if (!quality.parsed) throw new Error('No valid data records found. Check the header and delimiter.');
  if (minimum !== Infinity) {
    log.times = log.times.map(t => t === null ? null : t - minimum);
    quality.duration = maximum - minimum;
  }
  const ordered = [...seen].sort((a, b) => a - b), intervals: number[] = [];
  for (let i = 1; i < ordered.length; i++) intervals.push(ordered[i] - ordered[i - 1]);
  quality.intervalMedian = median(intervals);
  if (intervals.length) {
    quality.intervalMin = intervals.reduce((a, b) => Math.min(a, b), Infinity);
    quality.intervalMax = intervals.reduce((a, b) => Math.max(a, b), 0);
    quality.irregular = quality.intervalMax > quality.intervalMin * 1.2;
    const observations = timeGapDetector.detect({ orderedTimes: ordered, origin: minimum, medianInterval: quality.intervalMedian });
    quality.gaps = observations.total; log.events = observations.events;
  }
  if (quality.gaps > 500) warn('Event list limited to the first 500 recording gaps. Total gap count remains available.');
  if (quality.backwardsTimes) warn('Backwards timestamps found: samples sorted by actual time for inspection; original row order retained. Clock resets are not repaired.');
  if (quality.missingTimes) warn(`${quality.missingTimes} records lack a usable timestamp and are excluded from time-based analysis.`);
  if (quality.invalidValues) warn(`${quality.invalidValues} nonnumeric, ambiguous or out-of-range values retained as source text; excluded from numeric analysis.`);
  for (const signal of signals) {
    signal.values.forEach((value, row) => { const time = log.times[row]; if (value !== null && time !== null) signal.samples.push({ time, value, row }); });
    signal.samples.sort((a, b) => a.time - b.time || a.row - b.row);
    const deltas: number[] = [];
    for (let i = 1; i < signal.samples.length; i++) { const d = signal.samples[i].time - signal.samples[i - 1].time; if (d > 0) deltas.push(d); }
    signal.cadence = median(deltas);
  }
  return log;
}

export function describe(log: Log): LogInfo {
  return { format: log.format, delimiter: log.delimiter, quality: log.quality, events: log.events, mapping: log.mapping, signals: log.signals.map(s => ({ id: s.id, originalName: s.originalName, originalUnit: s.originalUnit, identity: s.identity, unit: s.unit, ambiguity: s.ambiguity, missing: s.missing, invalid: s.invalid, cadence: s.cadence, provenance: s.provenance })) };
}
