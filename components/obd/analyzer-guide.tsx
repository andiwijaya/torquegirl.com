/** Guidance follows actual import state; it does not track or persist user activity. */
export default function AnalyzerGuide({ stage, demo }: { stage: 'choose' | 'mapping' | 'analyze'; demo: boolean }) {
  return <section className="obd-guide" aria-label="Analyzer first-use guidance">
    <p className="obd-guide-next" aria-live="polite"><strong>{stage === 'choose' ? 'Start with a file or demo.' : stage === 'mapping' ? 'Next: check the preview, then Analyze log.' : 'Next: check quality, then build your view.'}</strong> {stage === 'choose' ? 'The demo lets you practice without a vehicle log.' : stage === 'mapping' ? 'Check delimiter, time, signal identities and units. Update preview after corrections; resolve blocking issues before accepting.' : 'Review gaps and cadence below. Choose a few useful signals, inspect the timeline and select a phase region.'}</p>
    {demo && <p className="obd-demo-hint"><strong>Synthetic demo / practice only.</strong> {stage === 'mapping' ? 'Expect comma-separated columns and elapsed seconds. Coolant and STFT have intentionally sparse readings; a deliberate recording gap is included.' : 'Try RPM, speed and throttle first. Inspect the recording-gap marker, then choose an idle region below and inspect its readings. These generated patterns describe no real vehicle.'}</p>}
    <details><summary>How to use this analyzer</summary>
      <ol>
        <li><strong>Choose a file or demo.</strong> Keep your original export as a backup.</li>
        <li><strong>Check delimiter, time and PID mapping.</strong> Confirm column separation, elapsed duration, signal identity, bank and units against your source.</li>
        <li><strong>Accept with Analyze log.</strong> Apply corrections with Update preview first.</li>
        <li><strong>Inspect data quality.</strong> Review rejected rows, missing values, gaps and sample spacing before interpreting shapes.</li>
        <li><strong>Select useful signals.</strong> Start with two or three that answer your question, plus operating context.</li>
        <li><strong>Inspect the timeline.</strong> Tap or drag a chart, use its arrow keys, or move Log position. What happened here shows readings and their source times.</li>
        <li><strong>Select a region or driving phase.</strong> Zoom for a closer view; choose Phase region A below for region statistics and Inspect this phase in Run A.</li>
        <li><strong>Optional: compare Run B.</strong> Review its mapping and quality, select regions, then check the operating-condition match before What changed.</li>
        <li><strong>Optional: explore relationships.</strong> Choose signals and a pairing tolerance for the selected phase. Correlation alone cannot establish a cause.</li>
        <li><strong>Record an observation and next test.</strong> In your own notes, include the region, signals, units, conditions, timing limits and an alternative explanation.</li>
      </ol>
      <p>Find patterns first. Diagnose second. Leaving or reloading clears the in-memory logs; returning starts a new analysis.</p>
    </details>
  </section>;
}
