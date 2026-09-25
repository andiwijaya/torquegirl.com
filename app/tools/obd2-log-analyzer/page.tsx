import type { Metadata } from 'next';
import Link from '../../../components/document-link';
import Analyzer from '../../../components/obd/analyzer';
import './style.css';
import './mapping.css';
import './drive.css';

const url = 'https://torquegirl.com/tools/obd2-log-analyzer';
export const metadata: Metadata = {
  title: 'OBD2 Log Analyzer — Explore Your Recorded Sensor Data',
  description: 'Inspect OBD2 CSV logs locally in your browser. Explore synchronized sensor charts, honest data-quality reports, event snapshots and real-time playback.',
  alternates: { canonical: url },
  openGraph: { title: 'TorqueGirl OBD2 Log Analyzer', description: 'Your drive. Your data. A clearer picture.', url, type: 'website' },
  twitter: { card: 'summary', title: 'TorqueGirl OBD2 Log Analyzer', description: 'Local CSV analysis with synchronized sensor snapshots.' },
};
export default function AnalyzerPage() {
  return <main className="obd-page"><header className="obd-header"><Link className="brand" href="/" aria-label="TorqueGirl home"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></Link><nav aria-label="Main navigation"><Link href="/technology">Technology</Link><Link href="/tools" aria-current="page">Tools</Link></nav><span className="obd-local-badge">LOCAL / PRIVATE</span></header>
    <section className="obd-hero"><div><p className="eyebrow"><span className="eyebrow-line" />TorqueGirl / Data tools / V3</p><h1>Power, <em>recorded.</em><br />Now make sense of it.</h1><p>OBD2 LOG ANALYZER</p></div><div className="obd-hero-note"><span>THE SIGNAL IS THE STORY.</span><p>Understand your log. Inspect a moment. Follow the relationship between sensors.</p><small>Recorded data and transparent observations. No automated diagnosis.</small></div></section>
    <Analyzer />
    <section className="obd-learn"><h2>Data first. Context always.</h2><p>Use a CSV or TSV with one header row and one row per sample. Time (s), Time (ms), ISO date/time and HH:MM:SS are supported. Put units in parentheses or brackets. Some Torque, OBD Fusion and FORScan exports fit this format; proprietary files and every exporter variant are not supported.</p><p><Link href="/technology/how-to-analyze-obd2-live-data-and-logs">How to analyze OBD2 live data and logs ↗</Link><Link href="/technology/obd2-scanner-vs-code-reader">Scanner versus code reader ↗</Link></p><p><Link href="/technology/what-is-an-obd2-scanner">What an OBD2 scanner tells you ↗</Link><Link href="/technology/how-to-read-obd2-codes">Understanding diagnostic codes ↗</Link></p></section>
    <footer className="obd-footer"><Link href="/">TorqueGirl.com</Link><span>Machines. Performance. Real engineering.</span><Link href="/privacy">Privacy</Link></footer>
  </main>;
}
