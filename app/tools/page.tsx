import SiteHeader from '../../components/site-header';
import SiteFooter from '../../components/site-footer';
import Link from '../../components/document-link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Automotive Data Tools', description: 'Explore TorqueGirl tools for understanding recorded automotive sensor data.', alternates: { canonical: 'https://torquegirl.com/tools' } };
export default function ToolsPage() {
  return <main className="site-shell article-shell"><SiteHeader active="Tools" /><section className="category-hero"><p className="eyebrow">TorqueGirl / Tools</p><h1>Understand the data.</h1><p>Practical tools for exploring the engineering behind your drive.</p></section><section className="section"><h2>OBD2 Log Analyzer</h2><p>Import locally. Inspect actual time, sensor relationships and recording quality. No automated diagnosis.</p><Link className="button button-dark" href="/tools/obd2-log-analyzer">Open the analyzer ↗</Link></section><SiteFooter /></main>;
}
