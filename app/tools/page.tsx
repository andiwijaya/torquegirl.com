import SiteHeader from '../../components/site-header';
import SiteFooter from '../../components/site-footer';
import Link from '../../components/document-link';
import type { Metadata } from 'next';
import { tools, obd2RecordingArticle } from '../../lib/torquegirl-content';
import './tools-index.css';
const url = 'https://torquegirl.com/tools';
const description = 'Analyze OBD2 logs and keep a local observation notebook, or explore torque, power and RPM with TorqueGirl’s two browser-local tools.';
export const metadata: Metadata = { title: 'Automotive Data and Engineering Tools', description, alternates: { canonical: url }, openGraph: { title: 'TorqueGirl Tools', description, url, type: 'website' }, twitter: { card: 'summary', title: 'TorqueGirl Tools', description } };
export default function ToolsPage() {
  return <main className="site-shell article-shell tools-index"><SiteHeader active="Tools" /><section className="category-hero"><p className="eyebrow">TorqueGirl / Tools</p><h1>Understand the data.<br />Explore the engineering.</h1><p>Two practical tools for following a question through the numbers. Calculations and imported logs stay in your browser. Find patterns first. Diagnose second.</p></section>
    <section className="section tool-index-grid" aria-label="TorqueGirl tools">{tools.map(tool => <article className="tool-index-card" key={tool.path}><img src={tool.image} alt={tool.imageAlt} loading="lazy" /><p className="eyebrow">{tool.label}</p><h2>{tool.title}</h2><p>{tool.description}</p><Link className="button button-dark" href={tool.path}>Open {tool.title}</Link></article>)}</section>
    <section className="section tool-index-journey"><h2>Start with a useful question.</h2><p>New to logging? <Link href={obd2RecordingArticle.path}>Prepare and export an OBD2 log</Link>, then review the analyzer’s mapping and first-use guide. Record an observation, an alternative explanation and a safe next test in the <Link href="/tools/obd2-log-analyzer#observation-notebook">local observation notebook</Link>.</p><p>Saved notes and compact evidence stay in this browser on this site; raw logs and analysis sessions are never saved or restored. Download a JSON backup to keep your notes. Explorer samples explain a relationship; they predict no actual engine capability.</p></section><SiteFooter /></main>;
}
