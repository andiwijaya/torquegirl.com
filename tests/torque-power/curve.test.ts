import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCurve, CURVE_LIMITS, parseCurveRows, parseCurveText, SYNTHETIC_CURVE, type CurveDelimiter, type CurveRow } from '../../lib/torque-power/curve';
import { TorquePowerError, type TorquePointInput, type TorquePowerErrorCode } from '../../lib/torque-power/math';

const error = (code: TorquePowerErrorCode, row?: number, field?: string) => (e: unknown) => e instanceof TorquePowerError && e.code === code && (row === undefined || e.row === row) && (!field || e.field === field);
const point = (rpm: number, torque: number): TorquePointInput => ({ rpm, torque, torqueUnit: 'Nm' });
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * 2e-14, `${actual} != ${expected}`);

test('two-point calculation produces both traces and numeric peaks from supplied samples', () => {
  const curve = calculateCurve([point(1000, 200), point(4000, 150)]);
  close(curve.points[0].powerKw, 20.943951023931955);
  close(curve.points[1].powerKw, 62.831853071795864);
  assert.deepEqual(curve.peakTorque, { value: 200, rpm: 1000, index: 0, tiedRpms: [1000] });
  close(curve.peakPower.value, 62.831853071795864);
  assert.equal(curve.peakPower.rpm, 4000); assert.equal(curve.peakPower.index, 1);
});

test('synthetic curve deliberately demonstrates peak torque and power at different RPM', () => {
  const curve = calculateCurve(SYNTHETIC_CURVE.points);
  assert.match(SYNTHETIC_CURVE.label, /Synthetic.*not measured/);
  assert.equal(curve.points.length, 8);
  assert.equal(curve.peakTorque.rpm, 3500); assert.equal(curve.peakTorque.value, 230);
  assert.equal(curve.peakPower.rpm, 6000); close(curve.peakPower.value, 119.38052083641214);
  assert.ok(Object.isFrozen(SYNTHETIC_CURVE.points[0]));
});

test('flat torque ties choose lowest supplied RPM and expose every tie', () => {
  const curve = calculateCurve([point(1000, 100), point(2000, 100), point(3000, 50)]);
  assert.deepEqual(curve.peakTorque, { value: 100, rpm: 1000, index: 0, tiedRpms: [1000, 2000] });
  assert.equal(curve.peakPower.rpm, 2000);
});

test('equal torque*RPM power ties choose lowest RPM without interpolation', () => {
  const curve = calculateCurve([point(1000, 300), point(2000, 150), point(3000, 100)]);
  assert.equal(curve.peakPower.index, 0); assert.equal(curve.peakPower.rpm, 1000);
  assert.deepEqual(curve.peakPower.tiedRpms, [1000, 2000, 3000]);
  close(curve.peakPower.value, 31.415926535897932);
  assert.deepEqual(curve.points.map(p => p.rpm), [1000, 2000, 3000]);
});

test('ties use actual numeric equality; distinct near values are not merged', () => {
  const curve = calculateCurve([point(1000, 100), point(2000, 100 + 1e-10)]);
  assert.deepEqual(curve.peakTorque.tiedRpms, [2000]); assert.equal(curve.peakTorque.index, 1);
});

test('zero RPM and all-zero torque curves remain valid with deterministic peaks', () => {
  const curve = calculateCurve([point(0, 0), point(1000, 0), point(2000, 0)]);
  assert.deepEqual(curve.peakPower, { value: 0, rpm: 0, index: 0, tiedRpms: [0, 1000, 2000] });
  assert.deepEqual(curve.peakTorque, curve.peakPower);
  assert.equal(calculateCurve([point(0, 500), point(1000, 10)]).peakTorque.rpm, 0);
});

test('numeric points can mix Nm and lb-ft without altering source data or order', () => {
  const inputs = Object.freeze([Object.freeze(point(1000, 200)), Object.freeze({ rpm: 2000, torque: 100, torqueUnit: 'lb-ft' as const })]);
  const before = JSON.stringify(inputs), curve = calculateCurve(inputs);
  close(curve.points[1].torqueNm, 135.58179483314004);
  close(curve.points[1].powerHp, 38.07991095260355);
  assert.equal(curve.peakTorque.rpm, 1000); assert.equal(curve.peakPower.rpm, 2000);
  curve.points[0].torqueNm = 0; assert.equal(JSON.stringify(inputs), before);
});

test('all comma/semicolon/tab paste formats share dot decimals and optional header', () => {
  for (const delimiter of [',', ';', '\t'] as const) for (const header of ['', ` RPM${delimiter}Torque \r\n`]) {
    const parsed = parseCurveText(`${header}1000.5${delimiter}200.25\r\n2000${delimiter}180`, 'lb-ft');
    assert.equal(parsed.delimiter, delimiter);
    assert.deepEqual(parsed.points, [{ rpm: 1000.5, torque: 200.25, torqueUnit: 'lb-ft' }, { rpm: 2000, torque: 180, torqueUnit: 'lb-ft' }]);
    assert.equal(calculateCurve(parsed.points).points.length, 2);
  }
});

test('BOM, blank lines and LF/CR/CRLF preserve physical line references', () => {
  for (const newline of ['\n', '\r', '\r\n']) {
    const text = ['\uFEFF', 'rpm,torque', '', '1000,100', '2000,', ''].join(newline);
    assert.throws(() => parseCurveText(text, 'Nm'), error('missing', 5, 'torque'));
  }
  assert.equal(parseCurveText('\uFEFF\nRPM,TORQUE\n1000,100\n\n2000,200\n', 'Nm').points.length, 2);
});

test('editable rows use the same grammar and calculation validation, with no blank-row skipping', () => {
  const rows = Object.freeze([Object.freeze({ rpm: '1e3', torque: '.5' }), Object.freeze({ rpm: ' 2e3 ', torque: '0' })]);
  assert.deepEqual(parseCurveRows(rows, 'Nm'), [point(1000, 0.5), point(2000, 0)]);
  assert.throws(() => parseCurveRows([{ rpm: '1000', torque: '1' }, { rpm: '', torque: '' }], 'Nm'), error('missing', 2, 'rpm'));
  assert.throws(() => parseCurveRows([{ rpm: '1000', torque: '1' }, { rpm: '2000', torque: '1,5' }], 'Nm'), error('number', 2, 'torque'));
});

test('duplicate and descending RPM fail in numeric, editable and pasted input without sorting/overwriting', () => {
  for (const [rpms, code, row] of [[[1000, 1000], 'duplicate', 2], [[1000, 2000, 1000], 'duplicate', 3], [[2000, 1000], 'order', 2]] as const) {
    const numeric = rpms.map(rpm => point(rpm, 100));
    assert.throws(() => calculateCurve(numeric), error(code, row, 'rpm'));
    assert.throws(() => parseCurveRows(rpms.map(rpm => ({ rpm: String(rpm), torque: '100' })), 'Nm'), error(code, row, 'rpm'));
    assert.throws(() => parseCurveText('RPM,Torque\n' + rpms.map(rpm => `${rpm},100`).join('\n'), 'Nm'), error(code, row + 1, 'rpm'));
    assert.deepEqual(numeric.map(p => p.rpm), rpms);
  }
  assert.throws(() => parseCurveText('1000,100\n1e3,200', 'Nm'), error('duplicate', 2));
  assert.throws(() => calculateCurve([point(-0, 1), point(0, 2)]), error('duplicate', 2));
});

test('missing or extra columns, mixed delimiters and quoted/grouped/locale data are rejected', () => {
  for (const text of ['1000,100\n2000', '1000,100\n2000,180,2', '1000,100\n2000;180', '1000,100\n2000,1,5']) assert.throws(() => parseCurveText(text, 'Nm'), error('format', 2));
  for (const text of ['1000,100\n2000,', '1000,100\n,200']) assert.throws(() => parseCurveText(text, 'Nm'), error('missing', 2));
  for (const text of ['1000;1,5\n2000;100', '1000 100\n2000 100', '1000,100;\n2000,100']) assert.throws(() => parseCurveText(text, 'Nm'), error('format'));
  for (const text of ['1000,100\n"2000",100', 'RPM (rpm),Torque (Nm)\n1000,100', '1000,100\nRPM,Torque']) assert.throws(() => parseCurveText(text, 'Nm'), error('number'));
  assert.throws(() => parseCurveText('1000;100\n2000;100', 'Nm', '|' as CurveDelimiter), error('format'));
  assert.throws(() => parseCurveText('1000;100\n2000;100', 'Nm', ','), error('format', 1));
});

test('domain, nonfinite, underflow and unknown-unit curve errors identify the offending row', () => {
  for (const [bad, code, field] of [[point(-1, 1), 'range', 'rpm'], [point(100_001, 1), 'range', 'rpm'], [point(2000, -1), 'range', 'torque'], [point(2000, 1_000_001), 'range', 'torque'], [point(2000, NaN), 'number', 'torque'], [point(Infinity, 100), 'number', 'rpm'], [{ rpm: 2000, torque: 1, torqueUnit: 'PS' }, 'unit', 'torqueUnit']] as const) {
    assert.throws(() => calculateCurve([point(1000, 100), bad as TorquePointInput]), error(code, 2, field));
  }
  assert.throws(() => parseCurveText('1,100\n2,1e309', 'Nm'), error('number', 2));
  assert.throws(() => parseCurveText('1,100\n2,1e-999', 'Nm'), error('precision', 2));
  assert.throws(() => parseCurveRows([{ rpm: '1e-200', torque: '1e-200' }, { rpm: '1000', torque: '10' }], 'Nm'), error('precision', 1));
});

test('point count accepts exactly 2 and 200 and rejects 0, 1 and 201 across all APIs', () => {
  for (const n of [0, 1, 2, 200, 201]) {
    const inputs = Array.from({ length: n }, (_, i) => point(i, 100));
    const rows = inputs.map(p => ({ rpm: String(p.rpm), torque: String(p.torque) })), text = rows.map(r => `${r.rpm},${r.torque}`).join('\n');
    if (n === 2 || n === 200) {
      assert.equal(calculateCurve(inputs).points.length, n); assert.equal(parseCurveRows(rows, 'Nm').length, n); assert.equal(parseCurveText(text, 'Nm').points.length, n);
    } else {
      assert.throws(() => calculateCurve(inputs), error('count')); assert.throws(() => parseCurveRows(rows, 'Nm'), error('count')); assert.throws(() => parseCurveText(text, 'Nm'), error('count'));
    }
  }
});

test('paste character/physical-line limits are bounded including whitespace, without truncation', () => {
  const base = '1000,100\n2000,100';
  assert.equal(parseCurveText(base + ' '.repeat(CURVE_LIMITS.textCharacters - base.length), 'Nm').points.length, 2);
  assert.throws(() => parseCurveText(base + ' '.repeat(CURVE_LIMITS.textCharacters - base.length + 1), 'Nm'), error('count', undefined, 'text'));
  assert.equal(parseCurveText(base + '\n'.repeat(998), 'Nm').points.length, 2);
  assert.throws(() => parseCurveText(base + '\n'.repeat(999), 'Nm'), error('count', undefined, 'text'));
  assert.throws(() => parseCurveText('RPM,Torque', 'Nm'), error('count'));
});

test('malformed runtime arrays, sparse/missing rows and nonstring cells yield typed errors', () => {
  assert.throws(() => calculateCurve(null as unknown as TorquePointInput[]), error('count'));
  assert.throws(() => calculateCurve(new Array(2)), error('format', 1));
  assert.throws(() => parseCurveRows([undefined, { rpm: '1000', torque: '100' }] as unknown as CurveRow[], 'Nm'), error('format', 1));
  assert.throws(() => parseCurveRows([{ rpm: '1000', torque: '100' }, { rpm: '2000' }] as CurveRow[], 'Nm'), error('number', 2, 'torque'));
  assert.throws(() => parseCurveText(null as unknown as string, 'Nm'), error('format'));
});

test('large supported finite curve remains stable and returns every supplied sample', () => {
  const inputs = Array.from({ length: 200 }, (_, i) => point((i + 1) * 500, 1_000_000));
  const curve = calculateCurve(inputs);
  assert.ok(curve.points.every(p => Object.values(p).every(Number.isFinite)));
  assert.equal(curve.peakTorque.rpm, 500); assert.equal(curve.peakTorque.tiedRpms.length, 200);
  assert.equal(curve.peakPower.rpm, 100_000); close(curve.peakPower.value, 10_471_975.511965977);
});
