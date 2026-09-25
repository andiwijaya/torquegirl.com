import { records, detectDelimiter, numeric } from './csv';
import { detectColumn, detectExporter, detectedTime } from './adapters';
import { dimension, interpretation, unitOptions, signalCatalog } from './catalog';
import { mappingSchema, type MappingConfig, type MappingIssue, type MappingProvenance } from './mapping-types';
import { identify } from './signals';
import type { Log, LogInfo } from './types';

export function sourceHeaders(text: string) {
  const delimiter = detectDelimiter(text), row = records(text, delimiter).next().value;
  if (!row || row.error || row.fields.length < 2) throw new Error('A header row and at least two delimited columns are required.');
  return { headers: row.fields as string[], delimiter };
}
export function defaultMapping(headers: string[]): MappingConfig {
  const adapter = detectExporter(headers), ti = headers.findIndex(h => detectedTime(h) !== null);
  return { version: 1, time: { index: ti < 0 ? null : ti, format: ti < 0 ? 'auto' : detectedTime(headers[ti])!, source: 'auto' }, columns: headers.map((h, index) => {
    const d = detectColumn(h, adapter);
    // Incompatible aliases stay custom until explicitly resolved, rather than becoming a wrong physical quantity.
    const compatible = d.identity && (!d.sourceUnit || !d.ambiguity);
    return { index, state: compatible ? 'auto' : 'custom', identity: compatible ? d.identity : null, unit: d.sourceUnit && unitOptions.includes(d.sourceUnit) ? d.sourceUnit : null, via: null };
  }) };
}
export function validateConfig(input: unknown, headers: string[]): MappingConfig {
  const parsed = mappingSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid mapping configuration: ${parsed.error.issues[0].message}`);
  const config = parsed.data, defaults = defaultMapping(headers);
  if (config.columns.length !== headers.length || config.columns.some((c, i) => c.index !== i) || (config.time.index !== null && config.time.index >= headers.length)) throw new Error('Mapping columns must exactly match the current source positions.');
  if (config.time.source === 'auto' && JSON.stringify(config.time) !== JSON.stringify(defaults.time)) throw new Error('Changed time interpretation must be explicitly user-confirmed.');
  for (const c of config.columns) {
    if (c.state === 'auto' && JSON.stringify(c) !== JSON.stringify(defaults.columns[c.index])) throw new Error('AUTO mapping must match the detected alias and source unit.');
    if ((c.state === 'custom' || c.state === 'ignore') && c.identity !== null) throw new Error('Custom/ignored columns cannot claim a canonical identity.');
    if (c.state === 'user' && (!c.identity || !c.via)) throw new Error('User mapping requires an explicit identity and provenance.');
    if (c.index === config.time.index || c.state === 'ignore') continue;
    const original = identify(headers[c.index]), oldDimension = dimension(original.originalUnit), newDimension = dimension(c.unit);
    if (oldDimension && newDimension && oldDimension !== newDimension) throw new Error(`Column ${c.index + 1}: ${original.originalUnit} cannot be reinterpreted as ${c.unit}. Physical dimensions differ.`);
    const targetDimension = dimension(signalCatalog.find(s => s.id === c.identity)?.unit ?? null);
    if (oldDimension && targetDimension && oldDimension !== targetDimension) throw new Error(`Column ${c.index + 1}: source unit and selected signal have incompatible physical dimensions.`);
    interpretation(c.identity, c.unit);
  }
  return config;
}
export function mappedColumn(header: string, config: MappingConfig, index: number, headers: string[]) {
  const c = config.columns[index], detected = detectColumn(header, detectExporter(headers));
  const converted = interpretation(c.identity, c.unit);
  const provenance: MappingProvenance = { state: c.state, interpretedUnit: c.unit, via: c.via, reason: c.state === 'auto' ? detected.reason : c.state === 'user' ? `USER: ${c.via === 'template' ? 'explicitly applied local template' : 'explicitly selected identity / unit'}` : c.state === 'ignore' ? 'IGNORE: explicitly excluded from analysis; source retained' : `CUSTOM: ${c.via ? 'intentionally unmapped' : 'no unambiguous known alias'}` };
  return { ...converted, unit: !c.identity && !c.unit ? detected.originalUnit : converted.unit, identity: c.identity, originalUnit: identify(header).originalUnit, provenance };
}
export interface ImportPreview {
  revision: number; config: MappingConfig; info: LogInfo;
  exporter: { id: string; label: string; evidence: string; timeConventions: string; unitConventions: string; quirks: string };
  headers: string[]; columns: { index: number; originalUnit: string | null; unit: string | null; reason: string; samples: string[]; normalized: (number | null)[]; numeric: number; missing: number; warning: string | null }[];
  time: { first: string | null; last: string | null; firstElapsed: number | null; lastElapsed: number | null; detectedFormat: string };
  issues: MappingIssue[];
}
export function previewDetails(text: string, config: MappingConfig, log: Log, info: LogInfo, revision: number): ImportPreview {
  const { headers, delimiter } = sourceHeaders(text), adapter = detectExporter(headers), issues: MappingIssue[] = [];
  const columns = headers.map((header, index) => {
    const signal = log.signals.find(s => s.id === `column-${index}`), mapped = mappedColumn(header, config, index, headers);
    return { index, originalUnit: mapped.originalUnit, unit: signal?.unit ?? mapped.unit, reason: index === config.time.index ? `TIME: ${config.time.source} · ${config.time.format}` : mapped.provenance.reason, samples: [] as string[], normalized: [] as (number | null)[], numeric: signal?.values.reduce<number>((n, v) => n + (v !== null ? 1 : 0), 0) ?? 0, missing: signal?.missing ?? 0, warning: signal?.ambiguity ?? null };
  });
  let count = 0;
  for (const row of records(text, delimiter)) {
    if (count++ === 0) continue;
    if (row.error || row.fields.length !== headers.length) continue;
    for (let i = 0; i < columns.length; i++) {
      columns[i].samples.push(row.fields[i].slice(0, 100));
      const raw = numeric(row.fields[i], delimiter !== ',');
      columns[i].normalized.push(i === config.time.index ? log.times[columns[i].samples.length - 1] ?? null : raw === null || config.columns[i].state === 'ignore' ? null : mappedColumn(headers[i], config, i, headers).convert(raw));
    }
    if (columns[0].samples.length === 3) break;
  }
  if (config.time.index === null || log.quality.missingTimes === log.quality.parsed) issues.push({ severity: 'error', message: 'Choose a time column and interpretation that produces at least one usable timestamp.' });
  if (!log.signals.some(s => s.samples.length > 0)) issues.push({ severity: 'error', message: 'At least one included signal must contain numeric data at a usable timestamp.' });
  const seen = new Map<string, number>();
  for (const s of log.signals) {
    const column = Number(s.id.slice(7));
    if (s.identity && seen.has(s.identity)) issues.push({ severity: 'warning', column, message: `Duplicate semantic mapping: ${s.identity}. Kept as separate columns; excluded from automatic A/B matching.` });
    if (s.identity) seen.set(s.identity, column);
    if (s.ambiguity) issues.push({ severity: 'warning', column, message: s.ambiguity });
    if (!s.samples.length) issues.push({ severity: 'warning', column, message: 'No numeric data with usable time; source values retained.' });
    else if (s.missing / log.quality.parsed >= 0.9) issues.push({ severity: 'warning', column, message: 'At least 90% of source values are missing; inspect sparse sampling.' });
    const previous = identify(s.originalName).identity;
    if (previous && s.identity && previous !== s.identity) issues.push({ severity: 'warning', column, message: `Explicit semantic change: ${previous} → ${s.identity}. No physical-reference adjustment is performed.` });
  }
  if (log.quality.backwardsTimes) issues.push({ severity: 'warning', message: 'Backwards time detected. No clock reset or midnight correction is applied.' });
  if (log.quality.missingTimes) issues.push({ severity: 'warning', message: `${log.quality.missingTimes} records have unusable timestamps and are excluded from time analysis.` });
  const formats = new Set<string>();
  for (let i = 0; i < log.times.length; i++) if (log.times[i] !== null) {
    formats.add(config.time.format === 's' ? 'Elapsed seconds' : config.time.format === 'ms' ? 'Elapsed milliseconds' : /^\d{4}-/.test(log.originalTimes[i].trim()) ? 'ISO date/time' : 'HH:MM:SS');
    if (formats.size > 1) break;
  }
  if (formats.size > 1) issues.push({ severity: 'error', message: 'Mixed ISO and clock-only timestamps. Choose one explicit interpretation; incompatible rows will remain unusable.' });
  return { revision, config, info, exporter: { id: adapter.id, label: adapter.label, evidence: adapter.evidence, timeConventions: adapter.timeConventions, unitConventions: adapter.unitConventions, quirks: adapter.quirks }, headers, columns, issues, time: { first: log.originalTimes[0] || null, last: log.originalTimes.at(-1) || null, firstElapsed: log.times[0] ?? null, lastElapsed: log.times.at(-1) ?? null, detectedFormat: [...formats].join(' + ') || 'Unresolved / no usable time' } };
}
