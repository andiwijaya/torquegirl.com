'use client';

import { useEffect, useRef, useState } from 'react';
import { browserNotebookStore, NOTEBOOK_KEY, type NotebookPlan, type NotebookSnapshot } from '../../lib/notebook/storage';
import { emptyNotebook, exportNotebookJson, NOTEBOOK_LIMITS, NotebookError, validateDraft, type NotebookDraft, type NotebookEvidence, type NotebookRecord, type NotebookSignal } from '../../lib/notebook/model';
import { projectAnalysisEvidence, type AnalysisEvidenceInput } from '../../lib/notebook/evidence';

const fields = [
  ['vehicleLabel', 'Vehicle label', 160], ['vehicleIdentifier', 'Optional identifier', 160],
  ['question', 'Question / goal', 2000], ['testDate', 'Test date', 10], ['conditions', 'Conditions', 2000],
  ['baseline', 'Baseline / Run A description', 2000], ['modification', 'Modification or change made', 2000],
  ['observation', 'Observation', 4000], ['alternativeExplanation', 'Alternative explanation', 2000],
  ['nextTest', 'Next test', 2000], ['retestResult', 'Retest result', 4000], ['notes', 'Free notes', 6000],
] as const;
type TextKey = typeof fields[number][0];
type Form = Partial<Record<TextKey, string>>;
type Pending = { kind: 'discard'; next: () => void } | { kind: 'plan'; plan: NotebookPlan };
const num = (value: number | null) => value === null ? 'unavailable' : value.toLocaleString('en', { maximumFractionDigits: 3 });
const regionText = (r: NonNullable<NotebookDraft['selectedRegion']>) => `${r.phase ?? 'time region'}: ${num(r.start)}–${num(r.end)} elapsed seconds`;
const title = (r: NotebookRecord) => r.vehicleLabel || r.question || 'Untitled observation';

function Evidence({ evidence }: { evidence: NotebookEvidence }) {
  return <div className="notebook-evidence" data-testid="notebook-evidence">
    <h4>Captured evidence snapshot</h4>
    <p>Run A: {evidence.runALabel || 'unlabelled'}{evidence.regionA && ` · ${regionText(evidence.regionA)}`}</p>
    {(evidence.runBLabel !== undefined || evidence.regionB) && <p>Run B: {evidence.runBLabel || 'unlabelled'}{evidence.regionB && ` · ${regionText(evidence.regionB)}`}</p>}
    <p>Selected signals: {evidence.signals.map(s => `${s.run ?? 'A'}: ${s.label} (${s.unit || 'unit unknown'})`).join('; ') || 'none'}</p>
    <p>Historical summary only. This cannot restore logs, charts or the analysis session.</p>
    {!!evidence.statistics?.length && <details><summary>Captured numeric summaries</summary>
      <p>Values use the display units shown for each signal. Mean and median weight each sample equally. Coverage estimates the fraction of region time covered by nearby samples; it does not prove continuous measurement. Cadence is median sample spacing.</p>
      <div className="notebook-cards">{evidence.statistics.map(s => <article key={`${s.run}:${s.signalId}`}><strong>Run {s.run}: {evidence.signals.find(v => v.id === s.signalId && (v.run ?? 'A') === s.run)?.label} · {evidence.signals.find(v => v.id === s.signalId && (v.run ?? 'A') === s.run)?.unit || 'unit unknown'}</strong><p>{s.count} samples · mean {num(s.mean)} · median {num(s.median)}<br />Min {num(s.min)} · max {num(s.max)} · coverage {num(s.coverage * 100)}% · cadence {num(s.cadence)} s</p></article>)}</div>
    </details>}
    {evidence.comparison && <details><summary>Captured comparison: {evidence.comparison.state}</summary><p>Operating conditions may differ in ways these channels cannot measure. No cause or diagnosis is inferred.</p><ul>{evidence.comparison.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>{evidence.comparison.changes.map(c => <p key={`${c.identity}:${c.unit}`}>{c.identity}: median A {num(c.a)}, B {num(c.b)}, B minus A {num(c.delta)} {c.unit === '%' ? 'percentage points' : c.unit}; {c.countA}/{c.countB} samples; coverage A/B {num(c.coverageA * 100)}%/{num(c.coverageB * 100)}%.</p>)}</details>}
  </div>;
}

function download(json: string, filename: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ObservationNotebook({ analysis }: { analysis?: AnalysisEvidenceInput }) {
  const store = useRef<ReturnType<typeof browserNotebookStore> | null>(null);
  const [snapshot, setSnapshot] = useState<NotebookSnapshot | null>(null);
  const [writable, setWritable] = useState(false), [storageState, setStorageState] = useState('Checking browser storage…');
  const [form, setForm] = useState<Form>({}), [editId, setEditId] = useState<string | null>(null);
  const [start, setStart] = useState(''), [end, setEnd] = useState(''), [phase, setPhase] = useState('');
  const [signals, setSignals] = useState<NotebookSignal[]>([]), [evidence, setEvidence] = useState<NotebookEvidence>();
  const [baseline, setBaseline] = useState('');
  const [runA, setRunA] = useState('Run A'), [runB, setRunB] = useState('Run B'), [scope, setScope] = useState('phase');
  const [status, setStatus] = useState(''), [error, setError] = useState(''), [stale, setStale] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null), [importPlan, setImportPlan] = useState<NotebookPlan | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [busy, setBusy] = useState(false);
  const gate = useRef(false), dialog = useRef<HTMLDialogElement>(null), formHeading = useRef<HTMLHeadingElement>(null);
  const signature = JSON.stringify({ form, start, end, phase, signals, evidence });
  const emptySignature = JSON.stringify({ form: {}, start: '', end: '', phase: '', signals: [] });
  const dirty = signature !== (baseline || emptySignature);
  const fail = (e: unknown) => { setError(e instanceof Error ? e.message : 'Notebook action failed; saved notes and draft were preserved.'); };

  useEffect(() => {
    const adapter = browserNotebookStore(); store.current = adapter;
    let active = true;
    // Client-only storage initialization after hydration; never write on mount.
    queueMicrotask(() => {
    if (!active) return;
    setWritable(adapter.writable);
    try { setSnapshot(adapter.read()); setStorageState(adapter.writable ? 'Browser-local saving is available. Save explicitly; keep your own backups.' : 'Read-only: safe cross-tab saving requires Web Locks. Saved notes can be read and exported. Drafts are memory-only; download a draft backup.'); }
    catch (e) { setStorageState('Storage unavailable or saved format unreadable. Saved bytes are preserved. Drafts are memory-only; download a draft backup.'); fail(e); }
    });
    const changed = (event: StorageEvent) => { if (event.key === NOTEBOOK_KEY || event.key === null) { setStale(true); setStatus('Saved notebook changed in another tab. Reload saved notes before applying changes; your draft is preserved.'); } };
    window.addEventListener('storage', changed);
    return () => { active = false; window.removeEventListener('storage', changed); };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => { if (pending && !dialog.current?.open) dialog.current?.showModal(); }, [pending]);

  const loadDraft = (record?: NotebookRecord) => {
    const nextForm: Form = {}; for (const [key] of fields) if (record?.[key] !== undefined) nextForm[key] = record[key];
    const nextStart = record?.selectedRegion ? String(record.selectedRegion.start) : '', nextEnd = record?.selectedRegion ? String(record.selectedRegion.end) : '', nextPhase = record?.selectedRegion?.phase ?? '';
    const nextSignals = record?.selectedSignals ?? [];
    setForm(nextForm); setStart(nextStart); setEnd(nextEnd); setPhase(nextPhase); setSignals(nextSignals); setEvidence(record?.evidence); setEditId(record?.id ?? null);
    setBaseline(JSON.stringify({ form: nextForm, start: nextStart, end: nextEnd, phase: nextPhase, signals: nextSignals, evidence: record?.evidence }));
    setError(''); formHeading.current?.focus();
  };
  const switchDraft = (next: () => void) => { if (dirty) setPending({ kind: 'discard', next }); else next(); };
  const draft = (): NotebookDraft => {
    const text: Form = {}; for (const [key] of fields) if (form[key] !== undefined && form[key] !== '') text[key] = form[key];
    if (start !== '' && (!Number.isFinite(Number(start)) || !Number.isFinite(Number(end)) || Number(start) < 0 || Number(end) < Number(start))) throw new NotebookError('invalid', 'Region must use finite nonnegative seconds, with end at or after start.');
    if ((start === '') !== (end === '') || phase && start === '') throw new NotebookError('invalid', 'Enter both region start and end, or leave the region and phase empty.');
    return validateDraft({ ...text, ...(start !== '' ? { selectedRegion: { start: Number(start), end: Number(end), ...(phase ? { phase } : {}) } } : {}), ...(signals.length ? { selectedSignals: signals } : {}), ...(evidence ? { evidence } : {}) });
  };
  const act = async (task: () => Promise<void>) => {
    if (gate.current) return; gate.current = true; setBusy(true); setError('');
    try { await task(); } catch (e) { fail(e); } finally { gate.current = false; setBusy(false); }
  };
  const save = () => act(async () => {
    if (!store.current || !snapshot) throw new NotebookError('unavailable', 'Saving is unavailable; download your draft to keep it.');
    const next = editId ? await store.current.update(snapshot, editId, draft()) : await store.current.create(snapshot, draft());
    setSnapshot(next); setStale(false); loadDraft(next.document.records.find(r => r.id === editId) ?? next.document.records.at(-1)); setStatus('Note saved in this browser. Raw logs and session were not saved.');
  });
  const reload = () => {
    try {
      const next = store.current!.read(); setSnapshot(next); setStale(false); setImportPlan(null); setError('');
      if (dirty) { setEditId(null); setStatus('Saved notes reloaded. Your draft was kept and will save as a new note to protect newer edits.'); }
      else { loadDraft(); setStatus('Saved notes reloaded.'); }
      setStorageState(store.current!.writable ? 'Browser-local saving is available. Save explicitly; keep your own backups.' : 'Read-only: Web Locks unavailable. Read/export saved notes or download your memory-only draft.');
    } catch (e) { fail(e); }
  };
  const prepare = (kind: 'delete' | 'clear', id?: string) => {
    try { const plan = kind === 'delete' ? store.current!.planDelete(snapshot!, id!) : store.current!.planClear(snapshot!); setError(''); setPending({ kind: 'plan', plan }); } catch (e) { fail(e); }
  };
  const applyPlan = (plan: NotebookPlan) => act(async () => {
    const next = await store.current!.commitPlan(plan, { confirmed: true }); setSnapshot(next); setStale(false); setImportPlan(null);
    if (editId && !next.document.records.some(r => r.id === editId) || plan.kind === 'replace') { setEditId(null); setBaseline(emptySignature); setStatus('Notebook updated. Your current form was kept; save it as a new note if needed.'); }
    else setStatus(`Notebook updated: ${plan.added} added, ${plan.removed} removed. ${plan.conflictIds.length} conflicting imported records skipped; local versions kept.`);
    dialog.current?.close(); setPending(null);
  });
  const cancel = () => { if (gate.current) return; dialog.current?.close(); setPending(null); };
  const capture = () => {
    try {
      if (!analysis) return;
      const input = scope === 'timeline' ? { signals: analysis.signals.filter(s => (s.run ?? 'A') === 'A'), timeRegionA: analysis.timeRegionA, runALabel: runA } : { ...analysis, runALabel: runA, ...(analysis.regionB ? { runBLabel: runB } : {}) };
      const next = projectAnalysisEvidence(input); setEvidence(next); setStart(next.regionA ? String(next.regionA.start) : ''); setEnd(next.regionA ? String(next.regionA.end) : ''); setPhase(next.regionA?.phase ?? ''); setSignals(next.signals); setError(''); setStatus('Evidence captured into the unsaved draft. Review it, then Save note intentionally.');
    } catch (e) { fail(e); }
  };
  const confirmLabel = pending?.kind === 'discard' ? 'Discard unsaved edits' : pending?.plan.kind === 'delete' ? 'Delete saved note' : pending?.plan.kind === 'clear' ? 'Clear saved notebook' : 'Replace saved notebook';
  const canSave = !!snapshot && writable && !busy;

  return <section id="observation-notebook" className="observation-notebook" aria-labelledby="notebook-heading">
    <span className="obd-kicker">07 / OBSERVATION + RETEST NOTEBOOK</span><h2 id="notebook-heading">Keep the observation. Plan the retest.</h2>
    <p>Find patterns first. Diagnose second. Record what the data supports, another possible explanation and a safe next test. Every field is optional; no vehicle details are required.</p>
    <p className="notebook-privacy">Browser-local notes only, on this origin in this browser. Nothing is sent over the network. Raw logs, source rows, traces and the analysis session are never saved or restored. Browser data clearing or private browsing may lose notes. JSON backups are user-controlled local files and may contain private identifiers or observations; store and share them carefully. Share Tool shares only the public tool URL.</p>
    <p data-testid="notebook-storage-state">{storageState}</p>
    {stale && <p className="obd-notice">Saved notes may be stale. Reload to review newer data; your draft will be kept as a new note.</p>}
    <div className="notebook-actions"><button disabled={busy} onClick={reload}>Reload saved notes (keep draft)</button><button disabled={!snapshot || busy} onClick={() => { try { download(store.current!.export(snapshot!), 'torquegirl-notebook.json'); setStatus('Saved notebook backup downloaded. Unsaved edits are excluded; use Download draft backup for those.'); setError(''); } catch (e) { fail(e); } }}>Download notebook backup</button><button disabled={!canSave || !snapshot?.document.records.length} onClick={() => prepare('clear')}>Clear all saved notes</button></div>
    <p className="notebook-status" role="status">{status}</p>{error && <p className="obd-error" role="alert">{error}</p>}
    <div className="notebook-layout">
      <div className="notebook-editor">
        <h3 tabIndex={-1} ref={formHeading}>{editId ? 'Edit saved observation' : 'New observation'}</h3>
        <p>{dirty ? 'Unsaved edits — kept in memory until you save or download a draft backup.' : 'No unsaved changes.'}</p>
        <fieldset disabled={busy}><legend>Capture current analysis (optional)</legend>
          <p>Choose signals in Build your view above. Phase capture includes those Run A signals and matching Run B signals (up to 16 combined), current phase statistics and the current comparison if available. Timeline capture includes the visible Run A time bounds and signals, without phase statistics. Review run labels; filenames are not copied automatically.</p>
          <label>Run A evidence label<input maxLength={160} value={runA} onChange={e => setRunA(e.target.value)} /></label><label>Run B evidence label<input maxLength={160} value={runB} onChange={e => setRunB(e.target.value)} /></label>
          <label>Evidence scope<select aria-label="Evidence scope" value={scope} onChange={e => setScope(e.target.value)}><option value="phase">Selected phases / comparison</option><option value="timeline">Visible Run A timeline</option></select></label>
          <button disabled={!analysis || scope === 'phase' && !analysis.regionA} onClick={capture}>Capture current evidence</button>
          {!analysis && <p>Analyze a log to capture evidence, or write a manual note below.</p>}
        </fieldset>
        <form onSubmit={e => { e.preventDefault(); void save(); }}>
          <fieldset disabled={busy}><legend>Observation details — all optional</legend>
          {fields.map(([key, label, max]) => <div className="notebook-field" key={key}><label htmlFor={`notebook-${key}`}>{label}</label>{key === 'testDate' || max === 160 ? <input id={`notebook-${key}`} type={key === 'testDate' ? 'date' : 'text'} maxLength={max} value={form[key] ?? ''} onChange={e => setForm(old => ({ ...old, [key]: e.target.value }))} /> : <textarea id={`notebook-${key}`} rows={key === 'observation' || key === 'notes' ? 4 : 2} maxLength={max} value={form[key] ?? ''} onChange={e => setForm(old => ({ ...old, [key]: e.target.value }))} />}</div>)}
          <fieldset><legend>Selected region (optional, elapsed seconds)</legend><label>Region start (s)<input type="number" min="0" max="1000000000" step="any" value={start} onChange={e => setStart(e.target.value)} /></label><label>Region end (s)<input type="number" min="0" max="1000000000" step="any" value={end} onChange={e => setEnd(e.target.value)} /></label><label>Selected phase<select aria-label="Selected phase" value={phase} onChange={e => setPhase(e.target.value)}><option value="">No phase</option>{['stopped', 'idle', 'acceleration', 'cruise', 'deceleration', 'unclassified'].map(p => <option key={p}>{p}</option>)}</select></label></fieldset>
          <fieldset><legend>Selected signals (optional, maximum 16)</legend>{signals.map((s, i) => <div className="notebook-signal" key={i}><label>Signal {i + 1} label<input maxLength={160} value={s.label} onChange={e => setSignals(old => old.map((v, index) => index === i ? { ...v, label: e.target.value } : v))} /></label><label>Signal {i + 1} unit<input maxLength={40} value={s.unit ?? ''} onChange={e => setSignals(old => old.map((v, index) => index === i ? { ...v, unit: e.target.value } : v))} /></label><p>Run {s.run ?? 'A'} · {s.identity ?? 'manual signal'}</p><button type="button" onClick={() => setSignals(old => old.filter((_, index) => index !== i))}>Remove signal {i + 1}</button></div>)}<button type="button" disabled={signals.length >= NOTEBOOK_LIMITS.signals} onClick={() => setSignals(old => [...old, { id: `manual-${crypto.randomUUID()}`, label: '' }])}>Add manual signal</button></fieldset>
          </fieldset>
          {evidence && <><Evidence evidence={evidence} /><button type="button" disabled={busy} onClick={() => setEvidence(undefined)}>Remove captured evidence from draft</button><p>Manual region/signal edits above do not alter this historical snapshot. Capture again to replace it.</p></>}
          <div className="notebook-actions"><button type="submit" className="obd-primary" disabled={!canSave}>{editId ? 'Save changes' : 'Save note'}</button><button type="button" disabled={busy} onClick={() => { try { const time = new Date().toISOString(); download(exportNotebookJson({ ...emptyNotebook(), records: [{ ...draft(), id: crypto.randomUUID(), createdAt: time, updatedAt: time }] }), 'torquegirl-notebook-draft.json'); setStatus('Draft backup downloaded. It has not been saved in browser storage.'); setError(''); } catch (e) { fail(e); } }}>Download draft backup</button><button type="button" disabled={busy} onClick={() => switchDraft(() => loadDraft())}>New / discard draft</button></div>
        </form>
      </div>
      <div className="notebook-saved"><h3>Saved observations ({snapshot?.document.records.length ?? 0})</h3>
        <p>At most 100 records and 512,000 UTF-8 bytes per notebook; each record at most 24,000 bytes. Backups contain notes and compact evidence only.</p>
        <div className="notebook-cards">{snapshot?.document.records.map(r => <article key={r.id} data-testid="notebook-record"><h4>{title(r)}</h4><p>Test date: {r.testDate || 'not recorded'} · Updated {r.updatedAt}</p>{r.observation && <p>{r.observation}</p>}{r.nextTest && <p>Next test: {r.nextTest}</p>}
          <details><summary>All saved details</summary>{fields.filter(([key]) => r[key] !== undefined).map(([key, name]) => <p key={key}><strong>{name}:</strong> {r[key]}</p>)}{r.selectedRegion && <p>{regionText(r.selectedRegion)}</p>}{!!r.selectedSignals?.length && <p>Signals: {r.selectedSignals.map(s => `${s.run ?? 'A'}: ${s.label} (${s.unit ?? 'unit unknown'})`).join('; ')}</p>}{r.evidence && <Evidence evidence={r.evidence} />}</details>
          <div className="notebook-actions"><button disabled={busy} onClick={() => switchDraft(() => loadDraft(r))}>Edit {title(r)}</button><button disabled={!canSave} onClick={() => prepare('delete', r.id)}>Delete {title(r)}</button></div></article>)}</div>
        {snapshot && !snapshot.document.records.length && <p>No saved observations yet. A manual note works without a log.</p>}
        <fieldset disabled={busy || !snapshot || !writable}><legend>Import a notebook backup</legend><p>Validation and preview happen before any write. Merge keeps local versions of conflicting IDs. Replacement removes saved notes only after confirmation. Your current form is kept.</p><label>Import mode<select aria-label="Import mode" value={mode} onChange={e => { setMode(e.target.value as 'merge' | 'replace'); setImportPlan(null); }}><option value="merge">Merge — keep existing notes</option><option value="replace">Replace — confirm removal</option></select></label><label>Choose notebook JSON<input type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; setImportPlan(null); void act(async () => { if (file.size > NOTEBOOK_LIMITS.bytes) throw new NotebookError('limit', 'Notebook import exceeds 512,000 UTF-8 bytes; nothing was changed.'); const json = await file.text(); const plan = store.current!.planImport(snapshot!, json, mode); setImportPlan(plan); setStatus('Backup validated. Review the import preview before applying it.'); }); }} /></label></fieldset>
        {importPlan && <div className="notebook-import-preview" data-testid="notebook-import-preview"><h4>Import preview: {importPlan.kind}</h4><p>{importPlan.added} added · {importPlan.removed} removed · {importPlan.unchanged} identical · {importPlan.conflictIds.length} conflicting IDs skipped (local versions kept).</p>{!!importPlan.conflictIds.length && <p>Skipped IDs: {importPlan.conflictIds.join(', ')}</p>}<p>Resulting notebook: {importPlan.preview.records.length} records.</p><details><summary>Review resulting notes</summary>{importPlan.preview.records.map(r => <p key={r.id}>{title(r)} · {r.observation || 'no observation text'}</p>)}</details><div className="notebook-actions"><button disabled={!canSave} onClick={() => importPlan.requiresConfirmation ? setPending({ kind: 'plan', plan: importPlan }) : void applyPlan(importPlan)}>Apply {importPlan.kind} import</button><button disabled={busy} onClick={() => { setImportPlan(null); setStatus('Import cancelled. Saved notes and your draft were preserved.'); }}>Cancel import preview</button></div></div>}
      </div>
    </div>
    <dialog ref={dialog} className="notebook-dialog" aria-labelledby="notebook-confirm-heading" aria-describedby="notebook-confirm-description" onCancel={e => { e.preventDefault(); cancel(); }}>
      <h3 id="notebook-confirm-heading">{confirmLabel}?</h3><p id="notebook-confirm-description">{pending?.kind === 'discard' ? 'Your unsaved form edits will be discarded. Download a draft backup first if you want to keep them.' : `${pending?.kind === 'plan' ? pending.plan.removed : 0} saved notes will be removed. This cannot be undone without your own backup. Your current form stays in memory.`}</p>
      {error && <p role="alert">{error}</p>}<div className="notebook-actions"><button autoFocus disabled={busy} onClick={cancel}>Cancel</button><button disabled={busy} className="notebook-destructive" onClick={() => { if (!pending || gate.current) return; if (pending.kind === 'discard') { const next = pending.next; cancel(); next(); } else void applyPlan(pending.plan); }}>{busy ? 'Applying…' : confirmLabel}</button></div>
    </dialog>
  </section>;
}
