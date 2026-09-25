import Link from '../../components/document-link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Automotive Data Tools', description: 'Explore TorqueGirl tools for understanding recorded automotive sensor data.', alternates: { canonical: 'https://torquegirl.com/tools' } };
export default function ToolsPage() {
  return <main className="site-shell article-shell"><header className="site-header"><Link className="brand" href="/">Torque<span>Girl</span>.com</Link><Link href="/technology">Technology ↗</Link></header><section className="category-hero"><p className="eyebrow">TorqueGirl / Tools</p><h1>Understand the data.</h1><p>Practical tools for exploring the engineering behind your drive.</p></section><section className="section"><h2>OBD2 Log Analyzer</h2><p>Import locally. Inspect actual time, sensor relationships and recording quality. No automated diagnosis.</p><Link className="button button-dark" href="/tools/obd2-log-analyzer">Open the analyzer ↗</Link></section></main>;
}
