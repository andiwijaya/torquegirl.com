import SiteHeader from '../../components/site-header';
import SiteFooter from '../../components/site-footer';
import { ArrowUpRight } from "lucide-react";
import { offTrackStories, getLatestArticles } from "../../lib/torquegirl-content";

export const metadata = {
  title: "Off Track | TorqueGirl",
  description: "A different side of TorqueGirl: short stories about curiosity, trying new things, and finding a different kind of drive.",
  alternates: { canonical: "https://torquegirl.com/off-track" },
};

export default function OffTrackPage() {
  return <main className="site-shell article-shell offtrack-archive">
    <SiteHeader active="Off Track" />
    <section className="category-hero offtrack-hero"><p className="eyebrow"><span className="eyebrow-line" />TorqueGirl / beyond the garage</p><h1>Off Track</h1><p>Curiosity takes the long way round. Short stories about trying something new, finding focus, and enjoying the ride.</p></section>
    <section className="article-index offtrack-index" aria-labelledby="offtrack-latest"><div className="article-index-heading"><p className="eyebrow"><span className="eyebrow-line" />A different kind of drive</p><h2 id="offtrack-latest">Out of the garage.</h2></div><div className="article-card-grid">{getLatestArticles(offTrackStories, offTrackStories.length).map((story) => <a className="article-card" href={story.path} key={story.slug}><div className="article-card-image"><img src={story.heroImage} alt={story.heroAlt} loading="lazy" /></div><div className="article-card-copy"><div className="article-card-meta"><span>{story.category}</span><span>{story.readingTime}</span></div><h3>{story.title}</h3><p>{story.description}</p><span className="text-link">Read the story <ArrowUpRight size={16} /></span></div></a>)}</div></section>
    <SiteFooter />
  </main>;
}
