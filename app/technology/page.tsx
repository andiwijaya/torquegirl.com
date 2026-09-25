import Link from "next/link";
import { HomeLink } from "../../components/home-link";
/* eslint-disable @next/next/no-html-link-for-pages */
import { ArrowUpRight } from "lucide-react";
import { technologyArticles } from "../../lib/torquegirl-content";

export const metadata = {
  title: "Technology",
  description: "TorqueGirl explains the technology behind aerodynamics, materials, cooling and the trade-offs that make high-performance machines work.",
  alternates: { canonical: "https://torquegirl.com/technology" },
};

export default function TechnologyPage() {
  return <main className="site-shell article-shell">
    <header className="site-header article-header"><HomeLink className="brand" ariaLabel="TorqueGirl home"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></HomeLink><nav className="nav-links article-nav" aria-label="Main navigation"><HomeLink>Home</HomeLink><Link href="/engines">Engines</Link><Link href="/tools">Tools</Link><Link href="/#explore">Machines</Link><Link href="/#how-it-works">Learn</Link><Link href="/#about">About</Link><Link className="nav-off-track" href="/off-track">Off Track</Link></nav></header>
    <section className="category-hero"><p className="eyebrow"><span className="eyebrow-line" />TorqueGirl / category</p><h1>Technology</h1><p>Materials, airflow, cooling and the engineering trade-offs that turn clever ideas into measurable performance.</p></section>
    <section className="article-index" aria-labelledby="latest-technology"><div className="article-index-heading"><p className="eyebrow"><span className="eyebrow-line" />Latest from the garage</p><h2 id="latest-technology">Performance, explained.</h2><p><Link className="text-link" href="/tools/obd2-log-analyzer">Explore your recorded sensor data with the OBD2 Log Analyzer ↗</Link></p></div><div className="article-card-grid">{technologyArticles.map((article) => <a className="article-card" href={`/technology/${article.slug}`} key={article.slug}><div className="article-card-image"><img src={article.heroImage} alt={article.heroAlt} loading="lazy" /></div><div className="article-card-copy"><div className="article-card-meta"><span>{article.category}</span><span>{article.readingTime}</span></div><h3>{article.title}</h3><p>{article.description}</p><span className="text-link">Read the article <ArrowUpRight size={16} /></span></div></a>)}</div></section>
    <footer className="site-footer"><div className="footer-top"><HomeLink className="brand brand-footer"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></HomeLink><p>Machines. Performance. Real engineering.</p></div><div className="footer-bottom"><nav aria-label="Footer navigation"><Link href="/engines">Engines</Link><Link href="/tools">Tools</Link><Link href="/technology">Technology</Link><Link href="/#about">About</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:hello@torquegirl.com">Contact</a></nav><div className="footer-meta"><span>© 2026 TorqueGirl</span><span>English only</span></div></div></footer>
  </main>;
}
