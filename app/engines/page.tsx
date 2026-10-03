import SiteHeader from '../../components/site-header';
import SiteFooter from '../../components/site-footer';
import { ArrowUpRight } from "lucide-react";
import { articles, getLatestArticles } from "../../lib/torquegirl-content";

export const metadata = {
  title: "Engines",
  description: "TorqueGirl explores engines, powertrains, combustion, torque, power and the engineering behind performance machines.",
  alternates: { canonical: "https://torquegirl.com/engines" },
};

export default function EnginesPage() {
  return <main className="site-shell article-shell">
    <SiteHeader active="Engines" />
    <section className="category-hero"><p className="eyebrow"><span className="eyebrow-line" />TorqueGirl / category</p><h1>Engines</h1><p>How power is made, moved, cooled and kept alive. TorqueGirl explores engines, powertrains, combustion, torque, power and the engineering behind performance machines.</p></section>
    <section className="article-index" aria-labelledby="latest-engines"><div className="article-index-heading"><p className="eyebrow"><span className="eyebrow-line" />Latest from the garage</p><h2 id="latest-engines">Power, decoded.</h2></div><div className="article-card-grid">{getLatestArticles(articles, articles.length).map((article) => <a className="article-card" href={article.path} key={article.slug}><div className="article-card-image"><img src={article.heroImage} alt={article.heroAlt} loading="lazy" /></div><div className="article-card-copy"><div className="article-card-meta"><span>{article.category}</span><span>{article.readingTime}</span></div><h3>{article.title}</h3><p>{article.description}</p><span className="text-link">Read the article <ArrowUpRight size={16} /></span></div></a>)}</div></section>
    <SiteFooter />
  </main>;
}
