'use client';

import { useEffect, useState, type FormEvent, type PointerEvent } from 'react';
import { convertPower, convertTorque, parseNumericInput, powerFromTorque, torqueFromPower, TorquePowerError, type PowerUnit, type TorqueUnit, type TorquePowerPoint } from '../../lib/torque-power/math';
import { calculateCurve, parseCurveText, SYNTHETIC_CURVE, type CalculatedCurve, type SampledPeak } from '../../lib/torque-power/curve';

function failure(error: unknown): TorquePowerError {
  return error instanceof TorquePowerError ? error : new TorquePowerError('number', 'rows', 'Check your values and try again.');
}
// Keep tiny supported values visible instead of rounding them to a false zero.
function number(value: number): string {
  return value !== 0 && (Math.abs(value) < 0.001 || Math.abs(value) >= 1e7) ? value.toExponential(5) : value.toLocaleString('en-US', { maximumFractionDigits: 6 });
}
const torqueValue = (p: TorquePowerPoint, unit: TorqueUnit) => unit === 'Nm' ? p.torqueNm : p.torqueLbFt;
const powerValue = (p: TorquePowerPoint, unit: PowerUnit) => unit === 'kW' ? p.powerKw : p.powerHp;
const powerLabel = (unit: PowerUnit) => unit === 'hp' ? 'mechanical hp' : 'kW';

function Plot({ points, selected, onSelect, kind, unit }: { points: TorquePowerPoint[]; selected: number; onSelect: (i: number) => void; kind: 'torque' | 'power'; unit: TorqueUnit | PowerUnit }) {
  const left = 70, right = 575, top = 18, bottom = 180;
  const values = points.map(p => kind === 'torque' ? torqueValue(p, unit as TorqueUnit) : powerValue(p, unit as PowerUnit));
  const max = Math.max(...values) || 1, first = points[0].rpm, last = points.at(-1)!.rpm;
  const x = (rpm: number) => left + (rpm - first) / (last - first) * (right - left);
  const y = (value: number) => bottom - value / max * (bottom - top);
  function inspect(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const rpm = first + ((event.clientX - box.left) / box.width * 600 - left) / (right - left) * (last - first);
    let nearest = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(points[i].rpm - rpm) < Math.abs(points[nearest].rpm - rpm)) nearest = i;
    onSelect(nearest);
  }
  return <figure className={`tp-plot tp-plot--${kind}`}><figcaption>{kind === 'torque' ? 'Torque' : 'Power'} vs RPM <span>({unit === 'hp' ? 'mechanical hp' : unit})</span></figcaption>
    <p className="tp-axis">Vertical scale: 0–{number(max)} {unit === 'hp' ? 'mechanical hp' : unit}{values.every(v => v === 0) ? ' (all samples are zero)' : ''}</p>
    <svg viewBox="0 0 600 195" role="img" aria-label={`${kind === 'torque' ? 'Torque' : 'Power'} versus RPM in ${unit}. Inspect supplied samples with the labelled slider below.`} onPointerDown={inspect} onPointerMove={e => { if (e.buttons) inspect(e); }}>
      {[0, 0.5, 1].map(f => <line key={f} x1={left} x2={right} y1={y(max * f)} y2={y(max * f)} className="tp-grid" />)}
      <path className="tp-trace" d={points.map((p, i) => `${i ? 'L' : 'M'}${x(p.rpm)},${y(values[i])}`).join(' ')} />
      {points.map((p, i) => <circle key={p.rpm} cx={x(p.rpm)} cy={y(values[i])} r={i === selected ? 5 : 2.5} className={i === selected ? 'tp-selected' : 'tp-marker'} />)}
      <line x1={x(points[selected].rpm)} x2={x(points[selected].rpm)} y1={top} y2={bottom} className="tp-cursor" />
    </svg><p className="tp-axis">RPM → {number(first)}–{number(last)}</p>
  </figure>;
}

export default function Explorer() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setReady(true); });
    // A cached document must follow the same empty-on-return contract as a
    // fresh document; browser history must not restore private curve inputs.
    const returnToDocument = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener('pageshow', returnToDocument);
    return () => { active = false; window.removeEventListener('pageshow', returnToDocument); };
  }, []);
  const [mode, setMode] = useState<'torque' | 'power'>('torque');
  const [rpm, setRpm] = useState('3000'), [torque, setTorque] = useState('100'), [power, setPower] = useState('100');
  const [torqueUnit, setTorqueUnit] = useState<TorqueUnit>('Nm'), [powerUnit, setPowerUnit] = useState<PowerUnit>('kW');
  const [point, setPoint] = useState<TorquePowerPoint | null>(null), [pointError, setPointError] = useState<TorquePowerError | null>(null);
  const [text, setText] = useState(''), [curveUnit, setCurveUnit] = useState<TorqueUnit>('Nm'), [curvePowerUnit, setCurvePowerUnit] = useState<PowerUnit>('kW');
  const [curve, setCurve] = useState<CalculatedCurve | null>(null), [curveError, setCurveError] = useState<TorquePowerError | null>(null);
  const [selected, setSelected] = useState(0), [synthetic, setSynthetic] = useState(false), [notice, setNotice] = useState('');
  function pointEdit() { setPoint(null); setPointError(null); }
  function submitPoint(event: FormEvent) {
    event.preventDefault();
    try {
      const speed = parseNumericInput(rpm, 'rpm');
      setPoint(mode === 'torque' ? powerFromTorque({ rpm: speed, torque: parseNumericInput(torque, 'torque'), torqueUnit }) : torqueFromPower({ rpm: speed, power: parseNumericInput(power, 'power'), powerUnit }));
      setPointError(null);
    } catch (error) {
      const issue = failure(error); setPoint(null);
      // A calculated output can exceed the domain too. Associate that error with
      // the editable quantity that can correct it, retaining the exact message.
      setPointError(issue.field === 'rpm' ? issue : new TorquePowerError(issue.code, mode, issue.message));
      const id = issue.field === 'rpm' ? '#tp-rpm' : mode === 'torque' ? '#tp-torque' : '#tp-power';
      event.currentTarget.querySelector<HTMLInputElement>(id)?.focus();
    }
  }
  function switchTorque(next: TorqueUnit) {
    try { setTorque(String(convertTorque(parseNumericInput(torque, 'torque'), torqueUnit, next))); setTorqueUnit(next); setPointError(null); }
    catch (error) {
      const issue = failure(error);
      setPointError(mode === 'torque' ? issue : new TorquePowerError(issue.code, 'torqueUnit', `${issue.message} Switch to Torque + RPM to correct the retained torque input before converting its unit.`));
      document.getElementById(mode === 'torque' ? 'tp-torque' : 'tp-torque-unit')?.focus();
    }
  }
  function switchPower(next: PowerUnit) {
    try { setPower(String(convertPower(parseNumericInput(power, 'power'), powerUnit, next))); setPowerUnit(next); setPointError(null); }
    catch (error) {
      const issue = failure(error);
      setPointError(mode === 'power' ? issue : new TorquePowerError(issue.code, 'powerUnit', `${issue.message} Switch to Power + RPM to correct the retained power input before converting its unit.`));
      document.getElementById(mode === 'power' ? 'tp-power' : 'tp-power-unit')?.focus();
    }
  }
  function submitCurve(event: FormEvent) {
    event.preventDefault();
    try { setCurve(calculateCurve(parseCurveText(text, curveUnit).points)); setSelected(0); setCurveError(null); }
    catch (error) { setCurve(null); setCurveError(failure(error)); event.currentTarget.querySelector('textarea')?.focus(); }
  }
  function switchCurveUnit(next: TorqueUnit) {
    if (next === curveUnit) return;
    try {
      if (text.trim()) {
        const parsed = parseCurveText(text, curveUnit);
        setText('RPM,Torque\n' + parsed.points.map(p => `${p.rpm},${convertTorque(p.torque, curveUnit, next)}`).join('\n'));
      }
      setCurveUnit(next); setCurveError(null); setNotice('Torque quantities converted. Paste is now shown as comma-separated dot decimals.');
    } catch (error) { setCurveError(failure(error)); setNotice('Unit unchanged. Correct the pasted values before converting; your input is preserved.'); }
  }
  function sample() {
    setText('RPM,Torque\n' + SYNTHETIC_CURVE.points.map(p => `${p.rpm},${convertTorque(p.torque, 'Nm', curveUnit)}`).join('\n'));
    setCurve(calculateCurve(SYNTHETIC_CURVE.points)); setSelected(0); setSynthetic(true); setCurveError(null); setNotice('Loaded the synthetic educational sample.');
  }
  const peakText = (peak: SampledPeak) => peak.tiedRpms.length === 1 ? `${number(peak.rpm)} RPM` : `${number(peak.rpm)} RPM (first of ${peak.tiedRpms.length} tied samples; all listed in the numeric samples)`;
  const current = curve?.points[selected];
  return <div className="tp-workspace">
    <section className="tp-panel" aria-labelledby="tp-point-title"><p className="tp-step">01 / A single operating point</p><h2 id="tp-point-title">Point calculator</h2>
      <form onSubmit={submitPoint} noValidate autoComplete="off">
        <fieldset className="tp-form-ready" disabled={!ready}>
        <fieldset className="tp-modes"><legend>Calculation direction</legend><label><input type="radio" name="point-mode" checked={mode === 'torque'} onChange={() => { setMode('torque'); pointEdit(); }} />Torque + RPM → Power</label><label><input type="radio" name="point-mode" checked={mode === 'power'} onChange={() => { setMode('power'); pointEdit(); }} />Power + RPM → Torque</label></fieldset>
        <div className="tp-fields">
          <label htmlFor="tp-rpm">RPM<input id="tp-rpm" type="text" inputMode="decimal" value={rpm} onChange={e => { setRpm(e.target.value); pointEdit(); }} aria-invalid={pointError?.field === 'rpm'} aria-describedby={`tp-point-help${pointError?.field === 'rpm' ? ' tp-point-error' : ''}`} /></label>
          {mode === 'torque' ? <label htmlFor="tp-torque">Torque ({torqueUnit})<input id="tp-torque" type="text" inputMode="decimal" value={torque} onChange={e => { setTorque(e.target.value); pointEdit(); }} aria-invalid={pointError?.field === 'torque'} aria-describedby={`tp-point-help${pointError?.field === 'torque' ? ' tp-point-error' : ''}`} /></label> : <label htmlFor="tp-power">Power ({powerLabel(powerUnit)})<input id="tp-power" type="text" inputMode="decimal" value={power} onChange={e => { setPower(e.target.value); pointEdit(); }} aria-invalid={pointError?.field === 'power'} aria-describedby={`tp-point-help${pointError?.field === 'power' ? ' tp-point-error' : ''}`} /></label>}
          <label htmlFor="tp-torque-unit">Point torque unit<select aria-label="Point torque unit" id="tp-torque-unit" value={torqueUnit} onChange={e => switchTorque(e.target.value as TorqueUnit)} aria-invalid={pointError?.field === 'torqueUnit'} aria-describedby="tp-point-help tp-point-error"><option>Nm</option><option>lb-ft</option></select></label>
          <label htmlFor="tp-power-unit">Point power unit<select aria-label="Point power unit" id="tp-power-unit" value={powerUnit} onChange={e => switchPower(e.target.value as PowerUnit)} aria-invalid={pointError?.field === 'powerUnit'} aria-describedby="tp-point-help tp-point-error"><option>kW</option><option value="hp">hp (mechanical)</option></select></label>
        </div>
        <p id="tp-point-help" className="tp-help">Use nonnegative dot decimals or e notation, without grouping or unit suffixes. RPM: 0–100,000; torque: up to 1,000,000 Nm; power: up to 20,000,000 kW. These are tool capacity limits. Unit changes convert the entered quantity; invalid values keep their current unit.</p>
        <p id="tp-point-error" className="tp-error" role="alert">{pointError?.message}</p><button type="submit">Calculate point</button>
        </fieldset>
      </form>
      <div className="tp-point-result" role="status" aria-live="polite">{point ? <><strong>{mode === 'torque' ? `${number(powerValue(point, powerUnit))} ${powerLabel(powerUnit)}` : `${number(torqueValue(point, torqueUnit))} ${torqueUnit}`}</strong><p>{number(point.rpm)} RPM · {number(point.torqueNm)} Nm / {number(point.torqueLbFt)} lb-ft · {number(point.powerKw)} kW / {number(point.powerHp)} mechanical hp</p></> : <p>Enter a point and calculate to see the result.</p>}</div>
    </section>
    <section className="tp-panel" aria-labelledby="tp-curve-title"><p className="tp-step">02 / Follow the relationship</p><h2 id="tp-curve-title">Curve exploration</h2>
      <form onSubmit={submitCurve} noValidate autoComplete="off">
        <fieldset className="tp-form-ready" disabled={!ready}>
        <div className="tp-fields"><label htmlFor="tp-curve-unit">Curve torque unit<select aria-label="Curve torque unit" id="tp-curve-unit" value={curveUnit} onChange={e => switchCurveUnit(e.target.value as TorqueUnit)} aria-describedby="tp-curve-help tp-curve-error"><option>Nm</option><option>lb-ft</option></select></label><label htmlFor="tp-curve-power">Curve power unit<select aria-label="Curve power unit" id="tp-curve-power" value={curvePowerUnit} onChange={e => setCurvePowerUnit(e.target.value as PowerUnit)}><option>kW</option><option value="hp">hp (mechanical)</option></select></label></div>
        <label htmlFor="tp-curve-text">RPM and torque points ({curveUnit})<textarea id="tp-curve-text" rows={9} value={text} spellCheck={false} onChange={e => { setText(e.target.value); setCurve(null); setCurveError(null); setSynthetic(false); setNotice(''); }} aria-invalid={!!curveError} aria-describedby="tp-curve-help tp-curve-error" placeholder={'RPM,Torque\n1000,200\n4000,150'} /></label>
        <p id="tp-curve-help" className="tp-help">Paste or edit 2–200 points: RPM then torque. Use consistent comma, semicolon or tab separators, dot decimals and optionally an RPM,Torque header. RPM must increase strictly; duplicates and incomplete rows are rejected. No automatic sorting or overwriting. Maximum 32,000 characters / 1,000 lines.</p>
        <p id="tp-curve-error" className="tp-error" role="alert">{curveError?.message}</p><div className="tp-actions"><button type="submit">Plot curve</button><button type="button" className="tp-secondary" onClick={sample}>Load synthetic sample</button></div>
        </fieldset>
      </form><p role="status" className="tp-help">{notice}</p>
      {curve && current && <div className="tp-curve-results">
        <p className="tp-source">{synthetic ? SYNTHETIC_CURVE.label : 'User-supplied educational samples — no engine performance prediction'}</p>
        <div className="tp-peaks"><div data-testid="peak-torque"><h3>Sampled peak torque</h3><strong>{number(torqueValue(curve.points[curve.peakTorque.index], curveUnit))} {curveUnit}</strong><p>{peakText(curve.peakTorque)}</p></div><div data-testid="peak-power"><h3>Sampled peak power</h3><strong>{number(powerValue(curve.points[curve.peakPower.index], curvePowerUnit))} {powerLabel(curvePowerUnit)}</strong><p>{peakText(curve.peakPower)}</p></div></div>
        <p className="tp-help">Separate vertical scales; compare the RPM positions, not line heights. Tap either plot to inspect the nearest supplied point. Lines are visual guides between samples.</p>
        <div className="tp-plots"><Plot points={curve.points} selected={selected} onSelect={setSelected} kind="torque" unit={curveUnit} /><Plot points={curve.points} selected={selected} onSelect={setSelected} kind="power" unit={curvePowerUnit} /></div>
        <label htmlFor="tp-inspect">Inspect supplied sample<input id="tp-inspect" type="range" min={0} max={curve.points.length - 1} step={1} value={selected} onChange={e => setSelected(Number(e.target.value))} aria-valuetext={`Sample ${selected + 1} of ${curve.points.length}: ${number(current.rpm)} RPM, ${number(torqueValue(current, curveUnit))} ${curveUnit}, ${number(powerValue(current, curvePowerUnit))} ${powerLabel(curvePowerUnit)}`} aria-describedby="tp-inspect-help" /></label>
        <p id="tp-inspect-help" className="tp-help">Use arrow keys for previous/next sample; Home/End for first/last. The slider also works by touch.</p>
        <p className="tp-readout" role="status" aria-live="polite" data-testid="curve-readout">Sample {selected + 1} / {curve.points.length} · <strong>{number(current.rpm)} RPM</strong> · {number(torqueValue(current, curveUnit))} {curveUnit} · {number(powerValue(current, curvePowerUnit))} {powerLabel(curvePowerUnit)}</p>
        <details className="tp-numeric"><summary>All numeric samples ({curve.points.length})</summary><ol>{curve.points.map((p, i) => <li key={p.rpm}><strong>Sample {i + 1}: {number(p.rpm)} RPM</strong><span>{number(torqueValue(p, curveUnit))} {curveUnit} · {number(powerValue(p, curvePowerUnit))} {powerLabel(curvePowerUnit)}</span><span>{curve.peakTorque.tiedRpms.includes(p.rpm) ? 'Sampled torque peak. ' : ''}{curve.peakPower.tiedRpms.includes(p.rpm) ? 'Sampled power peak.' : ''}</span></li>)}</ol></details>
      </div>}
    </section>
  </div>;
}
