'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LogWorkerClient } from '../../lib/obd/worker-client';
import ObdWorker from '../../lib/obd/worker?worker';
import { demoCsv } from '../../lib/obd/demo';
import type { LogInfo, Reading, SignalInfo, Trace } from '../../lib/obd/types';
import ImportPreview from './import-preview';
import type { ImportPreview as Preview } from '../../lib/obd/mapping';
import type { MappingConfig } from '../../lib/obd/mapping-types';

const colors = ['#ec424a', '#5baaff', '#f3bc5b', '#52d6b1', '#bc99ff', '#ed98c8'];
const number = (n: number | null | undefined) => n == null ? '—' : n.toLocaleString('en', { maximumFractionDigits: 2 });
const clock = (n: number) => {
  const precision = Math.abs(n * 10 - Math.round(n * 10)) < 1e-6 ? 1 : 3;
  const rounded = Math.round(n * 10 ** precision) / 10 ** precision;
  return `${Math.floor(rounded / 60).toString().padStart(2, '0')}:${(rounded % 60).toFixed(precision).padStart(precision + 3, '0')}`;
};

function Chart({ signal, data, reading, color, range, cursor, onInspect }: { signal: SignalInfo; data?: Trace; reading?: Reading; color: string; range: [number, number]; cursor: number; onInspect: (time: number) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(280, entries[0].contentRect.width)));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  const left = 50, right = width - 22, top = 16, bottom = 128;
  const span = Math.max(range[1] - range[0], 0.001), min = data?.min ?? 0, max = data?.max ?? 1;
  const padding = max === min ? Math.max(1, Math.abs(max) * 0.05) : (max - min) * 0.1;
  const y = (v: number) => bottom - (v - min + padding) / (max - min + padding * 2) * (bottom - top);
  const x = (t: number) => left + (t - range[0]) / span * (right - left);
  const path = data?.points.map((p, i, points) => { if (p.value === null) return ''; const op = i > 0 && points[i - 1].value !== null ? 'L' : 'M'; return `${op}${x(p.time).toFixed(1)},${y(p.value).toFixed(1)}${op === 'M' ? 'l0.01,0' : ''}`; }).join(' ') ?? '';
  const pointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    onInspect(range[0] + Math.max(0, Math.min(1, ((event.clientX - bounds.left) / bounds.width * width - left) / (right - left))) * span);
  };
  return <section className="obd-chart" aria-label={`${signal.originalName} chart`}>
    <div className="obd-chart-heading"><h3><i style={{ background: color }} />{signal.originalName}</h3><span>{number(reading?.value)} {signal.unit ?? 'unit unknown'}{reading?.stale ? ' · STALE' : ''}</span></div>
    {data?.count === 0 && <p className="obd-footnote">No numeric samples with valid times in this view.</p>}
    <svg ref={svgRef} viewBox={`0 0 ${width} 158`} role="slider" tabIndex={0} aria-label={`Inspect ${signal.originalName}`} aria-valuemin={range[0]} aria-valuemax={range[1]} aria-valuenow={Math.max(range[0], Math.min(range[1], cursor))} aria-valuetext={clock(cursor)} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); onInspect(Math.max(range[0], Math.min(range[1], cursor + (e.key === 'ArrowRight' ? 1 : -1) * span / 100))); } }} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); pointer(e); }} onPointerMove={e => { if (e.buttons) pointer(e); }}>
      {[0, 0.5, 1].map(f => <g key={f}><line x1={left} x2={right} y1={top + f * (bottom - top)} y2={top + f * (bottom - top)} stroke="#303942" /><text x={left - 8} y={top + f * (bottom - top) + 4} textAnchor="end">{number(max + padding - f * (max - min + 2 * padding))}</text></g>)}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {data && data.points.length < 100 && data.points.filter(p => p.value !== null).map((p, i) => <circle key={i} cx={x(p.time)} cy={y(p.value!)} r="2.5" fill={color} />)}
      {cursor >= range[0] && cursor <= range[1] && <line x1={x(cursor)} x2={x(cursor)} y1={top} y2={bottom} stroke="#fff" strokeDasharray="4 4" />}
      {(width < 420 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map(f => <text key={f} x={left + f * (right - left)} y="151" textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}>{clock(range[0] + f * span)}</text>)}
    </svg>
    <div className="obd-chart-stats"><span>Min <b>{number(data?.min)}</b></span><span>Max <b>{number(data?.max)}</b></span><span>Sample mean <b>{number(data?.average)}</b></span><span>{number(data?.count)} samples in view</span></div>
  </section>;
}

export default function Analyzer() {
  const client = useRef<LogWorkerClient | null>(null);
  const [info, setInfo] = useState<LogInfo | null>(null), [name, setName] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<string[]>([]), [filter, setFilter] = useState('');
  const [range, setRange] = useState<[number, number]>([0, 1]), [cursor, setCursor] = useState(0);
  const [traces, setTraces] = useState<Trace[]>([]), [readings, setReadings] = useState<Reading[]>([]);
  const [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  const duration = info?.quality.duration ?? 0;
  useEffect(() => () => client.current?.dispose(), []);
  const load = async (file: Blob, label: string) => {
    client.current?.dispose();
    setPlaying(false); setBusy(true); setError(''); setInfo(null); setPreview(null); setTraces([]); setReadings([]); setCursor(0); setName(label);
    let next: LogWorkerClient | null = null;
    try {
      next = new LogWorkerClient(new ObdWorker());
      client.current = next;
      const response = await next.request({ kind: 'load', file });
      if (client.current !== next || !('kind' in response) || response.kind !== 'preview') return;
      setPreview(response.preview);
    } catch (e) { if (client.current === next) { setError(e instanceof Error ? e.message : 'Import failed.'); setBusy(false); next?.dispose(); client.current = null; } }
    finally { if (client.current === next) setBusy(false); }
  };
  const reprocess = async (config?: MappingConfig): Promise<Preview | null> => {
    const current = client.current;
    if (!current) return null;
    setBusy(true); setError(''); setPlaying(false);
    try {
      const response = await current.request(config ? { kind: 'remap', config } : { kind: 'review' });
      if (client.current !== current || !('kind' in response) || response.kind !== 'preview') return null;
      setPreview(response.preview); return response.preview;
    } catch (e) { if (client.current === current) setError(e instanceof Error ? e.message : 'Mapping failed.'); return null; }
    finally { if (client.current === current) setBusy(false); }
  };
  const accept = async () => {
    const current = client.current;
    if (!current || !preview) return;
    setBusy(true); setError('');
    try {
      const response = await current.request({ kind: 'commit', revision: preview.revision });
      if (client.current !== current || !('kind' in response) || response.kind !== 'commit') return;
      setInfo(response.info); setPreview(null); setCursor(0); setTraces([]); setReadings([]); setRange([0, response.info.quality.duration]);
      setSelected(response.info.signals.filter(s => s.identity).slice(0, 3).map(s => s.id));
    } catch (e) { if (client.current === current) setError(e instanceof Error ? e.message : 'Cannot start analysis.'); }
    finally { if (client.current === current) setBusy(false); }
  };
  useEffect(() => {
    if (!info || !client.current) return;
    let active = true;
    client.current.request({ kind: 'view', signals: selected, start: range[0], end: range[1] }).then(r => { if (active && 'kind' in r && r.kind === 'view') setTraces(r.traces); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [info, selected, range]);
  useEffect(() => {
    if (!info || !client.current) return;
    let active = true;
    client.current.request({ kind: 'inspect', time: cursor }).then(r => { if (active && 'kind' in r && r.kind === 'inspect') setReadings(r.readings); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [info, cursor]);
  const ended = cursor >= duration;
  useEffect(() => {
    if (!playing || ended) return;
    let previous = performance.now();
    const timer = window.setInterval(() => { const now = performance.now(), delta = (now - previous) / 1000 * speed; previous = now; setCursor(t => Math.min(duration, t + delta)); }, 100);
    return () => window.clearInterval(timer);
  }, [playing, speed, duration, ended]);
  const isPlaying = playing && cursor < duration;
  const inspect = useCallback((time: number) => { setPlaying(false); setCursor(time); }, []);
  const zoom = (factor: number) => {
    const width = Math.min(duration, Math.max(0.1, (range[1] - range[0]) * factor));
    const center = cursor >= range[0] && cursor <= range[1] ? cursor : (range[0] + range[1]) / 2;
    const start = Math.max(0, Math.min(duration - width, center - width / 2)); setRange([start, Math.min(duration, start + width)]);
  };
  const pan = (direction: number) => { const width = range[1] - range[0], start = Math.max(0, Math.min(duration - width, range[0] + direction * width * 0.4)); setRange([start, start + width]); };
  const q = info?.quality;
  const importInfo = preview?.info ?? info;
  return <div className="obd-app">
    <section className={`obd-import ${importInfo ? 'obd-import-compact' : ''}`} aria-label="Import a log">
      <div><span className="obd-kicker">01 / IMPORT</span><h2>{importInfo ? name : 'Every drive tells a story.'}</h2><p>{importInfo ? `${importInfo.format} · ${number(importInfo.quality.parsed)} records · ${clock(importInfo.quality.duration)}` : 'Bring your recorded data. Explore what the sensors actually saw.'}</p></div>
      <div className="obd-import-actions"><label className="obd-button obd-primary">{busy ? 'Replace file' : importInfo ? 'Open another log' : 'Choose a CSV log'}<input aria-label="Choose CSV log" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" onChange={e => { const f = e.target.files?.[0]; if (f) void load(f, f.name); e.target.value = ''; }} /></label><button onClick={() => void load(new Blob([demoCsv()], { type: 'text/csv' }), 'Synthetic demo · illustrative data')}>Explore demo</button></div>
      {!importInfo && <p className="obd-import-note">CSV / TSV · up to 25 MiB, 250,000 records, 2 million cells · comma, semicolon or tab</p>}
    </section>
    <p className="obd-privacy">◉ Your log stays in memory in this browser. Only mapping templates you explicitly save persist locally. Nothing is uploaded.</p>
    {busy && <div className="obd-notice" role="status">Preparing your data in the background… <button onClick={() => { client.current?.dispose(); client.current = null; setBusy(false); setPreview(null); setInfo(null); setPlaying(false); setError(''); }}>Cancel import</button></div>}
    {error && <p className="obd-error" role="alert">{error}</p>}
    {preview && <ImportPreview preview={preview} busy={busy} onReprocess={reprocess} onAccept={() => void accept()} onBack={info ? () => { setPreview(null); setError(''); } : undefined} />}
    {!info && !preview && !busy && <div className="obd-empty-grid"><section><span>02 / UNDERSTAND</span><h3>Trust the timeline.</h3><p>See missing samples, recording gaps and uncertain units before reading a chart.</p></section><section><span>03 / INSPECT</span><h3>What happened here?</h3><p>Tap a moment to see synchronized readings, their source times and how old they are.</p></section><section><span>04 / EXPLORE</span><h3>Follow the relationships.</h3><p>Replay real elapsed time. Compare RPM, throttle and the signals your file contains.</p></section></div>}
    {info && q && !preview && <>
      <div className="obd-review-mapping"><p>Every reading follows your accepted mapping.</p><button disabled={busy} onClick={() => void reprocess()}>Review mapping</button></div>
      <div className="obd-summary"><div><span>Duration</span><strong>{clock(duration)}</strong></div><div><span>Recognized / custom</span><strong>{q.recognized} / {q.unknown}</strong></div><div><span>Missing values</span><strong>{number(q.missingValues)}</strong></div><div><span>Recording gaps</span><strong>{q.gaps}</strong></div></div>
      <details className="obd-quality"><summary>Import quality & source mapping <span>{q.warningCount} notices · {q.rejected} rejected records</span></summary>
        <dl><div><dt>Parsed / rejected</dt><dd>{q.parsed} / {q.rejected}</dd></div><div><dt>Missing / invalid values</dt><dd>{q.missingValues} / {q.invalidValues}</dd></div><div><dt>Missing timestamps</dt><dd>{q.missingTimes}</dd></div><div><dt>Duplicate / backwards times</dt><dd>{q.duplicateTimes} / {q.backwardsTimes}</dd></div><div><dt>Intervals min / median / max</dt><dd>{number(q.intervalMin)} / {number(q.intervalMedian)} / {number(q.intervalMax)} s</dd></div><div><dt>Sampling</dt><dd>{q.intervalMedian === null ? 'Insufficient timestamps' : `${q.irregular ? 'Irregular' : 'Regular'} · ${number(1 / q.intervalMedian)} Hz median`}</dd></div></dl>
        <p>Intervals use distinct sorted timestamps. Backwards clocks are reported, never repaired. Numeric values with no usable time remain in source data but are excluded from charts.</p>
        <ul>{q.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>{q.warningCount > 50 && <p>Showing first 50 notices of {q.warningCount}.</p>}
        <div className="obd-table-scroll"><table><caption>Original columns → canonical signals</caption><thead><tr><th>Original column</th><th>Identity</th><th>Source → display unit</th><th>Missing / nonnumeric</th></tr></thead><tbody>{info.signals.map(s => <tr key={s.id}><td>{s.originalName}<small>{s.id}</small></td><td>{s.identity ?? 'Custom / unknown'}{s.provenance && <small>{s.provenance.reason}<br />Interpreted unit: {s.provenance.interpretedUnit ?? 'unknown'}</small>}</td><td>{s.originalUnit ?? 'unknown'} → {s.unit ?? 'unknown'}{s.ambiguity && <small>{s.ambiguity}</small>}</td><td>{s.missing} / {s.invalid}</td></tr>)}</tbody></table></div>
      </details>
      <div className="obd-workspace">
        <aside className="obd-signals"><span className="obd-kicker">02 / SIGNALS</span><h2>Build your view.</h2><label className="obd-search">Find a signal<input type="search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="RPM, throttle, custom…" /></label><p>Choose up to six. Each chart has its own scale.</p><div className="obd-signal-list">{info.signals.filter(s => s.originalName.toLowerCase().includes(filter.toLowerCase())).map(s => <label key={s.id}><input type="checkbox" checked={selected.includes(s.id)} disabled={!selected.includes(s.id) && selected.length >= 6} onChange={e => setSelected(ids => e.target.checked ? [...ids, s.id] : ids.filter(id => id !== s.id))} /><span>{s.originalName}<small>{s.identity ?? 'Custom signal'} · {s.unit ?? 'unit unknown'}</small></span></label>)}</div></aside>
        <div className="obd-explorer">
          <div className="obd-toolbar"><div><span className="obd-kicker">03 / TIMELINE</span><h2>Find the moment.</h2></div><div className="obd-zoom"><button onClick={() => pan(-1)} aria-label="Pan earlier">←</button><button onClick={() => zoom(0.5)} disabled={!duration} aria-label="Zoom in">+</button><button onClick={() => zoom(2)} disabled={!duration} aria-label="Zoom out">−</button><button onClick={() => pan(1)} aria-label="Pan later">→</button><button onClick={() => setRange([0, duration])}>Reset</button></div></div>
          <p className="obd-chart-help">Tap or drag a chart to inspect. Use arrow keys when focused. Lines connect recorded samples; gaps stay open.</p>
          {selected.length === 0 && <p className="obd-notice">Select signals to start exploring.</p>}
          {selected.map((id, i) => { const signal = info.signals.find(s => s.id === id)!; return <Chart key={id} signal={signal} data={traces.find(t => t.id === id)} reading={readings.find(r => r.id === id)} range={range} cursor={cursor} color={colors[i]} onInspect={inspect} />; })}
          <div className="obd-playback"><button className="obd-primary" disabled={!duration} onClick={() => { if (isPlaying) setPlaying(false); else { if (cursor >= duration) setCursor(0); setPlaying(true); } }}>{isPlaying ? 'Pause' : 'Play'}</button><output aria-label="Cursor time">{clock(cursor)}</output><label className="obd-scrub">Log position<input aria-label="Log position" type="range" min="0" max={duration || 1} step="0.01" value={cursor} disabled={!duration} onChange={e => inspect(+e.target.value)} /></label><label>Speed<select aria-label="Playback speed" value={speed} onChange={e => setSpeed(+e.target.value)}>{[0.25, 1, 2, 5, 10].map(v => <option key={v} value={v}>{v}×</option>)}</select></label></div>
          <p className="obd-footnote">Playback respects elapsed time, including gaps. View statistics use full-resolution samples; the mean is sample-weighted, not time-weighted.</p>
        </div>
        <aside className="obd-state"><div className="obd-state-title"><span className="obd-kicker">04 / VEHICLE STATE</span><h2>What happened here?</h2><output>{clock(cursor)}</output></div><p>Nearest recorded value. No interpolation. Signed Δ is sample time minus cursor time.</p><div className="obd-readings">{selected.map((id, i) => { const s = info.signals.find(s => s.id === id)!, r = readings.find(r => r.id === id); return <div className={`obd-reading ${r?.stale ? 'is-stale' : ''}`} key={id} style={{ borderLeftColor: colors[i] }}><span>{s.originalName}</span><strong>{number(r?.value)} <small>{s.unit ?? 'unit unknown'}</small></strong>{r?.time != null ? <><small>Sample {clock(r.time)} · Δ {r.offset! > 0 ? '+' : ''}{number(r.offset)} s {r.stale ? '· STALE' : ''}</small><small>Source: {r.source} {s.originalUnit ?? ''}</small>{s.provenance?.state === 'user' && <small>Interpreted as: {s.provenance.interpretedUnit ?? 'native / unknown'}</small>}</> : <small>No numeric sample with a valid timestamp</small>}{s.ambiguity && <small className="obd-ambiguity">{s.ambiguity}</small>}</div>; })}</div><details><summary>How readings are selected</summary><p>Closest numeric sample in either direction; ties choose the earlier time. Duplicate times use the first original row. A reading is stale beyond the larger of 2 seconds or 3× that signal’s median positive interval. A future sample has a positive Δ. Stale values remain visible.</p></details></aside>
      </div>
      <section className="obd-events"><div><span className="obd-kicker">05 / OBSERVATIONS</span><h2>Markers, with evidence.</h2><p>Recording gaps only in V1: greater than max(5 seconds, 5× median positive interval). These are data observations, not vehicle faults.</p></div><div>{info.events.length ? info.events.map((event, i) => <button key={i} onClick={() => { inspect(event.time); setRange([Math.max(0, event.start - 5), Math.min(duration, event.time + 5)]); }}>{clock(event.time)} <span>{event.label}</span> ↗</button>) : <p>No gaps meeting this rule.</p>}</div></section>
    </>}
  </div>;
}
