/** Pure, nonnegative shaft-output exploration. No vehicle model or rating standard.
 * Derivation: work = torque * angle; P = d(work)/dt = torque * angular velocity.
 * One revolution = 2*pi rad; one minute = 60 s; omega = RPM * 2*pi/60.
 * BIPM SI Brochure, tables 4/6/8 and section 2.3.4 (angular vs cyclic frequency):
 * https://www.bipm.org/documents/20126/41483022/SI-Brochure-9.pdf
 * NIST SP 811 (2008), B.6 and B.8, foot, pound-force footnote 23, horsepower:
 * https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication811e2008.pdf
 * International foot = 0.3048 m exactly; lbf = 4.4482216152605 N exactly.
 * Mechanical hp = 550 ft*lbf/s. Metric PS = 75 kgf*m/s = 735.49875 W,
 * a different unit, intentionally unsupported. Definitions are exact; JS numbers
 * and Math.PI approximate them in binary64. Never use rounded 5252/9549 internally.
 */
export const NM_PER_LB_FT = 0.3048 * 4.4482216152605;
export const WATTS_PER_MECHANICAL_HP = 550 * NM_PER_LB_FT;
export const RADIANS_PER_SECOND_PER_RPM = 2 * Math.PI / 60;

export type TorqueUnit = 'Nm' | 'lb-ft';
export type PowerUnit = 'kW' | 'hp';
/** Product bounds, not engine capability/safety limits. Canonical SI bounds apply
 * identically to inputs and results regardless of the displayed units.
 */
export const TORQUE_POWER_LIMITS = Object.freeze({ rpm: 100_000, torqueNm: 1_000_000, powerWatts: 20_000_000_000 });
// Reject subnormal nonzero inputs/results: their reduced precision can turn a
// meaningful conversion into zero or introduce large relative rounding errors.
const MIN_NORMAL = 2 ** -1022;
export type InputField = 'rpm' | 'torque' | 'power' | 'torqueUnit' | 'powerUnit' | 'rows' | 'text';
export type TorquePowerErrorCode = 'missing' | 'number' | 'range' | 'unit' | 'undefined' | 'precision' | 'count' | 'format' | 'duplicate' | 'order';
export class TorquePowerError extends Error {
  constructor(public readonly code: TorquePowerErrorCode, public readonly field: InputField, message: string, public readonly row?: number) {
    super(row === undefined ? message : `Row ${row}: ${message}`);
    this.name = 'TorquePowerError';
  }
}

export interface TorquePointInput { readonly rpm: number; readonly torque: number; readonly torqueUnit: TorqueUnit }
export interface PowerPointInput { readonly rpm: number; readonly power: number; readonly powerUnit: PowerUnit }
/** All values stay unrounded; suitable for plot coordinates and text summaries. */
export interface TorquePowerPoint { rpm: number; torqueNm: number; torqueLbFt: number; powerKw: number; powerHp: number }

function torqueUnit(unit: TorqueUnit): void {
  if (unit !== 'Nm' && unit !== 'lb-ft') throw new TorquePowerError('unit', 'torqueUnit', 'Choose Nm or lb-ft.');
}
function powerUnit(unit: PowerUnit): void {
  if (unit !== 'kW' && unit !== 'hp') throw new TorquePowerError('unit', 'powerUnit', 'Choose kW or mechanical hp; metric PS is not supported.');
}
function bounded(value: number, field: InputField, max: number, unit: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TorquePowerError('number', field, `Enter a finite ${field} number.`);
  if (value < 0 || value > max) throw new TorquePowerError('range', field, `${field} must be between 0 and ${max} ${unit}.`);
  representable(value, value > 0, field);
  return value === 0 ? 0 : value; // Canonicalize negative zero.
}
function representable(value: number, positive: boolean, field: InputField): number {
  if (!Number.isFinite(value) || positive && value < MIN_NORMAL) throw new TorquePowerError('precision', field, `The ${field} value cannot be represented reliably. Use less extreme values.`);
  return value === 0 ? 0 : value;
}
/** Arithmetic at a valid upper boundary may overshoot by a few binary64 ULPs.
 * Clamp only that roundoff (4*epsilon relative), never out-of-range user inputs.
 */
function calculatedBound(value: number, field: InputField, max: number, unit: string): number {
  if (value > max && value <= max + max * Number.EPSILON * 4) return max;
  return bounded(value, field, max, unit);
}
function toNm(value: number, unit: TorqueUnit): number {
  torqueUnit(unit);
  bounded(value, 'torque', TORQUE_POWER_LIMITS.torqueNm / (unit === 'lb-ft' ? NM_PER_LB_FT : 1), unit);
  return calculatedBound(representable(unit === 'Nm' ? value : value * NM_PER_LB_FT, value > 0, 'torque'), 'torque', TORQUE_POWER_LIMITS.torqueNm, 'Nm');
}
function toWatts(value: number, unit: PowerUnit): number {
  powerUnit(unit);
  const factor = unit === 'kW' ? 1000 : WATTS_PER_MECHANICAL_HP;
  bounded(value, 'power', TORQUE_POWER_LIMITS.powerWatts / factor, unit);
  return calculatedBound(representable(value * factor, value > 0, 'power'), 'power', TORQUE_POWER_LIMITS.powerWatts, 'W');
}
export function convertTorque(value: number, from: TorqueUnit, to: TorqueUnit): number {
  torqueUnit(to);
  const nm = toNm(value, from);
  if (from === to) return value === 0 ? 0 : value;
  return representable(to === 'Nm' ? nm : nm / NM_PER_LB_FT, value > 0, 'torque');
}
export function convertPower(value: number, from: PowerUnit, to: PowerUnit): number {
  powerUnit(to);
  const watts = toWatts(value, from);
  if (from === to) return value === 0 ? 0 : value;
  return representable(watts / (to === 'kW' ? 1000 : WATTS_PER_MECHANICAL_HP), value > 0, 'power');
}
function output(rpm: number, nm: number, watts: number): TorquePowerPoint {
  nm = calculatedBound(nm, 'torque', TORQUE_POWER_LIMITS.torqueNm, 'Nm');
  watts = calculatedBound(watts, 'power', TORQUE_POWER_LIMITS.powerWatts, 'W');
  return { rpm, torqueNm: nm, torqueLbFt: representable(nm / NM_PER_LB_FT, nm > 0, 'torque'), powerKw: representable(watts / 1000, watts > 0, 'power'), powerHp: representable(watts / WATTS_PER_MECHANICAL_HP, watts > 0, 'power') };
}
/** Zero RPM always gives zero power for any supported torque (including zero). */
export function powerFromTorque(input: TorquePointInput): TorquePowerPoint {
  const rpm = bounded(input.rpm, 'rpm', TORQUE_POWER_LIMITS.rpm, 'RPM'), nm = toNm(input.torque, input.torqueUnit);
  // Multiply torque by RPM first so tiny RPM does not prematurely underflow.
  const watts = representable(nm * rpm * RADIANS_PER_SECOND_PER_RPM, nm > 0 && rpm > 0, 'power');
  return output(rpm, nm, watts);
}
/** At zero RPM inverse torque is undefined even when power is zero (0/0). */
export function torqueFromPower(input: PowerPointInput): TorquePowerPoint {
  const rpm = bounded(input.rpm, 'rpm', TORQUE_POWER_LIMITS.rpm, 'RPM'), watts = toWatts(input.power, input.powerUnit);
  if (rpm === 0) throw new TorquePowerError('undefined', 'rpm', 'Torque from power is undefined at zero RPM. Enter RPM greater than zero.');
  // Divide by RPM before the angular factor to avoid underflow in rpm * factor.
  const nm = representable(watts / rpm / RADIANS_PER_SECOND_PER_RPM, watts > 0, 'torque');
  return output(rpm, nm, watts);
}

/** Explicit decimal grammar shared by point forms and editable curve rows:
 * dot decimals and e/E notation, surrounding whitespace, optional sign.
 * No grouping, decimal commas, unit suffixes, hex, expressions or coercion.
 */
export function parseNumericInput(text: string, field: 'rpm' | 'torque' | 'power', row?: number): number {
  if (typeof text !== 'string') throw new TorquePowerError('number', field, 'Enter a numeric text value.', row);
  const token = text.trim();
  if (!token) throw new TorquePowerError('missing', field, `Enter ${field}; an empty value is not zero.`, row);
  if (token.length > 64 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(token)) throw new TorquePowerError('number', field, `Use a dot decimal for ${field}, optionally with e notation, without grouping or units.`, row);
  const value = Number(token);
  if (!Number.isFinite(value)) throw new TorquePowerError('number', field, `Enter a finite ${field}; this value overflows.`, row);
  if (value !== 0 && Math.abs(value) < MIN_NORMAL || value === 0 && /[1-9]/.test(token.split(/[eE]/)[0])) throw new TorquePowerError('precision', field, `${field} is too small to represent reliably. Use a less extreme value.`, row);
  return value === 0 ? 0 : value;
}
