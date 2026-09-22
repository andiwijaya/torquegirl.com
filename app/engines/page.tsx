import Link from "next/link";
/* eslint-disable @next/next/no-html-link-for-pages */
import { ArrowUpRight } from "lucide-react";
import { articles } from "../../lib/torquegirl-content";

export const metadata = {
  title: "Engines",
  description: "TorqueGirl explores engines, powertrains, combustion, torque, power and the engineering behind performance machines.",
  alternates: { canonical: "https://torquegirl.com/engines" },
};

export default function EnginesPage() {
  return <main className="site-shell article-shell">
    <header className="site-header article-header"><Link className="brand" href="/" aria-label="TorqueGirl home"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></Link><nav className="nav-links article-nav" aria-label="Main navigation"><Link href="/">Home</Link><Link href="/engines" aria-current="page">Engines</Link><Link href="/#explore">Machines</Link><Link href="/#how-it-works">Learn</Link><Link href="/#about">About</Link></nav></header>
    <section className="category-hero"><p className="eyebrow"><span className="eyebrow-line" />TorqueGirl / category</p><h1>Engines</h1><p>How power is made, moved, cooled and kept alive. TorqueGirl explores engines, powertrains, combustion, torque, power and the engineering behind performance machines.</p></section>
    <section className="article-index" aria-labelledby="latest-engines"><div className="article-index-heading"><p className="eyebrow"><span className="eyebrow-line" />Latest from the garage</p><h2 id="latest-engines">Power, decoded.</h2></div><div className="article-card-grid">{articles.map((article) => <a className="article-card" href={`/engines/${article.slug}`} key={article.slug}><div className="article-card-image"><img src={article.heroImage} alt={article.heroAlt} loading="lazy" /></div><div className="article-card-copy"><div className="article-card-meta"><span>{article.category}</span><span>{article.readingTime}</span></div><h3>{article.title}</h3><p>{article.description}</p><span className="text-link">Read the article <ArrowUpRight size={16} /></span></div></a>)}</div></section>
    <footer className="site-footer"><div className="footer-top"><Link className="brand brand-footer" href="/"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></Link><p>Machines. Performance. Real engineering.</p></div><div className="footer-bottom"><nav aria-label="Footer navigation"><Link href="/#about">About</Link><Link href="/engines">Categories</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:hello@torquegirl.com">Contact</a></nav><div className="footer-meta"><span>© 2026 TorqueGirl</span><span>English only</span></div></div></footer>
  </main>;
}
