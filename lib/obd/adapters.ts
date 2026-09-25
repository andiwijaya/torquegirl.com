import { identify } from './signals';
import { timeKind } from './time';
import { canonicalUnit } from './catalog';

export interface ExporterAdapter {
  id: string; label: string; evidence: string; timeConventions: string; unitConventions: string; quirks: string;
  matches(headers: string[]): boolean;
  aliases: Record<string, string>;
}
export const exporterAdapters: ExporterAdapter[] = [
  { id: 'torque', label: 'Torque / Torque Pro-style CSV', evidence: 'Device Time header with a sensor column; header heuristic, not verified exporter identity.', timeConventions: 'Device Time/GPS Time: ISO or clock strings; localized/epoch forms require explicit supported interpretation.', unitConventions: 'Units enclosed in parentheses; no unit inferred solely from exporter.', quirks: 'Duplicate/custom PID labels retained; combined boost/vacuum stays custom.', matches: h => h.some(s => /^device time$/i.test(s.trim())), aliases: { 'engine coolant temp': 'Coolant temperature', 'short term fuel trim bank 1': 'STFT Bank 1', 'short term fuel trim bank 2': 'STFT Bank 2' } },
  { id: 'forscan', label: 'FORScan-style CSV', evidence: 'time(ms) plus an RPM channel; recognizable but nonexclusive header convention.', timeConventions: 'Explicit time(ms) → elapsed milliseconds.', unitConventions: 'Parenthesized units; 1/min is RPM. No default units for bare abbreviations.', quirks: 'CSV/TSV only, not FSL; metadata preambles and separate units rows unsupported.', matches: h => h.some(s => /^time\s*\(ms\)$/i.test(s.trim())) && h.some(s => /^rpm(?:[([]|$)/i.test(s.trim())), aliases: { 'vss': 'Vehicle speed', 'shrtft1': 'STFT Bank 1', 'shrtft2': 'STFT Bank 2', 'longft1': 'LTFT Bank 1', 'longft2': 'LTFT Bank 2', 'tp': 'Throttle position', 'app': 'Accelerator position', 'sparkadv': 'Ignition timing', 'o2s11': 'O2 B1 S1', 'o2s12': 'O2 B1 S2', 'o2s21': 'O2 B2 S1', 'o2s22': 'O2 B2 S2' } },
  { id: 'obd-fusion', label: 'OBD Fusion-style candidate', evidence: 'Time (sec) / SAE-style sensor labels; also possible in generic logs. Review mappings.', timeConventions: 'Time (sec)/(seconds) → seconds when explicitly stated.', unitConventions: 'Header units only; no defaults from vehicle type.', quirks: 'Representative convention only; no claim of all OBD Fusion versions.', matches: h => h.some(s => /^time\s*\((sec|seconds)\)$/i.test(s.trim())) && h.some(s => /^(engine rpm|engine speed|short term fuel trim|absolute throttle position)/i.test(s.trim())), aliases: { 'short term fuel trim bank 1': 'STFT Bank 1', 'short term fuel trim bank 2': 'STFT Bank 2', 'long term fuel trim bank 1': 'LTFT Bank 1', 'long term fuel trim bank 2': 'LTFT Bank 2' } },
  { id: 'generic', label: 'Generic CSV / TSV', evidence: 'No distinctive exporter header convention; conservative shared aliases only.', timeConventions: 'Explicit seconds/milliseconds, ISO or HH:MM:SS. Bare numeric time remains unresolved.', unitConventions: 'Parentheses or brackets; missing units stay unknown.', quirks: 'One header record, constant record width; custom columns retained.', matches: () => true, aliases: {} },
];
export const detectExporter = (headers: string[]) => exporterAdapters.find(a => a.matches(headers))!;
export function detectColumn(header: string, adapter: ExporterAdapter) {
  const original = identify(header), match = header.match(/(?:\(([^()]*)\)|\[([^\[\]]*)\])\s*$/);
  const name = (match ? header.slice(0, match.index) : header).trim().toLowerCase();
  const alias = adapter.aliases[name];
  const unit = canonicalUnit(original.originalUnit);
  const detected = alias ? identify(`${alias}${unit ? ` (${unit})` : ''}`) : unit && unit !== original.originalUnit ? identify(`${match ? header.slice(0, match.index) : header} (${unit})`) : original;
  return { ...detected, originalUnit: original.originalUnit, sourceUnit: unit, reason: alias ? `AUTO: ${adapter.label} alias “${name}”` : detected.identity ? `AUTO: exact known alias${!detected.ambiguity ? ' + compatible unit' : '; unit unresolved'}` : 'CUSTOM: no unambiguous known alias' };
}
export function detectedTime(header: string) {
  const kind = timeKind(header);
  return kind === 's' || kind === 'ms' ? kind : kind === 'date' || kind === 'unspecified' ? 'auto' : null;
}
