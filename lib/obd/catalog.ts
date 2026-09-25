import { identify } from './signals';

export interface SignalDefinition { id: string; label: string; unit: string; units: string[] }
const definition = (id: string, label: string, unit: string, units = [unit]): SignalDefinition => ({ id, label, unit, units });
export const signalCatalog: SignalDefinition[] = [
  definition('rpm', 'Engine RPM', 'RPM'), definition('speed', 'Vehicle speed', 'km/h', ['km/h', 'mph']),
  definition('throttle', 'Throttle position', '%'), definition('accelerator', 'Accelerator pedal position', '%'),
  definition('coolant', 'Coolant temperature', '°C', ['°C', '°F']), definition('intake-temperature', 'Intake-air temperature', '°C', ['°C', '°F']),
  ...['stft', 'ltft'].flatMap(kind => ['1', '2', 'unspecified'].map(bank => definition(`${kind}-bank-${bank}`, `${kind.toUpperCase()} · bank ${bank}`, '%'))),
  definition('maf', 'Mass air flow', 'g/s'),
  definition('map-absolute', 'MAP · absolute pressure', 'kPa', ['kPa', 'psi', 'bar']),
  definition('boost-gauge', 'Boost · gauge pressure', 'kPa', ['kPa', 'psi', 'bar']),
  ...['absolute', 'gauge', 'differential', 'unspecified'].map(reference => definition(`fuel-pressure-${reference}`, `Fuel pressure · ${reference} reference`, 'kPa', ['kPa', 'psi', 'bar'])),
  ...[1, 2].flatMap(bank => [1, 2, 3, 4].map(sensor => definition(`o2-voltage-b${bank}s${sensor}`, `O2 voltage · bank ${bank} / sensor ${sensor}`, 'V'))),
  definition('lambda', 'Lambda (explicit ratio)', 'ratio'), definition('afr', 'Air/fuel ratio (explicit)', 'ratio'),
  definition('commanded-equivalence', 'Commanded equivalence ratio', 'ratio'), definition('timing', 'Ignition timing', '°'),
  definition('load', 'Calculated engine load', '%'), definition('voltage', 'Battery / module voltage', 'V'), definition('fuel-level', 'Fuel level', '%'),
];
export const unitOptions = ['RPM', 'km/h', 'mph', '°C', '°F', 'kPa', 'psi', 'bar', 'g/s', '%', 'V', '°', 'ratio'];
export function canonicalUnit(unit: string | null): string | null {
  if (!unit) return null;
  if (/^(1\/min|rev\/min)$/i.test(unit)) return 'RPM';
  return identify(`Custom (${unit})`).unit;
}
export function dimension(unit: string | null): string | null {
  const u = canonicalUnit(unit);
  return u === null ? null : ['km/h', 'mph'].includes(u) ? 'speed' : ['°C', '°F'].includes(u) ? 'temperature' : ['kPa', 'psi', 'bar'].includes(u) ? 'pressure' : unitOptions.includes(u) ? u : null;
}
export function interpretation(identity: string | null, unit: string | null) {
  const target = signalCatalog.find(s => s.id === identity), source = canonicalUnit(unit);
  if (target && source && !target.units.includes(source)) throw new Error(`Unit ${source} is incompatible with ${target.label}.`);
  const convert = (v: number) => source === 'mph' && target?.unit === 'km/h' ? v * 1.609344 : source === '°F' && target?.unit === '°C' ? (v - 32) * 5 / 9 : source === 'psi' && target?.unit === 'kPa' ? v * 6.894757293 : source === 'bar' && target?.unit === 'kPa' ? v * 100 : v;
  return { unit: target && source ? target.unit : source, ambiguity: target && !source ? 'Unit unresolved; native values only, no conversion.' : !target ? 'Custom signal; no physical identity inferred.' : null, convert };
}
