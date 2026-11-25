import { articleImage, pageMetadata } from '../../lib/site-seo';
import SiteHeader from '../../components/site-header';
import SiteFooter from '../../components/site-footer';
import Link from '../../components/document-link';
import { ArrowUpRight } from "lucide-react";
import { technologyArticles, getLatestArticles } from "../../lib/torquegirl-content";

export const metadata = pageMetadata({
  path: "/technology", title: "Automotive Technology & OBD2 Guides",
  description: "Follow step-by-step OBD2 guides for scanners, trouble codes, live data and log exports, and explore how Formula 1 aerodynamics creates downforce.",
  image: articleImage(technologyArticles[0]),
});

export default function TechnologyPage() {
  return <main className="site-shell article-shell">
    <SiteHeader active="Technology" />
    <section className="category-hero"><p className="eyebrow"><span className="eyebrow-line" />TorqueGirl / category</p><h1>Automotive Technology</h1><p>Learn how to use OBD2 scanners, read trouble codes and record live data. Explore how Formula 1 airflow creates downforce.</p></section>
    <section className="article-index" aria-labelledby="latest-technology"><div className="article-index-heading"><p className="eyebrow"><span className="eyebrow-line" />Latest from the garage</p><h2 id="latest-technology">Performance, explained.</h2><p><Link className="text-link" href="/tools/obd2-log-analyzer">Explore your recorded sensor data with the OBD2 Log Analyzer ↗</Link></p></div><div className="article-card-grid">{getLatestArticles(technologyArticles, technologyArticles.length).map((article) => <a className="article-card" href={article.path} key={article.slug}><div className="article-card-image"><img src={article.heroImage} alt={article.heroAlt} width={article.heroWidth} height={article.heroHeight} loading="lazy" /></div><div className="article-card-copy"><div className="article-card-meta"><span>{article.category}</span><span>{article.readingTime}</span></div><h3>{article.title}</h3><p>{article.description}</p><span className="text-link">Read the article <ArrowUpRight size={16} /></span></div></a>)}</div></section>
    <SiteFooter />
  </main>;
}
