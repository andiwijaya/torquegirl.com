import { ToolData } from '../../../components/seo-structured-data';
import { articleImage, pageMetadata } from '../../../lib/site-seo';
import { obd2AnalyzerTool, obd2LiveDataArticle } from '../../../lib/torquegirl-content';
import SiteHeader from '../../../components/site-header';
import SiteFooter from '../../../components/site-footer';
import Link from '../../../components/document-link';
import Analyzer from '../../../components/obd/analyzer';
import './style.css';
import './mapping.css';
import './drive.css';
import './notebook.css';

export const metadata = pageMetadata({
  path: obd2AnalyzerTool.path, title: "OBD2 Log Analyzer for CSV & TSV",
  description: "Analyze OBD2 CSV and TSV logs in your browser. Map sensor channels, compare runs on synchronized charts and save observations in a local notebook.",
  image: articleImage(obd2LiveDataArticle),
});
export default function AnalyzerPage() {
  return <main className="obd-page"><SiteHeader active="Tools" analyzer />
    <ToolData tool={obd2AnalyzerTool} />
    <section className="obd-hero"><div><p className="eyebrow"><span className="eyebrow-line" />TorqueGirl / Data tools / V3</p><h1>OBD2 <em>Log Analyzer</em></h1><p>Plot CSV and TSV sensor data and compare two recorded runs in your browser.</p></div><div className="obd-hero-note"><span>THE SIGNAL IS THE STORY.</span><p>Understand your log. Inspect a moment. Follow the relationship between sensors.</p><small>Recorded data and transparent observations. No automated diagnosis.</small></div></section>
    <Analyzer />
    <section className="obd-learn"><h2>Data first. Context always.</h2><p>Use a CSV or TSV with one header row and one row per sample. Time (s), Time (ms), ISO date/time and HH:MM:SS are supported. Put units in parentheses or brackets. Exporter recognition is based on header conventions; it does not validate a scanner, app or every export variant. Proprietary recordings are not supported.</p><p>New here? Follow the first-use guide above, or <Link href="#observation-notebook">open the local observation notebook</Link> to record a question and next test without a log. Save notes explicitly and download a backup; raw logs and sessions are never saved or restored.</p><p>Need a usable file? <Link href="/technology/how-to-record-and-export-obd2-logs">How to record and export OBD2 logs</Link></p><p><Link href="/technology/how-to-analyze-obd2-live-data-and-logs">How to analyze OBD2 live data and logs</Link><Link href="/technology/obd2-scanner-vs-code-reader">Scanner versus code reader</Link></p><p><Link href="/technology/what-is-an-obd2-scanner">What an OBD2 scanner tells you</Link><Link href="/technology/how-to-read-obd2-codes">Understanding diagnostic codes</Link></p></section>
    <SiteFooter analyzer />
  </main>;
}
