'use client';
import { useEffect, useMemo, useState } from 'react';
import { defaultMapping, type ImportPreview as Preview } from '../../lib/obd/mapping';
import { dimension, signalCatalog, unitOptions } from '../../lib/obd/catalog';
import type { ColumnMapping, MappingConfig } from '../../lib/obd/mapping-types';
import { applyTemplate, deleteTemplate, headerFingerprint, readTemplates, renameTemplate, resetTemplates, saveTemplate, type MappingTemplate } from '../../lib/obd/templates';

const states = { auto: 'Auto-mapped', user: 'User-mapped', custom: 'Custom / unknown', ignore: 'Ignore' };
const formats = { auto: 'Auto: ISO / HH:MM:SS only', s: 'Elapsed seconds', ms: 'Elapsed milliseconds', clock: 'HH:MM:SS', iso: 'ISO timestamp' };
const formatNumber = (value: number | null) => value === null ? 'unavailable' : value.toLocaleString('en', { maximumFractionDigits: 4 });

export default function ImportPreview({ preview, busy, onReprocess, onAccept, onBack }: { preview: Preview; busy: boolean; onReprocess: (config: MappingConfig) => Promise<Preview | null>; onAccept: () => void; onBack?: () => void }) {
  const [draft, setDraft] = useState(preview.config), [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState(''), [group, setGroup] = useState('all');
  const [templates, setTemplates] = useState<MappingTemplate[]>([]), [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('My mapping'), [templateNotice, setTemplateNotice] = useState(''), [fingerprint, setFingerprint] = useState('');
  const [saving, setSaving] = useState(false);
  const defaults = useMemo(() => defaultMapping(preview.headers), [preview.headers]);
  useEffect(() => {
    let active = true;
    headerFingerprint(preview.headers).then(hash => {
      if (!active) return;
      setFingerprint(hash);
      try { setTemplates(readTemplates(localStorage)); } catch (e) { setTemplateNotice(e instanceof Error ? e.message : 'Local storage unavailable.'); }
    }).catch(() => { if (active) setTemplateNotice('Local template fingerprints require a secure browser context.'); });
    return () => { active = false; };
  }, [preview.headers]);
  const changeColumn = (index: number, patch: Partial<ColumnMapping>) => {
    setDraft(current => ({ ...current, columns: current.columns.map(c => c.index === index ? { ...c, ...patch } : c) })); setDirty(true); setTemplateNotice('');
  };
  const reprocess = async (config: MappingConfig) => {
    setDraft(config); setDirty(true);
    const result = await onReprocess(config);
    if (result) { setDraft(result.config); setDirty(false); return true; }
    return false;
  };
  const templateAction = async (action: () => Promise<void> | void) => {
    setSaving(true); setTemplateNotice('');
    try { await action(); setTemplates(readTemplates(localStorage)); }
    catch (e) { setTemplateNotice(e instanceof Error ? e.message : 'Local templates are unavailable.'); }
    finally { setSaving(false); }
  };
  const errors = preview.issues.filter(i => i.severity === 'error');
  const warnings = preview.issues.filter(i => i.severity === 'warning');
  const columns = draft.columns.filter(c => {
    const matches = `${preview.headers[c.index]} ${c.identity ?? ''}`.toLowerCase().includes(filter.toLowerCase());
    return matches && (group === 'all' || group === 'needs-review' ? matches && (group !== 'needs-review' || preview.issues.some(i => i.column === c.index)) : group === 'mapped' ? matches && ['auto', 'user'].includes(c.state) : matches && c.state === group);
  });
  return <section className="obd-mapping" aria-labelledby="mapping-heading">
    <header className="obd-mapping-heading"><div><span className="obd-kicker">IMPORT INTELLIGENCE / V2</span><h2 id="mapping-heading">Understand before you analyze.</h2><p>Review each interpretation. Corrections rebuild the timeline and values from the original source.</p></div><span className="obd-mapping-badge">PREVIEW ONLY</span></header>
    <div className="obd-detection"><div><b>{preview.exporter.label}</b><p>{preview.exporter.evidence}</p></div><div><span>Delimiter</span><b>{preview.info.delimiter === '\t' ? 'Tab' : preview.info.delimiter === ';' ? 'Semicolon' : 'Comma'}</b></div><div><span>Records</span><b>{preview.info.quality.parsed.toLocaleString('en')}</b><small>{preview.info.quality.rejected} rejected</small></div><div><span>Columns</span><b>{preview.headers.length}</b><small>Original order preserved</small></div></div>
    <details className="obd-adapter-details"><summary>Convention limits & parser notices ({preview.info.quality.warningCount})</summary><p>{preview.exporter.timeConventions} {preview.exporter.unitConventions} {preview.exporter.quirks}</p><ul>{preview.info.quality.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>
    <fieldset disabled={busy || saving} className="obd-mapping-controls">
      <legend>Mapping configuration</legend>
      <section className="obd-time-mapping"><div><span className="obd-kicker">01 / TIME AXIS</span><h3>Start with time.</h3><p>No invented sampling interval. Bare numbers need an explicit seconds or milliseconds choice.</p></div><label>Time column<select aria-label="Time column" value={draft.time.index ?? ''} onChange={e => { setDraft(d => ({ ...d, time: { ...d.time, index: e.target.value === '' ? null : +e.target.value, source: 'user' } })); setDirty(true); }}><option value="">Choose a time column</option>{preview.headers.map((h, i) => <option key={i} value={i}>{i + 1}. {h || 'Unnamed'}</option>)}</select></label><label>Interpretation<select aria-label="Time interpretation" value={draft.time.format} onChange={e => { setDraft(d => ({ ...d, time: { ...d.time, format: e.target.value as MappingConfig['time']['format'], source: 'user' } })); setDirty(true); }}>{Object.entries(formats).map(([v, name]) => <option key={v} value={v}>{name}</option>)}</select></label>
        <dl><div><dt>First source time</dt><dd>{preview.time.first ?? 'missing'}<small>Elapsed {formatNumber(preview.time.firstElapsed)} s</small></dd></div><div><dt>Last source time</dt><dd>{preview.time.last ?? 'missing'}<small>Elapsed {formatNumber(preview.time.lastElapsed)} s</small></dd></div><div><dt>Duration</dt><dd data-testid="mapping-duration">{formatNumber(preview.info.quality.duration)} s</dd></div><div><dt>Duplicate / backwards / missing</dt><dd>{preview.info.quality.duplicateTimes} / {preview.info.quality.backwardsTimes} / {preview.info.quality.missingTimes}</dd></div></dl><p className="obd-time-policy">Detected in last preview: <strong>{preview.time.detectedFormat}</strong>. ISO without a timezone uses UTC. No epoch, localized date or midnight rollover guessing.</p>
      </section>
      <div className="obd-mapping-filter"><div><span className="obd-kicker">02 / SIGNAL MAPPING</span><h3>Give every column a meaning.</h3></div><label>Find column<input type="search" aria-label="Find mapping column" placeholder="Name or canonical identity" value={filter} onChange={e => setFilter(e.target.value)} /></label><label>Show<select aria-label="Mapping group" value={group} onChange={e => setGroup(e.target.value)}><option value="all">All columns</option><option value="needs-review">Needs review</option><option value="mapped">Mapped</option><option value="custom">Custom / unknown</option><option value="ignore">Ignored</option></select></label></div>
      <div className="obd-mapping-cards">{columns.map(c => {
        const detail = preview.columns[c.index], time = c.index === draft.time.index;
        const originalDimension = dimension(detail.originalUnit), target = signalCatalog.find(s => s.id === c.identity);
        const choices = target ? target.units : unitOptions.filter(u => !originalDimension || dimension(u) === originalDimension);
        const notices = preview.issues.filter(i => i.column === c.index);
        return <article key={c.index} className={`obd-mapping-card ${notices.length ? 'needs-review' : ''}`} data-testid={`mapping-column-${c.index}`}>
          <div className="obd-column-title"><span>{String(c.index + 1).padStart(2, '0')}</span><h4>{preview.headers[c.index] || 'Unnamed column'}</h4><b>{time ? 'TIME AXIS' : states[c.state]}</b></div>
          <p className="obd-column-evidence">Last preview: {detail.reason}</p>
          {time ? <p>This column supplies the shared timeline. Change it in Time axis above.</p> : <div className="obd-column-fields">
            <label>Mapping state<select aria-label={`State for column ${c.index + 1}`} value={c.state} onChange={e => { const state = e.target.value as ColumnMapping['state']; changeColumn(c.index, state === 'auto' ? defaults.columns[c.index] : { state, identity: state === 'user' ? c.identity : null, via: 'manual' }); }}><option value="auto" disabled={defaults.columns[c.index].state !== 'auto'}>Auto-mapped</option><option value="user">User-mapped</option><option value="custom">Custom / unknown</option><option value="ignore">Ignore</option></select></label>
            <label>Physical signal<select aria-label={`Identity for column ${c.index + 1}`} value={c.identity ?? ''} disabled={c.state === 'ignore'} onChange={e => changeColumn(c.index, { state: e.target.value ? 'user' : 'custom', identity: e.target.value || null, via: 'manual' })}><option value="">Custom / unknown</option>{signalCatalog.map(s => <option key={s.id} value={s.id} disabled={!!originalDimension && originalDimension !== dimension(s.unit)}>{s.label}</option>)}</select></label>
            <label>Interpret source unit<select aria-label={`Unit for column ${c.index + 1}`} value={c.unit ?? ''} disabled={c.state === 'ignore'} onChange={e => changeColumn(c.index, { unit: e.target.value || null, state: c.identity ? 'user' : 'custom', via: 'manual' })}><option value="">Unknown / native values</option>{choices.map(u => <option key={u} value={u}>{u}</option>)}</select></label>
          </div>}
          <div className="obd-column-origin"><span>Original unit: <b>{detail.originalUnit ?? 'not stated'}</b></span><span>Last display unit: <b>{time ? 'elapsed seconds' : detail.unit ?? 'unknown'}</b></span>{!time && c.state !== 'ignore' && <span>{detail.numeric.toLocaleString('en')} numeric · {detail.missing.toLocaleString('en')} missing</span>}</div>
          <div className="obd-source-examples"><span>Source → last preview</span>{detail.samples.map((s, i) => <code key={i}>{s || '(empty)'} → {formatNumber(detail.normalized[i])}</code>)}</div>
          {notices.length > 0 && <ul className="obd-column-warnings">{notices.map((issue, i) => <li key={i}>{issue.message}</li>)}</ul>}
        </article>;
      })}</div>
      {!columns.length && <p>No columns match this filter.</p>}
      <section className="obd-local-templates"><div><span className="obd-kicker">03 / LOCAL TEMPLATES</span><h3>Remember the interpretation.</h3><p>Only mapping choices and a header fingerprint are saved in this browser. No log values, timestamps or filenames. Templates are never applied automatically.</p></div><div className="obd-template-controls"><label>Template name<input aria-label="Template name" maxLength={60} value={templateName} onChange={e => setTemplateName(e.target.value)} /></label><button disabled={dirty || !!errors.length || !templateName.trim()} onClick={() => void templateAction(async () => { await saveTemplate(localStorage, templateName, preview.headers, draft); setTemplateNotice('Mapping template saved locally. No log data stored.'); })}>Save template</button><label>Saved templates<select aria-label="Saved templates" value={templateId} onChange={e => setTemplateId(e.target.value)}><option value="">Choose a template</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name} · {t.fingerprint === fingerprint ? 'headers match' : 'different headers'}</option>)}</select></label><button disabled={!templateId} onClick={() => void templateAction(async () => { const t = templates.find(t => t.id === templateId)!; const config = await applyTemplate(t, preview.headers); if (await reprocess(config)) setTemplateNotice(`Applied locally: ${t.name}. Review the updated preview.`); })}>Apply template</button><button disabled={!templateId || !templateName.trim()} onClick={() => void templateAction(() => { renameTemplate(localStorage, templateId, templateName); setTemplateNotice('Template renamed locally.'); })}>Rename</button><button disabled={!templateId} onClick={() => void templateAction(() => { deleteTemplate(localStorage, templateId); setTemplateId(''); setTemplateNotice('Template deleted from this browser.'); })}>Delete template</button><button onClick={() => void templateAction(() => { resetTemplates(localStorage); setTemplateId(''); setTemplateNotice('Saved mapping templates reset.'); })}>Reset templates</button></div></section>
    </fieldset>
    {templateNotice && <p className="obd-template-notice" role="status">{templateNotice}</p>}
    <div className="obd-mapping-accept"><div aria-live="polite">{dirty ? <strong>Changes pending. Update preview before analysis.</strong> : <><strong>{errors.length ? `${errors.length} blocking issue(s)` : 'Ready to explore'}</strong><span>{warnings.length} mapping warning(s) · review notices before continuing</span></>}{errors.map((issue, i) => <p key={i}>{issue.message}</p>)}</div><div><button disabled={busy || saving || !dirty} onClick={() => void reprocess(draft)}>Update preview</button><button disabled={busy || saving} onClick={() => void reprocess(defaults)}>Reset mapping</button>{onBack && <button disabled={busy || saving} onClick={onBack}>Keep previous analysis</button>}<button className="obd-primary" disabled={busy || saving || dirty || !!errors.length} onClick={onAccept}>Analyze log</button></div></div>
  </section>;
}
