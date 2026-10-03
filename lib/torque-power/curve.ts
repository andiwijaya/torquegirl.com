import { powerFromTorque, parseNumericInput, TorquePowerError, type TorquePointInput, type TorquePowerPoint, type TorqueUnit } from './math';

export const CURVE_LIMITS = Object.freeze({ minPoints: 2, maxPoints: 200, textCharacters: 32_000, physicalLines: 1000 });
export interface CurveRow { readonly rpm: string; readonly torque: string }
export type CurveDelimiter = ',' | ';' | '\t';
export interface ParsedCurve { points: TorquePointInput[]; delimiter: CurveDelimiter }
/** value is in Nm for torque peaks and kW for power peaks. Equal binary64 maxima
 * use the first (lowest RPM) sample; all exactly tied RPMs are supplied for prose.
 * No tolerance merges distinct values. No interpolated/estimated peak is returned.
 */
export interface SampledPeak { value: number; rpm: number; index: number; tiedRpms: number[] }
export interface CalculatedCurve { points: TorquePowerPoint[]; peakTorque: SampledPeak; peakPower: SampledPeak }

function count(rows: readonly unknown[]): void {
  if (!Array.isArray(rows) || rows.length < CURVE_LIMITS.minPoints || rows.length > CURVE_LIMITS.maxPoints) throw new TorquePowerError('count', 'rows', 'Provide 2 to 200 RPM/torque points; nothing was calculated.');
}
function ordering(rpm: number, previous: number | undefined, seen: Set<number>, row: number): void {
  if (seen.has(rpm)) throw new TorquePowerError('duplicate', 'rpm', 'Duplicate RPM. Keep one torque point per RPM; no values are overwritten.', row);
  if (previous !== undefined && rpm < previous) throw new TorquePowerError('order', 'rpm', 'RPM must increase strictly. Reorder the rows by RPM; no rows are sorted automatically.', row);
  seen.add(rpm);
}
function atRow<T>(row: number, task: () => T): T {
  try { return task(); } catch (error) {
    if (error instanceof TorquePowerError && error.row === undefined) throw new TorquePowerError(error.code, error.field, error.message, row);
    throw error;
  }
}
function parseRows(rows: readonly CurveRow[], unit: TorqueUnit, lineNumbers?: readonly number[]): TorquePointInput[] {
  count(rows);
  let previous: number | undefined;
  const seen = new Set<number>();
  return Array.from(rows, (row, index) => atRow(lineNumbers?.[index] ?? index + 1, () => {
    if (!row || typeof row !== 'object') throw new TorquePowerError('format', 'rows', 'Provide both RPM and torque cells.');
    const point: TorquePointInput = { rpm: parseNumericInput(row.rpm, 'rpm'), torque: parseNumericInput(row.torque, 'torque'), torqueUnit: unit };
    // Use the same domain/precision rules as the point calculator.
    powerFromTorque(point);
    ordering(point.rpm, previous, seen, lineNumbers?.[index] ?? index + 1); previous = point.rpm;
    return point;
  }));
}
/** Every editable row counts; blank/incomplete rows require correction/removal. */
export function parseCurveRows(rows: readonly CurveRow[], torqueUnit: TorqueUnit): TorquePointInput[] {
  return parseRows(rows, torqueUnit);
}
/** Deliberately small unquoted two-column format. Auto detects comma/semicolon/tab
 * from the first nonblank line, or caller chooses one. Optional exact RPM,Torque
 * header (case insensitive), one leading BOM, LF/CRLF/CR, blank lines ignored.
 * Always dot decimal. Unit comes from the control, never guessed from pasted text.
 * Errors retain physical line numbers, including ignored blanks and the header.
 */
export function parseCurveText(text: string, torqueUnit: TorqueUnit, delimiter?: CurveDelimiter): ParsedCurve {
  if (typeof text !== 'string') throw new TorquePowerError('format', 'text', 'Paste two columns of RPM and torque.');
  if (text.length > CURVE_LIMITS.textCharacters) throw new TorquePowerError('count', 'text', 'Paste at most 32,000 characters.');
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  if (lines.length > CURVE_LIMITS.physicalLines) throw new TorquePowerError('count', 'text', 'Paste at most 1,000 physical lines, including blank lines.');
  if (delimiter !== undefined && delimiter !== ',' && delimiter !== ';' && delimiter !== '\t') throw new TorquePowerError('format', 'text', 'Choose comma, semicolon or tab as the delimiter.');
  const first = lines.find(line => line.trim());
  if (!first) throw new TorquePowerError('count', 'rows', 'Provide 2 to 200 RPM/torque points.');
  const candidates = ([',', ';', '\t'] as const).filter(d => first.includes(d));
  const selected = delimiter ?? (candidates.length === 1 ? candidates[0] : undefined);
  if (!selected) throw new TorquePowerError('format', 'text', 'Use one consistent comma, semicolon or tab delimiter between RPM and torque.');
  const rows: CurveRow[] = [], lineNumbers: number[] = [];
  let firstRecord = true;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]; if (!line.trim()) continue;
    const cells = line.split(selected).map(cell => cell.trim());
    if (cells.length !== 2) throw new TorquePowerError('format', 'rows', 'Expected exactly two unquoted columns: RPM and torque. Use dot decimals, no grouping, and the same delimiter on every row.', i + 1);
    if (firstRecord && cells[0].toLowerCase() === 'rpm' && cells[1].toLowerCase() === 'torque') { firstRecord = false; continue; }
    firstRecord = false;
    rows.push({ rpm: cells[0], torque: cells[1] }); lineNumbers.push(i + 1);
    if (rows.length > CURVE_LIMITS.maxPoints) throw new TorquePowerError('count', 'rows', 'Provide at most 200 points; remove extra rows.', i + 1);
  }
  return { points: parseRows(rows, torqueUnit, lineNumbers), delimiter: selected };
}
function peak(points: readonly TorquePowerPoint[], field: 'torqueNm' | 'powerKw'): SampledPeak {
  let index = 0;
  for (let i = 1; i < points.length; i++) if (points[i][field] > points[index][field]) index = i;
  const value = points[index][field];
  return { value, rpm: points[index].rpm, index, tiedRpms: points.filter(p => p[field] === value).map(p => p.rpm) };
}
/** Ordered supplied samples only. Mixed units are supported explicitly per point.
 * No resampling, smoothing, extrapolation, engine prediction, or input mutation.
 */
export function calculateCurve(inputs: readonly TorquePointInput[]): CalculatedCurve {
  count(inputs);
  let previous: number | undefined;
  const seen = new Set<number>();
  const points = Array.from(inputs, (input, index) => atRow(index + 1, () => {
    if (!input || typeof input !== 'object') throw new TorquePowerError('format', 'rows', 'Provide RPM, torque and its unit for each point.');
    const point = powerFromTorque(input);
    ordering(point.rpm, previous, seen, index + 1); previous = point.rpm;
    return point;
  }));
  return { points, peakTorque: peak(points, 'torqueNm'), peakPower: peak(points, 'powerKw') };
}

/** Educational synthetic values, not measured data or a model of any engine.
 * Sampled torque peaks at 3500 RPM; sampled power peaks at 6000 RPM.
 */
export const SYNTHETIC_CURVE = Object.freeze({
  label: 'Synthetic educational curve - not measured engine capability',
  points: Object.freeze([
    [1000, 120], [2000, 180], [3000, 220], [3500, 230],
    [4000, 225], [5000, 210], [6000, 190], [7000, 150],
  ].map(([rpm, torque]) => Object.freeze({ rpm, torque, torqueUnit: 'Nm' as const }))),
});
