type Rule = { pattern: RegExp; identity: string; unit: string };
// Deliberately conservative aliases. No manufacturer PID numbers without a namespace.
const rules: Rule[] = [
  { pattern: /^(engine rpm|engine speed|rpm)$/, identity: 'rpm', unit: 'RPM' },
  { pattern: /^(vehicle speed|speed|speed \(obd\))$/, identity: 'speed', unit: 'km/h' },
  { pattern: /^(throttle position|absolute throttle position|throttle)$/, identity: 'throttle', unit: '%' },
  { pattern: /^(accelerator position|accelerator pedal position|app)$/, identity: 'accelerator', unit: '%' },
  { pattern: /^(engine coolant temperature|coolant temperature|coolant|ect)$/, identity: 'coolant', unit: '°C' },
  { pattern: /^(intake air temperature|intake air temp|iat)$/, identity: 'intake-temperature', unit: '°C' },
  { pattern: /^(mass air flow|mass air flow rate|mass air flow rate sensor|maf)$/, identity: 'maf', unit: 'g/s' },
  { pattern: /^(intake manifold absolute pressure|manifold absolute pressure|map)$/, identity: 'map-absolute', unit: 'kPa' },
  { pattern: /^(boost pressure|boost|gauge pressure)$/, identity: 'boost-gauge', unit: 'kPa' },
  { pattern: /^(fuel pressure)$/, identity: 'fuel-pressure-unspecified', unit: 'kPa' },
  { pattern: /^(timing advance|ignition timing|timing advance for #1 cylinder)$/, identity: 'timing', unit: '°' },
  { pattern: /^(engine load|calculated engine load|calculated load value)$/, identity: 'load', unit: '%' },
  { pattern: /^(battery voltage|control module voltage|voltage|vbat)$/, identity: 'voltage', unit: 'V' },
  { pattern: /^(fuel level|fuel level input)$/, identity: 'fuel-level', unit: '%' },
  { pattern: /^(commanded equivalence ratio|commanded eq ratio)$/, identity: 'commanded-equivalence', unit: 'ratio' },
  { pattern: /^lambda$/, identity: 'lambda', unit: 'ratio' },
  { pattern: /^(afr|air fuel ratio|air\/fuel ratio)$/, identity: 'afr', unit: 'ratio' },
];
const units: Record<string, string> = { 'c': '°C', '°c': '°C', 'degc': '°C', 'f': '°F', '°f': '°F', 'degf': '°F', 'km/h': 'km/h', 'kph': 'km/h', 'kmh': 'km/h', 'mph': 'mph', 'rpm': 'RPM', 'kpa': 'kPa', 'psi': 'psi', 'bar': 'bar', 'g/s': 'g/s', 'g/sec': 'g/s', '%': '%', 'v': 'V', 'volts': 'V', '°': '°', 'deg': '°', 'ratio': 'ratio' };
export function identify(header: string) {
  const match = header.match(/(?:\(([^()]*)\)|\[([^\[\]]*)\])\s*$/);
  let originalUnit: string | null = match ? (match[1] ?? match[2]).trim() : null;
  let name = match ? header.slice(0, match.index).trim() : header.trim();
  // RPM is also a complete, explicit unit-bearing signal name.
  if (/^rpm$/i.test(name) && !originalUnit) originalUnit = 'RPM';
  name = name.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  let rule = rules.find(r => r.pattern.test(name));
  const trim = name.match(/^(stft|ltft|short term fuel trim|long term fuel trim)(?:\s*(?:bank|b)\s*([12]))?$/);
  if (trim) rule = { pattern: /^$/, identity: `${/^(stft|short)/.test(trim[1]) ? 'stft' : 'ltft'}-bank-${trim[2] ?? 'unspecified'}`, unit: '%' };
  const oxygen = name.match(/^(?:o2|oxygen sensor)(?: voltage)?\s*(?:bank|b)\s*([12])\s*(?:sensor|s)\s*([1-4])$/);
  if (oxygen) rule = { pattern: /^$/, identity: `o2-voltage-b${oxygen[1]}s${oxygen[2]}`, unit: 'V' };
  const sourceUnit = originalUnit ? units[originalUnit.toLowerCase().replace(/\s/g, '')] ?? null : null;
  let convert = (v: number) => v;
  let unit = sourceUnit ?? originalUnit;
  let ambiguity: string | null = null;
  if (rule) {
    if (sourceUnit === rule.unit) unit = rule.unit;
    else if (rule.unit === 'km/h' && sourceUnit === 'mph') { unit = 'km/h'; convert = v => v * 1.609344; }
    else if (rule.unit === '°C' && sourceUnit === '°F') { unit = '°C'; convert = v => (v - 32) * 5 / 9; }
    else if (rule.unit === 'kPa' && (sourceUnit === 'psi' || sourceUnit === 'bar')) { unit = 'kPa'; convert = v => v * (sourceUnit === 'psi' ? 6.894757293 : 100); }
    else ambiguity = originalUnit ? `Unit “${originalUnit}” is incompatible or unsupported; values retained without conversion.` : 'Unit not stated; values retained without conversion.';
  } else if (!originalUnit) ambiguity = 'Unknown signal and unit; values retained as supplied.';
  return { identity: rule?.identity ?? null, originalUnit, unit, ambiguity, convert };
}
