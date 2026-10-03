import test from 'node:test';
import assert from 'node:assert/strict';
import { convertPower, convertTorque, NM_PER_LB_FT, parseNumericInput, powerFromTorque, RADIANS_PER_SECOND_PER_RPM, TORQUE_POWER_LIMITS, torqueFromPower, TorquePowerError, WATTS_PER_MECHANICAL_HP, type PowerUnit, type TorqueUnit, type TorquePowerErrorCode } from '../../lib/torque-power/math';

// Fixed expected values computed independently with BigInt fixed-point arithmetic
// and a decimal pi reference, not by importing/replicating production constants.
function close(actual: number, expected: number, relative = 2e-14): void {
  assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * relative, `${actual} != ${expected}`);
}
const error = (code: TorquePowerErrorCode, field?: string) => (e: unknown) => e instanceof TorquePowerError && e.code === code && (!field || e.field === field);

test('exact unit definitions are derived rather than using rounded table constants', () => {
  close(NM_PER_LB_FT, 1.3558179483314004);
  close(WATTS_PER_MECHANICAL_HP, 745.69987158227022);
  close(RADIANS_PER_SECOND_PER_RPM, 0.10471975511965977);
  close(convertTorque(100, 'Nm', 'lb-ft'), 73.75621492772654);
  close(convertPower(1, 'kW', 'hp'), 1.3410220895950279);
});

test('known SI point: 100 Nm at 3000 RPM gives 31.415926535897932 kW', () => {
  const point = powerFromTorque({ rpm: 3000, torque: 100, torqueUnit: 'Nm' });
  close(point.powerKw, 31.415926535897932);
  close(point.powerHp, 42.129451449733733);
  assert.equal(point.torqueNm, 100); assert.equal(point.rpm, 3000);
  assert.ok(Math.abs(point.powerKw - 100 * 3000 / 9549) > 0.0009);
});

test('known imperial point: 200 lb-ft at 4000 RPM gives 152.3196438104142 mechanical hp', () => {
  const point = powerFromTorque({ rpm: 4000, torque: 200, torqueUnit: 'lb-ft' });
  close(point.powerHp, 152.3196438104142);
  close(point.powerKw, 113.58473882888302);
  close(point.torqueNm, 271.16358966628008);
  assert.ok(Math.abs(point.powerHp - 200 * 4000 / 5252) > 0.003);
});

test('SI work per turn checks independently connect energy/time to power', () => {
  // 10 Nm applies 62.83185307179586 J per turn. 60 RPM is one turn/s.
  close(powerFromTorque({ rpm: 60, torque: 10, torqueUnit: 'Nm' }).powerKw, 0.06283185307179586);
  // Doubling turns/s doubles power; zero angular motion transfers zero power.
  close(powerFromTorque({ rpm: 120, torque: 10, torqueUnit: 'Nm' }).powerKw, 0.12566370614359172);
  assert.equal(powerFromTorque({ rpm: 0, torque: 10, torqueUnit: 'Nm' }).powerKw, 0);
});

test('inverse known SI and imperial references support all displayed quantities', () => {
  const si = torqueFromPower({ rpm: 6000, power: 100, powerUnit: 'kW' });
  close(si.torqueNm, 159.15494309189534);
  close(si.powerHp, 134.10220895950279);
  const imperial = torqueFromPower({ rpm: 4000, power: 152.3196438104142, powerUnit: 'hp' });
  close(imperial.torqueLbFt, 200);
  close(imperial.torqueNm, 271.16358966628008);
});

test('mechanical hp differs from metric PS; unsupported units are rejected', () => {
  close(convertPower(1, 'hp', 'kW'), 0.74569987158227022);
  assert.ok(Math.abs(convertPower(1, 'hp', 'kW') - 0.73549875) > 0.01);
  for (const unit of ['PS', 'bhp', 'W', '', null] as unknown as PowerUnit[]) {
    assert.throws(() => torqueFromPower({ rpm: 1000, power: 1, powerUnit: unit }), error('unit', 'powerUnit'));
    assert.throws(() => convertPower(1, 'kW', unit), error('unit'));
  }
  for (const unit of ['ft-lb', 'N m', '', null] as unknown as TorqueUnit[]) {
    assert.throws(() => powerFromTorque({ rpm: 1000, torque: 1, torqueUnit: unit }), error('unit', 'torqueUnit'));
    assert.throws(() => convertTorque(1, 'Nm', unit), error('unit'));
  }
});

test('conversion roundtrips cover small, fractional and large values in both directions', () => {
  for (const value of [0, 1e-100, 0.123456789, 1, 1234.56789, 700_000]) {
    for (const unit of ['Nm', 'lb-ft'] as const) {
      const other = unit === 'Nm' ? 'lb-ft' : 'Nm';
      close(convertTorque(convertTorque(value, unit, other), other, unit), value);
    }
    for (const unit of ['kW', 'hp'] as const) {
      const other = unit === 'kW' ? 'hp' : 'kW';
      close(convertPower(convertPower(value, unit, other), other, unit), value);
    }
  }
});

test('point roundtrip and mixed unit consistency over a broad deterministic grid', () => {
  for (const rpm of [0.001, 60, 999.9, 3000, 6000, 100_000]) for (const torque of [0, 1e-90, 0.125, 100, 700_000]) for (const torqueUnit of ['Nm', 'lb-ft'] as const) {
    const forward = powerFromTorque({ rpm, torque, torqueUnit });
    for (const powerUnit of ['kW', 'hp'] as const) {
      const backward = torqueFromPower({ rpm, power: powerUnit === 'kW' ? forward.powerKw : forward.powerHp, powerUnit });
      close(backward.torqueNm, forward.torqueNm);
      close(backward.torqueLbFt, forward.torqueLbFt);
    }
  }
});

test('zero cases and negative zero are canonical; inverse zero RPM is always undefined', () => {
  for (const torqueUnit of ['Nm', 'lb-ft'] as const) {
    assert.equal(powerFromTorque({ rpm: 0, torque: 100, torqueUnit }).powerKw, 0);
    assert.equal(powerFromTorque({ rpm: 5000, torque: 0, torqueUnit }).powerKw, 0);
    const zero = powerFromTorque({ rpm: -0, torque: -0, torqueUnit });
    for (const value of Object.values(zero)) assert.equal(Object.is(value, -0), false);
  }
  for (const powerUnit of ['kW', 'hp'] as const) {
    assert.equal(torqueFromPower({ rpm: 1000, power: 0, powerUnit }).torqueNm, 0);
    for (const power of [0, 100]) assert.throws(() => torqueFromPower({ rpm: 0, power, powerUnit }), error('undefined', 'rpm'));
  }
});

test('negative, nonfinite and runtime nonnumeric values consistently fail without coercion', () => {
  for (const value of [-1, NaN, Infinity, -Infinity, '100', null, undefined, true] as unknown as number[]) {
    const code = value === -1 ? 'range' : 'number';
    assert.throws(() => powerFromTorque({ rpm: value, torque: 1, torqueUnit: 'Nm' }), error(code, 'rpm'));
    assert.throws(() => torqueFromPower({ rpm: value, power: 1, powerUnit: 'kW' }), error(code, 'rpm'));
    assert.throws(() => convertTorque(value, 'Nm', 'lb-ft'), error(code, 'torque'));
    assert.throws(() => convertPower(value, 'hp', 'kW'), error(code, 'power'));
  }
});

test('canonical physical bounds apply to input and inverse output in either unit', () => {
  const max = powerFromTorque({ rpm: TORQUE_POWER_LIMITS.rpm, torque: TORQUE_POWER_LIMITS.torqueNm, torqueUnit: 'Nm' });
  close(max.powerKw, 10_471_975.511965977);
  assert.throws(() => powerFromTorque({ rpm: 100_001, torque: 1, torqueUnit: 'Nm' }), error('range', 'rpm'));
  assert.throws(() => powerFromTorque({ rpm: 1, torque: 1_000_001, torqueUnit: 'Nm' }), error('range', 'torque'));
  assert.throws(() => convertTorque(800_000, 'lb-ft', 'Nm'), error('range'));
  assert.throws(() => convertPower(20_000_001, 'kW', 'hp'), error('range'));
  assert.throws(() => convertPower(30_000_000, 'hp', 'kW'), error('range'));
  assert.throws(() => torqueFromPower({ rpm: 0.001, power: 1, powerUnit: 'kW' }), error('range', 'torque'));
});

test('extreme finite inputs do not leak overflow or silently become zero', () => {
  assert.throws(() => powerFromTorque({ rpm: Number.MAX_VALUE, torque: Number.MAX_VALUE, torqueUnit: 'Nm' }), error('range'));
  assert.throws(() => torqueFromPower({ rpm: Number.MIN_VALUE, power: 1, powerUnit: 'kW' }), error('precision'));
  assert.throws(() => powerFromTorque({ rpm: 1e-200, torque: 1e-200, torqueUnit: 'Nm' }), error('precision'));
  assert.throws(() => convertTorque(Number.MIN_VALUE, 'Nm', 'lb-ft'), error('precision'));
  assert.throws(() => convertPower(Number.MIN_VALUE, 'hp', 'kW'), error('precision'));
  // Subnormal nonzero inputs/results lose relative precision and are rejected.
  assert.throws(() => powerFromTorque({ rpm: 1e-320, torque: 1_000_000, torqueUnit: 'Nm' }), error('precision'));
  assert.throws(() => powerFromTorque({ rpm: 1e-200, torque: 1e-110, torqueUnit: 'Nm' }), error('precision'));
  const tiny = powerFromTorque({ rpm: 1e-300, torque: 100, torqueUnit: 'Nm' });
  assert.ok(tiny.powerKw > 0 && Number.isFinite(tiny.powerHp));
  close(torqueFromPower({ rpm: 1e-300, power: tiny.powerKw, powerUnit: 'kW' }).torqueNm, 100);
  close(powerFromTorque({ rpm: 1e-100, torque: 1e-100, torqueUnit: 'Nm' }).powerKw, 1.0471975511965977e-204);
});

test('canonical upper-bound roundtrips tolerate arithmetic roundoff while input bounds stay strict', () => {
  for (const rpm of [0.001, 1, 60, 1000, 3000, 6000, 100_000]) {
    const p = powerFromTorque({ rpm, torque: 1_000_000, torqueUnit: 'Nm' });
    close(torqueFromPower({ rpm, power: p.powerHp, powerUnit: 'hp' }).torqueNm, 1_000_000);
  }
  close(convertTorque(convertTorque(1_000_000, 'Nm', 'lb-ft'), 'lb-ft', 'Nm'), 1_000_000);
  close(convertPower(convertPower(20_000_000, 'kW', 'hp'), 'hp', 'kW'), 20_000_000);
  assert.throws(() => convertTorque(1_000_000 + 1e-9, 'Nm', 'lb-ft'), error('range'));
  assert.throws(() => torqueFromPower({ rpm: 0.001, power: 1, powerUnit: 'kW' }), error('range'));
});

test('numeric form grammar deliberately accepts dot decimals, signs, exponents and whitespace', () => {
  for (const [token, expected] of [[' 1000.5 ', 1000.5], ['.5', 0.5], ['1.', 1], ['+2.5e3', 2500], ['-2E-2', -0.02], ['0e999', 0], ['-0', 0]] as const) assert.equal(parseNumericInput(token, 'torque'), expected);
});

test('empty, locale/grouped, expression, malformed and extreme text gives actionable typed errors', () => {
  for (const text of ['', ' \t ']) assert.throws(() => parseNumericInput(text, 'rpm', 7), e => e instanceof TorquePowerError && e.code === 'missing' && e.row === 7 && /Row 7/.test(e.message));
  for (const text of ['1,5', '1,000', '1 000', '100Nm', 'NaN', 'Infinity', '0x10', '1/2', '1e', '--1', '1_000', '"200"', '<script>', '9'.repeat(65)]) assert.throws(() => parseNumericInput(text, 'torque'), error('number'));
  assert.throws(() => parseNumericInput('1e309', 'power'), error('number'));
  assert.throws(() => parseNumericInput('1e-999', 'power'), error('precision'));
  assert.throws(() => parseNumericInput('1e-310', 'power'), error('precision'));
  assert.throws(() => parseNumericInput(null as unknown as string, 'power'), error('number'));
});
